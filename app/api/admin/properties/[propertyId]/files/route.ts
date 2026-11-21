import { getContainer } from "@/server/container";
import { adminRoute, ok, parseQuery } from "@/server/http/route";
import { z } from "zod";

// Owner / admin: short-lived signed URL for a file under this property (`?path=`).
export const GET = adminRoute(async ({ request, scope }) => {
  const { path } = parseQuery(z.object({ path: z.string().min(1).max(500) }), request);
  return ok(await getContainer().getPropertyFileUrl.execute({ ...scope, path }));
});
