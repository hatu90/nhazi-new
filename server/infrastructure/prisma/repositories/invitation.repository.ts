import type { IInvitationRepository, INewInvitation } from "@/server/modules/invitation/invitation.repository";
import type { IInvitationLease, IInvitationResponse } from "@/server/modules/invitation/invitation.schema";
import { paginated, toSkipTake, type IPaginationQuery } from "@/server/shared/pagination";
import type { Prisma, PrismaClient } from "../client";
import { isoDate, isoDateOrNull, isoDateTime, orConflict } from "../mappers";

const include = {
  property: { select: { id: true, propertyName: true } },
  lease: { select: { id: true, startDate: true, endDate: true, terminatedAt: true, unit: { select: { unitName: true } } } },
  invitedByRef: { select: { id: true, displayName: true } },
} satisfies Prisma.InvitationInclude;

const toInvitation = (r: Prisma.InvitationGetPayload<{ include: typeof include }>): IInvitationResponse => ({
  id: r.id,
  kind: r.kind,
  status: r.status,
  phoneNumber: r.phoneNumber,
  role: r.role,
  property: { id: r.property.id, name: r.property.propertyName },
  lease: r.lease && {
    id: r.lease.id,
    unitName: r.lease.unit.unitName,
    startDate: isoDate(r.lease.startDate),
    endDate: isoDateOrNull(r.lease.endDate),
    terminatedAt: isoDateOrNull(r.lease.terminatedAt),
  },
  invitedBy: { accountId: r.invitedByRef.id, displayName: r.invitedByRef.displayName },
  createdAt: isoDateTime(r.createdAt),
  respondedAt: r.respondedAt && isoDateTime(r.respondedAt),
});

/** Invitations to a deleted property / lease are dead: never shown. */
const alive: Prisma.InvitationWhereInput = { property: { deletedAt: null }, OR: [{ leaseId: null }, { lease: { deletedAt: null } }] };

export class PrismaInvitationRepository implements IInvitationRepository {
  constructor(private readonly db: PrismaClient) {}

  create(c: INewInvitation) {
    return orConflict(
      async () => toInvitation(await this.db.invitation.create({ data: c, include })),
      "This phone number already has an open invitation",
      "ALREADY_INVITED",
    );
  }

  private async page(where: Prisma.InvitationWhereInput, q: IPaginationQuery) {
    const w: Prisma.InvitationWhereInput = { AND: [alive, where] };
    const [rows, total] = await Promise.all([
      this.db.invitation.findMany({ where: w, include, orderBy: [{ createdAt: "desc" }, { id: "asc" }], ...toSkipTake(q) }),
      this.db.invitation.count({ where: w }),
    ]);
    return paginated(rows.map(toInvitation), total, q);
  }

  list(propertyId: string, q: Parameters<IInvitationRepository["list"]>[1]) {
    return this.page({ propertyId, ...(q.kind && { kind: q.kind }), ...(q.status && { status: q.status }), ...(q.leaseId && { leaseId: q.leaseId }) }, q);
  }
  async findInProperty(propertyId: string, invitationId: string) {
    const r = await this.db.invitation.findFirst({ where: { AND: [alive, { id: invitationId, propertyId }] }, include });
    return r ? toInvitation(r) : null;
  }
  async findLease(propertyId: string, leaseId: string): Promise<IInvitationLease | null> {
    const r = await this.db.lease.findFirst({
      where: { id: leaseId, propertyId, deletedAt: null },
      select: { id: true, startDate: true, endDate: true, terminatedAt: true, unit: { select: { unitName: true } } },
    });
    return (
      r && { id: r.id, unitName: r.unit.unitName, startDate: isoDate(r.startDate), endDate: isoDateOrNull(r.endDate), terminatedAt: isoDateOrNull(r.terminatedAt) }
    );
  }
  async isMember(propertyId: string, phoneNumber: string) {
    return (await this.db.accountProperty.count({ where: { propertyId, account: { phoneNumber, deletedAt: null } } })) > 0;
  }
  async isTenant(leaseId: string, phoneNumber: string) {
    return (await this.db.accountLease.count({ where: { leaseId, account: { phoneNumber, deletedAt: null } } })) > 0;
  }
  async revoke(propertyId: string, invitationId: string) {
    const r = await this.db.invitation.updateMany({ where: { id: invitationId, propertyId, status: "pending" }, data: { status: "revoked" } });
    return r.count === 1;
  }

  async findAccountPhone(accountId: string) {
    const a = await this.db.account.findFirst({ where: { id: accountId, deletedAt: null }, select: { phoneNumber: true } });
    return a?.phoneNumber ?? null;
  }
  listForPhone(phoneNumber: string, q: Parameters<IInvitationRepository["listForPhone"]>[1]) {
    return this.page({ phoneNumber, status: q.status }, q);
  }
  async findForPhone(phoneNumber: string, invitationId: string) {
    const r = await this.db.invitation.findFirst({ where: { AND: [alive, { id: invitationId, phoneNumber }] }, include });
    return r ? toInvitation(r) : null;
  }

  respond(invitationId: string, accountId: string, decision: "accepted" | "declined") {
    return this.db.$transaction(async (tx) => {
      // the status guard makes concurrent answers safe: only one wins
      const closed = await tx.invitation.updateMany({
        where: { id: invitationId, status: "pending" },
        data: { status: decision, respondedBy: accountId, respondedAt: new Date() },
      });
      if (closed.count === 0) return false;
      if (decision === "accepted") {
        const inv = await tx.invitation.findUniqueOrThrow({ where: { id: invitationId } });
        if (inv.kind === "property" && inv.role) {
          await tx.accountProperty.createMany({ data: [{ propertyId: inv.propertyId, accountId, role: inv.role }], skipDuplicates: true });
        } else if (inv.leaseId) {
          await tx.accountLease.createMany({ data: [{ leaseId: inv.leaseId, accountId }], skipDuplicates: true });
        }
      }
      return true;
    });
  }
}
