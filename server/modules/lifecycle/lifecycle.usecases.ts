import { addDays, meterQuantity, resolvePriceVersion, suggestAmount, usageCost } from "@/lib/billing/pricing";
import type { IPropertyScope } from "@/server/shared/actor";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import { headcountOn, planUsages, type IPlannedUsage, type IReadingAt } from "../billing/billing.plan";
import type { IBillingRepository, INewPeriod } from "../billing/billing.repository";
import { withCosts } from "../billing/billing.usecases";
import type { IInvoiceRepository } from "../invoice/invoice.repository";
import { resolveRent, today } from "../lease/lease.rules";
import type { IRefundRepository } from "../refund/refund.repository";
import type { ITenancyRepository } from "../tenancy/tenancy.repository";
import type { CreateSubscriptionUseCase } from "../tenancy/tenancy.usecases";
import type { ILifecycleContext, ILifecycleRepository, IReadingWrite } from "./lifecycle.repository";
import { advanceLine, creditLines, depositLine, finalize, meterLine, planRefund, rentLine } from "./lifecycle.plan";
import type {
  IAddSubscriptionCommand,
  IAddSubscriptionResponse,
  IClosePeriodCommand,
  IClosePeriodResponse,
  ICloseLeaseCommand,
  ICloseLeaseResponse,
  IClosePlan,
  IInvoicePlan,
  IPlanLine,
  IReadingInput,
  IStartLeaseCommand,
  IStartLeaseResponse,
} from "./lifecycle.schema";

const invalid = (field: string, message: string) => new ValidationError(message, { fieldErrors: { [field]: [message] } });
const min = (a: string, b: string) => (a < b ? a : b);
const max = (a: string, b: string) => (a > b ? a : b);
const dmy = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

abstract class Base {
  constructor(
    protected readonly life: ILifecycleRepository,
    protected readonly billing: IBillingRepository,
    protected readonly invoices: IInvoiceRepository,
    protected readonly refunds: IRefundRepository,
    protected readonly policy: AccessPolicy,
  ) {}

  protected manage(s: IPropertyScope) {
    return this.policy.assertPropertyRole(s.actor, s.propertyId, ROLES.manage);
  }
  protected async load(propertyId: string, leaseId: string) {
    const ctx = await this.life.load(propertyId, leaseId);
    if (!ctx) throw new NotFoundError("Lease");
    return ctx;
  }
  protected leaseEnd(ctx: ILifecycleContext) {
    return ctx.lease.terminatedAt ?? ctx.lease.endDate;
  }
  /** A period must sit inside the lease. */
  protected checkRange(ctx: ILifecycleContext, start: string, end: string, field: string) {
    if (end < start) throw invalid(field, `Must be on/after ${start}`);
    const le = this.leaseEnd(ctx);
    if (le && end > le) throw invalid(field, `The lease ends on ${le}`);
  }
  /** Readings may only be given for meters the lease subscribes to, once each. */
  protected checkReadings(ctx: ILifecycleContext, readings: IReadingInput[]) {
    const meters = new Set(ctx.subscriptions.map((s) => s.meterId).filter((m): m is string => !!m));
    const seen = new Set<string>();
    for (const r of readings) {
      if (!meters.has(r.meterId)) throw invalid("readings", `Meter ${r.meterId} is not subscribed by this lease`);
      if (seen.has(r.meterId)) throw invalid("readings", `Meter ${r.meterId} appears twice`);
      seen.add(r.meterId);
    }
  }
  /** Stored readings, with the ones typed in this request overlaid on their date. */
  protected readingAt(payload: IReadingInput[], on: string): IReadingAt {
    return async (meterId, at) => {
      if (at === on) {
        const typed = payload.find((r) => r.meterId === meterId);
        if (typed) return { value: typed.value };
      }
      return this.life.findReading(meterId, at);
    };
  }
  protected writes(payload: IReadingInput[], on: string): IReadingWrite[] {
    return payload.map((r) => ({ meterId: r.meterId, on, value: r.value }));
  }

