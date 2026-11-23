import { metadataOf, pathFor, plan, type IEventExtra } from "./notification.events";
import type { INotificationRepository } from "./notification.repository";
import type { IPushSender } from "./notification.push";
import type { INewNotification, NotificationEvent, NotificationTargetType } from "./notification.schema";

export interface IPublishInput {
  event: NotificationEvent;
  targetType: NotificationTargetType;
  targetId: string;
  /** Who caused it: never notified about their own action. */
  actorId?: string | null;
  extra?: IEventExtra;
  /** Same key twice = once (scheduled jobs). */
  dedupeKey?: string;
}

/** What usecases depend on. */
export interface INotifier {
  publish(input: IPublishInput): Promise<void>;
}

/** Used where nothing should be sent (tests, scripts). */
export const noNotifier: INotifier = { publish: async () => {} };

/** Prefix of the app path in a click-through URL: the landlord app lives under /admin, the tenant app under /dashboard. */
export const appUrl = (area: "admin" | "dashboard", path: string) => `/${area}${path === "/" ? "" : path}`;

/**
 * Turns a domain event into one stored notification per receiver and pushes it to their devices.
 * Best effort by design: a failure here is logged and never fails the action that caused it.
 */
export class NotificationPublisher implements INotifier {
  constructor(private readonly repo: INotificationRepository, private readonly push: IPushSender | null) {}

  async publish(input: IPublishInput): Promise<void> {
    try {
      await this.run(input);
    } catch (err) {
      console.error(`[notifications] ${input.event} ${input.targetId} failed`, err);
    }
  }

  private async run({ event, targetType, targetId, actorId = null, extra = {}, dedupeKey }: IPublishInput) {
    const ctx = await this.repo.contextOf(targetType, targetId);
    if (!ctx) return;
    if ((event === "invitation.accepted" || event === "invitation.declined") && actorId && !extra.actorName) {
      extra = { ...extra, actorName: (await this.repo.displayName(actorId)) ?? undefined };
    }
    const { groups } = plan(event, ctx, extra);
    const metadata = metadataOf(ctx);
    const seen = new Set<string>();
    const rows: INewNotification[] = [];
    for (const g of groups) {
      for (const receiverId of g.ids) {
        if (receiverId === actorId || seen.has(receiverId)) continue; // one message per person per event
        seen.add(receiverId);
        rows.push({
          receiverId, actorId, event, targetType, targetId,
          severity: g.severity, title: g.title, body: g.body, area: g.area,
          path: pathFor(ctx, g.area), metadata,
          dedupeKey: dedupeKey ? `${dedupeKey}` : null,
        });
      }
    }
    if (rows.length === 0) { console.info(`[notifications] ${event} ${targetId}: no receivers`); return; }
    const stored = await this.repo.insertMany(rows);
    console.info(`[notifications] ${event} ${targetId}: stored ${stored.length}/${rows.length}`);
    await this.pushAll(stored);
  }

  private async pushAll(stored: { receiverId: string; id: string; event: string; title: string; body: string; area: "admin" | "dashboard"; path: string }[]) {
    if (!this.push || stored.length === 0) return;
    const tokens = await this.repo.tokensOf(stored.map((s) => s.receiverId));
    console.info(`[push] ${stored.length} notification(s), ${tokens.length} device token(s) for ${new Set(stored.map((s) => s.receiverId)).size} receiver(s)`);
    const dead: string[] = [];
    await Promise.all(stored.map(async (n) => {
      const mine = tokens.filter((t) => t.accountId === n.receiverId).map((t) => t.token);
      if (mine.length === 0) { console.info(`[push] receiver ${n.receiverId} has no registered device`); return; }
      const { invalidTokens } = await this.push!.send(mine, {
        title: n.title,
        body: n.body,
        data: { notificationId: n.id, event: n.event, url: appUrl(n.area, n.path) },
      });
      dead.push(...invalidTokens);
    }));
    if (dead.length) await this.repo.dropTokens(dead);
  }
}
