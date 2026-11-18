import { getContainer } from "@/server/container";
import { adminRoute, created, parseBody, parseParams } from "@/server/http/route";
import { openPeriodPayloadSchema, toOpenPeriodCommand } from "@/server/modules/billing/billing.schema";
import { idParamsSchema } from "@/server/shared/schema";

// POST /api/admin/properties/:propertyId/leases/:leaseId/billing-periods   body: { endDate, rentAmount? }
// Opens the next period (start = lease start, or the day after the previous period) and freezes the usages + prices.
export const POST = adminRoute(async ({ request, params, scope }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  return created(await getContainer().openBillingPeriod.execute(toOpenPeriodCommand(await parseBody(openPeriodPayloadSchema, request), scope, leaseId)));
});
