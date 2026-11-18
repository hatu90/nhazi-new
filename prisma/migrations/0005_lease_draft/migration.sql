-- A lease is a DRAFT until it is started: activated_at IS NULL. Starting opens the first billing period and
-- issues the move-in invoice; before that nothing is billed and the tenant does not see it.
-- first_period_end: where the first billing period will end, chosen when the draft is written.
ALTER TABLE "leases" ADD COLUMN "activated_at" TIMESTAMPTZ(6);
ALTER TABLE "leases" ADD COLUMN "first_period_end" DATE;
UPDATE "leases" SET "activated_at" = "created_at";
ALTER TABLE "leases" ADD CONSTRAINT "leases_first_period_end_chk" CHECK (
  "first_period_end" IS NULL OR ("first_period_end" >= "start_date" AND ("end_date" IS NULL OR "first_period_end" <= "end_date")));
