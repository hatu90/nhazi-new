import { getContainer } from "@/server/container";
import { z } from "zod";
import { adminRoute, ok, parseParams } from "@/server/http/route";
import { idSchema } from "@/server/shared/schema";

const ids = z.object({ templateId: idSchema, version: z.coerce.number().int().positive() });
export const GET = adminRoute(async ({ params, scope }) =>
  ok(await getContainer().getTemplateVersion.execute({ ...scope, ...parseParams(ids, params) })));
