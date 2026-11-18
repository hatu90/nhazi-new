import type { ILeaseCore, ITenancyRepository } from "@/server/modules/tenancy/tenancy.repository";
import { rentVersionsSchema } from "@/server/modules/lease/lease.schema";
import type {
  IAddLeaseMemberCommand,
  IAddRentCommand,
  IAddTenantCommand,
  ICreateLeaseCommand,
  ICreateSubscriptionCommand,
  ISubscriptionResponse,
  ITenancyDetailRecord,
  ITenancyListQuery,
  ITenancySummaryRecord,
  ITenantResponse,
  ITerminateLeaseCommand,
  IUpdateLeaseCommand,
  IUpdateLeaseHandoverCommand,
  IUpdateLeaseMemberCommand,
  IUpdateSubscriptionCommand,
} from "@/server/modules/tenancy/tenancy.schema";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import type { IRentVersion } from "@/server/modules/lease/lease.schema";
import type { Prisma, PrismaClient } from "../client";
import { isoDate, isoDateOrNull, num, orConflict, toJson } from "../mappers";

type Tx = Prisma.TransactionClient;
const d = (v: string) => new Date(v);
const dn = (v: string | null | undefined) => (v == null ? v : new Date(v));

const summaryInclude = {
  unit: { select: { unitName: true } },
  accountLeases: { include: { account: { select: { id: true, displayName: true, phoneNumber: true } } } },
} satisfies Prisma.LeaseInclude;
const detailInclude = {
  ...summaryInclude,
  agreementTemplate: { select: { templateName: true } },
  leaseMembers: { orderBy: { joinedAt: "asc" } },
  leaseHandovers: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
  serviceSubscriptions: { where: { deletedAt: null }, include: { service: { select: { serviceName: true, usageBase: true } }, meter: { select: { meterName: true } } }, orderBy: { startDate: "asc" } },
} satisfies Prisma.LeaseInclude;

type SummaryRow = Prisma.LeaseGetPayload<{ include: typeof summaryInclude }>;
type DetailRow = Prisma.LeaseGetPayload<{ include: typeof detailInclude }>;
type SubRow = DetailRow["serviceSubscriptions"][number];

const toTenant = (a: SummaryRow["accountLeases"][number]): ITenantResponse => ({
  accountId: a.account.id,
  displayName: a.account.displayName,
  phoneNumber: a.account.phoneNumber,
});

const toSummary = (r: SummaryRow): ITenancySummaryRecord => ({
  id: r.id,
  unitId: r.unitId,
  unitName: r.unit.unitName,
  startDate: isoDate(r.startDate),
  endDate: isoDateOrNull(r.endDate),
  terminatedAt: isoDateOrNull(r.terminatedAt),
  depositAmount: num(r.depositAmount),
  rentVersions: rentVersionsSchema.parse(r.prices),
  tenants: r.accountLeases.map(toTenant),
});

const toSubscription = (s: SubRow): ISubscriptionResponse => ({
  id: s.id,
  serviceId: s.serviceId,
  serviceName: s.service.serviceName,
  usageBase: s.service.usageBase,
  meterId: s.meterId,
  meterName: s.meter?.meterName ?? null,
  quantity: s.quantity,
  details: s.details,
  startDate: isoDate(s.startDate),
  endDate: isoDateOrNull(s.endDate),
});
const subInclude = { service: { select: { serviceName: true, usageBase: true } }, meter: { select: { meterName: true } } } satisfies Prisma.ServiceSubscriptionInclude;

