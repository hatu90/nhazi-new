import { getContainer } from "@/server/container";
import { adminRoute, created, ok, parseBody, parseParams, parseQuery } from "@/server/http/route";
import { invitationListQuerySchema, inviteTenantPayloadSchema, toInviteTenantCommand } from "@/server/modules/invitation/invitation.schema";
import { idParamsSchema } from "@/server/shared/schema";

const ids = idParamsSchema("leaseId");

// GET /api/admin/properties/:propertyId/leases/:leaseId/invitations?status&page&pageSize
export const GET = adminRoute(async ({ request, params, scope }) => {
  const { leaseId } = parseParams(ids, params);
  const query = { ...parseQuery(invitationListQuerySchema, request), kind: "lease" as const, leaseId };
  return ok(await getContainer().listInvitations.execute({ ...scope, query }));
});

// POST  body: { phoneNumber }   Invite someone to become a tenant of this lease.
export const POST = adminRoute(async ({ request, params, scope }) => {
  const { leaseId } = parseParams(ids, params);
  return created(await getContainer().inviteTenant.execute(toInviteTenantCommand(await parseBody(inviteTenantPayloadSchema, request), scope, leaseId)));
});
