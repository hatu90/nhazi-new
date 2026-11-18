import { getContainer } from "@/server/container";
import { adminRoute, created, ok, parseBody, parseQuery } from "@/server/http/route";
import { createMeterPayloadSchema, meterListQuerySchema, toCreateMeterCommand } from "@/server/modules/meter/meter.schema";

export const GET = adminRoute(async ({ request, scope }) =>
  ok(await getContainer().listMeters.execute({ ...scope, query: parseQuery(meterListQuerySchema, request) })));

export const POST = adminRoute(async ({ request, scope }) =>
  created(await getContainer().createMeter.execute(toCreateMeterCommand(await parseBody(createMeterPayloadSchema, request), scope))));
