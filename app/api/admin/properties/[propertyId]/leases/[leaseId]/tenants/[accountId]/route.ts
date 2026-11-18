import { getContainer } from "@/server/container";
import { adminRoute, ok, parseParams } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

export const DELETE = adminRoute(async ({ params, scope }) =>
  ok(await getContainer().removeTenant.execute({ ...scope, ...parseParams(idParamsSchema("leaseId", "accountId"), params) })));
