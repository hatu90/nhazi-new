-- Public feedback (bug reports, feature requests, ideas, ...) answered by the super admin.
CREATE TYPE "feedback_category" AS ENUM ('bug', 'feature', 'improvement', 'question', 'other');

CREATE TABLE "feedbacks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "category" "feedback_category" NOT NULL,
    "message" TEXT NOT NULL,
    "answer" TEXT,
    "answered_at" TIMESTAMPTZ(6),
    "answered_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "feedbacks_answered_by_id_fkey" FOREIGN KEY ("answered_by_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX "feedbacks_created_at_idx" ON "feedbacks"("created_at" DESC);
CREATE INDEX "feedbacks_category_created_at_idx" ON "feedbacks"("category", "created_at" DESC);
