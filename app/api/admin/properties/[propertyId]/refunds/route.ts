import { getContainer } from "@/server/container";
import { adminRoute, created, ok, parseBody, parseQuery } from "@/server/http/route";
import { createRefundPayloadSchema, refundListQuerySchema, toCreateRefundCommand } from "@/server/modules/refund/refund.schema";

export const GET = adminRoute(async ({ request, scope }) =>
  ok(await getContainer().listRefunds.execute({ ...scope, query: parseQuery(refundListQuerySchema, request) })));

// 409 REFUND_EXCEEDS_PAID / REFUND_EXCEEDS_CHARGE
export const POST = adminRoute(async ({ request, scope }) =>
  created(await getContainer().createRefund.execute(toCreateRefundCommand(await parseBody(createRefundPayloadSchema, request), scope))));
