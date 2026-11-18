import { getContainer } from "@/server/container";
import { authedRoute, created, ok, parseBody, parseQuery } from "@/server/http/route";
import {
  adminPropertyListQuerySchema,
  createPropertyPayloadSchema,
  toCreatePropertyCommand,
} from "@/server/modules/property/property.schema";

// GET /api/admin/properties?q=&page=&pageSize=      properties the caller manages
export const GET = authedRoute(async ({ request, actor }) => {
  const query = parseQuery(adminPropertyListQuerySchema, request);
  return ok(await getContainer().listManagedProperties.execute({ actor, query }));
});

// POST /api/admin/properties                         caller becomes the owner
export const POST = authedRoute(async ({ request, actor }) => {
  const payload = await parseBody(createPropertyPayloadSchema, request);
  return created(await getContainer().createProperty.execute(toCreatePropertyCommand(payload, actor)));
});
