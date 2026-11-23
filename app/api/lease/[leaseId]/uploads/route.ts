import { getContainer } from "@/server/container";
import { authedRoute, created, parseParams, parseUpload } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

// Tenant: upload one file (multipart field `file`, JPG/PNG/WebP/PDF, ≤ 5 MB). Returns `{ path, name }` to send as payment `evidence`.
export const POST = authedRoute(async ({ request, params, actor }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  const file = await parseUpload(request);
  return created(await getContainer().uploadLeaseFile.execute({ actor, leaseId, ...file }));
});
