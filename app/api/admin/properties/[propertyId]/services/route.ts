import { getContainer } from "@/server/container";
import { adminRoute, created, ok, parseBody, parseQuery } from "@/server/http/route";
import { createServicePayloadSchema, serviceListQuerySchema, toCreateServiceCommand } from "@/server/modules/service/service.schema";

export const GET = adminRoute(async ({ request, scope }) =>
  ok(await getContainer().listServices.execute({ ...scope, query: parseQuery(serviceListQuerySchema, request) })));

export const POST = adminRoute(async ({ request, scope }) =>
  created(await getContainer().createService.execute(toCreateServiceCommand(await parseBody(createServicePayloadSchema, request), scope))));
