import { getContainer } from "@/server/container";
import { ok, parseQuery, publicRoute } from "@/server/http/route";
import { referenceAddressSearchQuerySchema } from "@/server/modules/reference-address/reference-address.schema";

// GET /api/public/reference-addresses?q=&page=&pageSize=
export const GET = publicRoute(async ({ request }) => {
  const query = parseQuery(referenceAddressSearchQuerySchema, request);
  return ok(await getContainer().searchReferenceAddresses.execute(query));
});
