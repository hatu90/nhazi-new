import { getContainer } from "@/server/container";
import { adminRoute, ok, parseParams } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

// POST /api/admin/properties/:propertyId/billing-periods/:periodId/close
// Needs a closing reading for every meter usage; sets the metered quantities.
export const POST = adminRoute(async ({ params, scope }) =>
  ok(await getContainer().closeBillingPeriod.execute({ ...scope, ...parseParams(idParamsSchema("periodId"), params) })));
