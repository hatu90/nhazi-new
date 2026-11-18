import { getContainer } from "@/server/container";
import { adminRoute, created, parseBody } from "@/server/http/route";
import { bulkItemsPayloadSchema, toBulkItemsCommand } from "@/server/modules/inventory/inventory.schema";

// POST /api/admin/properties/:propertyId/inventory-items/bulk   body: { items: [...] }  (1..200, all or nothing)
export const POST = adminRoute(async ({ request, scope }) =>
  created(await getContainer().bulkCreateItems.execute(toBulkItemsCommand(await parseBody(bulkItemsPayloadSchema, request), scope))));
