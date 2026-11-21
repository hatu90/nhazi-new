import { getContainer } from "@/server/container";
import { authedRoute, ok, parseParams } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

// GET /api/lease/:leaseId/billing   the running period (+ meters to read) and the invoice split of the latest periods
export const GET = authedRoute(async ({ params, actor }) =>
  ok(await getContainer().getMyBilling.execute({ actor, ...parseParams(idParamsSchema("leaseId"), params) })));