  /** Closing quantities of the meter usages of the running period, ended on `endDate`. */
  protected async closeMeters(ctx: ILifecycleContext, endDate: string, payload: IReadingInput[]) {
    const active = ctx.active!;
    const closeOn = addDays(endDate, 1);
    const at = this.readingAt(payload, closeOn);
    const closings: IClosePlan["closings"] = [];
    const quantities = new Map<string, number>();
    for (const u of active.usages) {
      if (u.usageBase !== "meter" || !u.meterId) continue;
      const on = addDays(min(endDate, u.subscriptionEndDate ?? endDate), 1);
      const reading = await at(u.meterId, on);
      if (!reading) throw new ConflictError(`${u.serviceName} needs a meter reading on ${on}`, "MISSING_READING");
      let quantity: number;
      try {
        quantity = meterQuantity(u.openingValue ?? 0, reading.value);
      } catch {
        throw new ConflictError(`${u.serviceName}: the reading on ${on} is lower than the opening reading`, "READING_ORDER");
      }
      closings.push({ usageId: u.id, meterId: u.meterId, on, quantity });
      quantities.set(u.id, quantity);
    }
    return { closings, quantities };
  }

  protected async periodDetail(propertyId: string, periodId: string) {
    const p = await this.billing.findById(propertyId, periodId);
    if (!p) throw new NotFoundError("Billing period");
    return withCosts(p);
  }
  protected async invoiceDetail(propertyId: string, invoiceId: string) {
    const i = await this.invoices.findById(propertyId, invoiceId);
    if (!i) throw new NotFoundError("Invoice");
    return i;
  }
}

// ── II.6  Start a draft lease ────────────────────────────────────────────────────────
/**
 * Draft -> started, in one transaction: opens the first billing period (usages + frozen prices) and issues the
 * move-in invoice: deposit, the period's rent, and the non-meter services (all prorated suggestions you can override).
 * Meter services need an opening reading on the start date (typed in `readings` or already stored).
 */
export class StartLeaseUseCase extends Base implements IUseCase<IStartLeaseCommand, IStartLeaseResponse> {
  async execute(c: IStartLeaseCommand): Promise<IStartLeaseResponse> {
    await this.manage(c);
    const ctx = await this.load(c.propertyId, c.leaseId);
    if (ctx.lease.activatedAt !== null) throw new ConflictError("The lease has already started", "LEASE_STARTED");
    const start = ctx.lease.startDate;
    const end = c.periodEnd ?? ctx.lease.firstPeriodEnd;
    if (!end) throw invalid("periodEnd", "Choose where the first billing period ends");
    this.checkRange(ctx, start, end, "periodEnd");
    const monthly = resolveRent(ctx.lease.rentVersions, start);
    if (monthly === null) throw invalid("rent", "The lease has no rent in force on its start date");
    this.checkReadings(ctx, c.readings);

    const usages = await planUsages(ctx, start, end, this.readingAt(c.readings, start));
    const lines: IPlanLine[] = [
      ...(ctx.lease.depositAmount > 0 ? [depositLine(ctx.lease.depositAmount)] : []),
      rentLine(monthly, start, end),
      ...usages.filter((u) => u.usageBase !== "meter").map((u) => advanceLine(u, "new")),
    ];
    const items = finalize(lines, c.overrides, c.extraItems);
    const period: INewPeriod = {
      propertyId: c.propertyId,
      leaseId: c.leaseId,
      startDate: start,
      endDate: end,
      rentAmount: items[lines.findIndex((l) => l.key === "rent")].amount,
      usages,
    };
    const invoice: IInvoicePlan = { kind: "move_in", period: "new", title: c.title ?? `Move-in ${dmy(start)}`, dueDate: c.dueDate ?? start, items };
    const r = await this.life.applyStart({ propertyId: c.propertyId, leaseId: c.leaseId, actor: c.actor, readings: this.writes(c.readings, start), period, invoice });
    return { leaseId: c.leaseId, period: await this.periodDetail(c.propertyId, r.periodId), invoice: await this.invoiceDetail(c.propertyId, r.invoiceId) };
  }
}

// ── II.7  Close a billing period (and roll over) ─────────────────────────────────────
/**
 * Closes the running period at `endDate` (default: the planned end; earlier = mid-term) with the closing meter readings
 * (typed here or stored on the day after) -> metered quantities. With `next`, also opens the next period and issues the
 * transition invoice:
 *   rent of the next period (prorated) · its non-meter services (prorated) · this period's meter usage (exact)
 *   · a credit for the unused days of rent / services already invoiced when the period is cut short.
 * Every suggested amount can be overridden by line key.
 */
