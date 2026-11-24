import type { FeedbackCategory } from "@/client/lib/types";

export const FEEDBACK_CATEGORIES = ["bug", "feature", "improvement", "question", "other"] as const satisfies readonly FeedbackCategory[];

export const CATEGORY_TONE = { bug: "warning", feature: "info", improvement: "success", question: "neutral", other: "neutral" } as const satisfies Record<FeedbackCategory, string>;
