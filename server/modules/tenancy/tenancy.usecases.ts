import type { IPropertyScope } from "@/server/shared/actor";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import { resolveLeaseStatus, resolveRent, today } from "../lease/lease.rules";
import type { IInvitationRepository } from "../invitation/invitation.repository";
import type { ITenancyRepository } from "./tenancy.repository";
import type {
  IAddLeaseMemberCommand,
  IAddRentCommand,
  IAddTenantCommand,
  ICreateLeaseCommand,
  ICreateSubscriptionCommand,
  ISubscriptionResponse,
  ITenancyDetailRecord,
  ITenancyDetailResponse,
  ITenancyListQuery,
  ITenancyListResponse,
  ITerminateLeaseCommand,
  IUpdateLeaseCommand,
  IUpdateLeaseMemberCommand,
  IUpdateSubscriptionCommand,
} from "./tenancy.schema";

type Lease = { leaseId: string };

const invalid = (message: string, field: string, detail: string) => new ValidationError(message, { fieldErrors: { [field]: [detail] } });

/** Shared plumbing: authorisation, loading, and turning a stored record into the API response. */
abstract class Base {
  constructor(protected readonly leases: ITenancyRepository, protected readonly policy: AccessPolicy) {}

  protected enrich(r: ITenancyDetailRecord, on = today()): ITenancyDetailResponse {
    return { ...r, status: resolveLeaseStatus(r, on), currentRent: resolveRent(r.rentVersions, on) };
  }
  protected async detail(propertyId: string, leaseId: string) {
    const r = await this.leases.findDetail(propertyId, leaseId);
    if (!r) throw new NotFoundError("Lease");
    return this.enrich(r);
  }
  protected async core(propertyId: string, leaseId: string) {
    const c = await this.leases.findCore(propertyId, leaseId);
    if (!c) throw new NotFoundError("Lease");
    return c;
  }
  protected manage(s: IPropertyScope) {
    return this.policy.assertPropertyRole(s.actor, s.propertyId, ROLES.manage);
  }
}

/**
 * A person added to a lease with a phone number is invited to it, so they can sign in and see the lease.
 * Someone who is already a tenant or already has an open invitation is skipped, not an error.
 */
const inviteToLease = async (invitations: IInvitationRepository, s: IPropertyScope & Lease, phoneNumber: string | undefined) => {
  if (!phoneNumber || (await invitations.isTenant(s.leaseId, phoneNumber))) return;
  try {
    await invitations.create({ kind: "lease", propertyId: s.propertyId, leaseId: s.leaseId, phoneNumber, role: null, invitedBy: s.actor.accountId });
  } catch (e) {
    if (!(e instanceof ConflictError)) throw e;
  }
};

export class ListTenanciesUseCase extends Base implements IUseCase<IPropertyScope & { query: ITenancyListQuery }, ITenancyListResponse> {
  async execute({ actor, propertyId, query }: IPropertyScope & { query: ITenancyListQuery }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    const on = today();
    const page = await this.leases.list(propertyId, query, on);
    return {
      ...page,
      items: page.items.map(({ rentVersions, ...r }) => ({ ...r, status: resolveLeaseStatus(r, on), currentRent: resolveRent(rentVersions, on) })),
    };
  }
}

export class GetTenancyUseCase extends Base implements IUseCase<IPropertyScope & Lease, ITenancyDetailResponse> {
  async execute({ actor, propertyId, leaseId }: IPropertyScope & Lease) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.detail(propertyId, leaseId);
  }
}

export class CreateTenancyUseCase extends Base implements IUseCase<ICreateLeaseCommand, ITenancyDetailResponse> {
  constructor(leases: ITenancyRepository, policy: AccessPolicy, private readonly invitations: IInvitationRepository) {
    super(leases, policy);
  }
  async execute(c: ICreateLeaseCommand) {
    await this.manage(c);
    if (!(await this.leases.unitExists(c.propertyId, c.unitId))) throw new NotFoundError("Unit");
    if (await this.leases.hasOverlap(c.unitId, c.startDate, c.endDate ?? null)) {
      throw new ConflictError("The unit already has a lease in this period", "LEASE_OVERLAP");
    }
    if (c.handovers.length && (await this.leases.countItems(c.propertyId, c.handovers.map((h) => h.itemId))) !== c.handovers.length) throw new NotFoundError("Item");
    let templateVersion: number | null = null;
    if (c.agreement) {
      const t = await this.leases.findTemplate(c.propertyId, c.agreement.templateId);
      if (!t) throw new NotFoundError("Agreement template");
      templateVersion = t.currentVersion; // the version in use at this moment is pinned to the lease
    }
    const leaseId = await this.leases.create(c, templateVersion);
    for (const m of c.members) await inviteToLease(this.invitations, { actor: c.actor, propertyId: c.propertyId, leaseId }, m.phoneNumber);
    return this.detail(c.propertyId, leaseId);
  }
}

