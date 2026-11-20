-- Handover items belong to a lease, not a unit. The per-lease snapshot table is folded into "handovers".

ALTER TABLE "handovers" DROP CONSTRAINT "handovers_unit_id_property_id_fkey";
DROP INDEX "handovers_unit_item_live_key";
DROP INDEX "handovers_unit_id_property_id_idx";

-- the old per-unit default lists are replaced by the per-lease rows below
DELETE FROM "handovers";
ALTER TABLE "handovers" DROP COLUMN "unit_id";
ALTER TABLE "handovers" ADD COLUMN "lease_id" UUID NOT NULL;

-- carry over what leases already hold (rows whose catalogue item is gone cannot be kept)
INSERT INTO "handovers" ("property_id", "lease_id", "item_id", "quantity", "item_condition", "description", "created_at", "updated_at", "deleted_at")
SELECT DISTINCT ON (lh."lease_id", lh."source_item_id")
  lh."property_id", lh."lease_id", lh."source_item_id", lh."quantity", lh."item_condition", lh."description", lh."created_at", lh."updated_at", lh."deleted_at"
FROM "lease_handovers" lh
WHERE lh."source_item_id" IS NOT NULL AND lh."deleted_at" IS NULL
ORDER BY lh."lease_id", lh."source_item_id", lh."created_at";

DROP TABLE "lease_handovers";

CREATE INDEX "handovers_lease_id_property_id_idx" ON "handovers"("lease_id", "property_id");
CREATE UNIQUE INDEX "handovers_lease_item_live_key" ON "handovers" ("lease_id", "item_id") WHERE "deleted_at" IS NULL;
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_lease_id_property_id_fkey" FOREIGN KEY ("lease_id", "property_id") REFERENCES "leases"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
