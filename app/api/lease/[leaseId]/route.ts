import { getContainer } from "@/server/container";
import { authedRoute, ok, parseParams } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

// GET /api/lease/:leaseId
export const GET = authedRoute(async ({ params, actor }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  return ok(await getContainer().getMyLease.execute({ actor, leaseId }));
});
