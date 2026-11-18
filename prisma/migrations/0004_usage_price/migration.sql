-- A usage freezes the price version it is billed with: the version in force on the period's first day
-- ({effectiveDate, tiers}). Later price changes never touch a period that already opened.
ALTER TABLE "usages" ADD COLUMN "price" JSONB NOT NULL;
ALTER TABLE "usages" ADD CONSTRAINT "usages_price_chk" CHECK (jsonb_typeof("price") = 'object');
