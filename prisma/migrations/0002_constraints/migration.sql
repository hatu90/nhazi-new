-- Constraints Prisma cannot express: partial unique indexes, expression indexes, CHECKs, EXCLUDE.
-- Triggers (invoice totals, reading/usage rules, template version immutability, ...) are NOT here yet.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── partial unique indexes (soft delete aware) ───────────────────────────────────────
CREATE UNIQUE INDEX "accounts_phone_number_live_key" ON "accounts" ("phone_number") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "units_property_name_live_key" ON "units" ("property_id", "unit_name") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "services_property_name_live_key" ON "services" ("property_id", "service_name") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "inventory_items_property_name_live_key" ON "inventory_items" ("property_id", "inventory_name") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "handovers_unit_item_live_key" ON "handovers" ("unit_id", "item_id") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "readings_meter_read_on_live_key" ON "readings" ("meter_id", "read_on") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "agreement_templates_default_live_key" ON "agreement_templates" ("property_id") WHERE "is_default" AND "deleted_at" IS NULL;
CREATE UNIQUE INDEX "invoice_items_usage_billed_once_key" ON "invoice_items" ("usage_id") WHERE "usage_id" IS NOT NULL AND "voided_at" IS NULL;
CREATE UNIQUE INDEX "invoices_one_per_event_key" ON "invoices" ("lease_id", "billing_period_id", "kind")
  WHERE "kind" <> 'other' AND "status" <> 'cancelled' AND "deleted_at" IS NULL;
CREATE UNIQUE INDEX "billing_periods_one_active_key" ON "billing_periods" ("lease_id") WHERE "status" = 'active';

-- ── expression indexes for search ────────────────────────────────────────────────────
CREATE INDEX "properties_province_code_idx" ON "properties" (((province->>'code')::int)) WHERE "deleted_at" IS NULL;
CREATE INDEX "properties_ward_code_idx" ON "properties" (((ward->>'code')::int)) WHERE "deleted_at" IS NULL;

-- ── CHECK constraints ────────────────────────────────────────────────────────────────
ALTER TABLE "properties" ADD CONSTRAINT "properties_ward_in_province_chk"
  CHECK ((ward->>'provinceCode')::int = (province->>'code')::int);
ALTER TABLE "properties" ADD CONSTRAINT "properties_rent_range_chk"
  CHECK ("rent_price_from" IS NULL OR "rent_price_to" IS NULL OR "rent_price_from" <= "rent_price_to");
ALTER TABLE "leases" ADD CONSTRAINT "leases_billing_cycle_day_chk" CHECK ("billing_cycle_day" BETWEEN 1 AND 28);
ALTER TABLE "leases" ADD CONSTRAINT "leases_dates_chk" CHECK ("end_date" IS NULL OR "end_date" >= "start_date");
ALTER TABLE "leases" ADD CONSTRAINT "leases_agreement_version_chk"
  CHECK (("agreement_template_id" IS NULL) = ("agreement_template_version" IS NULL));
ALTER TABLE "lease_members" ADD CONSTRAINT "lease_members_dates_chk" CHECK ("left_at" IS NULL OR "left_at" >= "joined_at");
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_chk" CHECK ("amount" > 0);
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_cancelled_chk" CHECK (("status" = 'cancelled') = ("cancelled_at" IS NOT NULL));
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_amount_chk" CHECK ("amount" >= 0);
ALTER TABLE "service_subscriptions" ADD CONSTRAINT "service_subscriptions_quantity_chk" CHECK ("quantity" >= 1);
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_amount_chk" CHECK ("amount" >= 0 AND "amount" <= "charged_amount");
ALTER TABLE "requests" ADD CONSTRAINT "requests_close_lease_chk" CHECK (
  ("type" = 'close_lease' AND "lease_id" IS NOT NULL AND "requested_close_date" IS NOT NULL)
  OR ("type" <> 'close_lease' AND "requested_close_date" IS NULL));

-- ── EXCLUDE constraints (no overlaps) ────────────────────────────────────────────────
ALTER TABLE "billing_periods" ADD CONSTRAINT "billing_periods_no_overlap_excl"
  EXCLUDE USING gist ("lease_id" WITH =, daterange("start_date", "end_date", '[]') WITH &&);
ALTER TABLE "leases" ADD CONSTRAINT "leases_unit_no_overlap_excl"
  EXCLUDE USING gist ("unit_id" WITH =, daterange("start_date", COALESCE("terminated_at", "end_date"), '[]') WITH &&)
  WHERE ("deleted_at" IS NULL);
ALTER TABLE "account_subscriptions" ADD CONSTRAINT "account_subscriptions_no_overlap_excl"
  EXCLUDE USING gist ("account_id" WITH =, daterange("start_date", "end_date", '[]') WITH &&);

-- ── DB-level default for updated_at (Prisma's @updatedAt is client-side only; raw SQL / seeds need this) ──
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT table_name FROM information_schema.columns
           WHERE table_schema = 'public' AND column_name = 'updated_at' AND table_name <> '_prisma_migrations'
  LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN "updated_at" SET DEFAULT now()', r.table_name);
  END LOOP;
END $$;
