import { getContainer } from "@/server/container";
import { authedRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";
import { z } from "zod";

// PATCH /api/lease/:leaseId/agreements/:agreementId   { values }   fill in the agreement's form fields
export const PATCH = authedRoute(async ({ request, params, actor }) => {
  const { leaseId, agreementId } = parseParams(idParamsSchema("leaseId", "agreementId"), params);
  const { values } = await parseBody(z.object({ values: z.record(z.string(), z.unknown()) }), request);
  return ok(await getContainer().setMyAgreementValues.execute({ actor, leaseId, agreementId, values }));
});

// DELETE /api/lease/:leaseId/agreements/:agreementId   remove the agreement from the lease
export const DELETE = authedRoute(async ({ params, actor }) =>
  ok(await getContainer().removeMyAgreement.execute({ actor, ...parseParams(idParamsSchema("leaseId", "agreementId"), params) })));
