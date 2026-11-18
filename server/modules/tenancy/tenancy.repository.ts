import type { IPaginated } from "@/server/shared/pagination";
import type { ServiceUsageBase } from "@/server/shared/schema";
import type { IRentVersion } from "../lease/lease.schema";
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
  ITerminateLeaseCommand,
  IUpdateLeaseCommand,
  IUpdateLeaseHandoverCommand,
  IUpdateLeaseMemberCommand,
  IUpdateSubscriptionCommand,
} from "./tenancy.schema";

/** The few facts the rules need about a lease. Dates are YYYY-MM-DD. */
export interface ILeaseCore {
  id: string;
  unitId: string;
  startDate: string;
  endDate: string | null;
  terminatedAt: string | null;
  /** null = draft */
  activatedAt: string | null;
  hasAgreement: boolean;
  /** Latest member join date (null = no members): a lease cannot end before someone moved in. */
  lastMemberJoinedAt: string | null;
  rentVersions: IRentVersion[];
}

export interface ITenancyRepository {
  list(propertyId: string, query: ITenancyListQuery, today: string): Promise<IPaginated<ITenancySummaryRecord>>;
  findDetail(propertyId: string, leaseId: string): Promise<ITenancyDetailRecord | null>;
  findCore(propertyId: string, leaseId: string): Promise<ILeaseCore | null>;

  unitExists(propertyId: string, unitId: string): Promise<boolean>;
  /** Another live lease of the unit overlapping [start, end] (end null = open-ended). */
  hasOverlap(unitId: string, start: string, end: string | null, excludeLeaseId?: string): Promise<boolean>;
  findTemplate(propertyId: string, templateId: string): Promise<{ id: string; currentVersion: number } | null>;

  /** One transaction: tenants (accounts found/created by phone), members, handover snapshot of the unit, the lease. Returns its id. */
  create(command: ICreateLeaseCommand, templateVersion: number | null): Promise<string>;
  update(command: IUpdateLeaseCommand): Promise<void>;
  /** Draft leases only (nothing was ever billed). */
  softDeleteDraft(propertyId: string, leaseId: string): Promise<boolean>;
  /** One transaction: sets termination, ends open subscriptions and members at that date. */
  terminate(command: ITerminateLeaseCommand): Promise<void>;
  addRent(command: IAddRentCommand, versions: IRentVersion[]): Promise<void>;

  /** ConflictError ALREADY_TENANT. */
  addTenant(command: IAddTenantCommand): Promise<void>;
  countTenants(leaseId: string): Promise<number>;
  removeTenant(leaseId: string, accountId: string): Promise<boolean>;

  addMember(command: IAddLeaseMemberCommand, joinedAt: string): Promise<void>;
  /** null when the member is not on the lease. */
  findMember(leaseId: string, memberId: string): Promise<{ joinedAt: string } | null>;
  updateMember(command: IUpdateLeaseMemberCommand): Promise<void>;

  findService(propertyId: string, serviceId: string): Promise<{ usageBase: ServiceUsageBase } | null>;
  findMeter(propertyId: string, meterId: string): Promise<{ unitId: string; serviceId: string; removedAt: string | null } | null>;
  hasSubscriptionOverlap(leaseId: string, serviceId: string, start: string, end: string | null, excludeId?: string): Promise<boolean>;
  createSubscription(command: ICreateSubscriptionCommand, startDate: string): Promise<ISubscriptionResponse>;
  findSubscription(leaseId: string, subscriptionId: string): Promise<ISubscriptionResponse | null>;
  updateSubscription(command: IUpdateSubscriptionCommand): Promise<ISubscriptionResponse>;
  softDeleteSubscription(leaseId: string, subscriptionId: string): Promise<boolean>;

  updateHandover(command: IUpdateLeaseHandoverCommand): Promise<boolean>;
}
