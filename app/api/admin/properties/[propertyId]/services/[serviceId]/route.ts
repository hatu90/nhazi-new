import { getContainer } from "@/server/container";
import { adminRoute, noContent, ok, parseBody, parseParams } from "@/server/http/route";
import { toUpdateServiceCommand, updateServicePayloadSchema } from "@/server/modules/service/service.schema";
import { idParamsSchema } from "@/server/shared/schema";

const ids = idParamsSchema("serviceId");
export const GET = adminRoute(async ({ params, scope }) =>
  ok(await getContainer().getService.execute({ ...scope, ...parseParams(ids, params) })));

export const PATCH = adminRoute(async ({ request, params, scope }) => {
  const { serviceId } = parseParams(ids, params);
  return ok(await getContainer().updateService.execute(toUpdateServiceCommand(await parseBody(updateServicePayloadSchema, request), scope, serviceId)));
});

export const DELETE = adminRoute(async ({ params, scope }) => {
  await getContainer().deleteService.execute({ ...scope, ...parseParams(ids, params) });
  return noContent();
});
