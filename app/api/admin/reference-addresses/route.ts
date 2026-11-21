import { getContainer } from "@/server/container";
import { authedRoute, created, parseBody } from "@/server/http/route";
import { createReferenceAddressPayloadSchema } from "@/server/modules/reference-address/reference-address.schema";

// POST /api/admin/reference-addresses   { name }   find-or-create by slug
export const POST = authedRoute(async ({ request }) => {
  const payload = await parseBody(createReferenceAddressPayloadSchema, request);
  return created(await getContainer().createReferenceAddress.execute(payload));
});
