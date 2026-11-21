import { getContainer } from "@/server/container";
import { authedRoute, created } from "@/server/http/route";
import { ValidationError } from "@/server/shared/errors";

// Any signed-in account: stage one image for a property that is still being created (multipart field `file`, JPG/PNG/WebP, ≤ 5 MB).
// Returns `{ path, name }`; send `path` in `headerImage` / `images` of POST /api/admin/properties.
export const POST = authedRoute(async ({ request, actor }) => {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ValidationError("Attach a file in the `file` field");
  return created(await getContainer().uploadDraftImage.execute({ actor, name: file.name, contentType: file.type, bytes: await file.arrayBuffer() }));
});
