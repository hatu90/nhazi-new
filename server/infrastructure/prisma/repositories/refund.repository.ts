import type { IRefundRepository } from "@/server/modules/refund/refund.repository";
import type { ICreateRefundCommand, IInvoiceFacts, IRefundListQuery, IRefundResponse } from "@/server/modules/refund/refund.schema";
import type { PaymentMethod } from "@/server/modules/invoice/invoice.schema";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import type { Prisma, PrismaClient } from "../client";
import { isoDateTime, num } from "../mappers";

const include = { refundItems: { orderBy: { id: "asc" } } } satisfies Prisma.RefundInclude;
const toRefund = (r: Prisma.RefundGetPayload<{ include: typeof include }>): IRefundResponse => ({
  id: r.id,
  leaseId: r.leaseId,
  billingPeriodId: r.billingPeriodId,
  amount: num(r.amount),
  status: r.status,
  method: r.method,
  paidAt: r.paidAt ? isoDateTime(r.paidAt) : null,
  note: r.note,
  createdAt: isoDateTime(r.createdAt),
  items: r.refundItems.map((i) => ({
    id: i.id,
    invoiceId: i.invoiceId,
    invoiceItemId: i.invoiceItemId,
    kind: i.kind,
    title: i.title,
    chargedAmount: num(i.chargedAmount),
    unusedDays: i.unusedDays,
    totalDays: i.totalDays,
    amount: num(i.amount),
    note: i.note,
  })),
});

export class PrismaRefundRepository implements IRefundRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(propertyId: string, q: IRefundListQuery) {
    const where: Prisma.RefundWhereInput = { propertyId, ...(q.leaseId && { leaseId: q.leaseId }), ...(q.status && { status: q.status }) };
    const [rows, total] = await Promise.all([
      this.db.refund.findMany({ where, include, orderBy: [{ createdAt: "desc" }, { id: "asc" }], ...toSkipTake(q) }),
      this.db.refund.count({ where }),
    ]);
    return paginated(rows.map(toRefund), total, q);
  }
  async findById(propertyId: string, refundId: string) {
    const r = await this.db.refund.findFirst({ where: { id: refundId, propertyId }, include });
    return r ? toRefund(r) : null;
  }
  async leaseExists(propertyId: string, leaseId: string) {
    return (await this.db.lease.count({ where: { id: leaseId, propertyId, deletedAt: null } })) > 0;
  }
  async periodBelongsToLease(leaseId: string, billingPeriodId: string) {
    return (await this.db.billingPeriod.count({ where: { id: billingPeriodId, leaseId } })) > 0;
  }

  async invoiceFacts(propertyId: string, invoiceIds: string[]) {
    const [invoices, refunded] = await Promise.all([
      this.db.invoice.findMany({
        where: { id: { in: invoiceIds }, propertyId, deletedAt: null },
        include: { payments: { where: { deletedAt: null, status: "confirmed" }, select: { amount: true } }, invoiceItems: { select: { id: true, amount: true } } },
      }),
      this.db.refundItem.findMany({
        where: { invoiceId: { in: invoiceIds }, refund: { status: { not: "cancelled" } } },
        select: { invoiceId: true, invoiceItemId: true, amount: true },
      }),
    ]);
    const facts = new Map<string, IInvoiceFacts>();
    for (const inv of invoices) {
      facts.set(inv.id, {
        id: inv.id,
        leaseId: inv.leaseId,
        cancelled: inv.status === "cancelled",
        paidAmount: inv.payments.reduce((s, p) => s + num(p.amount), 0),
        refundedAmount: 0,
        items: new Map(inv.invoiceItems.map((i) => [i.id, { amount: num(i.amount), refundedAmount: 0 }])),
      });
    }
    for (const r of refunded) {
      const f = facts.get(r.invoiceId);
      if (!f) continue;
      f.refundedAmount += num(r.amount);
      const line = r.invoiceItemId ? f.items.get(r.invoiceItemId) : undefined;
      if (line) line.refundedAmount += num(r.amount);
    }
    return facts;
  }

  async create(c: ICreateRefundCommand) {
    const r = await this.db.refund.create({
      data: {
        propertyId: c.propertyId,
        leaseId: c.leaseId,
        billingPeriodId: c.billingPeriodId,
        amount: c.items.reduce((s, i) => s + i.amount, 0),
        method: c.method,
        note: c.note,
        createdBy: c.actor.accountId,
        refundItems: {
          create: c.items.map((i) => ({
            invoiceId: i.invoiceId,
            kind: i.kind,
            invoiceItemId: i.invoiceItemId,
            title: i.title,
            chargedAmount: i.chargedAmount,
            unusedDays: i.unusedDays,
            totalDays: i.totalDays,
            amount: i.amount,
            note: i.note,
          })),
        },
      },
      select: { id: true },
    });
    return r.id;
  }

  async markPaid(propertyId: string, refundId: string, method: PaymentMethod, paidOn: string | null) {
    const r = await this.db.refund.updateMany({
      where: { id: refundId, propertyId, status: "pending" },
      data: { status: "paid", method, paidAt: paidOn ? new Date(paidOn) : new Date() },
    });
    return r.count > 0;
  }
  async cancel(propertyId: string, refundId: string) {
    return (await this.db.refund.updateMany({ where: { id: refundId, propertyId, status: "pending" }, data: { status: "cancelled" } })).count > 0;
  }
}
