import { getContainer } from "@/server/container";
import { adminRoute, created, ok, parseBody, parseQuery } from "@/server/http/route";
import { createInvoicePayloadSchema, invoiceListQuerySchema, toCreateInvoiceCommand } from "@/server/modules/invoice/invoice.schema";

// GET ?leaseId=&status=&kind=
export const GET = adminRoute(async ({ request, scope }) =>
  ok(await getContainer().listInvoices.execute({ ...scope, query: parseQuery(invoiceListQuerySchema, request) })));

// POST: a manual (kind = other) invoice; cycle invoices come from the billing engine
export const POST = adminRoute(async ({ request, scope }) =>
  created(await getContainer().createInvoice.execute(toCreateInvoiceCommand(await parseBody(createInvoicePayloadSchema, request), scope))));
