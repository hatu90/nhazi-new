import { getContainer } from "@/server/container";
import { adminRoute, noContent, ok, parseBody, parseParams } from "@/server/http/route";
import { toUpdateUnitCommand, updateUnitPayloadSchema } from "@/server/modules/unit/unit.schema";
import { idParamsSchema } from "@/server/shared/schema";

const ids = idParamsSchema("unitId");
export const GET = adminRoute(async ({ params, scope }) =>
  ok(await getContainer().getUnit.execute({ ...scope, ...parseParams(ids, params) })));

export const PATCH = adminRoute(async ({ request, params, scope }) => {
  const { unitId } = parseParams(ids, params);
  return ok(await getContainer().updateUnit.execute(toUpdateUnitCommand(await parseBody(updateUnitPayloadSchema, request), scope, unitId)));
});

export const DELETE = adminRoute(async ({ params, scope }) => {
  await getContainer().deleteUnit.execute({ ...scope, ...parseParams(ids, params) });
  return noContent();
});
