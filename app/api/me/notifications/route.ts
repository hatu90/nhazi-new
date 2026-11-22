import { getContainer } from "@/server/container";
import { authedRoute, ok, parseQuery } from "@/server/http/route";
import { notificationListQuerySchema } from "@/server/modules/notification/notification.schema";

// GET /api/me/notifications?unread=true&targetType=invoice&page&pageSize   My notifications, newest first (+ the unread total).
export const GET = authedRoute(async ({ request, actor }) =>
  ok(await getContainer().listMyNotifications.execute({ actor, query: parseQuery(notificationListQuerySchema, request) })));
