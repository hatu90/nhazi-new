import { getContainer } from "@/server/container";
import { adminRoute, ok, parseParams } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

export const POST = adminRoute(async ({ params, scope }) =>
  ok(await getContainer().cancelRefund.execute({ ...scope, ...parseParams(idParamsSchema("refundId"), params) })));
