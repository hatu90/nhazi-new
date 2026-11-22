import { getContainer } from "@/server/container";
import { authedRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { reviewPayloadSchema, verificationParamsSchema } from "@/server/modules/verification/verification.schema";

// PATCH /api/admin/verification/reviews/:verificationId   { decision: "confirmed" | "rejected", years?: 1 | 2 (required to confirm), reviewNote? (required to reject) }   -> { propertyId, status }
export const PATCH = authedRoute(async ({ request, params, actor }) => {
  const { verificationId } = parseParams(verificationParamsSchema, params);
  const { decision, reviewNote, years } = await parseBody(reviewPayloadSchema, request);
  return ok(await getContainer().reviewDeclaration.execute({ actor, verificationId, decision, reviewNote: reviewNote ?? null, years: years ?? null }));
});
