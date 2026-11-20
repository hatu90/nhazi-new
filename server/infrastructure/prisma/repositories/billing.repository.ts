import type { IPriceVersion } from "@/lib/billing/pricing";
import type { IBillingRepository, INewPeriod, IOpenContext } from "@/server/modules/billing/billing.repository";
import type { IBillingPeriodDetailRecord, IBillingPeriodListQuery, IBillingPeriodResponse, IReadingRef } from "@/server/modules/billing/billing.schema";
import type { IRentVersion } from "@/server/modules/lease/lease.schema";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import type { Prisma, PrismaClient } from "../client";
import { isoDate, isoDateOrNull, num, numOrNull, orConflict } from "../mappers";
import { createPeriodTx } from "../writers";

const d = (s: string) => new Date(s);
const include = { lease: { select: { unit: { select: { unitName: true } } } } } satisfies Prisma.BillingPeriodInclude;
const toPeriod = (r: Prisma.BillingPeriodGetPayload<{ include: typeof include }>): IBillingPeriodResponse => ({
  id: r.id,
  leaseId: r.leaseId,
  unitName: r.lease.unit.unitName,
  status: r.status,
  startDate: isoDate(r.startDate),
  endDate: isoDate(r.endDate),
  rentAmount: num(r.rentAmount),
});
const ref = (r: { id: string; readOn: Date; readingValue: { toNumber(): number } } | null): IReadingRef | null =>
  r ? { id: r.id, readOn: isoDate(r.readOn), value: num(r.readingValue) } : null;

export class PrismaBillingRepository implements IBillingRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(propertyId: string, q: IBillingPeriodListQuery) {
    const where: Prisma.BillingPeriodWhereInput = { propertyId, ...(q.leaseId && { leaseId: q.leaseId }), ...(q.status && { status: q.status }) };
    const [rows, total] = await Promise.all([
      this.db.billingPeriod.findMany({ where, include, orderBy: [{ startDate: "desc" }, { id: "asc" }], ...toSkipTake(q) }),
      this.db.billingPeriod.count({ where }),
    ]);
    return paginated(rows.map(toPeriod), total, q);
  }

  async findById(propertyId: string, periodId: string): Promise<IBillingPeriodDetailRecord | null> {
    const r = await this.db.billingPeriod.findFirst({
      where: { id: periodId, propertyId },
      include: {
        ...include,
        usages: {
          include: {
            serviceSubscription: { include: { service: { select: { serviceName: true, usageBase: true } } } },
            openingReading: true,
            closingReading: true,
            invoiceItems: { where: { voidedAt: null }, select: { id: true }, take: 1 },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!r) return null;
    return {
      ...toPeriod(r),
      usages: r.usages.map((u) => ({
        id: u.id,
        subscriptionId: u.subscriptionId,
        serviceName: u.serviceSubscription.service.serviceName,
        usageBase: u.serviceSubscription.service.usageBase,
        quantity: numOrNull(u.quantity),
        price: u.price as unknown as IPriceVersion,
        openingReading: ref(u.openingReading),
        closingReading: ref(u.closingReading),
        billed: u.invoiceItems.length > 0,
      })),
    };
  }

  async getOpenContext(propertyId: string, leaseId: string): Promise<IOpenContext | null> {
    const lease = await this.db.lease.findFirst({
      where: { id: leaseId, propertyId, deletedAt: null },
      include: {
        billingPeriods: { orderBy: { endDate: "desc" }, take: 1 },
        leaseMembers: true,
        serviceSubscriptions: { where: { deletedAt: null }, include: { service: true } },
      },
    });
    if (!lease) return null;
    const last = lease.billingPeriods[0];
    return {
      lease: {
        id: lease.id,
        unitId: lease.unitId,
        startDate: isoDate(lease.startDate),
        endDate: isoDateOrNull(lease.endDate),
        terminatedAt: isoDateOrNull(lease.terminatedAt),
        activatedAt: lease.activatedAt && lease.activatedAt.toISOString(),
        firstPeriodEnd: isoDateOrNull(lease.firstPeriodEnd),
        depositAmount: num(lease.depositAmount),
        rentVersions: lease.prices as unknown as IRentVersion[],
        lastMemberJoinedAt: lease.leaseMembers.reduce<string | null>((m, x) => (m === null || isoDate(x.joinedAt) > m ? isoDate(x.joinedAt) : m), null),
      },
      lastPeriod: last
        ? { id: last.id, startDate: isoDate(last.startDate), endDate: isoDate(last.endDate), status: last.status, rentAmount: num(last.rentAmount) }
        : null,
      subscriptions: lease.serviceSubscriptions.map((s) => ({
        id: s.id,
        quantity: s.quantity,
        startDate: isoDate(s.startDate),
        endDate: isoDateOrNull(s.endDate),
        meterId: s.meterId,
        service: { name: s.service.serviceName, usageBase: s.service.usageBase, prices: s.service.prices as unknown as IPriceVersion[] },
      })),
      members: lease.leaseMembers.map((m) => ({ joinedAt: isoDate(m.joinedAt), leftAt: isoDateOrNull(m.leftAt) })),
    };
  }

  async findReading(meterId: string, on: string) {
    const r = await this.db.reading.findFirst({ where: { meterId, readOn: d(on), deletedAt: null }, orderBy: { readAt: "desc" }, select: { id: true, readingValue: true } });
    return r && { id: r.id, value: num(r.readingValue) };
  }

  createPeriod(c: INewPeriod) {
    return orConflict(
      () => this.db.$transaction((tx) => createPeriodTx(tx, c)),
      "The lease already has an active or overlapping billing period",
      "PERIOD_ACTIVE",
    );
  }

  async findUsage(propertyId: string, periodId: string, usageId: string) {
    const u = await this.db.usage.findFirst({
      where: { id: usageId, billingPeriodId: periodId, propertyId },
      include: {
        billingPeriod: { select: { status: true } },
        serviceSubscription: { include: { service: { select: { usageBase: true } } } },
        invoiceItems: { where: { voidedAt: null }, select: { id: true }, take: 1 },
      },
    });
    return u && { usageBase: u.serviceSubscription.service.usageBase, billed: u.invoiceItems.length > 0, periodStatus: u.billingPeriod.status };
  }

  async setUsageQuantity(usageId: string, quantity: number) {
    await this.db.usage.update({ where: { id: usageId }, data: { quantity } });
  }
}
