import { getContainer } from "@/server/container";
import { authedRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { idParamsSchema, idSchema } from "@/server/shared/schema";
import { z } from "zod";

// POST /api/lease/:leaseId/agreements   { templateId }   add an agreement to the lease
export const POST = authedRoute(async ({ request, params, actor }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  const { templateId } = await parseBody(z.object({ templateId: idSchema }), request);
  return ok(await getContainer().addMyAgreement.execute({ actor, leaseId, templateId }));
});
