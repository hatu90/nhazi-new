import { getContainer } from "@/server/container";
import { authedRoute, noContent, ok, parseBody, parseParams } from "@/server/http/route";
import { criterionParamsSchema, updateCriterionPayloadSchema } from "@/server/modules/verification/verification.schema";

// PATCH /api/admin/verification/criteria/:criterionId   any of the create fields; every property's status is re-derived
export const PATCH = authedRoute(async ({ request, params, actor }) => {
  const { criterionId } = parseParams(criterionParamsSchema, params);
  return ok(await getContainer().updateCriterion.execute({ ...(await parseBody(updateCriterionPayloadSchema, request)), actor, criterionId }));
});

// DELETE /api/admin/verification/criteria/:criterionId   also deletes the declarations of it (deactivate instead to keep them)
export const DELETE = authedRoute(async ({ params, actor }) => {
  const { criterionId } = parseParams(criterionParamsSchema, params);
  await getContainer().deleteCriterion.execute({ actor, criterionId });
  return noContent();
});
