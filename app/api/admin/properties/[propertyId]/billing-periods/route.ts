import { getContainer } from "@/server/container";
import { adminRoute, ok, parseQuery } from "@/server/http/route";
import { billingPeriodListQuerySchema } from "@/server/modules/billing/billing.schema";

export const GET = adminRoute(async ({ request, scope }) =>
  ok(await getContainer().listBillingPeriods.execute({ ...scope, query: parseQuery(billingPeriodListQuerySchema, request) })));
