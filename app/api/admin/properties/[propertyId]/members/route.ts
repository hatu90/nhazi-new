import { getContainer } from "@/server/container";
import { adminRoute, created, ok, parseBody } from "@/server/http/route";
import { addMemberPayloadSchema, toAddMemberCommand } from "@/server/modules/member/member.schema";

export const GET = adminRoute(async ({ scope }) => ok(await getContainer().listMembers.execute(scope)));

// owner only: the account must already be registered
export const POST = adminRoute(async ({ request, scope }) =>
  created(await getContainer().addMember.execute(toAddMemberCommand(await parseBody(addMemberPayloadSchema, request), scope))));
