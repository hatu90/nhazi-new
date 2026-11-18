import { getContainer } from "@/server/container";
import { adminRoute, created, parseBody } from "@/server/http/route";
import { bulkMetersPayloadSchema, toBulkMetersCommand } from "@/server/modules/meter/meter.schema";

// POST /api/admin/properties/:propertyId/meters/bulk   body: { items: [...] }  (1..200, all or nothing)
export const POST = adminRoute(async ({ request, scope }) =>
  created(await getContainer().bulkCreateMeters.execute(toBulkMetersCommand(await parseBody(bulkMetersPayloadSchema, request), scope))));
