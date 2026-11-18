import { getContainer } from "@/server/container";
import { adminRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { closePeriodPayloadSchema, toClosePeriodCommand } from "@/server/modules/lifecycle/lifecycle.schema";
import { idParamsSchema } from "@/server/shared/schema";

// POST /api/admin/properties/:propertyId/billing-periods/:periodId/close
// body (all optional): { endDate, readings: [{meterId, value}], next: { endDate }, dueDate, title, overrides, extraItems }
// Closes the period (mid-term with `endDate`), computes the metered usage, and with `next` rolls over: opens the next
// period and issues the transition invoice (prefilled rent / services / meter usage / credit; override by line key).
export const POST = adminRoute(async ({ request, params, scope }) => {
  const { periodId } = parseParams(idParamsSchema("periodId"), params);
  const body = (await request.clone().text()) ? await parseBody(closePeriodPayloadSchema, request) : closePeriodPayloadSchema.parse({});
  return ok(await getContainer().closeBillingPeriod.execute(toClosePeriodCommand(body, scope, periodId)));
});
