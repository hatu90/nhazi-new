import { getContainer } from "@/server/container";
import { authedRoute, ok } from "@/server/http/route";

// GET /api/me/notifications   Requests to handle, invoices to pay, payments to confirm (invitations: /api/me/invitations).
export const GET = authedRoute(async ({ actor }) => ok(await getContainer().listMyNotifications.execute({ actor })));
