import { addDays, meterQuantity, resolvePriceVersion, usageCost } from "@/lib/billing/pricing";
import type { IPropertyScope } from "@/server/shared/actor";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import { resolveRent } from "../lease/lease.rules";
import type { IBillingRepository, INewUsage } from "./billing.repository";
import type {
  IBillingPeriodDetailRecord,
  IBillingPeriodDetailResponse,
  IBillingPeriodListQuery,
  IBillingPeriodListResponse,
  IOpenPeriodCommand,
  IPeriodScope,
  IUpdateUsageCommand,
} from "./billing.schema";

const invalid = (field: string, message: string) => new ValidationError(message, { fieldErrors: { [field]: [message] } });
const max = (a: string, b: string) => (a > b ? a : b);
const min = (a: string, b: string) => (a < b ? a : b);

/** Costs are calculated from the frozen price; they are information, the invoice amount is the admin's. */
const withCosts = (p: IBillingPeriodDetailRecord): IBillingPeriodDetailResponse => ({
  ...p,
  usages: p.usages.map((u) => ({ ...u, cost: u.quantity === null ? null : usageCost({ quantity: u.quantity, price: u.price }) })),
});

abstract class Base {
  constructor(protected readonly billing: IBillingRepository, protected readonly policy: AccessPolicy) {}
  protected async detail(propertyId: string, periodId: string) {
    const p = await this.billing.findById(propertyId, periodId);
    if (!p) throw new NotFoundError("Billing period");
    return withCosts(p);
  }
  protected manage(s: IPropertyScope) {
    return this.policy.assertPropertyRole(s.actor, s.propertyId, ROLES.manage);
  }
}

export class ListBillingPeriodsUseCase extends Base implements IUseCase<IPropertyScope & { query: IBillingPeriodListQuery }, IBillingPeriodListResponse> {
  async execute({ actor, propertyId, query }: IPropertyScope & { query: IBillingPeriodListQuery }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.billing.list(propertyId, query);
  }
}
export class GetBillingPeriodUseCase extends Base implements IUseCase<IPeriodScope, IBillingPeriodDetailResponse> {
  async execute({ actor, propertyId, periodId }: IPeriodScope) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.detail(propertyId, periodId);
  }
}

/**
 * Open the next period of a lease and freeze one usage per live subscription:
 *  - price  : the version in force on the period's FIRST day (never changes afterwards)
 *  - meter  : opening reading = the reading on max(period start, subscription start); quantity is known at close
 *  - lease  : 1 · device : the subscribed count · member : headcount on max(period start, subscription start)
 */
