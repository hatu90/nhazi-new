import { getContainer } from "@/server/container";
import { authedRoute, ok, parseBody } from "@/server/http/route";
import { toUpdateMeCommand, updateMePayloadSchema } from "@/server/modules/identity/identity.schema";

// GET /api/me
export const GET = authedRoute(async ({ actor }) => ok(await getContainer().getMe.execute(actor)));

// PATCH /api/me   body: { displayName? }
export const PATCH = authedRoute(async ({ request, actor }) => {
  const payload = await parseBody(updateMePayloadSchema, request);
  return ok(await getContainer().updateMe.execute(toUpdateMeCommand(payload, actor)));
});
