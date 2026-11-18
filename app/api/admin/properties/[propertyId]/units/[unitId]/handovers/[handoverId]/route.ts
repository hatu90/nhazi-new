import { getContainer } from "@/server/container";
import { adminRoute, noContent, ok, parseBody, parseParams } from "@/server/http/route";
import { toUpdateHandoverCommand, updateHandoverPayloadSchema } from "@/server/modules/inventory/inventory.schema";
import { idParamsSchema } from "@/server/shared/schema";

const ids = idParamsSchema("unitId", "handoverId");
export const PATCH = adminRoute(async ({ request, params, scope }) => {
  const { unitId, handoverId } = parseParams(ids, params);
  return ok(await getContainer().updateHandover.execute(toUpdateHandoverCommand(await parseBody(updateHandoverPayloadSchema, request), scope, unitId, handoverId)));
});

export const DELETE = adminRoute(async ({ params, scope }) => {
  await getContainer().deleteHandover.execute({ ...scope, ...parseParams(ids, params) });
  return noContent();
});
