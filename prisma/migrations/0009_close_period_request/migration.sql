-- A tenant asks the landlord to close the running billing period, handing in the meter readings.
-- "details" carries the structured part of such a request: { periodId, endDate, readings: [...] }.
ALTER TYPE "request_type" ADD VALUE 'close_period';
ALTER TABLE "requests" ADD COLUMN "details" JSONB;
