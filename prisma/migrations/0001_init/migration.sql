-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('active', 'inactive', 'suspended');

-- CreateEnum
CREATE TYPE "property_category" AS ENUM ('apartment', 'house', 'mini_apartment', 'office');

-- CreateEnum
CREATE TYPE "property_role" AS ENUM ('owner', 'admin', 'technician', 'viewer');

-- CreateEnum
CREATE TYPE "service_usage_base" AS ENUM ('meter', 'lease', 'device', 'member');

-- CreateEnum
CREATE TYPE "billing_period_status" AS ENUM ('active', 'closed');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('pending', 'partial', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "invoice_kind" AS ENUM ('move_in', 'transition', 'closing', 'other');

-- CreateEnum
CREATE TYPE "invoice_item_kind" AS ENUM ('rent', 'service', 'meter', 'deposit', 'credit', 'other');

-- CreateEnum
CREATE TYPE "refund_item_kind" AS ENUM ('deposit', 'unused_rent', 'unused_service', 'other');

-- CreateEnum
CREATE TYPE "refund_status" AS ENUM ('pending', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('phone', 'google', 'facebook', 'apple', 'password');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('cash', 'bank_transfer');

-- CreateEnum
CREATE TYPE "item_condition" AS ENUM ('good', 'damaged', 'missing');

-- CreateEnum
CREATE TYPE "request_type" AS ENUM ('maintenance', 'close_lease', 'enquiry');

-- CreateEnum
CREATE TYPE "request_status" AS ENUM ('open', 'in_progress', 'resolved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "request_priority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "plan_cycle" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "sub_period_status" AS ENUM ('active', 'expired');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone_number" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "status" "account_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "provider" "auth_provider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(6),

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_properties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "role" "property_role" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_name" TEXT NOT NULL,
    "price" DECIMAL(14,0) NOT NULL,
    "description" TEXT,
    "cycle" "plan_cycle" NOT NULL,
    "features" JSONB NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,

    CONSTRAINT "account_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_subscription_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "sub_period_status" NOT NULL,

    CONSTRAINT "subscription_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_name" TEXT NOT NULL,
    "category" "property_category" NOT NULL,
    "street" TEXT NOT NULL,
    "header_image" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documents" JSONB NOT NULL DEFAULT '[]',
    "province" JSONB NOT NULL,
    "ward" JSONB NOT NULL,
    "rent_price_from" DECIMAL(14,0),
    "rent_price_to" DECIMAL(14,0),
    "rent_negotiable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "unit_name" TEXT NOT NULL,
    "area" DECIMAL(8,2) NOT NULL,
    "floor" INTEGER NOT NULL,
    "bathrooms" SMALLINT,
    "bedrooms" SMALLINT,
    "rent_price" DECIMAL(14,0),
    "rent_negotiable" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "service_name" TEXT NOT NULL,
    "usage_base" "service_usage_base" NOT NULL,
    "unit_of_measure" TEXT,
    "prices" JSONB NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "meter_name" TEXT NOT NULL,
    "serial_number" TEXT,
    "installed_at" DATE,
    "removed_at" DATE,
    "max_value" DECIMAL(14,3),
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "meters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreement_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "template_name" TEXT NOT NULL,
    "versions" JSONB NOT NULL,
    "current_version" INTEGER NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "agreement_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "inventory_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handovers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "item_condition" "item_condition" NOT NULL DEFAULT 'good',
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "prices" JSONB NOT NULL,
    "billing_cycle_day" SMALLINT NOT NULL DEFAULT 1,
    "deposit_amount" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "terminated_at" DATE,
    "termination_reason" TEXT,
    "agreement_template_id" UUID,
    "agreement_template_version" INTEGER,
    "agreement_data" JSONB,
    "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_leases" (
    "lease_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_leases_pkey" PRIMARY KEY ("lease_id","account_id")
);

-- CreateTable
CREATE TABLE "lease_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lease_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone_number" TEXT,
    "year_of_birth" SMALLINT NOT NULL,
    "joined_at" DATE NOT NULL,
    "left_at" DATE,

    CONSTRAINT "lease_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lease_handovers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "source_item_id" UUID,
    "item_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "item_condition" "item_condition" NOT NULL DEFAULT 'good',
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "lease_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "meter_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "details" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "service_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "status" "billing_period_status" NOT NULL DEFAULT 'active',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "rent_amount" DECIMAL(14,0) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "billing_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "meter_id" UUID NOT NULL,
    "read_on" DATE NOT NULL,
    "reading_value" DECIMAL(14,3) NOT NULL,
    "read_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "billing_period_id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "opening_reading_id" UUID,
    "closing_reading_id" UUID,
    "quantity" DECIMAL(14,3),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "kind" "invoice_kind" NOT NULL,
    "billing_period_id" UUID,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "invoice_status" NOT NULL DEFAULT 'pending',
    "cancelled_at" TIMESTAMPTZ(6),
    "target_metadata" JSONB NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "parent_id" UUID,
    "seq" SMALLINT NOT NULL DEFAULT 0,
    "kind" "invoice_item_kind" NOT NULL DEFAULT 'other',
    "usage_id" UUID,
    "voided_at" TIMESTAMPTZ(6),
    "title" TEXT NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "detail" JSONB,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "method" "payment_method" NOT NULL,
    "paid_on" DATE NOT NULL,
    "reference" TEXT,
    "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "billing_period_id" UUID,
    "amount" DECIMAL(14,0) NOT NULL,
    "status" "refund_status" NOT NULL DEFAULT 'pending',
    "method" "payment_method",
    "paid_at" TIMESTAMPTZ(6),
    "note" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "refund_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "kind" "refund_item_kind" NOT NULL,
    "invoice_item_id" UUID,
    "title" TEXT NOT NULL,
    "charged_amount" DECIMAL(14,0) NOT NULL,
    "unused_days" INTEGER,
    "total_days" INTEGER,
    "amount" DECIMAL(14,0) NOT NULL,
    "note" TEXT,

    CONSTRAINT "refund_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "unit_id" UUID,
    "lease_id" UUID,
    "type" "request_type" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "request_priority" NOT NULL DEFAULT 'normal',
    "status" "request_status" NOT NULL DEFAULT 'open',
    "requested_by" UUID NOT NULL,
    "assigned_to" UUID,
    "requested_close_date" DATE,
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_identities_account_id_idx" ON "auth_identities"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_provider_user_id_key" ON "auth_identities"("provider", "provider_user_id");

-- CreateIndex
CREATE INDEX "account_properties_account_id_idx" ON "account_properties"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_properties_property_id_account_id_key" ON "account_properties"("property_id", "account_id");

-- CreateIndex
CREATE INDEX "account_subscriptions_account_id_idx" ON "account_subscriptions"("account_id");

-- CreateIndex
CREATE INDEX "account_subscriptions_plan_id_idx" ON "account_subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "subscription_periods_account_subscription_id_idx" ON "subscription_periods"("account_subscription_id");

-- CreateIndex
CREATE INDEX "units_property_id_idx" ON "units"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "units_id_property_id_key" ON "units"("id", "property_id");

-- CreateIndex
CREATE INDEX "services_property_id_idx" ON "services"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "services_id_property_id_key" ON "services"("id", "property_id");

-- CreateIndex
CREATE INDEX "meters_property_id_idx" ON "meters"("property_id");

-- CreateIndex
CREATE INDEX "meters_unit_id_property_id_idx" ON "meters"("unit_id", "property_id");

-- CreateIndex
CREATE INDEX "meters_service_id_property_id_idx" ON "meters"("service_id", "property_id");

-- CreateIndex
CREATE UNIQUE INDEX "meters_id_property_id_key" ON "meters"("id", "property_id");

-- CreateIndex
CREATE UNIQUE INDEX "meters_id_service_id_key" ON "meters"("id", "service_id");

-- CreateIndex
CREATE INDEX "agreement_templates_property_id_idx" ON "agreement_templates"("property_id");

-- CreateIndex
CREATE INDEX "agreement_templates_created_by_idx" ON "agreement_templates"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "agreement_templates_id_property_id_key" ON "agreement_templates"("id", "property_id");

-- CreateIndex
CREATE INDEX "inventory_items_property_id_idx" ON "inventory_items"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_id_property_id_key" ON "inventory_items"("id", "property_id");

-- CreateIndex
CREATE INDEX "handovers_property_id_idx" ON "handovers"("property_id");

-- CreateIndex
CREATE INDEX "handovers_item_id_property_id_idx" ON "handovers"("item_id", "property_id");

-- CreateIndex
CREATE INDEX "handovers_unit_id_property_id_idx" ON "handovers"("unit_id", "property_id");

-- CreateIndex
CREATE INDEX "leases_property_id_idx" ON "leases"("property_id");

-- CreateIndex
CREATE INDEX "leases_unit_id_property_id_idx" ON "leases"("unit_id", "property_id");

-- CreateIndex
CREATE INDEX "leases_agreement_template_id_property_id_idx" ON "leases"("agreement_template_id", "property_id");

-- CreateIndex
CREATE UNIQUE INDEX "leases_id_property_id_key" ON "leases"("id", "property_id");

-- CreateIndex
CREATE UNIQUE INDEX "leases_id_unit_id_key" ON "leases"("id", "unit_id");

-- CreateIndex
CREATE INDEX "account_leases_lease_id_idx" ON "account_leases"("lease_id");

-- CreateIndex
CREATE INDEX "account_leases_account_id_idx" ON "account_leases"("account_id");

-- CreateIndex
CREATE INDEX "lease_members_lease_id_idx" ON "lease_members"("lease_id");

-- CreateIndex
CREATE INDEX "lease_handovers_lease_id_property_id_idx" ON "lease_handovers"("lease_id", "property_id");

-- CreateIndex
CREATE INDEX "lease_handovers_source_item_id_property_id_idx" ON "lease_handovers"("source_item_id", "property_id");

-- CreateIndex
CREATE INDEX "service_subscriptions_lease_id_property_id_idx" ON "service_subscriptions"("lease_id", "property_id");

-- CreateIndex
CREATE INDEX "service_subscriptions_service_id_property_id_idx" ON "service_subscriptions"("service_id", "property_id");

-- CreateIndex
CREATE INDEX "service_subscriptions_meter_id_service_id_idx" ON "service_subscriptions"("meter_id", "service_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_subscriptions_id_lease_id_key" ON "service_subscriptions"("id", "lease_id");

-- CreateIndex
CREATE INDEX "billing_periods_property_id_idx" ON "billing_periods"("property_id");

-- CreateIndex
CREATE INDEX "billing_periods_lease_id_property_id_idx" ON "billing_periods"("lease_id", "property_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_periods_id_lease_id_key" ON "billing_periods"("id", "lease_id");

-- CreateIndex
CREATE INDEX "readings_read_by_idx" ON "readings"("read_by");

-- CreateIndex
CREATE INDEX "readings_meter_id_property_id_idx" ON "readings"("meter_id", "property_id");

-- CreateIndex
CREATE INDEX "usages_opening_reading_id_idx" ON "usages"("opening_reading_id");

-- CreateIndex
CREATE INDEX "usages_closing_reading_id_idx" ON "usages"("closing_reading_id");

-- CreateIndex
CREATE INDEX "usages_billing_period_id_lease_id_idx" ON "usages"("billing_period_id", "lease_id");

-- CreateIndex
CREATE INDEX "usages_lease_id_property_id_idx" ON "usages"("lease_id", "property_id");

-- CreateIndex
CREATE INDEX "usages_subscription_id_lease_id_idx" ON "usages"("subscription_id", "lease_id");

-- CreateIndex
CREATE UNIQUE INDEX "usages_billing_period_id_subscription_id_key" ON "usages"("billing_period_id", "subscription_id");

-- CreateIndex
CREATE INDEX "invoices_property_id_idx" ON "invoices"("property_id");

-- CreateIndex
CREATE INDEX "invoices_created_by_idx" ON "invoices"("created_by");

-- CreateIndex
CREATE INDEX "invoices_lease_id_property_id_idx" ON "invoices"("lease_id", "property_id");

-- CreateIndex
CREATE INDEX "invoices_billing_period_id_lease_id_idx" ON "invoices"("billing_period_id", "lease_id");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_items_parent_id_idx" ON "invoice_items"("parent_id");

-- CreateIndex
CREATE INDEX "invoice_items_usage_id_idx" ON "invoice_items"("usage_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_items_id_invoice_id_key" ON "invoice_items"("id", "invoice_id");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_created_by_idx" ON "payments"("created_by");

-- CreateIndex
CREATE INDEX "refunds_property_id_idx" ON "refunds"("property_id");

-- CreateIndex
CREATE INDEX "refunds_created_by_idx" ON "refunds"("created_by");

-- CreateIndex
CREATE INDEX "refunds_lease_id_property_id_idx" ON "refunds"("lease_id", "property_id");

-- CreateIndex
CREATE INDEX "refunds_billing_period_id_lease_id_idx" ON "refunds"("billing_period_id", "lease_id");

-- CreateIndex
CREATE INDEX "refund_items_refund_id_idx" ON "refund_items"("refund_id");

-- CreateIndex
CREATE INDEX "refund_items_invoice_id_idx" ON "refund_items"("invoice_id");

-- CreateIndex
CREATE INDEX "refund_items_invoice_item_id_invoice_id_idx" ON "refund_items"("invoice_item_id", "invoice_id");

-- CreateIndex
CREATE INDEX "requests_property_id_idx" ON "requests"("property_id");

-- CreateIndex
CREATE INDEX "requests_requested_by_idx" ON "requests"("requested_by");

-- CreateIndex
CREATE INDEX "requests_assigned_to_idx" ON "requests"("assigned_to");

-- CreateIndex
CREATE INDEX "requests_unit_id_property_id_idx" ON "requests"("unit_id", "property_id");

-- CreateIndex
CREATE INDEX "requests_lease_id_property_id_idx" ON "requests"("lease_id", "property_id");

-- CreateIndex
CREATE INDEX "requests_lease_id_unit_id_idx" ON "requests"("lease_id", "unit_id");

-- CreateIndex
CREATE INDEX "request_comments_request_id_idx" ON "request_comments"("request_id");

-- CreateIndex
CREATE INDEX "request_comments_author_id_idx" ON "request_comments"("author_id");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "account_properties" ADD CONSTRAINT "account_properties_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "account_properties" ADD CONSTRAINT "account_properties_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "account_subscriptions" ADD CONSTRAINT "account_subscriptions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "account_subscriptions" ADD CONSTRAINT "account_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscription_periods" ADD CONSTRAINT "subscription_periods_account_subscription_id_fkey" FOREIGN KEY ("account_subscription_id") REFERENCES "account_subscriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meters" ADD CONSTRAINT "meters_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meters" ADD CONSTRAINT "meters_unit_id_property_id_fkey" FOREIGN KEY ("unit_id", "property_id") REFERENCES "units"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meters" ADD CONSTRAINT "meters_service_id_property_id_fkey" FOREIGN KEY ("service_id", "property_id") REFERENCES "services"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agreement_templates" ADD CONSTRAINT "agreement_templates_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agreement_templates" ADD CONSTRAINT "agreement_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_item_id_property_id_fkey" FOREIGN KEY ("item_id", "property_id") REFERENCES "inventory_items"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_unit_id_property_id_fkey" FOREIGN KEY ("unit_id", "property_id") REFERENCES "units"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_unit_id_property_id_fkey" FOREIGN KEY ("unit_id", "property_id") REFERENCES "units"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_agreement_template_id_property_id_fkey" FOREIGN KEY ("agreement_template_id", "property_id") REFERENCES "agreement_templates"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "account_leases" ADD CONSTRAINT "account_leases_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "account_leases" ADD CONSTRAINT "account_leases_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lease_members" ADD CONSTRAINT "lease_members_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lease_handovers" ADD CONSTRAINT "lease_handovers_lease_id_property_id_fkey" FOREIGN KEY ("lease_id", "property_id") REFERENCES "leases"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lease_handovers" ADD CONSTRAINT "lease_handovers_source_item_id_property_id_fkey" FOREIGN KEY ("source_item_id", "property_id") REFERENCES "inventory_items"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_subscriptions" ADD CONSTRAINT "service_subscriptions_lease_id_property_id_fkey" FOREIGN KEY ("lease_id", "property_id") REFERENCES "leases"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_subscriptions" ADD CONSTRAINT "service_subscriptions_service_id_property_id_fkey" FOREIGN KEY ("service_id", "property_id") REFERENCES "services"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_subscriptions" ADD CONSTRAINT "service_subscriptions_meter_id_service_id_fkey" FOREIGN KEY ("meter_id", "service_id") REFERENCES "meters"("id", "service_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "billing_periods" ADD CONSTRAINT "billing_periods_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "billing_periods" ADD CONSTRAINT "billing_periods_lease_id_property_id_fkey" FOREIGN KEY ("lease_id", "property_id") REFERENCES "leases"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_read_by_fkey" FOREIGN KEY ("read_by") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_meter_id_property_id_fkey" FOREIGN KEY ("meter_id", "property_id") REFERENCES "meters"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usages" ADD CONSTRAINT "usages_opening_reading_id_fkey" FOREIGN KEY ("opening_reading_id") REFERENCES "readings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usages" ADD CONSTRAINT "usages_closing_reading_id_fkey" FOREIGN KEY ("closing_reading_id") REFERENCES "readings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usages" ADD CONSTRAINT "usages_billing_period_id_lease_id_fkey" FOREIGN KEY ("billing_period_id", "lease_id") REFERENCES "billing_periods"("id", "lease_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usages" ADD CONSTRAINT "usages_lease_id_property_id_fkey" FOREIGN KEY ("lease_id", "property_id") REFERENCES "leases"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usages" ADD CONSTRAINT "usages_subscription_id_lease_id_fkey" FOREIGN KEY ("subscription_id", "lease_id") REFERENCES "service_subscriptions"("id", "lease_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_lease_id_property_id_fkey" FOREIGN KEY ("lease_id", "property_id") REFERENCES "leases"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billing_period_id_lease_id_fkey" FOREIGN KEY ("billing_period_id", "lease_id") REFERENCES "billing_periods"("id", "lease_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "invoice_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_usage_id_fkey" FOREIGN KEY ("usage_id") REFERENCES "usages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_lease_id_property_id_fkey" FOREIGN KEY ("lease_id", "property_id") REFERENCES "leases"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_billing_period_id_lease_id_fkey" FOREIGN KEY ("billing_period_id", "lease_id") REFERENCES "billing_periods"("id", "lease_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_invoice_item_id_invoice_id_fkey" FOREIGN KEY ("invoice_item_id", "invoice_id") REFERENCES "invoice_items"("id", "invoice_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_unit_id_property_id_fkey" FOREIGN KEY ("unit_id", "property_id") REFERENCES "units"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_lease_id_property_id_fkey" FOREIGN KEY ("lease_id", "property_id") REFERENCES "leases"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_lease_id_unit_id_fkey" FOREIGN KEY ("lease_id", "unit_id") REFERENCES "leases"("id", "unit_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "request_comments" ADD CONSTRAINT "request_comments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "request_comments" ADD CONSTRAINT "request_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

