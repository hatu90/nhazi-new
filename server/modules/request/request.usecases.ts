import type { IActor, IPropertyScope } from "@/server/shared/actor";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import type { IAccessRepository } from "../access/access.repository";
import type { IRequestRepository } from "./request.repository";
import {
  canTransition,
  isClosed,
  type IAdminCommentCommand,
  type IAdminRequestListQuery,
  type ICommentResponse,
  type ICreateRequestCommand,
  type IRequestDetailResponse,
  type IRequestListResponse,
  type ITenantCommentCommand,
  type ITenantRequestListQuery,
  type IUpdateRequestCommand,
} from "./request.schema";

const bad = (message: string, path: string) => new ValidationError(message, { fieldErrors: { [path]: [message] } });
const CLOSED = () => new ConflictError("The request is closed", "REQUEST_CLOSED");

// ── staff ───────────────────────────────────────────────────────────────────────────
export class ListRequestsUseCase implements IUseCase<IPropertyScope & { query: IAdminRequestListQuery }, IRequestListResponse> {
  constructor(private readonly requests: IRequestRepository, private readonly policy: AccessPolicy) {}
  async execute({ actor, propertyId, query }: IPropertyScope & { query: IAdminRequestListQuery }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.requests.listForProperty(propertyId, query);
  }
}

export class GetRequestUseCase implements IUseCase<IPropertyScope & { requestId: string }, IRequestDetailResponse> {
  constructor(private readonly requests: IRequestRepository, private readonly policy: AccessPolicy) {}
  async execute({ actor, propertyId, requestId }: IPropertyScope & { requestId: string }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    const r = await this.requests.find({ propertyId }, requestId);
    if (!r) throw new NotFoundError("Request");
    return r;
  }
}

/** Technicians work requests (status, assignment); only owner/admin may re-prioritise. */
export class UpdateRequestUseCase implements IUseCase<IUpdateRequestCommand, IRequestDetailResponse> {
  constructor(
    private readonly requests: IRequestRepository,
    private readonly policy: AccessPolicy,
    private readonly access: IAccessRepository,
  ) {}
  async execute(c: IUpdateRequestCommand) {
    const role = await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.field);
    const current = await this.requests.find({ propertyId: c.propertyId }, c.requestId);
    if (!current) throw new NotFoundError("Request");
    if (c.priority !== undefined && role === "technician") throw bad("Technicians cannot change the priority", "priority");
    if (c.status !== undefined && !canTransition(current.status, c.status)) {
      throw new ConflictError(`Cannot move a request from ${current.status} to ${c.status}`, "INVALID_TRANSITION");
    }
    if (c.assignedTo) {
      const assigneeRole = await this.access.findPropertyRole(c.assignedTo, c.propertyId);
      if (!assigneeRole || !(ROLES.field as readonly string[]).includes(assigneeRole)) throw bad("Assignee must be owner, admin or technician of the property", "assignedTo");
    }
    const closing = c.status !== undefined && isClosed(c.status) && !isClosed(current.status);
    await this.requests.update(c, closing ? new Date() : null);
    return (await this.requests.find({ propertyId: c.propertyId }, c.requestId))!;
  }
}

export class AddStaffCommentUseCase implements IUseCase<IAdminCommentCommand, ICommentResponse> {
  constructor(private readonly requests: IRequestRepository, private readonly policy: AccessPolicy) {}
  async execute(c: IAdminCommentCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.field);
    const r = await this.requests.find({ propertyId: c.propertyId }, c.requestId);
    if (!r) throw new NotFoundError("Request");
    if (isClosed(r.status)) throw CLOSED();
    return this.requests.addComment(c.requestId, c.actor.accountId, c.body);
  }
}

// ── tenant ──────────────────────────────────────────────────────────────────────────
type TenantLease = { actor: IActor; leaseId: string };
abstract class TenantBase {
  constructor(protected readonly requests: IRequestRepository) {}
  protected async lease(actor: IActor, leaseId: string) {
    const l = await this.requests.findTenantLease(actor.accountId, leaseId);
    if (!l) throw new NotFoundError("Lease");
    return l;
  }
  protected async own(actor: IActor, leaseId: string, requestId: string) {
    await this.lease(actor, leaseId);
    const r = await this.requests.find({ leaseId }, requestId);
    if (!r) throw new NotFoundError("Request");
    return r;
  }
}

export class ListMyRequestsUseCase extends TenantBase implements IUseCase<TenantLease & { query: ITenantRequestListQuery }, IRequestListResponse> {
  async execute({ actor, leaseId, query }: TenantLease & { query: ITenantRequestListQuery }) {
    await this.lease(actor, leaseId);
    return this.requests.listForLease(leaseId, query);
  }
}
export class GetMyRequestUseCase extends TenantBase implements IUseCase<TenantLease & { requestId: string }, IRequestDetailResponse> {
  execute({ actor, leaseId, requestId }: TenantLease & { requestId: string }) {
    return this.own(actor, leaseId, requestId);
  }
}
export class CreateMyRequestUseCase extends TenantBase implements IUseCase<ICreateRequestCommand, IRequestDetailResponse> {
  async execute(c: ICreateRequestCommand) {
    const lease = await this.lease(c.actor, c.leaseId);
    const id = await this.requests.create(c, lease);
    return (await this.requests.find({ leaseId: c.leaseId }, id))!;
  }
}
export class CancelMyRequestUseCase extends TenantBase implements IUseCase<TenantLease & { requestId: string }, IRequestDetailResponse> {
  async execute({ actor, leaseId, requestId }: TenantLease & { requestId: string }) {
    const r = await this.own(actor, leaseId, requestId);
    if (!canTransition(r.status, "cancelled")) throw new ConflictError("This request can no longer be cancelled", "INVALID_TRANSITION");
    if (r.status !== "cancelled") await this.requests.setStatus(requestId, "cancelled", new Date());
    return (await this.requests.find({ leaseId }, requestId))!;
  }
}
export class AddMyCommentUseCase extends TenantBase implements IUseCase<ITenantCommentCommand, ICommentResponse> {
  async execute(c: ITenantCommentCommand) {
    const r = await this.own(c.actor, c.leaseId, c.requestId);
    if (isClosed(r.status)) throw CLOSED();
    return this.requests.addComment(c.requestId, c.actor.accountId, c.body);
  }
}
