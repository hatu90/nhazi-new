-- The overall verification result moves from two columns on `properties` to its own table, one row per verified period.
-- "registered" is not stored: it is derived from property_verifications.
CREATE TYPE "verification_end_reason" AS ENUM ('expired', 'no_longer_met');

CREATE TABLE "property_verification_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "verified_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "ended_at" TIMESTAMPTZ(6),
    "end_reason" "verification_end_reason",
    "confirmed_by" UUID,
    "criteria" JSONB NOT NULL,
    CONSTRAINT "property_verification_results_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "property_verification_results_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "property_verification_results_ended_check" CHECK (("ended_at" IS NULL) = ("end_reason" IS NULL))
);
CREATE INDEX "property_verification_results_property_id_verified_at_idx" ON "property_verification_results"("property_id", "verified_at" DESC);
-- at most one open (current) period per property
CREATE UNIQUE INDEX "property_verification_results_one_open_idx" ON "property_verification_results"("property_id") WHERE "ended_at" IS NULL;

-- carry over properties that are verified right now as an open period (the criteria snapshot is rebuilt by the next recompute)
INSERT INTO "property_verification_results" ("property_id", "expires_at", "criteria")
SELECT "id", COALESCE("verification_expires_at", now()), '[]'::jsonb FROM "properties" WHERE "verification_status" = 'verified';

DROP INDEX "properties_verification_status_idx";
ALTER TABLE "properties" DROP COLUMN "verification_status", DROP COLUMN "verification_expires_at";
DROP TYPE "verification_status";
