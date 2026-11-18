import { getContainer } from "@/server/container";
import { adminRoute, created, ok, parseBody, parseQuery } from "@/server/http/route";
import { itemListQuerySchema, itemPayloadSchema, toCreateItemCommand } from "@/server/modules/inventory/inventory.schema";

export const GET = adminRoute(async ({ request, scope }) =>
  ok(await getContainer().listItems.execute({ ...scope, query: parseQuery(itemListQuerySchema, request) })));

export const POST = adminRoute(async ({ request, scope }) =>
  created(await getContainer().createItem.execute(toCreateItemCommand(await parseBody(itemPayloadSchema, request), scope))));
