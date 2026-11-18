import { getContainer } from "@/server/container";
import { adminRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { toUpdateLeaseMemberCommand, updateLeaseMemberPayloadSchema } from "@/server/modules/tenancy/tenancy.schema";
import { idParamsSchema } from "@/server/shared/schema";

export const PATCH = adminRoute(async ({ request, params, scope }) => {
  const { leaseId, memberId } = parseParams(idParamsSchema("leaseId", "memberId"), params);
  return ok(await getContainer().updateLeaseMember.execute(toUpdateLeaseMemberCommand(await parseBody(updateLeaseMemberPayloadSchema, request), scope, leaseId, memberId)));
});
