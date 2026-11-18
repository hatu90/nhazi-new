import { getContainer } from "@/server/container";
import { adminRoute, created, parseBody } from "@/server/http/route";
import { bulkServicesPayloadSchema, toBulkServicesCommand } from "@/server/modules/service/service.schema";

// POST /api/admin/properties/:propertyId/services/bulk   body: { items: [...] }  (1..200, all or nothing)
export const POST = adminRoute(async ({ request, scope }) =>
  created(await getContainer().bulkCreateServices.execute(toBulkServicesCommand(await parseBody(bulkServicesPayloadSchema, request), scope))));
