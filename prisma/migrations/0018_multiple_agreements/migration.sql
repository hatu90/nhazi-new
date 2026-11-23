-- A lease can carry several agreements: [{ id, templateId, version, values }] replaces the single template/version/data columns.
ALTER TABLE "leases" ADD COLUMN "agreements" JSONB NOT NULL DEFAULT '[]';
UPDATE "leases" SET "agreements" = jsonb_build_array(jsonb_build_object(
  'id', gen_random_uuid(),
  'templateId', "agreement_template_id",
  'version', "agreement_template_version",
  'values', COALESCE("agreement_data", '{}'::jsonb)))
WHERE "agreement_template_id" IS NOT NULL AND "agreement_template_version" IS NOT NULL;
DROP INDEX IF EXISTS "leases_agreement_template_id_property_id_idx";
ALTER TABLE "leases" DROP COLUMN "agreement_template_id", DROP COLUMN "agreement_template_version", DROP COLUMN "agreement_data";