const toDetail = (r: DetailRow): ITenancyDetailRecord => {
  const { rentVersions, ...summary } = toSummary(r);
  return {
    ...summary,
    billingCycleDay: r.billingCycleDay,
    terminationReason: r.terminationReason,
    rentVersions,
    agreement:
      r.agreementTemplateId && r.agreementTemplateVersion !== null && r.agreementTemplate
        ? { templateId: r.agreementTemplateId, templateName: r.agreementTemplate.templateName, version: r.agreementTemplateVersion, values: r.agreementData }
        : null,
    documents: r.documents,
    members: r.leaseMembers.map((m) => ({
      id: m.id,
      name: m.name,
      phoneNumber: m.phoneNumber,
      yearOfBirth: m.yearOfBirth,
      joinedAt: isoDate(m.joinedAt),
      leftAt: isoDateOrNull(m.leftAt),
    })),
    handovers: r.leaseHandovers.map((h) => ({ id: h.id, itemName: h.itemName, quantity: h.quantity, condition: h.itemCondition, description: h.description })),
    subscriptions: r.serviceSubscriptions.map(toSubscription),
  };
};

/** Find the live account of a phone number or create a placeholder the person claims when they sign up. */
const ensureAccount = async (tx: Tx, phoneNumber: string, displayName: string) => {
  const existing = await tx.account.findFirst({ where: { phoneNumber, deletedAt: null }, select: { id: true } });
  if (existing) return existing.id;
  return (await tx.account.create({ data: { phoneNumber, displayName }, select: { id: true } })).id;
};

const live = (propertyId: string, id: string): Prisma.LeaseWhereInput => ({ id, propertyId, deletedAt: null });

