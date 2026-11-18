import { getContainer } from "@/server/container";
import { adminRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { toUpdateUsageCommand, updateUsagePayloadSchema } from "@/server/modules/billing/billing.schema";
import { idParamsSchema } from "@/server/shared/schema";

// PATCH .../billing-periods/:periodId/usages/:usageId   body: { quantity }   (lease / device / member usages only)
export const PATCH = adminRoute(async ({ request, params, scope }) => {
  const { periodId, usageId } = parseParams(idParamsSchema("periodId", "usageId"), params);
  return ok(await getContainer().updateUsage.execute(toUpdateUsageCommand(await parseBody(updateUsagePayloadSchema, request), scope, periodId, usageId)));
});
