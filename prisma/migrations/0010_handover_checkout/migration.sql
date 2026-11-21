-- Check-out of a handed-over item when the lease ends.
ALTER TABLE "handovers"
  ADD COLUMN "returned_quantity" INTEGER,
  ADD COLUMN "returned_condition" "item_condition",
  ADD COLUMN "return_note" TEXT,
  ADD COLUMN "returned_at" DATE;
