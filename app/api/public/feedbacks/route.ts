import { getContainer } from "@/server/container";
import { created, ok, parseBody, parseQuery, publicRoute } from "@/server/http/route";
import { createFeedbackPayloadSchema, feedbackListQuerySchema } from "@/server/modules/feedback/feedback.schema";

// GET  /api/public/feedbacks?category=&page=&pageSize=   every feedback with its answer, newest first. No credentials.
export const GET = publicRoute(async ({ request }) => ok(await getContainer().listFeedbacks.execute(parseQuery(feedbackListQuerySchema, request))));

// POST /api/public/feedbacks   { authorName, contact, category, message }   No credentials. `contact` is never returned.
export const POST = publicRoute(async ({ request }) => created(await getContainer().createFeedback.execute(await parseBody(createFeedbackPayloadSchema, request))));
