import type { IPaginated } from "@/server/shared/pagination";
import type { InvitationKind, PropertyRole } from "@/server/shared/schema";
import type { IInvitationListQuery, IInvitationLease, IInvitationResponse, IMyInvitationListQuery } from "./invitation.schema";

export interface INewInvitation {
  kind: InvitationKind;
  propertyId: string;
  leaseId: string | null;
  phoneNumber: string;
  role: PropertyRole | null;
  invitedBy: string;
}

export interface IInvitationRepository {
  /** ConflictError ALREADY_INVITED when an open invitation for this phone + target exists. */
  create(c: INewInvitation): Promise<IInvitationResponse>;

  // admin side (scoped to a property)
  list(propertyId: string, query: IInvitationListQuery): Promise<IPaginated<IInvitationResponse>>;
  findInProperty(propertyId: string, invitationId: string): Promise<IInvitationResponse | null>;
  findLease(propertyId: string, leaseId: string): Promise<IInvitationLease | null>;
  isMember(propertyId: string, phoneNumber: string): Promise<boolean>;
  isTenant(leaseId: string, phoneNumber: string): Promise<boolean>;
  /** true when it was pending and is now revoked. */
  revoke(propertyId: string, invitationId: string): Promise<boolean>;

  // invitee side (scoped to a phone number)
  findAccountPhone(accountId: string): Promise<string | null>;
  listForPhone(phoneNumber: string, query: IMyInvitationListQuery): Promise<IPaginated<IInvitationResponse>>;
  findForPhone(phoneNumber: string, invitationId: string): Promise<IInvitationResponse | null>;
  /**
   * Atomically close a pending invitation; on "accepted" also grant the access
   * (property membership / lease tenancy, an existing one is kept as is).
   * false when it was no longer pending.
   */
  respond(invitationId: string, accountId: string, decision: "accepted" | "declined"): Promise<boolean>;
}
