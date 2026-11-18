import { getContainer } from "@/server/container";
import { adminRoute, created, ok, parseBody, parseQuery } from "@/server/http/route";
import { invitationListQuerySchema, invitePropertyPayloadSchema, toInvitePropertyCommand } from "@/server/modules/invitation/invitation.schema";

// GET /api/admin/properties/:propertyId/invitations?kind&status&leaseId&page&pageSize   (owner/admin)
export const GET = adminRoute(async ({ request, scope }) =>
  ok(await getContainer().listInvitations.execute({ ...scope, query: parseQuery(invitationListQuerySchema, request) })));

// POST  body: { phoneNumber, role }   Invite someone to the property team (owner only).
export const POST = adminRoute(async ({ request, scope }) =>
  created(await getContainer().invitePropertyMember.execute(toInvitePropertyCommand(await parseBody(invitePropertyPayloadSchema, request), scope))));
