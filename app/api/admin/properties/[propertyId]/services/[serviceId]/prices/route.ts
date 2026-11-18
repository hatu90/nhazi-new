import { getContainer } from "@/server/container";
import { adminRoute, created, parseBody, parseParams } from "@/server/http/route";
import { addPricePayloadSchema, toAddPriceCommand } from "@/server/modules/service/service.schema";
import { idParamsSchema } from "@/server/shared/schema";

// POST: append a price version (effectiveDate must be later than every existing one)
export const POST = adminRoute(async ({ request, params, scope }) => {
  const { serviceId } = parseParams(idParamsSchema("serviceId"), params);
  return created(await getContainer().addServicePrice.execute(toAddPriceCommand(await parseBody(addPricePayloadSchema, request), scope, serviceId)));
});
