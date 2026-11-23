import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ILeaseDetailRecord, ILeaseRepository, ILeaseSummaryRecord } from "@/server/modules/lease/lease.repository";
import {
  rentVersionsSchema,
  leaseAgreementsSchema,
  type IInvoiceDetailResponse,
  type IInvoiceListQuery,
  type IInvoiceResponse,
  type ILeaseListQuery,
  type IMonthBreakdown,
  type ILeaseDocument,
  type ILeaseAgreementEntry,
} from "@/server/modules/lease/lease.schema";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import { Prisma, type PrismaClient } from "../client";
import { isoDate, isoDateOrNull, isoDateTime, num, toDocuments, toJson } from "../mappers";

const templateVersionsSchema = z.array(z.object({ version: z.number().int(), data: z.unknown() }));

const summarySelect = {
  id: true,
  propertyId: true,
  unitId: true,
  startDate: true,
  endDate: true,
  terminatedAt: true,
  activatedAt: true,
  depositAmount: true,
  prices: true,
  property: { select: { propertyName: true } },
  unit: { select: { unitName: true } },
} satisfies Prisma.LeaseSelect;

type SummaryRow = Prisma.LeaseGetPayload<{ select: typeof summarySelect }>;

const toSummary = (r: SummaryRow): ILeaseSummaryRecord => ({
  id: r.id,
  propertyId: r.propertyId,
  propertyName: r.property.propertyName,
  unitId: r.unitId,
  unitName: r.unit.unitName,
  startDate: isoDate(r.startDate),
  endDate: isoDateOrNull(r.endDate),
  terminatedAt: isoDateOrNull(r.terminatedAt),
  activatedAt: r.activatedAt && isoDateTime(r.activatedAt),
  depositAmount: num(r.depositAmount),
  rentVersions: rentVersionsSchema.parse(r.prices),
});

const itemSelect = {
  kind: true,
  amount: true,
  usage: { select: { serviceSubscription: { select: { service: { select: { serviceName: true } } } } } },
} satisfies Prisma.InvoiceItemSelect;
type ItemRow = Prisma.InvoiceItemGetPayload<{ select: typeof itemSelect }>;
const liveInvoice = { deletedAt: null, status: { not: "cancelled" } } satisfies Prisma.InvoiceWhereInput;

/** Chart segment of an invoice line: rent, deposit, one per service (electric, water ...), the rest is "Other". Credits are not drawn. */
const segmentOf = (i: ItemRow): { key: string; label: string; order: number } | null => {
  if (num(i.amount) <= 0 || i.kind === "credit") return null;
  if (i.kind === "deposit") return { key: "deposit", label: "Deposit", order: 0 };
  if (i.kind === "rent") return { key: "rent", label: "Rent", order: 1 };
  const name = i.usage?.serviceSubscription.service.serviceName;
  if ((i.kind === "service" || i.kind === "meter") && name) return { key: `service:${name}`, label: name, order: 2 };
  return { key: "other", label: "Other", order: 3 };
};

export class PrismaLeaseRepository implements ILeaseRepository {
  constructor(private readonly db: PrismaClient) {}

  async listByTenant(accountId: string, query: ILeaseListQuery) {
    const where: Prisma.LeaseWhereInput = { deletedAt: null, accountLeases: { some: { accountId } } };
    const [rows, total] = await Promise.all([
      this.db.lease.findMany({
        where,
        select: summarySelect,
        orderBy: [{ startDate: "desc" }, { id: "asc" }],
        ...toSkipTake(query),
      }),
      this.db.lease.count({ where }),
    ]);
    return paginated(rows.map(toSummary), total, query);
  }

