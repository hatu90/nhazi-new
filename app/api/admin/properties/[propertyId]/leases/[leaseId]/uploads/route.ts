import { getContainer } from "@/server/container";
import { adminRoute, created, parseParams, parseUpload } from "@/server/http/route";
import { idParamsSchema } from "@/server/shared/schema";

// Owner / admin: upload one lease file (multipart field `file`, JPG/PNG/WebP/PDF, ≤ 5 MB). Returns `{ path, name }`; add `path` to the lease `documents` via PATCH.
export const POST = adminRoute(async ({ request, params, scope }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  const file = await parseUpload(request);
  return created(await getContainer().uploadAdminLeaseFile.execute({ ...scope, leaseId, ...file }));
});
