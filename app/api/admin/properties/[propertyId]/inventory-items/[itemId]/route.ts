import { getContainer } from "@/server/container";
import { adminRoute, noContent, ok, parseBody, parseParams } from "@/server/http/route";
import { itemPayloadSchema, toUpdateItemCommand } from "@/server/modules/inventory/inventory.schema";
import { idParamsSchema } from "@/server/shared/schema";

const ids = idParamsSchema("itemId");
export const PATCH = adminRoute(async ({ request, params, scope }) => {
  const { itemId } = parseParams(ids, params);
  return ok(await getContainer().updateItem.execute(toUpdateItemCommand(await parseBody(itemPayloadSchema, request), scope, itemId)));
});

export const DELETE = adminRoute(async ({ params, scope }) => {
  await getContainer().deleteItem.execute({ ...scope, ...parseParams(ids, params) });
  return noContent();
});
