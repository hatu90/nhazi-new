import type {
  INewNotification,
  INotificationListQuery,
  INotificationListResponse,
  INotificationResponse,
  NotificationTargetType,
} from "./notification.schema";

/** Everything the event catalog needs to know about a target and the people around it. */
export interface ITargetContext {
  targetType: NotificationTargetType;
  targetId: string;
  propertyId: string;
  propertyName: string;
  leaseId: string | null;
  unitName: string | null;
  /** The lease exists for tenants: it has been started (drafts are invisible to them). */
  leaseStarted: boolean;
  /** Invoice / request title, template name, ... */
  label: string;
  /** Request / payment / invoice / lease status when relevant. */
  status: string | null;
  amount: number | null;
  /** Invoice due date, period / lease end date (yyyy-mm-dd). */
  date: string | null;
  /** Billing period start. */
  startDate: string | null;
  /** Who made the target: request.requestedBy, payment.createdBy, invitation.invitedBy, comment.authorId. */
  creatorId: string | null;
  creatorName: string | null;
  /** request / request_comment: who filed the request. */
  requesterId: string | null;
  assigneeId: string | null;
  /** invitation: the account that owns the invited phone, when there is one. */
  inviteeId: string | null;
  /** invitation: role (team) or null (tenant). */
  role: string | null;
  /** request_comment: the request; payment: the invoice. */
  parentId: string | null;
  /** owner + admin of the property. */
  managerIds: string[];
  /** owner + admin + technician. */
  fieldIds: string[];
  /** Accounts on the lease. */
  tenantIds: string[];
}

export interface IPushTokenRow {
  accountId: string;
  token: string;
}

export interface INotificationRepository {
  // ── receiver side ────────────────────────────────────────────────────────────────
  list(accountId: string, query: INotificationListQuery): Promise<INotificationListResponse>;
  unreadCount(accountId: string): Promise<number>;
  /** false when it is not the account's. */
  markRead(accountId: string, notificationId: string): Promise<boolean>;
  markAllRead(accountId: string): Promise<number>;

  // ── publishing ───────────────────────────────────────────────────────────────────
  contextOf(targetType: NotificationTargetType, targetId: string): Promise<ITargetContext | null>;
  /** Stores the rows; rows whose (receiver, dedupeKey) already exist are skipped. Returns only the ones that were new. */
  insertMany(rows: INewNotification[]): Promise<(INotificationResponse & { receiverId: string })[]>;
  /** Pending invitations for `phone` have no notification yet when the account is created later: write them once the account exists. */
  pendingInvitationIds(phoneNumber: string): Promise<string[]>;
  findAccountIdByPhone(phoneNumber: string): Promise<string | null>;
  displayName(accountId: string): Promise<string | null>;

  // ── devices ──────────────────────────────────────────────────────────────────────
  saveToken(accountId: string, token: string, platform: string, userAgent: string | null): Promise<void>;
  removeToken(accountId: string, token: string): Promise<void>;
  tokensOf(accountIds: string[]): Promise<IPushTokenRow[]>;
  /** Tokens FCM said are dead. */
  dropTokens(tokens: string[]): Promise<void>;

  // ── scheduled jobs ───────────────────────────────────────────────────────────────
  /** Active billing periods of started, not ended leases whose end date is on or before `until`. */
  periodsEndingBy(until: string, limit: number, afterId?: string): Promise<{ id: string; endDate: string }[]>;
  /** Pending / partial invoices with a due date before `today`. */
  overdueInvoices(today: string, limit: number, afterId?: string): Promise<{ id: string; dueDate: string }[]>;
}