  async findByTenant(accountId: string, leaseId: string): Promise<ILeaseDetailRecord | null> {
    const row = await this.db.lease.findFirst({
      where: { id: leaseId, deletedAt: null, accountLeases: { some: { accountId } } },
      select: {
        ...summarySelect,
        billingCycleDay: true,
        agreements: true,
        documents: true,
        leaseMembers: { orderBy: { joinedAt: "asc" } },
      },
    });
    if (!row) return null;

    const { rentVersions, ...summary } = toSummary(row);
    // `summary.activatedAt` rides along so the usecase can tell a draft apart
    const entries = leaseAgreementsSchema.parse(row.agreements);
    const templates = entries.length ? await this.db.agreementTemplate.findMany({ where: { id: { in: entries.map((e) => e.templateId) } }, select: { id: true, templateName: true, versions: true } }) : [];
    const agreements: ILeaseDetailRecord["agreements"] = entries.flatMap((e) => {
      const t = templates.find((x) => x.id === e.templateId);
      if (!t) return [];
      const versions = templateVersionsSchema.parse(t.versions);
      return [{ id: e.id, templateId: e.templateId, templateName: t.templateName, version: e.version, content: versions.find((v) => v.version === e.version)?.data ?? null, values: e.values }];
    });
    return {
      ...summary,
      billingCycleDay: row.billingCycleDay,
      rentVersions,
      agreements,
      documents: toDocuments(row.documents),
      members: row.leaseMembers.map((m) => ({
        id: m.id,
        name: m.name,
        phoneNumber: m.phoneNumber,
        yearOfBirth: m.yearOfBirth,
        joinedAt: isoDate(m.joinedAt),
        leftAt: isoDateOrNull(m.leftAt),
      })),
    };
  }

