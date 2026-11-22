import { getContainer } from "@/server/container";
import { adminRoute, ok, parseParams, parseQuery } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";
import { z } from "zod";

// Any property member: short-lived signed URL for a file under this lease (`?path=`).
export const GET = adminRoute(async ({ request, params, scope }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  const { path } = parseQuery(z.object({ path: z.string().min(1).max(500) }), request);
  return ok(await getContainer().getAdminLeaseFileUrl.execute({ ...scope, leaseId, path }));
});