export class UpdateTenancyUseCase extends Base implements IUseCase<IUpdateLeaseCommand, ITenancyDetailResponse> {
  async execute(c: IUpdateLeaseCommand) {
    await this.manage(c);
    const core = await this.core(c.propertyId, c.leaseId);
    if ((c.depositAmount !== undefined || c.firstPeriodEnd !== undefined) && core.activatedAt !== null) {
      throw new ConflictError("The deposit and the first period can only change while the lease is a draft", "LEASE_STARTED");
    }
    if (c.firstPeriodEnd && (c.firstPeriodEnd < core.startDate || (core.endDate && c.firstPeriodEnd > core.endDate))) {
      throw invalid("Invalid first period end", "firstPeriodEnd", "Must be within the lease");
    }
    if (c.endDate && c.endDate < core.startDate) throw invalid("Invalid end date", "endDate", "Must be on/after startDate");
    if (c.endDate && (await this.leases.hasOverlap(core.unitId, core.startDate, c.endDate, core.id))) {
      throw new ConflictError("The new end date overlaps another lease of the unit", "LEASE_OVERLAP");
    }
    if (c.agreementValues && !core.hasAgreement) throw invalid("The lease has no agreement template", "agreementValues", "No agreement on this lease");
    await this.leases.update(c);
    return this.detail(c.propertyId, c.leaseId);
  }
}

/** A draft was never billed, so it can simply be thrown away. */
export class DeleteDraftTenancyUseCase extends Base implements IUseCase<IPropertyScope & Lease, void> {
  async execute({ actor, propertyId, leaseId }: IPropertyScope & Lease) {
    await this.manage({ actor, propertyId });
    const core = await this.core(propertyId, leaseId);
    if (core.activatedAt !== null) throw new ConflictError("A started lease cannot be deleted: close it instead", "LEASE_STARTED");
    await this.leases.softDeleteDraft(propertyId, leaseId);
  }
}

export class TerminateTenancyUseCase extends Base implements IUseCase<ITerminateLeaseCommand, ITenancyDetailResponse> {
  async execute(c: ITerminateLeaseCommand) {
    await this.manage(c);
    const core = await this.core(c.propertyId, c.leaseId);
    if (core.activatedAt === null) throw new ConflictError("The lease has not started", "LEASE_NOT_STARTED");
    if (core.terminatedAt) throw new ConflictError("The lease is already terminated", "LEASE_TERMINATED");
    if (c.terminatedAt < core.startDate) throw invalid("Invalid termination date", "terminatedAt", "Must be on/after startDate");
    if (core.lastMemberJoinedAt && c.terminatedAt < core.lastMemberJoinedAt) {
      throw invalid("A member joined after this date", "terminatedAt", `Must be on/after ${core.lastMemberJoinedAt}`);
    }
    await this.leases.terminate(c);
    return this.detail(c.propertyId, c.leaseId);
  }
}

export class AddRentVersionUseCase extends Base implements IUseCase<IAddRentCommand, ITenancyDetailResponse> {
  async execute(c: IAddRentCommand) {
    await this.manage(c);
    const core = await this.core(c.propertyId, c.leaseId);
    const last = core.rentVersions[core.rentVersions.length - 1];
    if (last && c.effectiveDate <= last.effectiveDate) {
      throw invalid("effectiveDate must be later than the latest rent version", "effectiveDate", `Must be after ${last.effectiveDate}`);
    }
    await this.leases.addRent(c, [...core.rentVersions, { effectiveDate: c.effectiveDate, amount: c.amount }]);
    return this.detail(c.propertyId, c.leaseId);
  }
}

export class AddTenantUseCase extends Base implements IUseCase<IAddTenantCommand, ITenancyDetailResponse> {
  async execute(c: IAddTenantCommand) {
    await this.manage(c);
    await this.core(c.propertyId, c.leaseId);
    await this.leases.addTenant(c);
    return this.detail(c.propertyId, c.leaseId);
  }
}

export class RemoveTenantUseCase extends Base implements IUseCase<IPropertyScope & Lease & { accountId: string }, ITenancyDetailResponse> {
  async execute({ actor, propertyId, leaseId, accountId }: IPropertyScope & Lease & { accountId: string }) {
    await this.manage({ actor, propertyId });
    await this.core(propertyId, leaseId);
    if ((await this.leases.countTenants(leaseId)) <= 1) throw new ConflictError("A lease needs at least one tenant", "LAST_TENANT");
    if (!(await this.leases.removeTenant(leaseId, accountId))) throw new NotFoundError("Tenant");
    return this.detail(propertyId, leaseId);
  }
}

export class AddLeaseMemberUseCase extends Base implements IUseCase<IAddLeaseMemberCommand, ITenancyDetailResponse> {
  constructor(leases: ITenancyRepository, policy: AccessPolicy, private readonly invitations: IInvitationRepository) {
    super(leases, policy);
  }
  async execute(c: IAddLeaseMemberCommand) {
    await this.manage(c);
    const core = await this.core(c.propertyId, c.leaseId);
    const joinedAt = c.joinedAt ?? (today() < core.startDate ? core.startDate : today());
    if (joinedAt < core.startDate) throw invalid("Invalid join date", "joinedAt", "Must be on/after the lease start");
    await this.leases.addMember(c, joinedAt);
    await inviteToLease(this.invitations, c, c.phoneNumber);
    return this.detail(c.propertyId, c.leaseId);
  }
}

