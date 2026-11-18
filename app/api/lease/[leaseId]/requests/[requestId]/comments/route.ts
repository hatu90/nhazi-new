import { getContainer } from "@/server/container";
import { authedRoute, created, parseBody, parseParams } from "@/server/http/route";
import { commentPayloadSchema, toTenantCommentCommand } from "@/server/modules/request/request.schema";
import { idParamsSchema } from "@/server/shared/schema";

export const POST = authedRoute(async ({ request, params, actor }) => {
  const { leaseId, requestId } = parseParams(idParamsSchema("leaseId", "requestId"), params);
  return created(await getContainer().addMyComment.execute(toTenantCommentCommand(await parseBody(commentPayloadSchema, request), actor, leaseId, requestId)));
});
