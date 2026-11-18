import { getContainer } from "@/server/container";
import { adminRoute, noContent, ok, parseBody, parseParams } from "@/server/http/route";
import { changeMemberRolePayloadSchema, toChangeMemberRoleCommand } from "@/server/modules/member/member.schema";
import { idParamsSchema } from "@/server/shared/schema";

const ids = idParamsSchema("accountId");
export const PATCH = adminRoute(async ({ request, params, scope }) => {
  const { accountId } = parseParams(ids, params);
  return ok(await getContainer().changeMemberRole.execute(toChangeMemberRoleCommand(await parseBody(changeMemberRolePayloadSchema, request), scope, accountId)));
});

export const DELETE = adminRoute(async ({ params, scope }) => {
  await getContainer().removeMember.execute({ ...scope, ...parseParams(ids, params) });
  return noContent();
});
