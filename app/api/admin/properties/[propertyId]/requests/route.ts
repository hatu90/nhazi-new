import { getContainer } from "@/server/container";
import { adminRoute, ok, parseQuery } from "@/server/http/route";
import { adminRequestListQuerySchema } from "@/server/modules/request/request.schema";

export const GET = adminRoute(async ({ request, scope }) =>
  ok(await getContainer().listRequests.execute({ ...scope, query: parseQuery(adminRequestListQuerySchema, request) })));
