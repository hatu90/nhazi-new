import { getContainer } from "@/server/container";
import { authedRoute, created, parseUpload } from "@/server/http/route";

// Any signed-in account: stage one image for a property that is still being created (multipart field `file`, JPG/PNG/WebP, ≤ 5 MB).
// Returns `{ path, name }`; send `path` in `headerImage` / `images` of POST /api/admin/properties.
export const POST = authedRoute(async ({ request, actor }) => {
  const file = await parseUpload(request);
  return created(await getContainer().uploadDraftImage.execute({ actor, ...file }));
});
