import { getContainer } from "@/server/container";
import { adminRoute, created, ok, parseBody, parseQuery } from "@/server/http/route";
import { createUnitPayloadSchema, toCreateUnitCommand, unitListQuerySchema } from "@/server/modules/unit/unit.schema";

export const GET = adminRoute(async ({ request, scope }) =>
  ok(await getContainer().listUnits.execute({ ...scope, query: parseQuery(unitListQuerySchema, request) })));

export const POST = adminRoute(async ({ request, scope }) =>
  created(await getContainer().createUnit.execute(toCreateUnitCommand(await parseBody(createUnitPayloadSchema, request), scope))));
