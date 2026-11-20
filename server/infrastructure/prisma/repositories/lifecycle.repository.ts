import type { IPriceVersion } from "@/lib/billing/pricing";
import type { IBillingRepository } from "@/server/modules/billing/billing.repository";
import type { INewInvoice } from "@/server/modules/invoice/invoice.schema";
import type {
  IBilledLine,
  ICloseLeasePlan,
  ILifecycleContext,
  ILifecycleRepository,
  IRolloverPlan,
  IStartPlan,
  ISubscriptionPlan,
} from "@/server/modules/lifecycle/lifecycle.repository";
import type { IInvoicePlan } from "@/server/modules/lifecycle/lifecycle.schema";
import { ConflictError } from "@/server/shared/errors";
import type { PrismaClient } from "../client";
import { isoDate, isoDateOrNull, num, numOrNull, orConflict } from "../mappers";
import { closePeriodTx, createInvoiceTx, createPeriodTx, createRefundTx, insertReadings, readingIdAt, usageIdOf, type Tx } from "../writers";

const d = (v: string) => new Date(v);
const CONFLICT = ["The lease changed while the step was running: reload and try again", "CONFLICT"] as const;

interface IScope {
  propertyId: string;
  leaseId: string;
  actor: { accountId: string };
}

/** Turn a plan's usage references into ids once the periods / usages exist. */
async function toInvoice(tx: Tx, scope: IScope, plan: IInvoicePlan, periods: { new?: string; closed?: string }): Promise<INewInvoice> {
  const items = [];
  for (const it of plan.items) {
    let usageId: string | undefined;
    if (it.usage) {
      const periodId = periods[it.usage.period];
      if (!periodId) throw new ConflictError("Usage period missing", "USAGE_MISSING");
      usageId = await usageIdOf(tx, periodId, it.usage.subscriptionId);
    }
    items.push({ title: it.title, kind: it.kind, amount: it.amount, usageId, detail: it.detail });
  }
  return {
    propertyId: scope.propertyId,
    leaseId: scope.leaseId,
    actor: scope.actor,
    kind: plan.kind,
    billingPeriodId: plan.period ? periods[plan.period] : undefined,
    title: plan.title,
    dueDate: plan.dueDate,
    items,
  };
}

