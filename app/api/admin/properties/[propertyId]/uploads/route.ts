import { getContainer } from "@/server/container";
import { adminRoute, created, parseUpload } from "@/server/http/route";

// Owner / admin: upload one property image (multipart field `file`, JPG/PNG/WebP, ≤ 5 MB). Returns `{ path, name }`; send `path` in `headerImage` / `images` via PATCH.
export const POST = adminRoute(async ({ request, scope }) => {
  const file = await parseUpload(request);
  return created(await getContainer().uploadPropertyImage.execute({ ...scope, ...file }));
});
