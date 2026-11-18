import type { IPriceVersion } from "@/lib/billing/pricing";
import type { IInvoiceRepository } from "@/server/modules/invoice/invoice.repository";
import type {
  IAdminInvoiceDetailResponse,
  IAdminInvoiceListQuery,
  IAdminInvoiceResponse,
  INewInvoice,
  IUsageDetail,
  IPaymentResponse,
  IRecordPaymentCommand,
} from "@/server/modules/invoice/invoice.schema";
import { ConflictError } from "@/server/shared/errors";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import type { InvoiceStatus } from "@/server/shared/schema";
import type { Prisma, PrismaClient } from "../client";
import { isoDate, isoDateTime, num, numOrNull, orConflict, toJson } from "../mappers";

type Tx = Prisma.TransactionClient;
const include = {
  lease: { select: { unit: { select: { unitName: true } } } },
  payments: { where: { deletedAt: null }, orderBy: { paidOn: "asc" } },
} satisfies Prisma.InvoiceInclude;
type Row = Prisma.InvoiceGetPayload<{ include: typeof include }>;

const sum = (xs: { amount: { toNumber(): number } }[]) => xs.reduce((s, x) => s + x.amount.toNumber(), 0);

const toInvoice = (r: Row): IAdminInvoiceResponse => ({
  id: r.id,
  leaseId: r.leaseId,
  unitName: r.lease.unit.unitName,
  kind: r.kind,
  title: r.title,
  amount: num(r.amount),
  paidAmount: sum(r.payments),
  dueDate: isoDate(r.dueDate),
  status: r.status,
  cancelledAt: r.cancelledAt ? isoDateTime(r.cancelledAt) : null,
  createdAt: isoDateTime(r.createdAt),
});

const toPayment = (p: Prisma.PaymentGetPayload<object>): IPaymentResponse => ({
  id: p.id,
  invoiceId: p.invoiceId,
  amount: num(p.amount),
  method: p.method,
  paidOn: isoDate(p.paidOn),
  reference: p.reference,
  notes: p.notes,
  evidence: p.evidence,
  createdBy: p.createdBy,
  createdAt: isoDateTime(p.createdAt),
});

/** pending / partial / paid from the live payments. Call inside the transaction that changed them. */
const recomputeStatus = async (tx: Tx, invoiceId: string, total: number) => {
  const paid = sum(await tx.payment.findMany({ where: { invoiceId, deletedAt: null }, select: { amount: true } }));
  const status: InvoiceStatus = paid <= 0 ? "pending" : paid >= total ? "paid" : "partial";
  await tx.invoice.update({ where: { id: invoiceId }, data: { status } });
};

/** Row lock so two concurrent payments cannot both pass the overpayment check. */
const lock = (tx: Tx, invoiceId: string) => tx.$queryRaw`SELECT id FROM invoices WHERE id = ${invoiceId}::uuid FOR UPDATE`;