  async monthBreakdown(leaseId: string, months: number, now: string): Promise<IMonthBreakdown[]> {
    const [y, m] = now.split("-").map(Number);
    const keys = Array.from({ length: months }, (_, i) => {
      const d = new Date(Date.UTC(y, m - 1 - (months - 1 - i), 1));
      return d.toISOString().slice(0, 7);
    });
    const invoices = await this.db.invoice.findMany({
      where: { leaseId, ...liveInvoice, dueDate: { gte: new Date(`${keys[0]}-01T00:00:00Z`) } },
      select: { dueDate: true, invoiceItems: { where: { voidedAt: null }, select: itemSelect } },
    });
    const result = keys.map((month) => {
      const byKey = new Map<string, { key: string; label: string; amount: number; order: number }>();
      for (const inv of invoices) {
        if (isoDate(inv.dueDate).slice(0, 7) !== month) continue;
        for (const it of inv.invoiceItems) {
          const seg = segmentOf(it);
          if (!seg) continue;
          const cur = byKey.get(seg.key) ?? { ...seg, amount: 0 };
          cur.amount += num(it.amount);
          byKey.set(seg.key, cur);
        }
      }
      const segments = [...byKey.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)).map(({ key, label, amount }) => ({ key, label, amount }));
      return { month, total: segments.reduce((t, x) => t + x.amount, 0), segments };
    });
    let first = 0;
    while (first < result.length - 3 && result[first].total === 0) first++;
    return result.slice(first);
  }

  async addDocuments(leaseId: string, documents: ILeaseDocument[]) {
    return this.db.$transaction(async (tx) => {
      const row = await tx.lease.findUniqueOrThrow({ where: { id: leaseId }, select: { documents: true } });
      const current = toDocuments(row.documents);
      const next = [...current, ...documents.filter((d) => !current.some((c) => c.path === d.path))];
      await tx.lease.update({ where: { id: leaseId }, data: { documents: toJson(next) } });
      return next;
    });
  }

  async listTemplates(leaseId: string) {
    const rows = await this.db.agreementTemplate.findMany({
      where: { deletedAt: null, property: { leases: { some: { id: leaseId } } } },
      select: { id: true, templateName: true },
      orderBy: [{ isDefault: "desc" }, { templateName: "asc" }],
    });
    return rows.map((r) => ({ id: r.id, name: r.templateName }));
  }

  async addAgreement(leaseId: string, templateId: string) {
    return this.db.$transaction(async (tx) => {
      const lease = await tx.lease.findUniqueOrThrow({ where: { id: leaseId }, select: { propertyId: true, agreements: true } });
      const t = await tx.agreementTemplate.findFirst({ where: { id: templateId, propertyId: lease.propertyId, deletedAt: null }, select: { currentVersion: true } });
      if (!t) return false;
      const next = [...leaseAgreementsSchema.parse(lease.agreements), { id: randomUUID(), templateId, version: t.currentVersion, values: {} }];
      await tx.lease.update({ where: { id: leaseId }, data: { agreements: toJson(next) } });
      return true;
    });
  }

  async removeAgreement(leaseId: string, agreementId: string) {
    return this.mutateAgreements(leaseId, (list) => (list.some((a) => a.id === agreementId) ? list.filter((a) => a.id !== agreementId) : null));
  }

  async setAgreementValues(leaseId: string, agreementId: string, values: Record<string, unknown>) {
    return this.mutateAgreements(leaseId, (list) => (list.some((a) => a.id === agreementId) ? list.map((a) => (a.id === agreementId ? { ...a, values } : a)) : null));
  }

  /** Read-modify-write of the lease's agreements; `fn` returns null to abort (false is returned). */
  private mutateAgreements(leaseId: string, fn: (list: ILeaseAgreementEntry[]) => ILeaseAgreementEntry[] | null) {
    return this.db.$transaction(async (tx) => {
      const row = await tx.lease.findUniqueOrThrow({ where: { id: leaseId }, select: { agreements: true } });
      const next = fn(leaseAgreementsSchema.parse(row.agreements));
      if (!next) return false;
      await tx.lease.update({ where: { id: leaseId }, data: { agreements: toJson(next) } });
      return true;
    });
  }

  async isTenant(accountId: string, leaseId: string) {
    const n = await this.db.accountLease.count({ where: { accountId, leaseId, lease: { deletedAt: null } } });
    return n > 0;
  }

  async findInvoice(leaseId: string, invoiceId: string): Promise<IInvoiceDetailResponse | null> {
    const r = await this.db.invoice.findFirst({
      where: { id: invoiceId, leaseId, deletedAt: null },
      include: {
        payments: { where: { deletedAt: null }, orderBy: { paidOn: "asc" } },
        invoiceItems: { where: { voidedAt: null }, orderBy: [{ seq: "asc" }, { id: "asc" }] },
      },
    });
    if (!r) return null;
    return {
      id: r.id,
      leaseId: r.leaseId,
      kind: r.kind,
      title: r.title,
      amount: num(r.amount),
      paidAmount: r.payments.filter((p) => p.status === "confirmed").reduce((sum, p) => sum + num(p.amount), 0),
      dueDate: isoDate(r.dueDate),
      status: r.status,
      createdAt: isoDateTime(r.createdAt),
      items: r.invoiceItems.map((i) => ({ id: i.id, kind: i.kind, title: i.title, amount: num(i.amount) })),
      payments: r.payments.map((x) => ({ id: x.id, amount: num(x.amount), method: x.method, status: x.status, paidOn: isoDate(x.paidOn), evidence: x.evidence })),
    };
  }

  async listInvoices(leaseId: string, query: IInvoiceListQuery) {
    const where: Prisma.InvoiceWhereInput = { leaseId, deletedAt: null, ...(query.status && { status: query.status }) };
    const [rows, total] = await Promise.all([
      this.db.invoice.findMany({
        where,
        include: { payments: { where: { deletedAt: null, status: "confirmed" }, select: { amount: true } } },
        orderBy: [{ dueDate: "desc" }, { id: "asc" }],
        ...toSkipTake(query),
      }),
      this.db.invoice.count({ where }),
    ]);
    const items: IInvoiceResponse[] = rows.map((r) => ({
      id: r.id,
      leaseId: r.leaseId,
      kind: r.kind,
      title: r.title,
      amount: num(r.amount),
      paidAmount: r.payments.reduce((sum, p) => sum + num(p.amount), 0),
      dueDate: isoDate(r.dueDate),
      status: r.status,
      createdAt: isoDateTime(r.createdAt),
    }));
    return paginated(items, total, query);
  }
}
