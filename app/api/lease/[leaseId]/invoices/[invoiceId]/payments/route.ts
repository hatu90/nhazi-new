import { getContainer } from "@/server/container";
import { authedRoute, created, parseBody, parseParams } from "@/server/http/route";
import { recordPaymentPayloadSchema, toReportPaymentCommand } from "@/server/modules/invoice/invoice.schema";
import { idParamsSchema } from "@/server/shared/schema";

// Tenant: "I paid this". Stored as pending until an admin confirms it. 409 OVERPAYMENT / INVOICE_CANCELLED.
export const POST = authedRoute(async ({ request, params, actor }) => {
  const { leaseId, invoiceId } = parseParams(idParamsSchema("leaseId", "invoiceId"), params);
  return created(await getContainer().reportPayment.execute(toReportPaymentCommand(await parseBody(recordPaymentPayloadSchema, request), actor, leaseId, invoiceId)));
});
