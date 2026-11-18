import { getContainer } from "@/server/container";
import { ok, parseQuery, publicRoute } from "@/server/http/route";
import { propertySearchQuerySchema } from "@/server/modules/property/property.schema";

// GET /api/public/properties?q=&provinceCode=&wardCode=&category=&minPrice=&maxPrice=&page=&pageSize=
export const GET = publicRoute(async ({ request }) => {
  const query = parseQuery(propertySearchQuerySchema, request);
  return ok(await getContainer().searchProperties.execute(query));
});
