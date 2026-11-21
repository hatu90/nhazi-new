import { getContainer } from "@/server/container";
import { adminRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { closePeriodPayloadSchema, toClosePeriodCommand } from "@/server/modules/lifecycle/lifecycle.schema";
import { idParamsSchema } from "@/server/shared/schema";

// POST /api/admin/properties/:propertyId/billing-periods/:periodId/close/preview   same body as .../close; writes nothing, returns the invoice it would issue.
export const POST = adminRoute(async ({ request, params, scope }) => {
  const { periodId } = parseParams(idParamsSchema("periodId"), params);
  return ok(await getContainer().closeBillingPeriod.preview(toClosePeriodCommand(await parseBody(closePeriodPayloadSchema, request), scope, periodId)));
});