export class ClosePeriodUseCase extends Base implements IUseCase<IClosePeriodCommand, IClosePeriodResponse> {
  async execute(c: IClosePeriodCommand): Promise<IClosePeriodResponse> {
    await this.manage(c);
    const leaseId = await this.life.leaseOfPeriod(c.propertyId, c.periodId);
    if (!leaseId) throw new NotFoundError("Billing period");
    const ctx = await this.load(c.propertyId, leaseId);
    const active = ctx.active;
    if (!active || active.id !== c.periodId) throw new ConflictError("The period is already closed", "PERIOD_CLOSED");

    const endDate = c.endDate ?? active.endDate;
    this.checkRange(ctx, active.startDate, endDate, "endDate");
    this.checkReadings(ctx, c.readings);
    const closeOn = addDays(endDate, 1);
    const { closings, quantities } = await this.closeMeters(ctx, endDate, c.readings);
    const close: IClosePlan = { periodId: active.id, endDate, closings };
    const readings = this.writes(c.readings, closeOn);
    const base = { propertyId: c.propertyId, leaseId, actor: c.actor, readings };

    if (!c.next) {
      await this.life.applyRollover({ ...base, close, next: null, invoice: null });
      return { period: await this.periodDetail(c.propertyId, active.id), next: null, invoice: null };
    }

    const nextStart = closeOn;
    const nextEnd = c.next.endDate;
    const le = this.leaseEnd(ctx);
    if (le && nextStart > le) throw new ConflictError("The lease has already been fully billed: close the lease instead", "LEASE_FULLY_BILLED");
    this.checkRange(ctx, nextStart, nextEnd, "next.endDate");
    const monthly = resolveRent(ctx.lease.rentVersions, nextStart);
    if (monthly === null) throw invalid("rent", `The lease has no rent in force on ${nextStart}`);

    const usages = await planUsages(ctx, nextStart, nextEnd, this.readingAt(c.readings, closeOn));
    const billed = endDate < active.endDate ? await this.life.billedLines(c.propertyId, leaseId, active.id) : [];
    const lines: IPlanLine[] = [
      rentLine(monthly, nextStart, nextEnd),
      ...usages.filter((u) => u.usageBase !== "meter").map((u) => advanceLine(u, "new")),
      ...active.usages.filter((u) => u.usageBase === "meter" && quantities.has(u.id)).map((u) => meterLine(u, quantities.get(u.id)!, "closed")),
      ...creditLines(billed, active.startDate, active.endDate, endDate),
    ];
    const items = finalize(lines, c.overrides, c.extraItems);
    const next: INewPeriod = {
      propertyId: c.propertyId,
      leaseId,
      startDate: nextStart,
      endDate: nextEnd,
      rentAmount: items[lines.findIndex((l) => l.key === "rent")].amount,
      usages,
    };
    const invoice: IInvoicePlan = { kind: "transition", period: "new", title: c.title ?? `Invoice ${dmy(nextStart)}`, dueDate: c.dueDate ?? nextStart, items };
    const r = await this.life.applyRollover({ ...base, close, next, invoice });
    return {
      period: await this.periodDetail(c.propertyId, active.id),
      next: r.nextPeriodId ? await this.periodDetail(c.propertyId, r.nextPeriodId) : null,
      invoice: r.invoiceId ? await this.invoiceDetail(c.propertyId, r.invoiceId) : null,
    };
  }
}

// ── II.9  Close a lease ──────────────────────────────────────────────────────────────
/**
 * Ends the lease on `terminatedAt`, in one transaction:
 *  - closes the running period on that day with the closing readings (shortened if it is mid-term)
 *  - ends the open subscriptions and members
 *  - issues the closing invoice (this period's meter usage + your extra items), if there is anything to charge
 *  - creates the refund (pending): unused rent + unused non-meter services (prorated by days) and the deposit,
 *    never more than was charged on a line or paid on its invoice. Override by key (refund:rent, refund:deposit,
 *    refund:service:<subscriptionId>) or `refund.skip`.
 */
