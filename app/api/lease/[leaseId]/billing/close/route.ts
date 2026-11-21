import { getContainer } from "@/server/container";
import { authedRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { closeMyPeriodPayloadSchema } from "@/server/modules/lifecycle/lifecycle.schema";
import { idParamsSchema } from "@/server/shared/schema";

// POST /api/lease/:leaseId/billing/close   { endDate?, readings: [{ meterId, value }] }
// The tenant enters the meter readings and closes the running period; the next one opens with its invoice (next rent, non-meter services, this period's metered usage).
export const POST = authedRoute(async ({ request, params, actor }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  return ok(await getContainer().closeMyPeriod.execute({ actor, leaseId, payload: await parseBody(closeMyPeriodPayloadSchema, request) }));
});
