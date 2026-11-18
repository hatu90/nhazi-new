import { getContainer } from "@/server/container";
import { authedRoute, created, ok, parseBody, parseParams, parseQuery } from "@/server/http/route";
import { createRequestPayloadSchema, tenantRequestListQuerySchema, toCreateRequestCommand } from "@/server/modules/request/request.schema";
import { idParamsSchema } from "@/server/shared/schema";

const ids = idParamsSchema("leaseId");
export const GET = authedRoute(async ({ request, params, actor }) =>
  ok(await getContainer().listMyRequests.execute({ actor, ...parseParams(ids, params), query: parseQuery(tenantRequestListQuerySchema, request) })));

export const POST = authedRoute(async ({ request, params, actor }) => {
  const { leaseId } = parseParams(ids, params);
  return created(await getContainer().createMyRequest.execute(toCreateRequestCommand(await parseBody(createRequestPayloadSchema, request), actor, leaseId)));
});
