import { getContainer } from "@/server/container";
import { authedRoute, ok, parseParams } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

// POST /api/me/invitations/:invitationId/accept
export const POST = authedRoute(async ({ params, actor }) => {
  const { invitationId } = parseParams(idParamsSchema("invitationId"), params);
  return ok(await getContainer().respondInvitation.execute({ actor, invitationId, decision: "accepted" }));
});
