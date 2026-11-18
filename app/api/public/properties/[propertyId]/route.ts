import { getContainer } from "@/server/container";
import { ok, parseParams, publicRoute } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

// GET /api/public/properties/:propertyId
export const GET = publicRoute(async ({ params }) => {
  const { propertyId } = parseParams(idParamsSchema("propertyId"), params);
  return ok(await getContainer().getPublicProperty.execute({ propertyId }));
});
