import { getContainer } from "@/server/container";
import { adminRoute, ok } from "@/server/http/route";

// GET /api/admin/properties/:propertyId/stats : the dashboard KPIs (any member).
export const GET = adminRoute(async ({ scope }) => ok(await getContainer().getPropertyStats.execute(scope)));
