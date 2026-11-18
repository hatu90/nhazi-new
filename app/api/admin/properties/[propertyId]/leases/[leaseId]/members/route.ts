import { getContainer } from "@/server/container";
import { adminRoute, created, parseBody, parseParams } from "@/server/http/route";
import { addLeaseMemberPayloadSchema, toAddLeaseMemberCommand } from "@/server/modules/tenancy/tenancy.schema";
import { idParamsSchema } from "@/server/shared/schema";

export const POST = adminRoute(async ({ request, params, scope }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  return created(await getContainer().addLeaseMember.execute(toAddLeaseMemberCommand(await parseBody(addLeaseMemberPayloadSchema, request), scope, leaseId)));
});
