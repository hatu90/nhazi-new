import { getContainer } from "@/server/container";
import { authedRoute, noContent, parseBody } from "@/server/http/route";
import { pushTokenPayloadSchema } from "@/server/modules/notification/notification.schema";

// POST /api/me/push-tokens   body: { token, platform? }   Register this browser / device for push (FCM).
export const POST = authedRoute(async ({ request, actor }) => {
  const payload = await parseBody(pushTokenPayloadSchema, request);
  await getContainer().registerPushToken.execute({ ...payload, actor, userAgent: request.headers.get("user-agent") });
  return noContent();
});

// DELETE /api/me/push-tokens   body: { token }   Stop pushing to this browser / device.
export const DELETE = authedRoute(async ({ request, actor }) => {
  const { token } = await parseBody(pushTokenPayloadSchema.pick({ token: true }), request);
  await getContainer().unregisterPushToken.execute({ actor, token });
  return noContent();
});
