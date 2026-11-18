import { getContainer } from "@/server/container";
import { authedRoute, ok, parseParams } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

// GET /api/admin/properties/:propertyId
export const GET = authedRoute(async ({ params, actor }) => {
  const { propertyId } = parseParams(idParamsSchema("propertyId"), params);
  return ok(await getContainer().getManagedProperty.execute({ actor, propertyId }));
});
