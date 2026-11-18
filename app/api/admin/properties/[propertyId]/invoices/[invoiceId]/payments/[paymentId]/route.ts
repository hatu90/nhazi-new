import { getContainer } from "@/server/container";
import { adminRoute, noContent, parseParams } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

export const DELETE = adminRoute(async ({ params, scope }) => {
  await getContainer().deletePayment.execute({ ...scope, ...parseParams(idParamsSchema("invoiceId", "paymentId"), params) });
  return noContent();
});
