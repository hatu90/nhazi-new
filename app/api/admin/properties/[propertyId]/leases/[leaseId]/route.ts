import { getContainer } from "@/server/container";
import { adminRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { toUpdateLeaseCommand, updateLeasePayloadSchema } from "@/server/modules/tenancy/tenancy.schema";
import { idParamsSchema } from "@/server/shared/schema";

const ids = idParamsSchema("leaseId");
export const GET = adminRoute(async ({ params, scope }) =>
  ok(await getContainer().getTenancy.execute({ ...scope, ...parseParams(ids, params) })));

export const PATCH = adminRoute(async ({ request, params, scope }) => {
  const { leaseId } = parseParams(ids, params);
  return ok(await getContainer().updateTenancy.execute(toUpdateLeaseCommand(await parseBody(updateLeasePayloadSchema, request), scope, leaseId)));
});
