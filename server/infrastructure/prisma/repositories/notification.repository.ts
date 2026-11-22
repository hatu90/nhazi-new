import type { INotificationRepository, ITargetContext } from "@/server/modules/notification/notification.repository";
import type {
  INewNotification,
  INotificationListQuery,
  INotificationMetadata,
  INotificationResponse,
  NotificationTargetType,
} from "@/server/modules/notification/notification.schema";
import type { Prisma, PrismaClient } from "../client";
import { isoDate, isoDateTime, num, toJson } from "../mappers";

type Row = Prisma.NotificationGetPayload<object>;

const toResponse = (r: Row): INotificationResponse => ({
  id: r.id,
  event: r.event as INotificationResponse["event"],
  targetType: r.targetType,
  targetId: r.targetId,
  severity: r.severity,
  title: r.title,
  body: r.body,
  area: r.area,
  path: r.path,
  metadata: r.metadata as INotificationMetadata,
  readAt: r.readAt ? isoDateTime(r.readAt) : null,
  createdAt: isoDateTime(r.createdAt),
});

const MANAGE = ["owner", "admin"] as const;
const FIELD = ["owner", "admin", "technician"] as const;

export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly db: PrismaClient) {}

  // ── receiver side ────────────────────────────────────────────────────────────────
  async list(accountId: string, q: INotificationListQuery) {
    const where: Prisma.NotificationWhereInput = { receiverId: accountId, ...(q.unread && { readAt: null }), ...(q.targetType && { targetType: q.targetType }) };
    const [rows, total, unread] = await Promise.all([
      this.db.notification.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.db.notification.count({ where }),
      this.unreadCount(accountId),
    ]);
    return { items: rows.map(toResponse), total, page: q.page, pageSize: q.pageSize, unread };
  }
  unreadCount(accountId: string) {
    return this.db.notification.count({ where: { receiverId: accountId, readAt: null } });
  }
  async markRead(accountId: string, notificationId: string) {
    const r = await this.db.notification.updateMany({ where: { id: notificationId, receiverId: accountId, readAt: null }, data: { readAt: new Date() } });
    if (r.count > 0) return true;
    return (await this.db.notification.count({ where: { id: notificationId, receiverId: accountId } })) > 0; // already read is fine
  }
  async markAllRead(accountId: string) {
    return (await this.db.notification.updateMany({ where: { receiverId: accountId, readAt: null }, data: { readAt: new Date() } })).count;
  }

  // ── publishing ───────────────────────────────────────────────────────────────────
  async insertMany(rows: INewNotification[]) {
    const created = await this.db.notification.createManyAndReturn({
      data: rows.map((r) => ({ ...r, metadata: toJson(r.metadata) })),
      skipDuplicates: true,
    });
    return created.map((r) => ({ ...toResponse(r), receiverId: r.receiverId }));
  }
  async pendingInvitationIds(phoneNumber: string) {
    return (await this.db.invitation.findMany({ where: { phoneNumber, status: "pending" }, select: { id: true } })).map((i) => i.id);
  }
  async findAccountIdByPhone(phoneNumber: string) {
    return (await this.db.account.findFirst({ where: { phoneNumber, deletedAt: null }, select: { id: true } }))?.id ?? null;
  }
  async displayName(accountId: string) {
    return (await this.db.account.findUnique({ where: { id: accountId }, select: { displayName: true } }))?.displayName ?? null;
  }

  /** Property team + lease tenants around a target. */
  private async people(propertyId: string, leaseId: string | null) {
    const [members, tenants] = await Promise.all([
      this.db.accountProperty.findMany({ where: { propertyId, account: { deletedAt: null } }, select: { accountId: true, role: true } }),
      leaseId ? this.db.accountLease.findMany({ where: { leaseId, account: { deletedAt: null } }, select: { accountId: true } }) : Promise.resolve([]),
    ]);
    return {
      managerIds: members.filter((m) => (MANAGE as readonly string[]).includes(m.role)).map((m) => m.accountId),
      fieldIds: members.filter((m) => (FIELD as readonly string[]).includes(m.role)).map((m) => m.accountId),
      tenantIds: tenants.map((t) => t.accountId),
    };
  }

  async contextOf(targetType: NotificationTargetType, targetId: string): Promise<ITargetContext | null> {
    const empty = { label: "", status: null, amount: null, date: null, startDate: null, creatorId: null, creatorName: null, requesterId: null, assigneeId: null, inviteeId: null, role: null, parentId: null } as const;
    const base = async (part: Partial<ITargetContext> & { propertyId: string; propertyName: string; leaseId: string | null; unitName: string | null; leaseStarted: boolean }): Promise<ITargetContext> =>
      ({ ...empty, targetType, targetId, ...part, ...(await this.people(part.propertyId, part.leaseId)) });
    const unitOf = { select: { unit: { select: { unitName: true } } } } as const;

    switch (targetType) {
      case "lease":
      case "agreement": {
        const l = await this.db.lease.findFirst({ where: { id: targetId, deletedAt: null }, select: { propertyId: true, startDate: true, endDate: true, terminatedAt: true, activatedAt: true, property: { select: { propertyName: true } }, unit: { select: { unitName: true } } } });
        if (!l) return null;
        return base({ propertyId: l.propertyId, propertyName: l.property.propertyName, leaseId: targetId, unitName: l.unit.unitName, leaseStarted: l.activatedAt !== null, date: isoDate(l.terminatedAt ?? (targetType === "lease" && l.activatedAt && !l.terminatedAt ? l.startDate : l.endDate ?? l.startDate)) });
      }
      case "billing_period": {
        const p = await this.db.billingPeriod.findUnique({ where: { id: targetId }, select: { propertyId: true, leaseId: true, startDate: true, endDate: true, property: { select: { propertyName: true } }, lease: { select: { activatedAt: true, unit: { select: { unitName: true } } } } } });
        if (!p) return null;
        return base({ propertyId: p.propertyId, propertyName: p.property.propertyName, leaseId: p.leaseId, unitName: p.lease.unit.unitName, leaseStarted: p.lease.activatedAt !== null, startDate: isoDate(p.startDate), date: isoDate(p.endDate) });
      }
      case "invoice": {
        const i = await this.db.invoice.findFirst({ where: { id: targetId, deletedAt: null }, select: { propertyId: true, leaseId: true, title: true, status: true, amount: true, dueDate: true, createdBy: true, property: { select: { propertyName: true } }, lease: { select: { activatedAt: true, unit: { select: { unitName: true } } } }, payments: { where: { status: "confirmed", deletedAt: null }, select: { amount: true } } } });
        if (!i) return null;
        const left = num(i.amount) - i.payments.reduce((s, p) => s + num(p.amount), 0);
        return base({ propertyId: i.propertyId, propertyName: i.property.propertyName, leaseId: i.leaseId, unitName: i.lease.unit.unitName, leaseStarted: i.lease.activatedAt !== null, label: i.title, status: i.status, amount: left, date: isoDate(i.dueDate), creatorId: i.createdBy });
      }
      case "payment": {
        const p = await this.db.payment.findFirst({ where: { id: targetId, deletedAt: null }, select: { invoiceId: true, amount: true, status: true, createdBy: true, createdByRef: { select: { displayName: true } }, invoice: { select: { title: true, propertyId: true, leaseId: true, property: { select: { propertyName: true } }, lease: { select: { activatedAt: true, ...unitOf.select } } } } } });
        if (!p) return null;
        const i = p.invoice;
        return base({ propertyId: i.propertyId, propertyName: i.property.propertyName, leaseId: i.leaseId, unitName: i.lease.unit.unitName, leaseStarted: i.lease.activatedAt !== null, label: i.title, status: p.status, amount: num(p.amount), creatorId: p.createdBy, creatorName: p.createdByRef.displayName, parentId: p.invoiceId });
      }
      case "request": {
        const r = await this.db.request.findFirst({ where: { id: targetId, deletedAt: null }, select: { propertyId: true, leaseId: true, title: true, status: true, requestedBy: true, assignedTo: true, property: { select: { propertyName: true } }, unit: { select: { unitName: true } }, lease: { select: { activatedAt: true } }, requestedByRef: { select: { displayName: true } } } });
        if (!r) return null;
        return base({ propertyId: r.propertyId, propertyName: r.property.propertyName, leaseId: r.leaseId, unitName: r.unit?.unitName ?? null, leaseStarted: r.lease?.activatedAt != null, label: r.title, status: r.status, creatorId: r.requestedBy, creatorName: r.requestedByRef.displayName, requesterId: r.requestedBy, assigneeId: r.assignedTo });
      }
      case "request_comment": {
        const c = await this.db.requestComment.findUnique({ where: { id: targetId }, select: { requestId: true, authorId: true, author: { select: { displayName: true } }, request: { select: { propertyId: true, leaseId: true, title: true, status: true, requestedBy: true, assignedTo: true, property: { select: { propertyName: true } }, unit: { select: { unitName: true } }, lease: { select: { activatedAt: true } } } } } });
        if (!c) return null;
        const r = c.request;
        return base({ propertyId: r.propertyId, propertyName: r.property.propertyName, leaseId: r.leaseId, unitName: r.unit?.unitName ?? null, leaseStarted: r.lease?.activatedAt != null, label: r.title, status: r.status, creatorId: c.authorId, creatorName: c.author.displayName, requesterId: r.requestedBy, assigneeId: r.assignedTo, parentId: c.requestId });
      }
      case "invitation": {
        const v = await this.db.invitation.findUnique({ where: { id: targetId }, select: { propertyId: true, leaseId: true, role: true, phoneNumber: true, invitedBy: true, invitedByRef: { select: { displayName: true } }, property: { select: { propertyName: true } }, lease: { select: { unit: { select: { unitName: true } } } } } });
        if (!v) return null;
        return base({ propertyId: v.propertyId, propertyName: v.property.propertyName, leaseId: v.leaseId, unitName: v.lease?.unit.unitName ?? null, leaseStarted: true, role: v.role, creatorId: v.invitedBy, creatorName: v.invitedByRef.displayName, inviteeId: await this.findAccountIdByPhone(v.phoneNumber) });
      }
    }
  }

  // ── devices ──────────────────────────────────────────────────────────────────────
  async saveToken(accountId: string, token: string, platform: string, userAgent: string | null) {
    // a browser that signs in as someone else takes its token over
    await this.db.pushToken.upsert({
      where: { token },
      create: { accountId, token, platform, userAgent },
      update: { accountId, platform, userAgent, lastSeenAt: new Date() },
    });
  }
  async removeToken(accountId: string, token: string) {
    await this.db.pushToken.deleteMany({ where: { accountId, token } });
  }
  async tokensOf(accountIds: string[]) {
    return this.db.pushToken.findMany({ where: { accountId: { in: [...new Set(accountIds)] } }, select: { accountId: true, token: true } });
  }
  async dropTokens(tokens: string[]) {
    await this.db.pushToken.deleteMany({ where: { token: { in: tokens } } });
  }

  // ── scheduled jobs ───────────────────────────────────────────────────────────────
  async periodsEndingBy(until: string, limit: number) {
    const rows = await this.db.billingPeriod.findMany({
      where: { status: "active", endDate: { lte: new Date(until) }, lease: { deletedAt: null, activatedAt: { not: null }, terminatedAt: null } },
      select: { id: true, endDate: true },
      orderBy: { endDate: "asc" },
      take: limit,
    });
    return rows.map((r) => ({ id: r.id, endDate: isoDate(r.endDate) }));
  }
  async overdueInvoices(today: string, limit: number) {
    const rows = await this.db.invoice.findMany({
      where: { deletedAt: null, status: { in: ["pending", "partial"] }, dueDate: { lt: new Date(today) }, lease: { deletedAt: null } },
      select: { id: true, dueDate: true },
      orderBy: { dueDate: "asc" },
      take: limit,
    });
    return rows.map((r) => ({ id: r.id, dueDate: isoDate(r.dueDate) }));
  }
}

