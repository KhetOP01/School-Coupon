ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED'
    CHECK (status IN ('COMPLETED', 'VOIDED')),
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS void_reason VARCHAR(255);

CREATE TABLE IF NOT EXISTS payment_voids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL UNIQUE REFERENCES payments(id),
  merchant_id INT NOT NULL REFERENCES merchants(id),
  student_id INT NOT NULL REFERENCES students(id),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  reason VARCHAR(255),
  voided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_voids_merchant_voided
  ON payment_voids(merchant_id, voided_at);
