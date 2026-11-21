import { getContainer } from "@/server/container";
import { authedRoute, created, parseBody, parseParams } from "@/server/http/route";
import { createEnquiryPayloadSchema, toCreateEnquiryCommand } from "@/server/modules/request/request.schema";
import { idParamsSchema } from "@/server/shared/schema";

// POST /api/public/properties/:propertyId/enquiries   A signed-in account asks the landlord about the property.
export const POST = authedRoute(async ({ request, params, actor }) => {
  const { propertyId } = parseParams(idParamsSchema("propertyId"), params);
  return created(await getContainer().createEnquiry.execute(toCreateEnquiryCommand(await parseBody(createEnquiryPayloadSchema, request), actor, propertyId)));
});

