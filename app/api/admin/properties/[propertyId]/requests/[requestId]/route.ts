import { getContainer } from "@/server/container";
import { adminRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { toUpdateRequestCommand, updateRequestPayloadSchema } from "@/server/modules/request/request.schema";
import { idParamsSchema } from "@/server/shared/schema";

const ids = idParamsSchema("requestId");
export const GET = adminRoute(async ({ params, scope }) =>
  ok(await getContainer().getRequest.execute({ ...scope, ...parseParams(ids, params) })));

// status / priority / assignedTo. Technicians can work a request but not re-prioritise it.
export const PATCH = adminRoute(async ({ request, params, scope }) => {
  const { requestId } = parseParams(ids, params);
  return ok(await getContainer().updateRequest.execute(toUpdateRequestCommand(await parseBody(updateRequestPayloadSchema, request), scope, requestId)));
});
