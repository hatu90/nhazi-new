export type NotificationKind = "request" | "invoice" | "payment";

/** Which client app opens `path`: the landlord app (/admin) or the tenant app (/dashboard). */
export type NotificationArea = "admin" | "dashboard";

/** One thing waiting for the caller (invitations are served separately by /api/me/invitations). */
export interface INotificationResponse {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  area: NotificationArea;
  /** Route inside `area`'s app. */
  path: string;
  createdAt: string;
}
export interface INotificationListResponse {
  items: INotificationResponse[];
}
