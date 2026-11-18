import { getContainer } from "@/server/container";
import { adminRoute, created, ok, parseBody, parseParams, parseQuery } from "@/server/http/route";
import { createReadingPayloadSchema, readingListQuerySchema, toCreateReadingCommand } from "@/server/modules/reading/reading.schema";
import { idParamsSchema } from "@/server/shared/schema";

const ids = idParamsSchema("meterId");
export const GET = adminRoute(async ({ request, params, scope }) =>
  ok(await getContainer().listReadings.execute({ ...scope, ...parseParams(ids, params), query: parseQuery(readingListQuerySchema, request) })));

// owner | admin | technician
export const POST = adminRoute(async ({ request, params, scope }) => {
  const { meterId } = parseParams(ids, params);
  return created(await getContainer().createReading.execute(toCreateReadingCommand(await parseBody(createReadingPayloadSchema, request), scope, meterId)));
});
