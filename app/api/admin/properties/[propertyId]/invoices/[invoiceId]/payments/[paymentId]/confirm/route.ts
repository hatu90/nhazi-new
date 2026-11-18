import { getContainer } from "@/server/container";
import { adminRoute, ok, parseParams } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

// 409 PAYMENT_NOT_PENDING / OVERPAYMENT / INVOICE_CANCELLED. Confirming updates the invoice status.
export const POST = adminRoute(async ({ params, scope }) =>
  ok(await getContainer().reviewPayment.execute({ ...scope, ...parseParams(idParamsSchema("invoiceId", "paymentId"), params), decision: "confirm" })));
