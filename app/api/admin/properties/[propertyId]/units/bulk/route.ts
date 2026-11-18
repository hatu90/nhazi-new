import { getContainer } from "@/server/container";
import { adminRoute, created, parseBody } from "@/server/http/route";
import { bulkUnitsPayloadSchema, toBulkUnitsCommand } from "@/server/modules/unit/unit.schema";

// POST /api/admin/properties/:propertyId/units/bulk   body: { items: [...] }  (1..200, all or nothing)
export const POST = adminRoute(async ({ request, scope }) =>
  created(await getContainer().bulkCreateUnits.execute(toBulkUnitsCommand(await parseBody(bulkUnitsPayloadSchema, request), scope))));
