import { getContainer } from "@/server/container";
import { authedRoute, ok, parseParams } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

// GET /api/lease/:leaseId/agreement-templates   the templates of the lease's property a tenant can add
export const GET = authedRoute(async ({ params, actor }) =>
  ok(await getContainer().listMyAgreementTemplates.execute({ actor, ...parseParams(idParamsSchema("leaseId"), params) })));
