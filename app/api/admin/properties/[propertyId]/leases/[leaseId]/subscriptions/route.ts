import { getContainer } from "@/server/container";
import { adminRoute, created, parseBody, parseParams } from "@/server/http/route";
import { addSubscriptionPayloadSchema, toAddSubscriptionCommand } from "@/server/modules/lifecycle/lifecycle.schema";
import { idParamsSchema } from "@/server/shared/schema";

// POST /api/admin/properties/:propertyId/leases/:leaseId/subscriptions
// Mid-term aware: on a running lease it also creates the running period's usage and, for non-meter services, an invoice for the rest of the period.
// extra body fields: amount (override the prorated suggestion), dueDate, reading (meter value on the start date).
export const POST = adminRoute(async ({ request, params, scope }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  return created(await getContainer().addSubscription.execute(toAddSubscriptionCommand(await parseBody(addSubscriptionPayloadSchema, request), scope, leaseId)));
});
