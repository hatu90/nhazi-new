-- Invitations: an admin invites a phone number to a property (team role) or to a lease (tenant).
-- Whoever signs in with that (verified) phone can accept or decline.
CREATE TYPE "invitation_kind" AS ENUM ('property', 'lease');
CREATE TYPE "invitation_status" AS ENUM ('pending', 'accepted', 'declined', 'revoked');

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "invitation_kind" NOT NULL,
    "property_id" UUID NOT NULL,
    "lease_id" UUID,
    "phone_number" TEXT NOT NULL,
    "role" "property_role",
    "status" "invitation_status" NOT NULL DEFAULT 'pending',
    "invited_by" UUID NOT NULL,
    "responded_by" UUID,
    "responded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invitations_property_id_status_idx" ON "invitations"("property_id", "status");

-- CreateIndex
CREATE INDEX "invitations_phone_number_status_idx" ON "invitations"("phone_number", "status");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_lease_id_property_id_fkey" FOREIGN KEY ("lease_id", "property_id") REFERENCES "leases"("id", "property_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;


-- ── rules ──
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_kind_chk" CHECK (
  ("kind" = 'property' AND "lease_id" IS NULL AND "role" IS NOT NULL)
  OR ("kind" = 'lease' AND "lease_id" IS NOT NULL AND "role" IS NULL));
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_response_chk" CHECK (
  ("status" IN ('accepted', 'declined')) = ("responded_by" IS NOT NULL AND "responded_at" IS NOT NULL));
-- one open invitation per phone and target
CREATE UNIQUE INDEX "invitations_pending_property_uq" ON "invitations" ("property_id", "phone_number") WHERE "status" = 'pending' AND "kind" = 'property';
CREATE UNIQUE INDEX "invitations_pending_lease_uq" ON "invitations" ("lease_id", "phone_number") WHERE "status" = 'pending' AND "kind" = 'lease';
