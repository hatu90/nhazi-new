import { getContainer } from "@/server/container";
import { adminRoute, created, parseBody, parseParams } from "@/server/http/route";
import { addTenantPayloadSchema, toAddTenantCommand } from "@/server/modules/tenancy/tenancy.schema";
import { idParamsSchema } from "@/server/shared/schema";

export const POST = adminRoute(async ({ request, params, scope }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  return created(await getContainer().addTenant.execute(toAddTenantCommand(await parseBody(addTenantPayloadSchema, request), scope, leaseId)));
});
