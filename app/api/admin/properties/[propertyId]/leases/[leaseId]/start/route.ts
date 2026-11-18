import { getContainer } from "@/server/container";
import { adminRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { startLeasePayloadSchema, toStartLeaseCommand } from "@/server/modules/lifecycle/lifecycle.schema";
import { idParamsSchema } from "@/server/shared/schema";

// POST /api/admin/properties/:propertyId/leases/:leaseId/start
// body: { periodEnd?, readings?, dueDate?, title?, overrides?, extraItems? }
// Draft -> started: opens the first billing period and issues the move-in invoice (deposit, rent, services; prefilled, overridable).
export const POST = adminRoute(async ({ request, params, scope }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  const body = (await request.clone().text()) ? await parseBody(startLeasePayloadSchema, request) : startLeasePayloadSchema.parse({});
  return ok(await getContainer().startLease.execute(toStartLeaseCommand(body, scope, leaseId)));
});
