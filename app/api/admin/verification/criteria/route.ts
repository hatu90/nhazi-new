import { getContainer } from "@/server/container";
import { authedRoute, created, ok, parseBody } from "@/server/http/route";
import { createCriterionPayloadSchema } from "@/server/modules/verification/verification.schema";

// GET /api/admin/verification/criteria   the whole catalog incl. inactive. Platform staff only.
export const GET = authedRoute(async ({ actor }) => ok(await getContainer().listCriteria.execute(actor)));

// POST /api/admin/verification/criteria   { name, nameEn?, description?, descriptionEn?, required?, active?, sortOrder? }
export const POST = authedRoute(async ({ request, actor }) =>
  created(await getContainer().createCriterion.execute({ actor, payload: await parseBody(createCriterionPayloadSchema, request) })));
