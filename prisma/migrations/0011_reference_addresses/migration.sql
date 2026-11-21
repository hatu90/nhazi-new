-- Reference addresses (well-known places) and their n:m link to properties, with distance in meters.
CREATE TABLE "reference_addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reference_addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_reference_addresses" (
    "property_id" UUID NOT NULL,
    "reference_address_id" UUID NOT NULL,
    "distance" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_reference_addresses_pkey" PRIMARY KEY ("property_id","reference_address_id"),
    CONSTRAINT "property_reference_addresses_distance_check" CHECK ("distance" IS NULL OR "distance" >= 0)
);

CREATE UNIQUE INDEX "reference_addresses_slug_key" ON "reference_addresses"("slug");
CREATE INDEX "property_reference_addresses_reference_address_id_idx" ON "property_reference_addresses"("reference_address_id");

ALTER TABLE "property_reference_addresses" ADD CONSTRAINT "property_reference_addresses_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "property_reference_addresses" ADD CONSTRAINT "property_reference_addresses_reference_address_id_fkey" FOREIGN KEY ("reference_address_id") REFERENCES "reference_addresses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
