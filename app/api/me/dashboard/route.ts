import { getContainer } from "@/server/container";
import { authedRoute, ok } from "@/server/http/route";

// GET /api/me/dashboard : home dashboard numbers, as a property member (management) and as a tenant.
export const GET = authedRoute(async ({ actor }) => ok(await getContainer().getMyDashboard.execute(actor)));
