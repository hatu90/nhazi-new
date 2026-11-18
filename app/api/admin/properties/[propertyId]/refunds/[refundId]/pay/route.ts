import { getContainer } from "@/server/container";
import { adminRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { payRefundPayloadSchema, toPayRefundCommand } from "@/server/modules/refund/refund.schema";
import { idParamsSchema } from "@/server/shared/schema";

export const POST = adminRoute(async ({ request, params, scope }) => {
  const { refundId } = parseParams(idParamsSchema("refundId"), params);
  return ok(await getContainer().payRefund.execute(toPayRefundCommand(await parseBody(payRefundPayloadSchema, request), scope, refundId)));
});
