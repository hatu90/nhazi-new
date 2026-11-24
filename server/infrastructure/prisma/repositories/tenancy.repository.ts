import type { ILeaseCore, ITenancyRepository } from "@/server/modules/tenancy/tenancy.repository";
import { randomUUID } from "node:crypto";
import { leaseAgreementsSchema, rentVersionsSchema } from "@/server/modules/lease/lease.schema";
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
  IUpdateLeaseMemberCommand,
  IUpdateSubscriptionCommand,
} from "@/server/modules/tenancy/tenancy.schema";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import type { IRentVersion } from "@/server/modules/lease/lease.schema";
import type { Prisma, PrismaClient } from "../client";
import { createInvoiceTx } from "../writers";
import { isoDate, isoDateOrNull, num, orConflict, toDocuments, toJson } from "../mappers";

type Tx = Prisma.TransactionClient;
const d = (v: string) => new Date(v);
const dn = (v: string | null | undefined) => (v == null ? v : new Date(v));

const summaryInclude = {
  unit: { select: { unitName: true } },
  accountLeases: { include: { account: { select: { id: true, displayName: true, phoneNumber: true } } } },
  leaseMembers: { where: { leftAt: null }, orderBy: { joinedAt: "asc" } },
  invitations: { where: { kind: "lease", status: "pending" }, select: { phoneNumber: true } },
} satisfies Prisma.LeaseInclude;
const detailInclude = {
  ...summaryInclude,
  leaseMembers: { orderBy: { joinedAt: "asc" } },
  handovers: { where: { deletedAt: null }, include: { inventoryItem: { select: { inventoryName: true } } }, orderBy: { createdAt: "asc" } },
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
  activatedAt: r.activatedAt && r.activatedAt.toISOString(),
  depositAmount: num(r.depositAmount),
  rentVersions: rentVersionsSchema.parse(r.prices),
  tenants: r.accountLeases.map(toTenant),
  members: r.leaseMembers.map((m) => ({ id: m.id, name: m.name, phoneNumber: m.phoneNumber })),
  pendingInvites: r.invitations.map((i) => i.phoneNumber),
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

const toDetail = (r: DetailRow, templateNames: Map<string, string>): ITenancyDetailRecord => {
  const { rentVersions, ...summary } = toSummary(r);
  return {
    ...summary,
    firstPeriodEnd: isoDateOrNull(r.firstPeriodEnd),
    billingCycleDay: r.billingCycleDay,
    terminationReason: r.terminationReason,
    rentVersions,
    agreements: leaseAgreementsSchema.parse(r.agreements).map((a) => ({ ...a, templateName: templateNames.get(a.templateId) ?? "" })),
    documents: toDocuments(r.documents),
    members: r.leaseMembers.map((m) => ({
      id: m.id,
      name: m.name,
      phoneNumber: m.phoneNumber,
      yearOfBirth: m.yearOfBirth,
      joinedAt: isoDate(m.joinedAt),
      leftAt: isoDateOrNull(m.leftAt),
    })),
    handovers: r.handovers.map((h) => ({ id: h.id, itemId: h.itemId, itemName: h.inventoryItem.inventoryName, quantity: h.quantity, condition: h.itemCondition, description: h.description, returnedQuantity: h.returnedQuantity, returnedCondition: h.returnedCondition, returnNote: h.returnNote })),
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
    const ended: Prisma.LeaseWhereInput = { OR: [{ terminatedAt: { not: null } }, { terminatedAt: null, endDate: { lt: t } }] };
    const started: Prisma.LeaseWhereInput = { activatedAt: { not: null } };
    const status: Prisma.LeaseWhereInput =
      q.status === "draft"
        ? { activatedAt: null }
        : q.status === "upcoming"
          ? { ...started, startDate: { gt: t }, terminatedAt: null }
          : q.status === "ended"
            ? { ...started, ...ended }
            : q.status === "active"
              ? { ...started, startDate: { lte: t }, NOT: ended }
              : {};
    const where: Prisma.LeaseWhereInput = { propertyId, deletedAt: null, ...(q.unitId && { unitId: q.unitId }), ...status };
    const [rows, total] = await Promise.all([
      this.db.lease.findMany({ where, include: summaryInclude, orderBy: [{ startDate: "desc" }, { id: "asc" }], ...toSkipTake(q) }),
      this.db.lease.count({ where }),
    ]);
    return paginated(rows.map(toSummary), total, q);
  }

  async findDetail(propertyId: string, leaseId: string) {
    const r = await this.db.lease.findFirst({ where: live(propertyId, leaseId), include: detailInclude });
    if (!r) return null;
    const ids = leaseAgreementsSchema.parse(r.agreements).map((a) => a.templateId);
    const templates = ids.length ? await this.db.agreementTemplate.findMany({ where: { id: { in: ids } }, select: { id: true, templateName: true } }) : [];
    return toDetail(r, new Map(templates.map((t) => [t.id, t.templateName])));
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
        activatedAt: r.activatedAt && r.activatedAt.toISOString(),
        agreementIds: leaseAgreementsSchema.parse(r.agreements).map((a) => a.id),
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

  async countItems(propertyId: string, itemIds: string[]) {
    return this.db.inventoryItem.count({ where: { propertyId, id: { in: itemIds }, deletedAt: null } });
  }

  async findTemplate(propertyId: string, templateId: string) {
    const t = await this.db.agreementTemplate.findFirst({ where: { id: templateId, propertyId, deletedAt: null }, select: { id: true, currentVersion: true } });
    return t;
  }

  create(c: ICreateLeaseCommand, templateVersion: number | null): Promise<string> {
    return orConflict(
      () =>
        this.db.$transaction(async (tx) => {
          const lease = await tx.lease.create({
            data: {
              propertyId: c.propertyId,
              unitId: c.unitId,
              startDate: d(c.startDate),
              endDate: dn(c.endDate),
              prices: toJson([{ effectiveDate: c.startDate, amount: c.rent }]),
              depositAmount: c.depositAmount,
              documents: toJson(c.documents),
              agreements: toJson(c.agreement && templateVersion !== null ? [{ id: randomUUID(), templateId: c.agreement.templateId, version: templateVersion, values: c.agreement.values }] : []),
              leaseMembers: {
                create: c.members.map((m) => ({ name: m.name, phoneNumber: m.phoneNumber, yearOfBirth: m.yearOfBirth, joinedAt: d(c.startDate) })),
              },
              handovers: {
                // propertyId comes from the parent lease (composite FK), so it must not be passed here
                create: c.handovers.map((h) => ({ itemId: h.itemId, quantity: h.quantity, itemCondition: h.condition, description: h.description })),
              },
            },
            select: { id: true },
          });
          // the deposit is invoiced up front, with the draft
          if (c.depositAmount > 0) {
            await createInvoiceTx(tx, {
              propertyId: c.propertyId,
              leaseId: lease.id,
              actor: c.actor,
              kind: "other",
              billingPeriodId: undefined,
              title: "Tiền cọc",
              dueDate: c.startDate,
              items: [{ kind: "deposit", title: "Tiền cọc", amount: c.depositAmount, usageId: undefined, detail: null }],
            });
          }
          return lease.id;
        }),
      "The unit already has a lease in this period",
      "LEASE_OVERLAP",
    );
  }

  async update(c: IUpdateLeaseCommand) {
    await this.db.$transaction(async (tx) => {
    let agreements: ReturnType<typeof leaseAgreementsSchema.parse> | undefined;
    if (c.newAgreement || c.removeAgreement || c.agreementValues) {
      const cur = leaseAgreementsSchema.parse((await tx.lease.findUniqueOrThrow({ where: { id: c.leaseId }, select: { agreements: true } })).agreements);
      agreements = cur;
      if (c.newAgreement) agreements = [...agreements, { ...c.newAgreement, values: {} }];
      if (c.removeAgreement) agreements = agreements.filter((a) => a.id !== c.removeAgreement);
      if (c.agreementValues) agreements = agreements.map((a) => (a.id === c.agreementValues!.agreementId ? { ...a, values: c.agreementValues!.values } : a));
    }
    await tx.lease.update({
      where: { id: c.leaseId },
      data: {
        endDate: dn(c.endDate),
        billingCycleDay: c.billingCycleDay,
        depositAmount: c.depositAmount,
        firstPeriodEnd: dn(c.firstPeriodEnd),
        ...(c.documents && { documents: toJson(c.documents) }),
        ...(agreements && { agreements: toJson(agreements) }),
      },
    });
    if (c.depositAmount !== undefined) {
      // keep the draft's unpaid deposit invoice in step with the deposit
      const items = await tx.invoiceItem.findMany({
        where: { kind: "deposit", voidedAt: null, invoice: { leaseId: c.leaseId, deletedAt: null, status: "pending", kind: "other" } },
        select: { id: true, invoiceId: true },
      });
      for (const it of items) {
        await tx.invoiceItem.update({ where: { id: it.id }, data: { amount: c.depositAmount } });
        await tx.invoice.update({ where: { id: it.invoiceId }, data: { amount: c.depositAmount } });
      }
    }
    });
  }

  async softDeleteDraft(propertyId: string, leaseId: string) {
    const r = await this.db.lease.updateMany({ where: { id: leaseId, propertyId, deletedAt: null, activatedAt: null }, data: { deletedAt: new Date() } });
    return r.count > 0;
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
}
