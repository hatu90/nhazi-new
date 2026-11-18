import { getContainer } from "@/server/container";
import { adminRoute, noContent, ok, parseBody, parseParams } from "@/server/http/route";
import { toUpdateSubscriptionCommand, updateSubscriptionPayloadSchema } from "@/server/modules/tenancy/tenancy.schema";
import { idParamsSchema } from "@/server/shared/schema";

const ids = idParamsSchema("leaseId", "subscriptionId");
export const PATCH = adminRoute(async ({ request, params, scope }) => {
  const { leaseId, subscriptionId } = parseParams(ids, params);
  return ok(await getContainer().updateSubscription.execute(toUpdateSubscriptionCommand(await parseBody(updateSubscriptionPayloadSchema, request), scope, leaseId, subscriptionId)));
});

export const DELETE = adminRoute(async ({ params, scope }) => {
  await getContainer().deleteSubscription.execute({ ...scope, ...parseParams(ids, params) });
  return noContent();
});
