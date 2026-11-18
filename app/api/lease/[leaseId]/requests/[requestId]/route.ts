import { getContainer } from "@/server/container";
import { authedRoute, ok, parseParams } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

export const GET = authedRoute(async ({ params, actor }) =>
  ok(await getContainer().getMyRequest.execute({ actor, ...parseParams(idParamsSchema("leaseId", "requestId"), params) })));
