import { getContainer } from "@/server/container";
import { adminRoute, noContent, ok, parseBody, parseParams } from "@/server/http/route";
import { toUpdateMeterCommand, updateMeterPayloadSchema } from "@/server/modules/meter/meter.schema";
import { idParamsSchema } from "@/server/shared/schema";

const ids = idParamsSchema("meterId");
export const GET = adminRoute(async ({ params, scope }) =>
  ok(await getContainer().getMeter.execute({ ...scope, ...parseParams(ids, params) })));

export const PATCH = adminRoute(async ({ request, params, scope }) => {
  const { meterId } = parseParams(ids, params);
  return ok(await getContainer().updateMeter.execute(toUpdateMeterCommand(await parseBody(updateMeterPayloadSchema, request), scope, meterId)));
});

export const DELETE = adminRoute(async ({ params, scope }) => {
  await getContainer().deleteMeter.execute({ ...scope, ...parseParams(ids, params) });
  return noContent();
});