export class PrismaLifecycleRepository implements ILifecycleRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly billing: IBillingRepository,
  ) {}

  async leaseOfPeriod(propertyId: string, periodId: string) {
    const p = await this.db.billingPeriod.findFirst({ where: { id: periodId, propertyId }, select: { leaseId: true } });
    return p?.leaseId ?? null;
  }

  async load(propertyId: string, leaseId: string): Promise<ILifecycleContext | null> {
    const open = await this.billing.getOpenContext(propertyId, leaseId);
    if (!open) return null;
    const p = await this.db.billingPeriod.findFirst({
      where: { leaseId, status: "active" },
      include: {
        usages: {
          orderBy: { createdAt: "asc" },
          include: { openingReading: { select: { readingValue: true } }, serviceSubscription: { include: { service: { select: { serviceName: true, usageBase: true } } } } },
        },
      },
    });
    return {
      ...open,
      active: p && {
        id: p.id,
        startDate: isoDate(p.startDate),
        endDate: isoDate(p.endDate),
        rentAmount: num(p.rentAmount),
        usages: p.usages.map((u) => ({
          id: u.id,
          subscriptionId: u.subscriptionId,
          serviceName: u.serviceSubscription.service.serviceName,
          usageBase: u.serviceSubscription.service.usageBase,
          meterId: u.serviceSubscription.meterId,
          subscriptionEndDate: isoDateOrNull(u.serviceSubscription.endDate),
          quantity: numOrNull(u.quantity),
          price: u.price as unknown as IPriceVersion,
          openingValue: u.openingReading ? num(u.openingReading.readingValue) : null,
        })),
      },
    };
  }

  async hasOverlap(unitId: string, start: string, end: string | null, excludeLeaseId: string) {
    const s = d(start);
    const n = await this.db.lease.count({
      where: {
        unitId,
        deletedAt: null,
        id: { not: excludeLeaseId },
        ...(end && { startDate: { lte: d(end) } }),
        OR: [{ terminatedAt: { gte: s } }, { terminatedAt: null, endDate: null }, { terminatedAt: null, endDate: { gte: s } }],
      },
    });
    return n > 0;
  }

  findReading(meterId: string, on: string) {
    return this.billing.findReading(meterId, on);
  }

  async findLastReading(meterId: string, on: string) {
    const pick = { readOn: true, readingValue: true } as const;
    // The latest reading on/before the day; failing that, the nearest one after it.
    const r =
      (await this.db.reading.findFirst({ where: { meterId, readOn: { lte: new Date(on) }, deletedAt: null }, orderBy: { readAt: "desc" }, select: pick })) ??
      (await this.db.reading.findFirst({ where: { meterId, readOn: { gt: new Date(on) }, deletedAt: null }, orderBy: { readAt: "asc" }, select: pick }));
    return r && { value: num(r.readingValue), on: isoDate(r.readOn) };
  }

  async findServicePrices(propertyId: string, serviceId: string) {
    const s = await this.db.service.findFirst({ where: { id: serviceId, propertyId, deletedAt: null } });
    return s && { name: s.serviceName, usageBase: s.usageBase, prices: s.prices as unknown as IPriceVersion[] };
  }

  async billedLines(propertyId: string, leaseId: string, periodId: string): Promise<IBilledLine[]> {
    const items = await this.db.invoiceItem.findMany({
      where: {
        voidedAt: null,
        AND: [
          { invoice: { leaseId, propertyId, deletedAt: null, status: { not: "cancelled" } } },
          { OR: [{ kind: "deposit" }, { kind: "rent", invoice: { billingPeriodId: periodId } }, { kind: "service", usage: { billingPeriodId: periodId } }] },
        ],
      },
      include: { invoice: { include: { payments: { where: { deletedAt: null, status: "confirmed" }, select: { amount: true } } } }, usage: { select: { subscriptionId: true } } },
      orderBy: [{ invoice: { createdAt: "asc" } }, { seq: "asc" }],
    });
    const invoiceIds = [...new Set(items.map((i) => i.invoiceId))];
    const refunded = await this.db.refundItem.findMany({
      where: { invoiceId: { in: invoiceIds }, refund: { status: { not: "cancelled" } } },
      select: { invoiceId: true, invoiceItemId: true, amount: true },
    });
    const perInvoice = new Map<string, number>();
    const perItem = new Map<string, number>();
    for (const r of refunded) {
      perInvoice.set(r.invoiceId, (perInvoice.get(r.invoiceId) ?? 0) + num(r.amount));
      if (r.invoiceItemId) perItem.set(r.invoiceItemId, (perItem.get(r.invoiceItemId) ?? 0) + num(r.amount));
    }
    return items.map((i) => ({
      invoiceId: i.invoiceId,
      invoiceItemId: i.id,
      role: i.kind === "deposit" ? ("deposit" as const) : i.kind === "rent" ? ("rent" as const) : ("service" as const),
      subscriptionId: i.usage?.subscriptionId ?? null,
      title: i.title,
      window: ((d) => (d && typeof d === "object" && "from" in d && "to" in d ? { from: String(d.from), to: String(d.to) } : null))(i.detail as { from?: unknown; to?: unknown } | null),
      amount: num(i.amount),
      refunded: perItem.get(i.id) ?? 0,
      invoicePaid: i.invoice.payments.reduce((s, p) => s + num(p.amount), 0),
      invoiceRefunded: perInvoice.get(i.invoiceId) ?? 0,
    }));
  }

  // ── atomic steps ──────────────────────────────────────────────────────────────────
  applyStart(plan: IStartPlan) {
    return orConflict(
      () =>
        this.db.$transaction(async (tx) => {
          await insertReadings(tx, plan.propertyId, plan.actor.accountId, plan.readings);
          const started = await tx.lease.updateMany({ where: { id: plan.leaseId, propertyId: plan.propertyId, deletedAt: null, activatedAt: null }, data: { activatedAt: new Date() } });
          if (started.count === 0) throw new ConflictError("The lease has already started", "LEASE_STARTED");
          if (plan.moveStart) {
            const { from, to } = plan.moveStart;
            const row = await tx.lease.findUniqueOrThrow({ where: { id: plan.leaseId }, select: { prices: true } });
            const prices = (row.prices as unknown as { effectiveDate: string; amount: number }[]).map((v) => (v.effectiveDate === from ? { ...v, effectiveDate: to } : v));
            await tx.lease.update({ where: { id: plan.leaseId }, data: { startDate: d(to), prices: prices as never } });
            await tx.serviceSubscription.updateMany({ where: { leaseId: plan.leaseId, deletedAt: null, startDate: { lt: d(to) } }, data: { startDate: d(to) } });
            await tx.serviceSubscription.updateMany({ where: { leaseId: plan.leaseId, deletedAt: null, startDate: d(from) }, data: { startDate: d(to) } });
            await tx.leaseMember.updateMany({ where: { leaseId: plan.leaseId, joinedAt: { lt: d(to) } }, data: { joinedAt: d(to) } });
            await tx.leaseMember.updateMany({ where: { leaseId: plan.leaseId, joinedAt: d(from) }, data: { joinedAt: d(to) } });
          }
          const periodId = await createPeriodTx(tx, plan.period);
          const invoiceId = await createInvoiceTx(tx, await toInvoice(tx, plan, plan.invoice, { new: periodId }));
          return { periodId, invoiceId };
        }),
      ...CONFLICT,
    );
  }

  applyRollover(plan: IRolloverPlan) {
    return orConflict(
      () =>
        this.db.$transaction(async (tx) => {
          await insertReadings(tx, plan.propertyId, plan.actor.accountId, plan.readings);
          await closePeriodTx(tx, plan.close.periodId, plan.close.endDate, plan.close.closings);
          if (!plan.next || !plan.invoice) return { nextPeriodId: null, invoiceId: null };
          const nextPeriodId = await createPeriodTx(tx, plan.next);
          const invoiceId = await createInvoiceTx(tx, await toInvoice(tx, plan, plan.invoice, { new: nextPeriodId, closed: plan.close.periodId }));
          return { nextPeriodId, invoiceId };
        }),
      ...CONFLICT,
    );
  }

  applyClose(plan: ICloseLeasePlan) {
    return orConflict(
      () =>
        this.db.$transaction(async (tx) => {
          await insertReadings(tx, plan.propertyId, plan.actor.accountId, plan.readings);
          if (plan.close) await closePeriodTx(tx, plan.close.periodId, plan.close.endDate, plan.close.closings);
          const invoiceId =
            plan.invoice && plan.close ? await createInvoiceTx(tx, await toInvoice(tx, plan, plan.invoice, { closed: plan.close.periodId })) : null;

          // the lease ends: open subscriptions end that day (never-started ones are dropped), members leave
          const t = d(plan.terminatedAt);
          const ended = await tx.lease.updateMany({
            where: { id: plan.leaseId, propertyId: plan.propertyId, deletedAt: null, terminatedAt: null },
            data: { terminatedAt: t, terminationReason: plan.reason },
          });
          if (ended.count === 0) throw new ConflictError("The lease is already closed", "LEASE_TERMINATED");
          await tx.serviceSubscription.updateMany({ where: { leaseId: plan.leaseId, deletedAt: null, startDate: { gt: t } }, data: { deletedAt: new Date() } });
          await tx.serviceSubscription.updateMany({
            where: { leaseId: plan.leaseId, deletedAt: null, OR: [{ endDate: null }, { endDate: { gt: t } }] },
            data: { endDate: t },
          });
          await tx.leaseMember.updateMany({ where: { leaseId: plan.leaseId, leftAt: null, joinedAt: { lte: t } }, data: { leftAt: t } });

          const refundId = plan.refund
            ? await createRefundTx(tx, {
                propertyId: plan.propertyId,
                leaseId: plan.leaseId,
                billingPeriodId: plan.refund.billingPeriodId,
                createdBy: plan.actor.accountId,
                method: plan.refund.method,
                note: plan.refund.note,
                items: plan.refund.items,
              })
            : null;
          return { invoiceId, refundId };
        }),
      ...CONFLICT,
    );
  }

  applySubscription(plan: ISubscriptionPlan) {
    return orConflict(
      () =>
        this.db.$transaction(async (tx) => {
          await insertReadings(tx, plan.propertyId, plan.actor.accountId, plan.readings);
          const sub = await tx.serviceSubscription.create({
            data: {
              propertyId: plan.propertyId,
              leaseId: plan.leaseId,
              serviceId: plan.subscription.serviceId,
              meterId: plan.subscription.meterId,
              quantity: plan.subscription.quantity,
              details: plan.subscription.details,
              startDate: d(plan.subscription.startDate),
              endDate: plan.subscription.endDate ? d(plan.subscription.endDate) : undefined,
            },
            select: { id: true },
          });
          let usageId: string | null = null;
          if (plan.usage) {
            usageId = (
              await tx.usage.create({
                data: {
                  propertyId: plan.propertyId,
                  leaseId: plan.leaseId,
                  billingPeriodId: plan.usage.periodId,
                  subscriptionId: sub.id,
                  openingReadingId: plan.usage.opening ? await readingIdAt(tx, plan.usage.opening.meterId, plan.usage.opening.on) : null,
                  quantity: plan.usage.quantity,
                  price: plan.usage.price as unknown as object,
                },
                select: { id: true },
              })
            ).id;
          }
          let invoiceId: string | null = null;
          if (plan.invoice && usageId) {
            invoiceId = await createInvoiceTx(tx, {
              propertyId: plan.propertyId,
              leaseId: plan.leaseId,
              actor: plan.actor,
              kind: plan.invoice.kind,
              title: plan.invoice.title,
              dueDate: plan.invoice.dueDate,
              items: plan.invoice.items.map((it) => ({ title: it.title, kind: it.kind, amount: it.amount, usageId: usageId!, detail: it.detail })),
            });
          }
          return { subscriptionId: sub.id, usageId, invoiceId };
        }),
      ...CONFLICT,
    );
  }
}
