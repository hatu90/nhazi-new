import { z } from "zod";
import type { ILeaseDetailRecord, ILeaseRepository, ILeaseSummaryRecord } from "@/server/modules/lease/lease.repository";
import {
  rentVersionsSchema,
  type IInvoiceDetailResponse,
  type IInvoiceListQuery,
  type IInvoiceResponse,
  type ILeaseListQuery,
} from "@/server/modules/lease/lease.schema";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import { Prisma, type PrismaClient } from "../client";
import { isoDate, isoDateOrNull, isoDateTime, num } from "../mappers";

const templateVersionsSchema = z.array(z.object({ version: z.number().int(), data: z.unknown() }));

const summarySelect = {
  id: true,
  propertyId: true,
  unitId: true,
  startDate: true,
  endDate: true,
  terminatedAt: true,
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
  depositAmount: num(r.depositAmount),
  rentVersions: rentVersionsSchema.parse(r.prices),
});

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
        agreementTemplateId: true,
        agreementTemplateVersion: true,
        agreementData: true,
        documents: true,
        agreementTemplate: { select: { templateName: true, versions: true } },
        leaseMembers: { orderBy: { joinedAt: "asc" } },
      },
    });
    if (!row) return null;

    const { rentVersions, ...summary } = toSummary(row);
    let agreement: ILeaseDetailRecord["agreement"] = null;
    if (row.agreementTemplateId && row.agreementTemplate && row.agreementTemplateVersion !== null) {
      const versions = templateVersionsSchema.parse(row.agreementTemplate.versions);
      agreement = {
        templateId: row.agreementTemplateId,
        templateName: row.agreementTemplate.templateName,
        version: row.agreementTemplateVersion,
        content: versions.find((v) => v.version === row.agreementTemplateVersion)?.data ?? null,
        values: row.agreementData,
      };
    }
    return {
      ...summary,
      billingCycleDay: row.billingCycleDay,
      rentVersions,
      agreement,
      documents: row.documents,
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
      paidAmount: r.payments.reduce((sum, p) => sum + num(p.amount), 0),
      dueDate: isoDate(r.dueDate),
      status: r.status,
      createdAt: isoDateTime(r.createdAt),
      items: r.invoiceItems.map((i) => ({ id: i.id, kind: i.kind, title: i.title, amount: num(i.amount) })),
      payments: r.payments.map((x) => ({ id: x.id, amount: num(x.amount), method: x.method, paidOn: isoDate(x.paidOn) })),
    };
  }

  async listInvoices(leaseId: string, query: IInvoiceListQuery) {
    const where: Prisma.InvoiceWhereInput = { leaseId, deletedAt: null, ...(query.status && { status: query.status }) };
    const [rows, total] = await Promise.all([
      this.db.invoice.findMany({
        where,
        include: { payments: { where: { deletedAt: null }, select: { amount: true } } },
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