export class PrismaInvoiceRepository implements IInvoiceRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(propertyId: string, q: IAdminInvoiceListQuery) {
    const where: Prisma.InvoiceWhereInput = {
      propertyId,
      deletedAt: null,
      ...(q.leaseId && { leaseId: q.leaseId }),
      ...(q.status && { status: q.status }),
      ...(q.kind && { kind: q.kind }),
    };
    const [rows, total] = await Promise.all([
      this.db.invoice.findMany({ where, include, orderBy: [{ dueDate: "desc" }, { id: "asc" }], ...toSkipTake(q) }),
      this.db.invoice.count({ where }),
    ]);
    return paginated(rows.map(toInvoice), total, q);
  }

  async findById(propertyId: string, invoiceId: string): Promise<IAdminInvoiceDetailResponse | null> {
    const r = await this.db.invoice.findFirst({
      where: { id: invoiceId, propertyId, deletedAt: null },
      include: { ...include, invoiceItems: { orderBy: [{ seq: "asc" }, { id: "asc" }] } },
    });
    if (!r) return null;
    return {
      ...toInvoice(r),
      billingPeriodId: r.billingPeriodId,
      items: r.invoiceItems.map((i) => ({
        id: i.id,
        parentId: i.parentId,
        seq: i.seq,
        kind: i.kind,
        title: i.title,
        amount: num(i.amount),
        usageId: i.usageId,
        voided: i.voidedAt !== null,
        detail: (i.detail as IUsageDetail | null) ?? null,
      })),
      payments: r.payments.map(toPayment),
    };
  }

  async leaseExists(propertyId: string, leaseId: string) {
    return (await this.db.lease.count({ where: { id: leaseId, propertyId, deletedAt: null } })) > 0;
  }

  async periodBelongsToLease(leaseId: string, periodId: string) {
    return (await this.db.billingPeriod.count({ where: { id: periodId, leaseId } })) > 0;
  }
  async findUsages(leaseId: string, ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await this.db.usage.findMany({
      where: { leaseId, id: { in: ids } },
      include: { invoiceItems: { where: { voidedAt: null }, select: { id: true }, take: 1 } },
    });
    return rows.map((u) => ({ id: u.id, quantity: numOrNull(u.quantity), price: u.price as unknown as IPriceVersion, billed: u.invoiceItems.length > 0 }));
  }

  create(c: INewInvoice) {
    const total = c.items.reduce((s, i) => s + i.amount, 0);
    return orConflict(
      async () =>
        (
          await this.db.invoice.create({
            data: {
              propertyId: c.propertyId,
              leaseId: c.leaseId,
              kind: c.kind,
              billingPeriodId: c.billingPeriodId,
              title: c.title,
              amount: total,
              dueDate: new Date(c.dueDate),
              targetMetadata: toJson({ source: c.kind === "other" ? "manual" : "billing" }),
              createdBy: c.actor.accountId,
              invoiceItems: {
                create: c.items.map((it, seq) => ({
                  seq,
                  kind: it.kind,
                  title: it.title,
                  amount: it.amount,
                  usageId: it.usageId,
                  detail: it.detail ? toJson(it.detail) : undefined,
                })),
              },
            },
            select: { id: true },
          })
        ).id,
      "This lease already has an invoice for that event, or a usage is already billed",
      "EVENT_INVOICED",
    );
  }

  recordPayment(c: IRecordPaymentCommand): Promise<IPaymentResponse | null> {
    return this.db.$transaction(async (tx) => {
      await lock(tx, c.invoiceId);
      const inv = await tx.invoice.findFirst({
        where: { id: c.invoiceId, propertyId: c.propertyId, deletedAt: null },
        include: { payments: { where: { deletedAt: null }, select: { amount: true } } },
      });
      if (!inv) return null;
      if (inv.status === "cancelled") throw new ConflictError("The invoice is cancelled", "INVOICE_CANCELLED");
      const total = num(inv.amount);
      const owed = total - sum(inv.payments);
      if (c.amount > owed) throw new ConflictError(`Payment exceeds the amount still owed (${owed})`, "OVERPAYMENT");
      const p = await tx.payment.create({
        data: {
          invoiceId: c.invoiceId,
          amount: c.amount,
          method: c.method,
          paidOn: new Date(c.paidOn),
          reference: c.reference,
          notes: c.notes,
          evidence: c.evidence,
          createdBy: c.actor.accountId,
        },
      });
      await recomputeStatus(tx, c.invoiceId, total);
      return toPayment(p);
    });
  }

  deletePayment(propertyId: string, invoiceId: string, paymentId: string) {
    return this.db.$transaction(async (tx) => {
      await lock(tx, invoiceId);
      const inv = await tx.invoice.findFirst({ where: { id: invoiceId, propertyId, deletedAt: null } });
      if (!inv) return false;
      const r = await tx.payment.updateMany({ where: { id: paymentId, invoiceId, deletedAt: null }, data: { deletedAt: new Date() } });
      if (r.count === 0) return false;
      if (inv.status !== "cancelled") await recomputeStatus(tx, invoiceId, num(inv.amount));
      return true;
    });
  }

  cancel(propertyId: string, invoiceId: string) {
    return this.db.$transaction(async (tx) => {
      await lock(tx, invoiceId);
      const inv = await tx.invoice.findFirst({
        where: { id: invoiceId, propertyId, deletedAt: null },
        include: { payments: { where: { deletedAt: null }, select: { amount: true } } },
      });
      if (!inv) return null;
      if (inv.status === "cancelled") throw new ConflictError("The invoice is already cancelled", "ALREADY_CANCELLED");
      if (inv.payments.length > 0) throw new ConflictError("Remove the payments before cancelling the invoice", "INVOICE_HAS_PAYMENTS");
      const now = new Date();
      await tx.invoice.update({ where: { id: invoiceId }, data: { status: "cancelled", cancelledAt: now } });
      await tx.invoiceItem.updateMany({ where: { invoiceId, voidedAt: null }, data: { voidedAt: now } }); // frees billed usages
      return true;
    });
  }
}
