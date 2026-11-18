import { getContainer } from "@/server/container";
import { adminRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { closeLeasePayloadSchema, toCloseLeaseCommand } from "@/server/modules/lifecycle/lifecycle.schema";
import { idParamsSchema } from "@/server/shared/schema";

// POST /api/admin/properties/:propertyId/leases/:leaseId/close
// body: { terminatedAt, reason?, readings?, dueDate?, title?, overrides?, extraItems?, refund?: { skip?, method?, note? } }
// Ends the lease: closes the running period, ends subscriptions + members, closing invoice, and a prefilled refund (unused rent / services, deposit).
export const POST = adminRoute(async ({ request, params, scope }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  return ok(await getContainer().closeLease.execute(toCloseLeaseCommand(await parseBody(closeLeasePayloadSchema, request), scope, leaseId)));
});
