import type { IDashboardRepository } from "@/server/modules/dashboard/dashboard.repository";
import type { IDashboardResponse, IDuePeriod, IOverdueInvoice, IPendingPayment } from "@/server/modules/dashboard/dashboard.schema";
import type { Prisma, PrismaClient } from "../client";
import { isoDate, isoDateTime, num } from "../mappers";

/** Rows shown per card; the totals count everything. */
const SHOWN = 5;

const sum = (xs: { amount: Prisma.Decimal }[]) => xs.reduce((s, x) => s + num(x.amount), 0);

const leaseLabel = { select: { unit: { select: { unitName: true } }, property: { select: { propertyName: true } } } } as const;

export class PrismaDashboardRepository implements IDashboardRepository {
  constructor(private readonly db: PrismaClient) {}

  async forAccount(accountId: string, on: Date): Promise<IDashboardResponse> {
    const today = new Date(Date.UTC(on.getUTCFullYear(), on.getUTCMonth(), on.getUTCDate()));
    const monthStart = new Date(Date.UTC(on.getUTCFullYear(), on.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(on.getUTCFullYear(), on.getUTCMonth() + 1, 1));
    const [management, tenant] = await Promise.all([this.management(accountId, today, monthStart, nextMonth), this.tenant(accountId, today, monthStart, nextMonth)]);
    return { management, tenant };
  }

  /** Every property the account is a member of (any role). */
  private async management(accountId: string, today: Date, monthStart: Date, nextMonth: Date): Promise<IDashboardResponse["management"]> {
    const members = await this.db.accountProperty.findMany({ where: { accountId, property: { deletedAt: null } }, select: { propertyId: true } });
    const propertyIds = members.map((m) => m.propertyId);
    const inScope = { propertyId: { in: propertyIds } };
    const running = { deletedAt: null, activatedAt: { not: null }, terminatedAt: null } satisfies Prisma.LeaseWhereInput;
    const live = { ...inScope, deletedAt: null, status: { in: ["pending", "partial"] as ("pending" | "partial")[] }, dueDate: { lt: today } };
    const payment = { deletedAt: null, invoice: { ...inScope, deletedAt: null } };
    const openRequest = { ...inScope, deletedAt: null, status: { in: ["open", "in_progress"] as ("open" | "in_progress")[] } };

    const [units, occupied, dueTotal, due, requestTotal, maintenance, closeLease, requests, overdue, pendingTotal, pending, collected] = await Promise.all([
      this.db.unit.count({ where: { ...inScope, deletedAt: null } }),
      this.db.lease.groupBy({ by: ["unitId"], where: { ...inScope, ...running } }),
      this.db.billingPeriod.count({ where: { ...inScope, status: "active", endDate: { lte: today }, lease: running } }),
      this.db.billingPeriod.findMany({
        where: { ...inScope, status: "active", endDate: { lte: today }, lease: running },
        orderBy: [{ endDate: "asc" }, { id: "asc" }],
        take: SHOWN,
        select: { id: true, propertyId: true, leaseId: true, startDate: true, endDate: true, lease: leaseLabel },
      }),
      this.db.request.count({ where: openRequest }),
      this.db.request.count({ where: { ...openRequest, type: "maintenance" } }),
      this.db.request.count({ where: { ...openRequest, type: "close_lease" } }),
      this.db.request.findMany({
        where: openRequest,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        take: SHOWN,
        select: { id: true, propertyId: true, type: true, title: true, priority: true, status: true, createdAt: true, property: { select: { propertyName: true } }, unit: { select: { unitName: true } } },
      }),
      this.overdue(live),
      this.db.payment.count({ where: { ...payment, status: "pending" } }),
      this.pendingPayments({ ...payment, status: "pending" }),
      this.db.payment.aggregate({ _sum: { amount: true }, where: { ...payment, status: "confirmed", paidOn: { gte: monthStart, lt: nextMonth } } }),
    ]);

    return {
      properties: { total: propertyIds.length, units, occupiedUnits: occupied.length },
      periodsToClose: { total: dueTotal, items: due.map(toDuePeriod) },
      requests: {
        total: requestTotal,
        maintenance,
        closeLease,
        items: requests.map((r) => ({ id: r.id, propertyId: r.propertyId, propertyName: r.property.propertyName, unitName: r.unit?.unitName ?? null, type: r.type, title: r.title, priority: r.priority, status: r.status, createdAt: isoDateTime(r.createdAt) })),
      },
      overdueInvoices: overdue,
      payments: { total: pendingTotal, items: pending, collectedThisMonth: collected._sum.amount ? num(collected._sum.amount) : 0 },
    };
  }

  /** Every lease the account is a tenant of. */
  private async tenant(accountId: string, today: Date, monthStart: Date, nextMonth: Date): Promise<IDashboardResponse["tenant"]> {
    const mine = { deletedAt: null, accountLeases: { some: { accountId } } } satisfies Prisma.LeaseWhereInput;
    const running = { ...mine, activatedAt: { not: null }, terminatedAt: null } satisfies Prisma.LeaseWhereInput;
    const invoiceOf = { lease: mine, deletedAt: null } satisfies Prisma.InvoiceWhereInput;
    const live = { ...invoiceOf, status: { in: ["pending", "partial"] as ("pending" | "partial")[] }, dueDate: { lt: today } };
    const reported = { deletedAt: null, createdBy: accountId, invoice: invoiceOf };

    const [leases, active, dueTotal, due, overdue, pendingTotal, pending, paid] = await Promise.all([
      this.db.lease.count({ where: mine }),
      this.db.lease.count({ where: running }),
      this.db.billingPeriod.count({ where: { status: "active", endDate: { lte: today }, lease: running } }),
      this.db.billingPeriod.findMany({
        where: { status: "active", endDate: { lte: today }, lease: running },
        orderBy: [{ endDate: "asc" }, { id: "asc" }],
        take: SHOWN,
        select: { id: true, propertyId: true, leaseId: true, startDate: true, endDate: true, lease: leaseLabel },
      }),
      this.overdue(live),
      this.db.payment.count({ where: { ...reported, status: "pending" } }),
      this.pendingPayments({ ...reported, status: "pending" }),
      this.db.payment.aggregate({ _sum: { amount: true }, where: { ...reported, status: "confirmed", paidOn: { gte: monthStart, lt: nextMonth } } }),
    ]);

    return {
      leases: { total: leases, active },
      periodsToClose: { total: dueTotal, items: due.map(toDuePeriod) },
      overdueInvoices: overdue,
      payments: { total: pendingTotal, items: pending, paidThisMonth: paid._sum.amount ? num(paid._sum.amount) : 0 },
    };
  }

  /** Overdue invoices, oldest due date first, each with what is still owed (confirmed payments only count). */
  private async overdue(where: Prisma.InvoiceWhereInput): Promise<IDashboardResponse["tenant"]["overdueInvoices"]> {
    const rows = await this.db.invoice.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      select: {
        id: true, propertyId: true, leaseId: true, title: true, amount: true, dueDate: true,
        lease: leaseLabel,
        payments: { where: { deletedAt: null, status: "confirmed" }, select: { amount: true } },
      },
    });
    const all: IOverdueInvoice[] = rows.map((r) => ({
      id: r.id, propertyId: r.propertyId, propertyName: r.lease.property.propertyName, leaseId: r.leaseId, unitName: r.lease.unit.unitName,
      title: r.title, dueDate: isoDate(r.dueDate), outstanding: num(r.amount) - sum(r.payments),
    }));
    return { total: all.length, outstanding: all.reduce((s, i) => s + i.outstanding, 0), items: all.slice(0, SHOWN) };
  }

  private async pendingPayments(where: Prisma.PaymentWhereInput): Promise<IPendingPayment[]> {
    const rows = await this.db.payment.findMany({
      where,
      orderBy: [{ paidOn: "asc" }, { id: "asc" }],
      take: SHOWN,
      select: { id: true, invoiceId: true, amount: true, paidOn: true, invoice: { select: { propertyId: true, leaseId: true, lease: leaseLabel } } },
    });
    return rows.map((r) => ({
      id: r.id, invoiceId: r.invoiceId, propertyId: r.invoice.propertyId, propertyName: r.invoice.lease.property.propertyName,
      leaseId: r.invoice.leaseId, unitName: r.invoice.lease.unit.unitName, amount: num(r.amount), paidOn: isoDate(r.paidOn),
    }));
  }
}

const toDuePeriod = (r: { id: string; propertyId: string; leaseId: string; startDate: Date; endDate: Date; lease: { unit: { unitName: string }; property: { propertyName: string } } }): IDuePeriod => ({
  id: r.id, propertyId: r.propertyId, propertyName: r.lease.property.propertyName, leaseId: r.leaseId, unitName: r.lease.unit.unitName,
  startDate: isoDate(r.startDate), endDate: isoDate(r.endDate),
});
