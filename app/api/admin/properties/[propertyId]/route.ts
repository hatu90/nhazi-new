import { getContainer } from "@/server/container";
import { adminRoute, authedRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { toUpdatePropertyCommand, updatePropertyPayloadSchema } from "@/server/modules/property/property.schema";
import { idParamsSchema } from "@/server/shared/schema";

// GET /api/admin/properties/:propertyId
export const GET = authedRoute(async ({ params, actor }) => {
  const { propertyId } = parseParams(idParamsSchema("propertyId"), params);
  return ok(await getContainer().getManagedProperty.execute({ actor, propertyId }));
});

// PATCH /api/admin/properties/:propertyId   body: any of { name, category, street, province+ward, rentPriceFrom/To, rentNegotiable, headerImage, images, rules }
// Setup: images (storage keys), header image, rules. Owner / admin.
export const PATCH = adminRoute(async ({ request, scope }) =>
  ok(await getContainer().updateProperty.execute(toUpdatePropertyCommand(await parseBody(updatePropertyPayloadSchema, request), scope))));
