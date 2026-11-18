import { getContainer } from "@/server/container";
import { adminRoute, created, parseBody, parseParams } from "@/server/http/route";
import { recordPaymentPayloadSchema, toRecordPaymentCommand } from "@/server/modules/invoice/invoice.schema";
import { idParamsSchema } from "@/server/shared/schema";

// 409 OVERPAYMENT / INVOICE_CANCELLED. Updates the invoice status (pending / partial / paid).
export const POST = adminRoute(async ({ request, params, scope }) => {
  const { invoiceId } = parseParams(idParamsSchema("invoiceId"), params);
  return created(await getContainer().recordPayment.execute(toRecordPaymentCommand(await parseBody(recordPaymentPayloadSchema, request), scope, invoiceId)));
});
