-- Property quality verification: a staff-managed criteria catalog, per-property declarations, and a derived status on properties.
CREATE TYPE "verification_status" AS ENUM ('none', 'registered', 'verified');
CREATE TYPE "criterion_status" AS ENUM ('declared', 'confirmed', 'rejected');

ALTER TABLE "accounts" ADD COLUMN "is_platform_admin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN "verification_status" "verification_status" NOT NULL DEFAULT 'none';

CREATE TABLE "verification_criteria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "description" TEXT,
    "description_en" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verification_criteria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "criterion_id" UUID NOT NULL,
    "status" "criterion_status" NOT NULL DEFAULT 'declared',
    "note" TEXT,
    "review_note" TEXT,
    "declared_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    CONSTRAINT "property_verifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "property_verifications_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "property_verifications_criterion_id_fkey" FOREIGN KEY ("criterion_id") REFERENCES "verification_criteria"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "property_verifications_property_id_criterion_id_key" ON "property_verifications"("property_id", "criterion_id");
CREATE INDEX "property_verifications_criterion_id_idx" ON "property_verifications"("criterion_id");
CREATE INDEX "properties_verification_status_idx" ON "properties"("verification_status");

INSERT INTO "verification_criteria" ("name", "name_en", "description", "description_en", "sort_order") VALUES
  ('Đã đăng ký hộ kinh doanh', 'Registered business household', 'Có giấy đăng ký hộ kinh doanh cho hoạt động cho thuê.', 'Holds a business-household registration for the rental activity.', 1),
  ('Đảm bảo phòng cháy chữa cháy', 'Fire safety', 'Có thiết bị PCCC, lối thoát hiểm và đáp ứng quy định.', 'Fire equipment and escape routes are in place and meet regulations.', 2),
  ('Đảm bảo vệ sinh', 'Hygiene', 'Khu vực chung và phòng được giữ sạch sẽ, có xử lý rác.', 'Common areas and rooms are kept clean, with waste handled.', 3),
  ('Đảm bảo an ninh', 'Security', 'Có biện pháp an ninh: khóa, camera, kiểm soát ra vào.', 'Security measures in place: locks, cameras, access control.', 4),
  ('Niêm yết giá, dịch vụ đầy đủ', 'Prices and services fully listed', 'Giá thuê và toàn bộ dịch vụ được niêm yết công khai.', 'Rent and all services are publicly listed.', 5);
