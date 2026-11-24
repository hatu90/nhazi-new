import { getContainer } from "@/server/container";
import { authedRoute, ok, parseBody, parseParams } from "@/server/http/route";
import { answerFeedbackPayloadSchema, feedbackParamsSchema } from "@/server/modules/feedback/feedback.schema";

// PUT /api/admin/feedbacks/:feedbackId/answer   { answer }   Super admin only. Answering again replaces the answer.
export const PUT = authedRoute(async ({ request, params, actor }) => {
  const { feedbackId } = parseParams(feedbackParamsSchema, params);
  const { answer } = await parseBody(answerFeedbackPayloadSchema, request);
  return ok(await getContainer().answerFeedback.execute({ actor, feedbackId, answer }));
});
