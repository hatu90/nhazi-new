import { getContainer } from "@/server/container";
import { adminRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { criterionParamsSchema, declarePayloadSchema } from "@/server/modules/verification/verification.schema";

// PUT /api/admin/properties/:propertyId/verification/:criterionId   { note? }   declare as met (or re-declare); sends it to staff review. Owner / admin.
export const PUT = adminRoute(async ({ request, params, scope }) => {
  const { criterionId } = parseParams(criterionParamsSchema, params);
  const { note } = await parseBody(declarePayloadSchema, request);
  return ok(await getContainer().declareCriterion.execute({ ...scope, criterionId, note: note ?? null }));
});

// DELETE /api/admin/properties/:propertyId/verification/:criterionId   withdraw the declaration
export const DELETE = adminRoute(async ({ params, scope }) => {
  const { criterionId } = parseParams(criterionParamsSchema, params);
  return ok(await getContainer().withdrawCriterion.execute({ ...scope, criterionId }));
});
