-- A payment the tenant reports is PENDING until an admin confirms (or rejects) it; only CONFIRMED payments count
-- towards the invoice. Everything recorded before this migration, and anything an admin records, is confirmed.
CREATE TYPE "payment_status" AS ENUM ('pending', 'confirmed', 'rejected');
ALTER TABLE "payments" ADD COLUMN "status" "payment_status" NOT NULL DEFAULT 'confirmed';
