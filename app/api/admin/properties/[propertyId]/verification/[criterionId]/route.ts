import { getContainer } from "@/server/container";
import { adminRoute, ok, parseParams } from "@/server/http/route";
import { criterionParamsSchema } from "@/server/modules/verification/verification.schema";

// DELETE /api/admin/properties/:propertyId/verification/:criterionId   withdraw the declaration
export const DELETE = adminRoute(async ({ params, scope }) => {
  const { criterionId } = parseParams(criterionParamsSchema, params);
  return ok(await getContainer().withdrawCriterion.execute({ ...scope, criterionId }));
});
