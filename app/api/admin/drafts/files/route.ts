import { getContainer } from "@/server/container";
import { authedRoute, ok, parseQuery } from "@/server/http/route";
import { z } from "zod";

// Short-lived signed URL for one of the caller's own staged images (`?path=`).
export const GET = authedRoute(async ({ request, actor }) => {
  const { path } = parseQuery(z.object({ path: z.string().min(1).max(500) }), request);
  return ok(await getContainer().getDraftFileUrl.execute({ actor, path }));
});
