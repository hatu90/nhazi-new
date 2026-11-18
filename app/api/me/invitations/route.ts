import { getContainer } from "@/server/container";
import { authedRoute, ok, parseQuery } from "@/server/http/route";
import { myInvitationListQuerySchema } from "@/server/modules/invitation/invitation.schema";

// GET /api/me/invitations?status=pending&page&pageSize   Invitations sent to my phone number.
export const GET = authedRoute(async ({ request, actor }) =>
  ok(await getContainer().listMyInvitations.execute({ actor, query: parseQuery(myInvitationListQuerySchema, request) })));
