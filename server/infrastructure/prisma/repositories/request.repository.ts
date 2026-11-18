import type { IRequestRepository, IRequestScope } from "@/server/modules/request/request.repository";
import type {
  IAdminRequestListQuery,
  ICommentResponse,
  ICreateRequestCommand,
  IRequestDetailResponse,
  IRequestResponse,
  ITenantRequestListQuery,
  IUpdateRequestCommand,
  RequestStatus,
} from "@/server/modules/request/request.schema";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import type { Prisma, PrismaClient } from "../client";
import { isoDateOrNull, isoDateTime } from "../mappers";

const person = { select: { id: true, displayName: true } } as const;
const include = {
  unit: { select: { unitName: true } },
  requestedByRef: person,
  assignedToRef: person,
} satisfies Prisma.RequestInclude;
type Row = Prisma.RequestGetPayload<{ include: typeof include }>;

const toRequest = (r: Row): IRequestResponse => ({
  id: r.id,
  propertyId: r.propertyId,
  unitId: r.unitId,
  unitName: r.unit?.unitName ?? null,
  leaseId: r.leaseId,
  type: r.type,
  title: r.title,
  description: r.description,
  priority: r.priority,
  status: r.status,
  requestedBy: r.requestedByRef,
  assignedTo: r.assignedToRef,
  requestedCloseDate: isoDateOrNull(r.requestedCloseDate),
  closedAt: r.closedAt ? isoDateTime(r.closedAt) : null,
  createdAt: isoDateTime(r.createdAt),
});
const commentInclude = { author: person } satisfies Prisma.RequestCommentInclude;
const toComment = (c: Prisma.RequestCommentGetPayload<{ include: typeof commentInclude }>): ICommentResponse => ({
  id: c.id,
  requestId: c.requestId,
  author: c.author,
  body: c.body,
  createdAt: isoDateTime(c.createdAt),
});

const scopeWhere = (s: IRequestScope): Prisma.RequestWhereInput => ({ deletedAt: null, ...s });

export class PrismaRequestRepository implements IRequestRepository {
  constructor(private readonly db: PrismaClient) {}

  private async page(where: Prisma.RequestWhereInput, q: { page: number; pageSize: number }) {
    const [rows, total] = await Promise.all([
      this.db.request.findMany({ where, include, orderBy: [{ createdAt: "desc" }, { id: "asc" }], ...toSkipTake(q) }),
      this.db.request.count({ where }),
    ]);
    return paginated(rows.map(toRequest), total, q);
  }

  listForProperty(propertyId: string, q: IAdminRequestListQuery) {
    return this.page(
      { ...scopeWhere({ propertyId }), ...(q.status && { status: q.status }), ...(q.type && { type: q.type }), ...(q.priority && { priority: q.priority }), ...(q.unitId && { unitId: q.unitId }), ...(q.assignedTo && { assignedTo: q.assignedTo }) },
      q,
    );
  }
  listForLease(leaseId: string, q: ITenantRequestListQuery) {
    return this.page({ ...scopeWhere({ leaseId }), ...(q.status && { status: q.status }), ...(q.type && { type: q.type }) }, q);
  }

  async find(scope: IRequestScope, requestId: string): Promise<IRequestDetailResponse | null> {
    const r = await this.db.request.findFirst({
      where: { ...scopeWhere(scope), id: requestId },
      include: { ...include, requestComments: { include: commentInclude, orderBy: { createdAt: "asc" } } },
    });
    return r && { ...toRequest(r), comments: r.requestComments.map(toComment) };
  }

  async findTenantLease(accountId: string, leaseId: string) {
    const l = await this.db.lease.findFirst({
      where: { id: leaseId, deletedAt: null, accountLeases: { some: { accountId } } },
      select: { id: true, propertyId: true, unitId: true },
    });
    return l;
  }

  async create(c: ICreateRequestCommand, lease: { propertyId: string; unitId: string }) {
    const r = await this.db.request.create({
      data: {
        propertyId: lease.propertyId,
        unitId: lease.unitId,
        leaseId: c.leaseId,
        type: c.type,
        title: c.title,
        description: c.description,
        priority: c.priority,
        requestedBy: c.actor.accountId,
        requestedCloseDate: c.requestedCloseDate ? new Date(c.requestedCloseDate) : undefined,
      },
      select: { id: true },
    });
    return r.id;
  }

  async update(c: IUpdateRequestCommand, closeAt: Date | null) {
    await this.db.request.update({
      where: { id: c.requestId },
      data: { status: c.status, priority: c.priority, assignedTo: c.assignedTo, ...(closeAt && { closedAt: closeAt }) },
    });
  }
  async setStatus(requestId: string, status: RequestStatus, closedAt: Date | null) {
    await this.db.request.update({ where: { id: requestId }, data: { status, closedAt } });
  }

  async addComment(requestId: string, authorId: string, body: string) {
    return toComment(await this.db.requestComment.create({ data: { requestId, authorId, body }, include: commentInclude }));
  }
}
