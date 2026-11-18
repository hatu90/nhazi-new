import { getContainer } from "@/server/container";
import { adminRoute, created, parseBody, parseParams } from "@/server/http/route";
import { addVersionPayloadSchema, toAddVersionCommand } from "@/server/modules/agreement/agreement.schema";
import { idParamsSchema } from "@/server/shared/schema";

// POST: save the editor as a NEW version on top of `baseVersion` (409 STALE_VERSION if someone saved first)
export const POST = adminRoute(async ({ request, params, scope }) => {
  const { templateId } = parseParams(idParamsSchema("templateId"), params);
  return created(await getContainer().addTemplateVersion.execute(toAddVersionCommand(await parseBody(addVersionPayloadSchema, request), scope, templateId)));
});
