import { getContainer } from "@/server/container";
import { authedRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { closeMyPeriodPayloadSchema } from "@/server/modules/lifecycle/lifecycle.schema";
import { idParamsSchema } from "@/server/shared/schema";

// POST /api/lease/:leaseId/billing/close/preview   same body as .../close; writes nothing, returns the invoice that closing would issue.
export const POST = authedRoute(async ({ request, params, actor }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  return ok(await getContainer().closeMyPeriod.preview({ actor, leaseId, payload: await parseBody(closeMyPeriodPayloadSchema, request) }));
});
