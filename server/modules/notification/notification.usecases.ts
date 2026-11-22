import type { IActor } from "@/server/shared/actor";
import { NotFoundError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { today } from "../lease/lease.rules";
import type { INotifier } from "./notification.publisher";
import type { INotificationRepository } from "./notification.repository";
import type { INotificationListQuery, INotificationListResponse, IPushTokenCommand } from "./notification.schema";

export class ListMyNotificationsUseCase implements IUseCase<{ actor: IActor; query: INotificationListQuery }, INotificationListResponse> {
  constructor(private readonly notifications: INotificationRepository) {}
  execute({ actor, query }: { actor: IActor; query: INotificationListQuery }) {
    return this.notifications.list(actor.accountId, query);
  }
}

export class CountMyUnreadUseCase implements IUseCase<{ actor: IActor }, { unread: number }> {
  constructor(private readonly notifications: INotificationRepository) {}
  async execute({ actor }: { actor: IActor }) {
    return { unread: await this.notifications.unreadCount(actor.accountId) };
  }
}

export class MarkNotificationReadUseCase implements IUseCase<{ actor: IActor; notificationId: string }, void> {
  constructor(private readonly notifications: INotificationRepository) {}
  async execute({ actor, notificationId }: { actor: IActor; notificationId: string }) {
    if (!(await this.notifications.markRead(actor.accountId, notificationId))) throw new NotFoundError("Notification");
  }
}

export class MarkAllNotificationsReadUseCase implements IUseCase<{ actor: IActor }, { updated: number }> {
  constructor(private readonly notifications: INotificationRepository) {}
  async execute({ actor }: { actor: IActor }) {
    return { updated: await this.notifications.markAllRead(actor.accountId) };
  }
}

export class RegisterPushTokenUseCase implements IUseCase<IPushTokenCommand, void> {
  constructor(private readonly notifications: INotificationRepository) {}
  execute(c: IPushTokenCommand) {
    return this.notifications.saveToken(c.actor.accountId, c.token, c.platform, c.userAgent);
  }
}

export class UnregisterPushTokenUseCase implements IUseCase<{ actor: IActor; token: string }, void> {
  constructor(private readonly notifications: INotificationRepository) {}
  execute({ actor, token }: { actor: IActor; token: string }) {
    return this.notifications.removeToken(actor.accountId, token);
  }
}

/** A signed-up phone gets the invitations that were sent to it before it had an account. */
export class BackfillInvitationNotificationsUseCase implements IUseCase<{ accountId: string; phoneNumber: string }, void> {
  constructor(private readonly notifications: INotificationRepository, private readonly notifier: INotifier) {}
  async execute({ accountId, phoneNumber }: { accountId: string; phoneNumber: string }) {
    for (const id of await this.notifications.pendingInvitationIds(phoneNumber)) {
      await this.notifier.publish({ event: "invitation.received", targetType: "invitation", targetId: id, dedupeKey: `invitation.received:${id}:${accountId}` });
    }
  }
}

// ── scheduled ───────────────────────────────────────────────────────────────────────
/** A billing period that ends within this many days is "closing soon". */
export const CLOSING_SOON_DAYS = 3;
const BATCH = 500;
const WEEK = 7;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10);

export interface IScheduledResult {
  periods: number;
  invoices: number;
}

/**
 * Run once a day (POST /api/cron/notifications).
 *  - billing period: "closing soon" once, from CLOSING_SOON_DAYS before its end date; "overdue" the day after, repeated weekly until closed.
 *  - invoice: "overdue" the day after its due date, repeated weekly until paid or cancelled.
 * Safe to run any number of times a day: the dedupe key makes a repeat store and push nothing.
 */
export class RunScheduledNotificationsUseCase implements IUseCase<{ now?: string } | void, IScheduledResult> {
  constructor(private readonly notifications: INotificationRepository, private readonly notifier: INotifier) {}

  async execute(input?: { now?: string } | void): Promise<IScheduledResult> {
    const day = input?.now ?? today();
    const periods = await this.notifications.periodsEndingBy(addDays(day, CLOSING_SOON_DAYS), BATCH);
    for (const p of periods) {
      const late = daysBetween(p.endDate, day);
      await this.notifier.publish(late > 0
        ? { event: "billing_period.overdue", targetType: "billing_period", targetId: p.id, extra: { daysLate: late }, dedupeKey: `billing_period.overdue:${p.id}:${Math.floor((late - 1) / WEEK)}` }
        : { event: "billing_period.closing_soon", targetType: "billing_period", targetId: p.id, dedupeKey: `billing_period.closing_soon:${p.id}` });
    }
    const invoices = await this.notifications.overdueInvoices(day, BATCH);
    for (const i of invoices) {
      const late = daysBetween(i.dueDate, day);
      await this.notifier.publish({ event: "invoice.overdue", targetType: "invoice", targetId: i.id, extra: { daysLate: late }, dedupeKey: `invoice.overdue:${i.id}:${Math.floor((late - 1) / WEEK)}` });
    }
    return { periods: periods.length, invoices: invoices.length };
  }
}
