-- Readings are recorded with a timestamp, so a meter can be read several times a day.
-- "read_on" stays as the day the reading belongs to (the date of "read_at"); billing still looks readings up by day.

ALTER TABLE "readings" ADD COLUMN "read_at" TIMESTAMPTZ(6);
UPDATE "readings" SET "read_at" = "read_on"::timestamp AT TIME ZONE 'UTC';
ALTER TABLE "readings" ALTER COLUMN "read_at" SET NOT NULL;

DROP INDEX "readings_meter_read_on_live_key";
CREATE UNIQUE INDEX "readings_meter_read_at_live_key" ON "readings" ("meter_id", "read_at") WHERE "deleted_at" IS NULL;
CREATE INDEX "readings_meter_id_read_on_idx" ON "readings" ("meter_id", "read_on");
