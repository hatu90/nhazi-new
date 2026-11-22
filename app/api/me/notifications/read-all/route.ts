import { getContainer } from "@/server/container";
import { authedRoute, ok } from "@/server/http/route";

// POST /api/me/notifications/read-all
export const POST = authedRoute(async ({ actor }) => ok(await getContainer().markAllNotificationsRead.execute({ actor })));
