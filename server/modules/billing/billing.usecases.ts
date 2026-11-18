import { addDays, suggestAmount, usageCost } from "@/lib/billing/pricing";
import type { IPropertyScope } from "@/server/shared/actor";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import { resolveRent } from "../lease/lease.rules";
import { planUsages } from "./billing.plan";
import type { IBillingRepository } from "./billing.repository";
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

/** Costs are calculated from the frozen price; they are information, the invoice amount is the admin's. */
export const withCosts = (p: IBillingPeriodDetailRecord): IBillingPeriodDetailResponse => ({
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
 * Open the next period of a lease on its own (the lifecycle actions do the same as part of a bigger step).
 * Rent: the admin's figure, else a prorated suggestion for the period length.
 */
export class OpenBillingPeriodUseCase extends Base implements IUseCase<IOpenPeriodCommand, IBillingPeriodDetailResponse> {
  async execute(c: IOpenPeriodCommand) {
    await this.manage(c);
    const ctx = await this.billing.getOpenContext(c.propertyId, c.leaseId);
    if (!ctx) throw new NotFoundError("Lease");
    if (ctx.lease.activatedAt === null) throw new ConflictError("Start the lease first", "LEASE_NOT_STARTED");
    if (ctx.lastPeriod?.status === "active") throw new ConflictError("Close the active billing period first", "PERIOD_ACTIVE");

    const start = ctx.lastPeriod ? addDays(ctx.lastPeriod.endDate, 1) : ctx.lease.startDate;
    if (c.endDate < start) throw invalid("endDate", `The period starts on ${start}; the end date cannot be earlier`);
    const leaseEnd = ctx.lease.terminatedAt ?? ctx.lease.endDate;
    if (leaseEnd && start > leaseEnd) throw new ConflictError("The lease has already been fully billed", "LEASE_FULLY_BILLED");
    if (leaseEnd && c.endDate > leaseEnd) throw invalid("endDate", `The lease ends on ${leaseEnd}`);

    const monthly = resolveRent(ctx.lease.rentVersions, start);
    if (c.rentAmount === undefined && monthly === null) throw invalid("rentAmount", "The lease has no rent in force on the period start; enter the rent");
    const rentAmount = c.rentAmount ?? suggestAmount(monthly ?? 0, start, c.endDate);

    const usages = await planUsages(ctx, start, c.endDate, (meterId, on) => this.billing.findReading(meterId, on));
    const id = await this.billing.createPeriod({ propertyId: c.propertyId, leaseId: c.leaseId, startDate: start, endDate: c.endDate, rentAmount, usages });
    return this.detail(c.propertyId, id);
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
