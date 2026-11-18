import { getContainer } from "@/server/container";
import { authedRoute, ok, parseParams, parseQuery } from "@/server/http/route";
import { invoiceListQuerySchema } from "@/server/modules/lease/lease.schema";
import { idParamsSchema } from "@/server/shared/schema";

// GET /api/lease/:leaseId/invoices?status=&page=&pageSize=
export const GET = authedRoute(async ({ request, params, actor }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  const query = parseQuery(invoiceListQuerySchema, request);
  return ok(await getContainer().listMyLeaseInvoices.execute({ actor, leaseId, query }));
});
