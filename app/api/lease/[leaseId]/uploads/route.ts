import { getContainer } from "@/server/container";
import { authedRoute, created, parseParams } from "@/server/http/route";
import { ValidationError } from "@/server/shared/errors";
import { idParamsSchema } from "@/server/shared/schema";

// Tenant: upload one file (multipart field `file`, JPG/PNG/WebP/PDF, ≤ 5 MB). Returns `{ path, name }` to send as payment `evidence`.
export const POST = authedRoute(async ({ request, params, actor }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ValidationError("Attach a file in the `file` field");
  return created(await getContainer().uploadLeaseFile.execute({ actor, leaseId, name: file.name, contentType: file.type, bytes: await file.arrayBuffer() }));
});
