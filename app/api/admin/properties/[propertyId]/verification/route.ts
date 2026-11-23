import { getContainer } from "@/server/container";
import { adminRoute, ok, parseBody } from "@/server/http/route";
import { declareManyPayloadSchema } from "@/server/modules/verification/verification.schema";

// GET /api/admin/properties/:propertyId/verification   status + every active criterion with this property's declaration
export const GET = adminRoute(async ({ scope }) => ok(await getContainer().getPropertyVerification.execute(scope)));

// POST /api/admin/properties/:propertyId/verification   { criterionIds, note? }   declare the chosen undeclared / rejected criteria at once; sends them to staff review. Owner / admin.
export const POST = adminRoute(async ({ request, scope }) => {
  const { criterionIds, note } = await parseBody(declareManyPayloadSchema, request);
  return ok(await getContainer().declareAllCriteria.execute({ ...scope, criterionIds, note: note ?? null }));
});
