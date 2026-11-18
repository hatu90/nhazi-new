import { getContainer } from "@/server/container";
import { adminRoute, created, ok, parseBody, parseParams } from "@/server/http/route";
import { createHandoverPayloadSchema, toCreateHandoverCommand } from "@/server/modules/inventory/inventory.schema";
import { idParamsSchema } from "@/server/shared/schema";

const ids = idParamsSchema("unitId");
export const GET = adminRoute(async ({ params, scope }) =>
  ok(await getContainer().listHandovers.execute({ ...scope, ...parseParams(ids, params) })));

export const POST = adminRoute(async ({ request, params, scope }) => {
  const { unitId } = parseParams(ids, params);
  return created(await getContainer().createHandover.execute(toCreateHandoverCommand(await parseBody(createHandoverPayloadSchema, request), scope, unitId)));
});
