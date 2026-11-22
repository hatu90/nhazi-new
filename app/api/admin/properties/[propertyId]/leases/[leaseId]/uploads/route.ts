import { getContainer } from "@/server/container";
import { adminRoute, created, parseParams } from "@/server/http/route";
import { ValidationError } from "@/server/shared/errors";
import { idParamsSchema } from "@/server/shared/schema";

// Owner / admin: upload one lease file (multipart field `file`, JPG/PNG/WebP/PDF, ≤ 5 MB). Returns `{ path, name }`; add `path` to the lease `documents` via PATCH.
export const POST = adminRoute(async ({ request, params, scope }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ValidationError("Attach a file in the `file` field");
  return created(await getContainer().uploadAdminLeaseFile.execute({ ...scope, leaseId, name: file.name, contentType: file.type, bytes: await file.arrayBuffer() }));
});
