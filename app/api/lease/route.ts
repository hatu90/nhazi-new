import { getContainer } from "@/server/container";
import { authedRoute, ok, parseQuery } from "@/server/http/route";
import { leaseListQuerySchema } from "@/server/modules/lease/lease.schema";

// GET /api/lease?page=&pageSize=      the caller's leases (as tenant)
export const GET = authedRoute(async ({ request, actor }) => {
  const query = parseQuery(leaseListQuerySchema, request);
  return ok(await getContainer().listMyLeases.execute({ actor, query }));
});
