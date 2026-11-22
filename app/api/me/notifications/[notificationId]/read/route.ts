import { getContainer } from "@/server/container";
import { authedRoute, noContent, parseParams } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

// POST /api/me/notifications/:notificationId/read
export const POST = authedRoute(async ({ params, actor }) => {
  const { notificationId } = parseParams(idParamsSchema("notificationId"), params);
  await getContainer().markNotificationRead.execute({ actor, notificationId });
  return noContent();
});