export class OpenBillingPeriodUseCase extends Base implements IUseCase<IOpenPeriodCommand, IBillingPeriodDetailResponse> {
  async execute(c: IOpenPeriodCommand) {
    await this.manage(c);
    const ctx = await this.billing.getOpenContext(c.propertyId, c.leaseId);
    if (!ctx) throw new NotFoundError("Lease");
    if (ctx.lastPeriod?.status === "active") throw new ConflictError("Close the active billing period first", "PERIOD_ACTIVE");

    const start = ctx.lastPeriod ? addDays(ctx.lastPeriod.endDate, 1) : ctx.lease.startDate;
    if (c.endDate < start) throw invalid("endDate", `The period starts on ${start}; the end date cannot be earlier`);
    const leaseEnd = ctx.lease.terminatedAt ?? ctx.lease.endDate;
    if (leaseEnd && start > leaseEnd) throw new ConflictError("The lease has already been fully billed", "LEASE_FULLY_BILLED");
    if (leaseEnd && c.endDate > leaseEnd) throw invalid("endDate", `The lease ends on ${leaseEnd}`);

    const rentAmount = c.rentAmount ?? resolveRent(ctx.lease.rentVersions, start);
    if (rentAmount === null) throw invalid("rentAmount", "The lease has no rent in force on the period start; enter the rent");

    const usages: INewUsage[] = [];
    for (const sub of ctx.subscriptions) {
      if (sub.startDate > c.endDate || (sub.endDate && sub.endDate < start)) continue; // not live in this period
      const price = resolvePriceVersion(sub.service.prices, start);
      if (!price) throw new ConflictError(`${sub.service.name} has no price in force on ${start}`, "PRICE_NOT_IN_FORCE");
      const from = max(start, sub.startDate);
      if (sub.service.usageBase === "meter") {
        const opening = sub.meterId ? await this.billing.findReading(sub.meterId, from) : null;
        if (!opening) throw new ConflictError(`${sub.service.name} needs a meter reading on ${from}`, "MISSING_READING");
        usages.push({ subscriptionId: sub.id, openingReadingId: opening.id, quantity: null, price });
        continue;
      }
      const quantity =
        sub.service.usageBase === "device"
          ? sub.quantity
          : sub.service.usageBase === "member"
            ? ctx.members.filter((m) => m.joinedAt <= from && (m.leftAt === null || m.leftAt > from)).length
            : 1;
      usages.push({ subscriptionId: sub.id, openingReadingId: null, quantity, price });
    }

    const id = await this.billing.createPeriod({ propertyId: c.propertyId, leaseId: c.leaseId, startDate: start, endDate: c.endDate, rentAmount, usages });
    return this.detail(c.propertyId, id);
  }
}

/** Close a period: every meter usage needs its closing reading (dated the day after the period, or after the subscription ended). */
export class CloseBillingPeriodUseCase extends Base implements IUseCase<IPeriodScope, IBillingPeriodDetailResponse> {
  async execute({ actor, propertyId, periodId }: IPeriodScope) {
    await this.manage({ actor, propertyId });
    const ctx = await this.billing.getCloseContext(propertyId, periodId);
    if (!ctx) throw new NotFoundError("Billing period");
    if (ctx.period.status === "closed") throw new ConflictError("The period is already closed", "PERIOD_CLOSED");

    const closings: { usageId: string; closingReadingId: string; quantity: number }[] = [];
    for (const u of ctx.meterUsages) {
      const on = addDays(min(ctx.period.endDate, u.subscriptionEndDate ?? ctx.period.endDate), 1);
      const closing = await this.billing.findReading(u.meterId, on);
      if (!closing) throw new ConflictError(`${u.serviceName} needs a meter reading on ${on}`, "MISSING_READING");
      let quantity: number;
      try {
        quantity = meterQuantity(u.openingValue, closing.value);
      } catch {
        throw new ConflictError(`${u.serviceName}: the reading on ${on} is lower than the opening reading`, "READING_ORDER");
      }
      closings.push({ usageId: u.id, closingReadingId: closing.id, quantity });
    }
    if (!(await this.billing.closePeriod(periodId, closings))) throw new ConflictError("The period is already closed", "PERIOD_CLOSED");
    return this.detail(propertyId, periodId);
  }
}

/** Counted usages (lease / device / member) can be corrected until their period closes or they are invoiced. Meters follow the readings. */
export class UpdateUsageUseCase extends Base implements IUseCase<IUpdateUsageCommand, IBillingPeriodDetailResponse> {
  async execute(c: IUpdateUsageCommand) {
    await this.manage(c);
    const u = await this.billing.findUsage(c.propertyId, c.periodId, c.usageId);
    if (!u) throw new NotFoundError("Usage");
    if (u.usageBase === "meter") throw invalid("quantity", "Meter usage comes from the readings");
    if (u.periodStatus === "closed") throw new ConflictError("The period is closed", "PERIOD_CLOSED");
    if (u.billed) throw new ConflictError("The usage is already on an invoice", "USAGE_BILLED");
    await this.billing.setUsageQuantity(c.usageId, c.quantity);
    return this.detail(c.propertyId, c.periodId);
  }
}
