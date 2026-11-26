-- Remove merchant/stall fee percent and settlement fee deduction
UPDATE settlements
SET net_amount = gross_amount;

ALTER TABLE settlements
  DROP COLUMN IF EXISTS fee_amount;

ALTER TABLE merchants
  DROP COLUMN IF EXISTS fee_percent;

ALTER TABLE canteen_stalls
  DROP COLUMN IF EXISTS fee_percent;
