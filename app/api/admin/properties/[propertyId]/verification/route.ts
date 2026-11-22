import { getContainer } from "@/server/container";
import { adminRoute, ok } from "@/server/http/route";

// GET /api/admin/properties/:propertyId/verification   status + every active criterion with this property's declaration
export const GET = adminRoute(async ({ scope }) => ok(await getContainer().getPropertyVerification.execute(scope)));
