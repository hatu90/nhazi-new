import { z } from "zod";
import type { IActor } from "@/server/shared/actor";
import { paginationQuerySchema } from "@/server/shared/pagination";

/** What a notification is about. */
export const NOTIFICATION_TARGETS = ["lease", "invitation", "agreement", "billing_period", "request", "request_comment", "invoice", "payment"] as const;
export type NotificationTargetType = (typeof NOTIFICATION_TARGETS)[number];

/** What happened. `<target>.<verb>`; the client may localise from `event` + `metadata`. */
export const NOTIFICATION_EVENTS = [
  "invitation.received", "invitation.accepted", "invitation.declined",
  "lease.started", "lease.ended",
  "agreement.updated",
  "billing_period.closed", "billing_period.closing_soon", "billing_period.overdue",
  "request.created", "request.status_changed", "request.assigned",
  "request_comment.created",
  "invoice.created", "invoice.cancelled", "invoice.overdue",
  "payment.recorded", "payment.reported", "payment.confirmed", "payment.rejected",
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

/** How soon the receiver has to act: `urgent` = overdue, `warning` = needs a decision / due within days, `info` = just so you know. */
export type NotificationSeverity = "info" | "warning" | "urgent";

/** Which client app opens `path`: the landlord app (/admin) or the tenant app (/dashboard). */
export type NotificationArea = "admin" | "dashboard";

/** Context stored next to the target, so the UI can group / link without more lookups. All optional: not every target has a property or a lease. */
export interface INotificationMetadata {
  propertyId?: string;
  propertyName?: string;
  leaseId?: string;
  unitName?: string;
  requestId?: string;
  invoiceId?: string;
  billingPeriodId?: string;
  [key: string]: string | number | null | undefined;
}

export interface INotificationResponse {
  id: string;
  event: NotificationEvent;
  targetType: NotificationTargetType;
  targetId: string;
  severity: NotificationSeverity;
  title: string;
  body: string;
  area: NotificationArea;
  /** Route inside `area`'s app. */
  path: string;
  metadata: INotificationMetadata;
  /** Null = unread. */
  readAt: string | null;
  createdAt: string;
}
export interface INotificationListResponse {
  items: INotificationResponse[];
  total: number;
  page: number;
  pageSize: number;
  unread: number;
}

// ── GET /api/me/notifications ───────────────────────────────────────────────────────
export const notificationListQuerySchema = paginationQuerySchema.extend({
  unread: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
  targetType: z.enum(NOTIFICATION_TARGETS).optional(),
});
export type INotificationListQuery = z.infer<typeof notificationListQuerySchema>;


// ── POST / DELETE /api/me/push-tokens ───────────────────────────────────────────────
export const pushTokenPayloadSchema = z.object({
  token: z.string().trim().min(20).max(4096),
  platform: z.enum(["web", "android", "ios"]).default("web"),
});
export type IPushTokenPayload = z.infer<typeof pushTokenPayloadSchema>;
export interface IPushTokenCommand extends IPushTokenPayload {
  actor: IActor;
  userAgent: string | null;
}

// ── what the publisher and the repository exchange ──────────────────────────────────
/** One row to store (and push) for one receiver. */
export interface INewNotification {
  receiverId: string;
  actorId: string | null;
  event: NotificationEvent;
  targetType: NotificationTargetType;
  targetId: string;
  severity: NotificationSeverity;
  title: string;
  body: string;
  area: NotificationArea;
  path: string;
  metadata: INotificationMetadata;
  /** Unique per receiver: publishing the same key twice stores (and pushes) once. Null = always store. */
  dedupeKey: string | null;
}
