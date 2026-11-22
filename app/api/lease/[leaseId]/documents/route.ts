import { getContainer } from "@/server/container";
import { authedRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { leaseDocumentSchema } from "@/server/modules/tenancy/tenancy.schema";
import { idParamsSchema } from "@/server/shared/schema";
import { z } from "zod";

// Tenant: add documents to the lease (cannot remove). Paths come from POST /api/lease/:leaseId/uploads.
export const POST = authedRoute(async ({ request, params, actor }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  const { documents } = await parseBody(z.object({ documents: z.array(leaseDocumentSchema).max(50) }), request);
  return ok(await getContainer().addLeaseDocuments.execute({ actor, leaseId, documents }));
});
