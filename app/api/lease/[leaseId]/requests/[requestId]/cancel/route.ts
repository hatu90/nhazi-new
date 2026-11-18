import { getContainer } from "@/server/container";
import { authedRoute, ok, parseParams } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

export const POST = authedRoute(async ({ params, actor }) =>
  ok(await getContainer().cancelMyRequest.execute({ actor, ...parseParams(idParamsSchema("leaseId", "requestId"), params) })));
