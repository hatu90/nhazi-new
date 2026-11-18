import { getContainer } from "@/server/container";
import { adminRoute, ok, parseParams } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

// POST /api/admin/properties/:propertyId/invitations/:invitationId/revoke   Withdraw an open invitation.
export const POST = adminRoute(async ({ params, scope }) => {
  const { invitationId } = parseParams(idParamsSchema("invitationId"), params);
  return ok(await getContainer().revokeInvitation.execute({ ...scope, invitationId }));
});
