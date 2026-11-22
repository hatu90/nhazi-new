import { getContainer } from "@/server/container";
import { authedRoute, ok } from "@/server/http/route";

// GET /api/me/notifications/unread-count   { unread }
export const GET = authedRoute(async ({ actor }) => ok(await getContainer().countMyUnread.execute({ actor })));
