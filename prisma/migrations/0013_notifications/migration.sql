-- Stored notifications (one row per receiver) + the FCM device tokens they are pushed to.
CREATE TYPE "notification_target_type" AS ENUM ('lease', 'invitation', 'agreement', 'billing_period', 'request', 'request_comment', 'invoice', 'payment');
CREATE TYPE "notification_severity" AS ENUM ('info', 'warning', 'urgent');
CREATE TYPE "notification_area" AS ENUM ('admin', 'dashboard');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "receiver_id" UUID NOT NULL,
    "actor_id" UUID,
    "event" TEXT NOT NULL,
    "target_type" "notification_target_type" NOT NULL,
    "target_id" UUID NOT NULL,
    "severity" "notification_severity" NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "area" "notification_area" NOT NULL,
    "path" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "dedupe_key" TEXT,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'web',
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_receiver_id_created_at_idx" ON "notifications"("receiver_id", "created_at" DESC);
CREATE INDEX "notifications_receiver_id_read_at_idx" ON "notifications"("receiver_id", "read_at");
CREATE INDEX "notifications_target_type_target_id_idx" ON "notifications"("target_type", "target_id");
-- the scheduled jobs re-run safely: one row per receiver and dedupe key (NULL keys never collide)
CREATE UNIQUE INDEX "notifications_receiver_id_dedupe_key_key" ON "notifications"("receiver_id", "dedupe_key");
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");
CREATE INDEX "push_tokens_account_id_idx" ON "push_tokens"("account_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
