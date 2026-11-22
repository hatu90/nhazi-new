import { getContainer } from "@/server/container";
import { authedRoute, ok, parseQuery } from "@/server/http/route";
import { reviewListQuerySchema } from "@/server/modules/verification/verification.schema";

// GET /api/admin/verification/reviews?status=declared|confirmed|rejected   the review queue, oldest first. Platform staff only.
export const GET = authedRoute(async ({ request, actor }) =>
  ok(await getContainer().listVerificationReviews.execute({ actor, query: parseQuery(reviewListQuerySchema, request) })));