export class CloseLeaseUseCase extends Base implements IUseCase<ICloseLeaseCommand, ICloseLeaseResponse> {
  async execute(c: ICloseLeaseCommand): Promise<ICloseLeaseResponse> {
    await this.manage(c);
    const ctx = await this.load(c.propertyId, c.leaseId);
    if (ctx.lease.activatedAt === null) throw new ConflictError("The lease has not started: delete the draft instead", "LEASE_NOT_STARTED");
    if (ctx.lease.terminatedAt) throw new ConflictError("The lease is already closed", "LEASE_TERMINATED");
    const t = c.terminatedAt;
    if (t < ctx.lease.startDate) throw invalid("terminatedAt", `Must be on/after ${ctx.lease.startDate}`);
    if (ctx.lease.lastMemberJoinedAt && t < ctx.lease.lastMemberJoinedAt) throw invalid("terminatedAt", `A member joined on ${ctx.lease.lastMemberJoinedAt}`);
    this.checkReadings(ctx, c.readings);

    const active = ctx.active;
    const last = ctx.lastPeriod;
    // the period the money question is about: the running one, or the last one when the lease ends inside it
    let refundPeriod: { id: string; start: string; plannedEnd: string } | null = null;
    let close: IClosePlan | null = null;
    let quantities = new Map<string, number>();
    if (active) {
      if (t < active.startDate) throw new ConflictError(`The running period started on ${active.startDate}: close it first`, "PERIOD_AHEAD");
      if (t > active.endDate) throw new ConflictError(`The running period ends on ${active.endDate}: roll it over first`, "PERIOD_BEHIND");
      const r = await this.closeMeters(ctx, t, c.readings);
      close = { periodId: active.id, endDate: t, closings: r.closings };
      quantities = r.quantities;
      refundPeriod = { id: active.id, start: active.startDate, plannedEnd: active.endDate };
    } else if (last && t <= last.endDate) {
      refundPeriod = { id: last.id, start: last.startDate, plannedEnd: last.endDate };
    } else {
      throw new ConflictError("There is no running billing period for that date: open one or pick a date inside the last period", "NO_ACTIVE_PERIOD");
    }

    // closing invoice: arrears for the metered usage, plus whatever the admin adds
    const invoiceOverrides = Object.fromEntries(Object.entries(c.overrides).filter(([k]) => !k.startsWith("refund:")));
    const refundOverrides = Object.fromEntries(Object.entries(c.overrides).filter(([k]) => k.startsWith("refund:")));
    let invoice: IInvoicePlan | null = null;
    if (active) {
      const lines: IPlanLine[] = active.usages
        .filter((u) => u.usageBase === "meter" && quantities.has(u.id))
        .map((u) => meterLine(u, quantities.get(u.id)!, "closed"));
      const items = finalize(lines, invoiceOverrides, c.extraItems);
      if (items.length > 0) {
        invoice = { kind: "closing", period: "closed", title: c.title ?? `Closing ${dmy(t)}`, dueDate: c.dueDate ?? t, items };
      }
    } else if (Object.keys(invoiceOverrides).length || c.extraItems.length) {
      throw invalid("extraItems", "Nothing to invoice: the last period is already closed");
    }

    // refund: prefilled, capped
    let refund = null;
    if (!c.refund.skip) {
      const billed = await this.life.billedLines(c.propertyId, c.leaseId, refundPeriod.id);
      refund = planRefund(billed, { ...refundPeriod, terminatedAt: t }, refundOverrides, { method: c.refund.method, note: c.refund.note }).refund;
    } else if (Object.keys(refundOverrides).length) {
      throw invalid("overrides", "refund.skip is set but refund amounts were given");
    }

    const r = await this.life.applyClose({
      propertyId: c.propertyId,
      leaseId: c.leaseId,
      actor: c.actor,
      readings: this.writes(c.readings, addDays(t, 1)),
      terminatedAt: t,
      reason: c.reason,
      close,
      invoice,
      refund,
    });
    return {
      leaseId: c.leaseId,
      terminatedAt: t,
      period: refundPeriod ? await this.periodDetail(c.propertyId, refundPeriod.id) : null,
      invoice: r.invoiceId ? await this.invoiceDetail(c.propertyId, r.invoiceId) : null,
      refund: r.refundId ? await this.refunds.findById(c.propertyId, r.refundId) : null,
    };
  }
}

