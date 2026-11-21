import { getContainer } from "@/server/container";
import { authedRoute, ok, parseParams, parseQuery } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";
import { z } from "zod";

// Tenant: short-lived signed URL for a file under this lease (`?path=`).
export const GET = authedRoute(async ({ request, params, actor }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  const { path } = parseQuery(z.object({ path: z.string().min(1).max(500) }), request);
  return ok(await getContainer().getLeaseFileUrl.execute({ actor, leaseId, path }));
});
