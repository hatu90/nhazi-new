import { getContainer } from "@/server/container";
import { created, identityRoute, parseBody } from "@/server/http/route";
import { registerPayloadSchema, toRegisterCommand } from "@/server/modules/identity/identity.schema";

// POST /api/public/register   (Authorization: Bearer <Firebase ID token>)  body: { displayName, phoneNumber }
export const POST = identityRoute(async ({ request, identity }) => {
  const payload = await parseBody(registerPayloadSchema, request);
  return created(await getContainer().register.execute(toRegisterCommand(payload, identity)));
});
