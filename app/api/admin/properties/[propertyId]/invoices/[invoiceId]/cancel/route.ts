import { getContainer } from "@/server/container";
import { adminRoute, ok, parseParams } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

// 409 INVOICE_HAS_PAYMENTS until the payments are removed
export const POST = adminRoute(async ({ params, scope }) =>
  ok(await getContainer().cancelInvoice.execute({ ...scope, ...parseParams(idParamsSchema("invoiceId"), params) })));