export class PrismaTenancyRepository implements ITenancyRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(propertyId: string, q: ITenancyListQuery, today: string) {
    const t = d(today);
    const ended: Prisma.LeaseWhereInput = { OR: [{ terminatedAt: { lt: t } }, { terminatedAt: null, endDate: { lt: t } }] };
    const status: Prisma.LeaseWhereInput =
      q.status === "upcoming" ? { startDate: { gt: t } } : q.status === "ended" ? ended : q.status === "active" ? { startDate: { lte: t }, NOT: ended } : {};
    const where: Prisma.LeaseWhereInput = { propertyId, deletedAt: null, ...(q.unitId && { unitId: q.unitId }), ...status };
    const [rows, total] = await Promise.all([
      this.db.lease.findMany({ where, include: summaryInclude, orderBy: [{ startDate: "desc" }, { id: "asc" }], ...toSkipTake(q) }),
      this.db.lease.count({ where }),
    ]);
    return paginated(rows.map(toSummary), total, q);
  }

  async findDetail(propertyId: string, leaseId: string) {
    const r = await this.db.lease.findFirst({ where: live(propertyId, leaseId), include: detailInclude });
    return r ? toDetail(r) : null;
  }

  async findCore(propertyId: string, leaseId: string): Promise<ILeaseCore | null> {
    const r = await this.db.lease.findFirst({ where: live(propertyId, leaseId) });
    const last = r && (await this.db.leaseMember.aggregate({ where: { leaseId: r.id }, _max: { joinedAt: true } }));
    return (
      r && {
        lastMemberJoinedAt: isoDateOrNull(last?._max.joinedAt ?? null),
        id: r.id,
        unitId: r.unitId,
        startDate: isoDate(r.startDate),
        endDate: isoDateOrNull(r.endDate),
        terminatedAt: isoDateOrNull(r.terminatedAt),
        hasAgreement: r.agreementTemplateId !== null,
        rentVersions: rentVersionsSchema.parse(r.prices),
      }
    );
  }

  async unitExists(propertyId: string, unitId: string) {
    return (await this.db.unit.count({ where: { id: unitId, propertyId, deletedAt: null } })) > 0;
  }

  async hasOverlap(unitId: string, start: string, end: string | null, excludeLeaseId?: string) {
    const s = d(start);
    const n = await this.db.lease.count({
      where: {
        unitId,
        deletedAt: null,
        ...(excludeLeaseId && { id: { not: excludeLeaseId } }),
        ...(end && { startDate: { lte: d(end) } }),
        OR: [{ terminatedAt: { gte: s } }, { terminatedAt: null, endDate: null }, { terminatedAt: null, endDate: { gte: s } }],
      },
    });
    return n > 0;
  }

  async findTemplate(propertyId: string, templateId: string) {
    const t = await this.db.agreementTemplate.findFirst({ where: { id: templateId, propertyId, deletedAt: null }, select: { id: true, currentVersion: true } });
    return t;
  }

  create(c: ICreateLeaseCommand, templateVersion: number | null): Promise<string> {
    return orConflict(
      () =>
        this.db.$transaction(async (tx) => {
          const accountIds = new Set<string>();
          for (const t of c.tenants) accountIds.add(await ensureAccount(tx, t.phoneNumber, t.displayName));
          const handovers = await tx.handover.findMany({
            where: { propertyId: c.propertyId, unitId: c.unitId, deletedAt: null },
            include: { inventoryItem: { select: { inventoryName: true } } },
          });
          const lease = await tx.lease.create({
            data: {
              propertyId: c.propertyId,
              unitId: c.unitId,
              startDate: d(c.startDate),
              endDate: dn(c.endDate),
              prices: toJson([{ effectiveDate: c.startDate, amount: c.rent }]),
              billingCycleDay: c.billingCycleDay,
              depositAmount: c.depositAmount,
              documents: c.documents,
              ...(c.agreement && templateVersion !== null && {
                agreementTemplateId: c.agreement.templateId,
                agreementTemplateVersion: templateVersion,
                agreementData: toJson(c.agreement.values),
              }),
              accountLeases: { create: [...accountIds].map((accountId) => ({ accountId })) },
              leaseMembers: {
                create: c.members.map((m) => ({ name: m.name, phoneNumber: m.phoneNumber, yearOfBirth: m.yearOfBirth, joinedAt: d(c.startDate) })),
              },
              leaseHandovers: {
                // propertyId comes from the parent lease (composite FK), so it must not be passed here
                create: handovers.map((h) => ({
                  sourceItemId: h.itemId,
                  itemName: h.inventoryItem.inventoryName,
                  quantity: h.quantity,
                  itemCondition: h.itemCondition,
                  description: h.description,
                })),
              },
            },
            select: { id: true },
          });
          return lease.id;
        }),
      "The unit already has a lease in this period",
      "LEASE_OVERLAP",
    );
  }

  async update(c: IUpdateLeaseCommand) {
    await this.db.lease.update({
      where: { id: c.leaseId },
      data: {
        endDate: dn(c.endDate),
        billingCycleDay: c.billingCycleDay,
        documents: c.documents,
        ...(c.agreementValues && { agreementData: toJson(c.agreementValues) }),
      },
    });
  }

  async terminate(c: ITerminateLeaseCommand) {
    const t = d(c.terminatedAt);
    await this.db.$transaction(async (tx) => {
      await tx.lease.update({ where: { id: c.leaseId }, data: { terminatedAt: t, terminationReason: c.reason } });
      // subscriptions that never started are dropped, running ones end on the termination date
      await tx.serviceSubscription.updateMany({ where: { leaseId: c.leaseId, deletedAt: null, startDate: { gt: t } }, data: { deletedAt: new Date() } });
      await tx.serviceSubscription.updateMany({
        where: { leaseId: c.leaseId, deletedAt: null, OR: [{ endDate: null }, { endDate: { gt: t } }] },
        data: { endDate: t },
      });
      await tx.leaseMember.updateMany({ where: { leaseId: c.leaseId, leftAt: null, joinedAt: { lte: t } }, data: { leftAt: t } });
    });
  }

  async addRent(c: IAddRentCommand, versions: IRentVersion[]) {
    await this.db.lease.update({ where: { id: c.leaseId }, data: { prices: toJson(versions) } });
  }

  async addTenant(c: IAddTenantCommand) {
    await orConflict(
      () =>
        this.db.$transaction(async (tx) => {
          const accountId = await ensureAccount(tx, c.phoneNumber, c.displayName);
          await tx.accountLease.create({ data: { leaseId: c.leaseId, accountId } });
        }),
      "This person is already a tenant of the lease",
      "ALREADY_TENANT",
    );
  }
  countTenants(leaseId: string) {
    return this.db.accountLease.count({ where: { leaseId } });
  }
  async removeTenant(leaseId: string, accountId: string) {
    return (await this.db.accountLease.deleteMany({ where: { leaseId, accountId } })).count > 0;
  }

  async addMember(c: IAddLeaseMemberCommand, joinedAt: string) {
    await this.db.leaseMember.create({
      data: { leaseId: c.leaseId, name: c.name, phoneNumber: c.phoneNumber, yearOfBirth: c.yearOfBirth, joinedAt: d(joinedAt) },
    });
  }
  async findMember(leaseId: string, memberId: string) {
    const m = await this.db.leaseMember.findFirst({ where: { id: memberId, leaseId } });
    return m && { joinedAt: isoDate(m.joinedAt) };
  }
  async updateMember(c: IUpdateLeaseMemberCommand) {
    await this.db.leaseMember.update({ where: { id: c.memberId }, data: { name: c.name, phoneNumber: c.phoneNumber, leftAt: dn(c.leftAt) } });
  }

  async findService(propertyId: string, serviceId: string) {
    return this.db.service.findFirst({ where: { id: serviceId, propertyId, deletedAt: null }, select: { usageBase: true } });
  }
  async findMeter(propertyId: string, meterId: string) {
    const m = await this.db.meter.findFirst({ where: { id: meterId, propertyId, deletedAt: null }, select: { unitId: true, serviceId: true, removedAt: true } });
    return m && { unitId: m.unitId, serviceId: m.serviceId, removedAt: isoDateOrNull(m.removedAt) };
  }
  async hasSubscriptionOverlap(leaseId: string, serviceId: string, start: string, end: string | null, excludeId?: string) {
    const n = await this.db.serviceSubscription.count({
      where: {
        leaseId,
        serviceId,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
        ...(end && { startDate: { lte: d(end) } }),
        OR: [{ endDate: null }, { endDate: { gte: d(start) } }],
      },
    });
    return n > 0;
  }
  async createSubscription(c: ICreateSubscriptionCommand, startDate: string) {
    const r = await this.db.serviceSubscription.create({
      data: {
        propertyId: c.propertyId,
        leaseId: c.leaseId,
        serviceId: c.serviceId,
        meterId: c.meterId,
        quantity: c.quantity,
        details: c.details,
        startDate: d(startDate),
        endDate: dn(c.endDate),
      },
      include: subInclude,
    });
    return toSubscription(r);
  }
  async findSubscription(leaseId: string, subscriptionId: string) {
    const r = await this.db.serviceSubscription.findFirst({ where: { id: subscriptionId, leaseId, deletedAt: null }, include: subInclude });
    return r ? toSubscription(r) : null;
  }
  async updateSubscription(c: IUpdateSubscriptionCommand) {
    const r = await this.db.serviceSubscription.update({
      where: { id: c.subscriptionId },
      data: { endDate: dn(c.endDate), quantity: c.quantity, details: c.details },
      include: subInclude,
    });
    return toSubscription(r);
  }
  async softDeleteSubscription(leaseId: string, subscriptionId: string) {
    return (await this.db.serviceSubscription.updateMany({ where: { id: subscriptionId, leaseId, deletedAt: null }, data: { deletedAt: new Date() } })).count > 0;
  }

  async updateHandover(c: IUpdateLeaseHandoverCommand) {
    const r = await this.db.leaseHandover.updateMany({
      where: { id: c.handoverId, leaseId: c.leaseId, deletedAt: null },
      data: { itemCondition: c.condition, quantity: c.quantity, description: c.description },
    });
    return r.count > 0;
  }
}
