import { getContainer } from "@/server/container";
import { adminRoute, noContent, ok, parseBody, parseParams } from "@/server/http/route";
import { toUpdateTemplateCommand, updateTemplatePayloadSchema } from "@/server/modules/agreement/agreement.schema";
import { idParamsSchema } from "@/server/shared/schema";

const ids = idParamsSchema("templateId");
export const GET = adminRoute(async ({ params, scope }) =>
  ok(await getContainer().getTemplate.execute({ ...scope, ...parseParams(ids, params) })));

export const PATCH = adminRoute(async ({ request, params, scope }) => {
  const { templateId } = parseParams(ids, params);
  return ok(await getContainer().updateTemplate.execute(toUpdateTemplateCommand(await parseBody(updateTemplatePayloadSchema, request), scope, templateId)));
});

export const DELETE = adminRoute(async ({ params, scope }) => {
  await getContainer().deleteTemplate.execute({ ...scope, ...parseParams(ids, params) });
  return noContent();
});
