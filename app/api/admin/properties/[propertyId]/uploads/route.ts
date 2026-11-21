import { getContainer } from "@/server/container";
import { adminRoute, created } from "@/server/http/route";
import { ValidationError } from "@/server/shared/errors";

// Owner / admin: upload one property image (multipart field `file`, JPG/PNG/WebP, ≤ 5 MB). Returns `{ path, name }`; send `path` in `headerImage` / `images` via PATCH.
export const POST = adminRoute(async ({ request, scope }) => {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ValidationError("Attach a file in the `file` field");
  return created(await getContainer().uploadPropertyImage.execute({ ...scope, name: file.name, contentType: file.type, bytes: await file.arrayBuffer() }));
});