// ── II.8  Add a subscription (mid-term aware) ────────────────────────────────────────
/**
 * Adds the subscription. When the lease is running and the subscription is live in the running period, it also
 * creates that period's usage (price frozen at the period start) and, for non-meter services, an invoice for
 * the days left in the period (prorated suggestion, or `amount`). Meter services are billed when the period closes;
 * they need a reading on the start date.
 */
export class AddSubscriptionUseCase extends Base implements IUseCase<IAddSubscriptionCommand, IAddSubscriptionResponse> {
  constructor(
    life: ILifecycleRepository,
    billing: IBillingRepository,
    invoices: IInvoiceRepository,
    refunds: IRefundRepository,
    policy: AccessPolicy,
    private readonly validator: CreateSubscriptionUseCase,
    private readonly tenancy: ITenancyRepository,
  ) {
    super(life, billing, invoices, refunds, policy);
  }

  async execute(c: IAddSubscriptionCommand): Promise<IAddSubscriptionResponse> {
    const startDate = await this.validator.validate(c); // role + every subscription rule
    const ctx = await this.load(c.propertyId, c.leaseId);
    const service = await this.life.findServicePrices(c.propertyId, c.serviceId);
    if (!service) throw new NotFoundError("Service");

    const active = ctx.active;
    const live = !!active && ctx.lease.activatedAt !== null && startDate <= active.endDate && (!c.endDate || c.endDate >= active.startDate);
    let usage = null;
    let invoice = null;
    let readings: IReadingWrite[] = [];
    if (live && active) {
      const price = resolvePriceVersion(service.prices, active.startDate);
      if (!price) throw new ConflictError(`${service.name} has no price in force on ${active.startDate}`, "PRICE_NOT_IN_FORCE");
      const from = max(startDate, active.startDate);
      const to = c.endDate ? min(active.endDate, c.endDate) : active.endDate;
      if (service.usageBase === "meter") {
        if (!c.meterId) throw invalid("meterId", "Required for meter services");
        const stored = await this.life.findReading(c.meterId, from);
        if (!stored && c.reading === undefined) throw new ConflictError(`${service.name} needs a meter reading on ${from}: pass \`reading\``, "MISSING_READING");
        if (c.reading !== undefined) readings = [{ meterId: c.meterId, on: from, value: c.reading }];
        usage = { periodId: active.id, opening: { meterId: c.meterId, on: from }, quantity: null, price };
      } else {
        const quantity = service.usageBase === "device" ? c.quantity : service.usageBase === "member" ? headcountOn(ctx.members, from) : 1;
        usage = { periodId: active.id, opening: null, quantity, price };
        const calculated = usageCost({ quantity, price }).amount;
        const amount = c.amount ?? suggestAmount(calculated, from, to);
        if (amount > 0) {
          invoice = {
            kind: "other" as const,
            title: `${service.name} ${dmy(from)}–${dmy(to)}`,
            dueDate: c.dueDate ?? today(),
            items: [
              {
                kind: "service" as const,
                title: `${service.name} ${dmy(from)}–${dmy(to)}`,
                amount,
                usage: { subscriptionId: "", period: "new" as const },
                detail: { quantity, price, calculatedAmount: calculated, from, to },
              },
            ],
          };
        }
      }
    }
    const r = await this.life.applySubscription({
      propertyId: c.propertyId,
      leaseId: c.leaseId,
      actor: c.actor,
      readings,
      subscription: { serviceId: c.serviceId, meterId: c.meterId, quantity: c.quantity, details: c.details, startDate, endDate: c.endDate },
      usage,
      invoice,
    });
    const sub = await this.tenancy.findSubscription(c.leaseId, r.subscriptionId);
    if (!sub) throw new NotFoundError("Subscription");
    return { ...sub, usageId: r.usageId, invoice: r.invoiceId ? await this.invoiceDetail(c.propertyId, r.invoiceId) : null };
  }
}

export type { IPlannedUsage };
