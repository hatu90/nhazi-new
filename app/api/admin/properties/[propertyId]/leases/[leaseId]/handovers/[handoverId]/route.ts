import { getContainer } from "@/server/container";
import { adminRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { toUpdateLeaseHandoverCommand, updateLeaseHandoverPayloadSchema } from "@/server/modules/tenancy/tenancy.schema";
import { idParamsSchema } from "@/server/shared/schema";

export const PATCH = adminRoute(async ({ request, params, scope }) => {
  const { leaseId, handoverId } = parseParams(idParamsSchema("leaseId", "handoverId"), params);
  return ok(await getContainer().updateLeaseHandover.execute(toUpdateLeaseHandoverCommand(await parseBody(updateLeaseHandoverPayloadSchema, request), scope, leaseId, handoverId)));
});
