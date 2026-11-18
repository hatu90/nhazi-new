import { getContainer } from "@/server/container";
import { adminRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { terminateLeasePayloadSchema, toTerminateLeaseCommand } from "@/server/modules/tenancy/tenancy.schema";
import { idParamsSchema } from "@/server/shared/schema";

export const POST = adminRoute(async ({ request, params, scope }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  return ok(await getContainer().terminateTenancy.execute(toTerminateLeaseCommand(await parseBody(terminateLeasePayloadSchema, request), scope, leaseId)));
});
