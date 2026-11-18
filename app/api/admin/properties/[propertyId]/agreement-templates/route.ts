import { getContainer } from "@/server/container";
import { adminRoute, created, ok, parseBody, parseQuery } from "@/server/http/route";
import { createTemplatePayloadSchema, templateListQuerySchema, toCreateTemplateCommand } from "@/server/modules/agreement/agreement.schema";

export const GET = adminRoute(async ({ request, scope }) =>
  ok(await getContainer().listTemplates.execute({ ...scope, query: parseQuery(templateListQuerySchema, request) })));

export const POST = adminRoute(async ({ request, scope }) =>
  created(await getContainer().createTemplate.execute(toCreateTemplateCommand(await parseBody(createTemplatePayloadSchema, request), scope))));
