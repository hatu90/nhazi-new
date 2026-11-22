-- Lease documents become { path, name } (the name is a caption the uploader can edit) instead of bare storage keys.
ALTER TABLE "leases" ADD COLUMN "documents_new" JSONB NOT NULL DEFAULT '[]';
UPDATE "leases" SET "documents_new" = COALESCE((SELECT jsonb_agg(jsonb_build_object('path', d, 'name', '')) FROM unnest("documents") AS d), '[]'::jsonb);
ALTER TABLE "leases" DROP COLUMN "documents";
ALTER TABLE "leases" RENAME COLUMN "documents_new" TO "documents";