export class UpdateLeaseMemberUseCase extends Base implements IUseCase<IUpdateLeaseMemberCommand, ITenancyDetailResponse> {
  async execute(c: IUpdateLeaseMemberCommand) {
    await this.manage(c);
    await this.core(c.propertyId, c.leaseId);
    const member = await this.leases.findMember(c.leaseId, c.memberId);
    if (!member) throw new NotFoundError("Member");
    if (c.leftAt && c.leftAt < member.joinedAt) throw invalid("Invalid leave date", "leftAt", `Must be on/after ${member.joinedAt}`);
    await this.leases.updateMember(c);
    return this.detail(c.propertyId, c.leaseId);
  }
}

export class CreateSubscriptionUseCase extends Base implements IUseCase<ICreateSubscriptionCommand, ISubscriptionResponse> {
  async execute(c: ICreateSubscriptionCommand) {
    const startDate = await this.validate(c);
    return this.leases.createSubscription(c, startDate);
  }

  /** Authorisation + every rule of adding a subscription; returns the effective start date. */
  async validate(c: ICreateSubscriptionCommand): Promise<string> {
    await this.manage(c);
    const core = await this.core(c.propertyId, c.leaseId);
    if (core.terminatedAt) throw new ConflictError("The lease is terminated", "LEASE_TERMINATED");
    const service = await this.leases.findService(c.propertyId, c.serviceId);
    if (!service) throw new NotFoundError("Service");

    if (service.usageBase === "meter") {
      if (!c.meterId) throw invalid("A meter is required for this service", "meterId", "Required for meter services");
      const meter = await this.leases.findMeter(c.propertyId, c.meterId);
      if (!meter) throw new NotFoundError("Meter");
      if (meter.unitId !== core.unitId) throw invalid("The meter is not in the lease unit", "meterId", "Wrong unit");
      if (meter.serviceId !== c.serviceId) throw invalid("The meter belongs to another service", "meterId", "Wrong service");
      if (meter.removedAt) throw invalid("The meter was removed", "meterId", `Removed on ${meter.removedAt}`);
    } else if (c.meterId) {
      throw invalid("Only meter services take a meter", "meterId", "Not a meter service");
    }
    if (service.usageBase !== "device" && c.quantity !== 1) throw invalid("Only device services take a quantity", "quantity", "Must be 1");

    const startDate = c.startDate ?? (today() < core.startDate ? core.startDate : today());
    const lastDay = core.terminatedAt ?? core.endDate;
    if (startDate < core.startDate || (lastDay && startDate > lastDay)) throw invalid("Start date outside the lease", "startDate", "Outside the lease period");
    if (c.endDate && lastDay && c.endDate > lastDay) throw invalid("End date outside the lease", "endDate", `Must be on/before ${lastDay}`);
    if (await this.leases.hasSubscriptionOverlap(c.leaseId, c.serviceId, startDate, c.endDate ?? null)) {
      throw new ConflictError("The lease already has this service in that period", "SUBSCRIPTION_OVERLAP");
    }
    return startDate;
  }
}

export class UpdateSubscriptionUseCase extends Base implements IUseCase<IUpdateSubscriptionCommand, ISubscriptionResponse> {
  async execute(c: IUpdateSubscriptionCommand) {
    await this.manage(c);
    await this.core(c.propertyId, c.leaseId);
    const sub = await this.leases.findSubscription(c.leaseId, c.subscriptionId);
    if (!sub) throw new NotFoundError("Subscription");
    if (c.quantity !== undefined && sub.usageBase !== "device" && c.quantity !== 1) throw invalid("Only device services take a quantity", "quantity", "Must be 1");
    if (c.endDate && c.endDate < sub.startDate) throw invalid("Invalid end date", "endDate", `Must be on/after ${sub.startDate}`);
    if (c.endDate !== undefined && (await this.leases.hasSubscriptionOverlap(c.leaseId, sub.serviceId, sub.startDate, c.endDate, sub.id))) {
      throw new ConflictError("The lease already has this service in that period", "SUBSCRIPTION_OVERLAP");
    }
    return this.leases.updateSubscription(c);
  }
}

export class DeleteSubscriptionUseCase extends Base implements IUseCase<IPropertyScope & Lease & { subscriptionId: string }, void> {
  async execute({ actor, propertyId, leaseId, subscriptionId }: IPropertyScope & Lease & { subscriptionId: string }) {
    await this.manage({ actor, propertyId });
    await this.core(propertyId, leaseId);
    if (!(await this.leases.softDeleteSubscription(leaseId, subscriptionId))) throw new NotFoundError("Subscription");
  }
}
