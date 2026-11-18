import { getContainer } from "@/server/container";
import { adminRoute, created, parseBody, parseParams } from "@/server/http/route";
import { commentPayloadSchema, toAdminCommentCommand } from "@/server/modules/request/request.schema";
import { idParamsSchema } from "@/server/shared/schema";

export const POST = adminRoute(async ({ request, params, scope }) => {
  const { requestId } = parseParams(idParamsSchema("requestId"), params);
  return created(await getContainer().addStaffComment.execute(toAdminCommentCommand(await parseBody(commentPayloadSchema, request), scope, requestId)));
});
