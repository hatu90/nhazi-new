import { z } from "zod";
import type { IActor } from "@/server/shared/actor";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";
import { idSchema } from "@/server/shared/schema";

export const feedbackCategorySchema = z.enum(["bug", "feature", "improvement", "question", "other"]);
export type FeedbackCategory = z.infer<typeof feedbackCategorySchema>;

// ── GET /api/public/feedbacks ───────────────────────────────────────────────────────
export const feedbackListQuerySchema = paginationQuerySchema.extend({
  category: feedbackCategorySchema.optional(),
});
export type IFeedbackListQuery = z.infer<typeof feedbackListQuerySchema>;

// ── POST /api/public/feedbacks ──────────────────────────────────────────────────────
export const createFeedbackPayloadSchema = z.object({
  authorName: z.string().trim().min(1).max(100),
  /** phone or email: only the super admin ever sees it */
  contact: z.string().trim().min(3).max(200),
  category: feedbackCategorySchema,
  message: z.string().trim().min(1).max(2000),
});
export type ICreateFeedbackCommand = z.infer<typeof createFeedbackPayloadSchema>;

// ── PUT /api/admin/feedbacks/:feedbackId/answer ─────────────────────────────────────
export const answerFeedbackPayloadSchema = z.object({ answer: z.string().trim().min(1).max(2000) });
export const feedbackParamsSchema = z.object({ feedbackId: idSchema });
export interface IAnswerFeedbackCommand {
  actor: IActor;
  feedbackId: string;
  answer: string;
}

// ── responses ───────────────────────────────────────────────────────────────────────
/** Everything here is public. The author's contact is deliberately not part of it. */
export interface IFeedbackResponse {
  id: string;
  authorName: string;
  category: FeedbackCategory;
  message: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
}
export type IFeedbackListResponse = IPaginated<IFeedbackResponse>;
