import { getContainer } from "@/server/container";
import { authedRoute, ok, parseParams } from "@/server/http/route";
import { feedbackParamsSchema } from "@/server/modules/feedback/feedback.schema";

// GET /api/admin/feedbacks/:feedbackId/contact   -> { contact }   Super admin only.
export const GET = authedRoute(async ({ params, actor }) => {
  const { feedbackId } = parseParams(feedbackParamsSchema, params);
  return ok(await getContainer().getFeedbackContact.execute({ actor, feedbackId }));
});
