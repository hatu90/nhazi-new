import { noNotifier, type INotifier } from "../notification/notification.publisher";
import type { IPropertyScope } from "@/server/shared/actor";
import type { IPaginated } from "@/server/shared/pagination";
import { ConflictError, NotFoundError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import { resolveLeaseStatus, today } from "../lease/lease.rules";
import type { IInvitationRepository } from "./invitation.repository";
import type {
  IInvitationListQuery,
  IInvitationResponse,
  IInvitePropertyCommand,
  IInviteTenantCommand,
  IMyInvitationListQuery,
  IRespondInvitationCommand,
  IRevokeInvitationCommand,
} from "./invitation.schema";
import type { IActor } from "@/server/shared/actor";

type Page = IPaginated<IInvitationResponse>;
const notPending = () => new ConflictError("This invitation is no longer open", "INVITATION_NOT_PENDING");

// ── admin side ──────────────────────────────────────────────────────────────────────
abstract class AdminBase {
  constructor(protected readonly invitations: IInvitationRepository, protected readonly policy: AccessPolicy, protected readonly notifier: INotifier = noNotifier) {}
}

/** Ask someone to join the property team. Team management is owner-only (same as adding a member). */
export class InvitePropertyUseCase extends AdminBase implements IUseCase<IInvitePropertyCommand, IInvitationResponse> {
  async execute(c: IInvitePropertyCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.ownerOnly);
    if (await this.invitations.isMember(c.propertyId, c.phoneNumber)) {
      throw new ConflictError("This person is already a member of the property", "ALREADY_MEMBER");
    }
    const inv = await this.invitations.create({
      kind: "property",
      propertyId: c.propertyId,
      leaseId: null,
      phoneNumber: c.phoneNumber,
      role: c.role,
      invitedBy: c.actor.accountId,
    });
    await this.notifier.publish({ event: "invitation.received", targetType: "invitation", targetId: inv.id, actorId: c.actor.accountId });
    return inv;
  }
}

/** Ask someone to become a tenant of a lease (they then see it under /api/lease). */
export class InviteTenantUseCase extends AdminBase implements IUseCase<IInviteTenantCommand, IInvitationResponse> {
  async execute(c: IInviteTenantCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    const lease = await this.invitations.findLease(c.propertyId, c.leaseId);
    if (!lease) throw new NotFoundError("Lease");
    if (resolveLeaseStatus(lease, today()) === "ended") throw new ConflictError("The lease has ended", "LEASE_ENDED");
    if (await this.invitations.isTenant(c.leaseId, c.phoneNumber)) {
      throw new ConflictError("This person is already a tenant of the lease", "ALREADY_TENANT");
    }
    const inv = await this.invitations.create({
      kind: "lease",
      propertyId: c.propertyId,
      leaseId: c.leaseId,
      phoneNumber: c.phoneNumber,
      role: null,
      invitedBy: c.actor.accountId,
    });
    await this.notifier.publish({ event: "invitation.received", targetType: "invitation", targetId: inv.id, actorId: c.actor.accountId });
    return inv;
  }
}

export class ListInvitationsUseCase extends AdminBase implements IUseCase<IPropertyScope & { query: IInvitationListQuery }, Page> {
  async execute({ actor, propertyId, query }: IPropertyScope & { query: IInvitationListQuery }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.manage);
    return this.invitations.list(propertyId, query);
  }
}

/** Withdraw an open invitation. Property invitations need an owner, tenant invitations any manager. */
export class RevokeInvitationUseCase extends AdminBase implements IUseCase<IRevokeInvitationCommand, IInvitationResponse> {
  async execute({ actor, propertyId, invitationId }: IRevokeInvitationCommand) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.manage);
    const inv = await this.invitations.findInProperty(propertyId, invitationId);
    if (!inv) throw new NotFoundError("Invitation");
    if (inv.kind === "property") await this.policy.assertPropertyRole(actor, propertyId, ROLES.ownerOnly);
    if (!(await this.invitations.revoke(propertyId, invitationId))) throw notPending();
    return { ...inv, status: "revoked" as const };
  }
}

// ── invitee side: the phone number on the account is the only credential ─────────────
abstract class InviteeBase {
  constructor(protected readonly invitations: IInvitationRepository, protected readonly notifier: INotifier = noNotifier) {}
  protected async phoneOf(actor: IActor) {
    const phone = await this.invitations.findAccountPhone(actor.accountId);
    if (!phone) throw new NotFoundError("Account");
    return phone;
  }
}

export class ListMyInvitationsUseCase extends InviteeBase implements IUseCase<{ actor: IActor; query: IMyInvitationListQuery }, Page> {
  async execute({ actor, query }: { actor: IActor; query: IMyInvitationListQuery }) {
    return this.invitations.listForPhone(await this.phoneOf(actor), query);
  }
}

/** Accept or decline. An invitation addressed to another phone simply does not exist for the caller. */
export class RespondInvitationUseCase extends InviteeBase implements IUseCase<IRespondInvitationCommand, IInvitationResponse> {
  async execute({ actor, invitationId, decision }: IRespondInvitationCommand) {
    const phone = await this.phoneOf(actor);
    const inv = await this.invitations.findForPhone(phone, invitationId);
    if (!inv) throw new NotFoundError("Invitation");
    if (inv.status !== "pending") throw notPending();
    if (decision === "accepted" && inv.lease && resolveLeaseStatus(inv.lease, today()) === "ended") {
      throw new ConflictError("The lease has ended", "LEASE_ENDED");
    }
    if (!(await this.invitations.respond(invitationId, actor.accountId, decision))) throw notPending();
    const after = await this.invitations.findForPhone(phone, invitationId);
    if (!after) throw new NotFoundError("Invitation");
    await this.notifier.publish({ event: decision === "accepted" ? "invitation.accepted" : "invitation.declined", targetType: "invitation", targetId: invitationId, actorId: actor.accountId });
    return after;
  }
}
