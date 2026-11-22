-- A confirmation is valid for 1 or 2 years; once it lapses it stops counting and the property drops from `verified`.
ALTER TABLE "property_verifications" ADD COLUMN "validity_years" INTEGER, ADD COLUMN "expires_at" TIMESTAMPTZ(6);
ALTER TABLE "property_verifications" ADD CONSTRAINT "property_verifications_validity_years_check" CHECK ("validity_years" IS NULL OR "validity_years" IN (1, 2));
ALTER TABLE "properties" ADD COLUMN "verification_expires_at" TIMESTAMPTZ(6);

-- confirmations made before terms existed get one year from their review
UPDATE "property_verifications" SET "validity_years" = 1, "expires_at" = COALESCE("reviewed_at", "declared_at") + INTERVAL '1 year' WHERE "status" = 'confirmed';
UPDATE "properties" SET "verification_expires_at" = (
  SELECT MIN(v."expires_at") FROM "property_verifications" v JOIN "verification_criteria" c ON c."id" = v."criterion_id"
  WHERE v."property_id" = "properties"."id" AND c."active" AND c."required" AND v."status" = 'confirmed')
WHERE "verification_status" = 'verified';
