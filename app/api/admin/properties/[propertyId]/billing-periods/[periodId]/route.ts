import { getContainer } from "@/server/container";
import { adminRoute, ok, parseParams } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

export const GET = adminRoute(async ({ params, scope }) =>
  ok(await getContainer().getBillingPeriod.execute({ ...scope, ...parseParams(idParamsSchema("periodId"), params) })));
