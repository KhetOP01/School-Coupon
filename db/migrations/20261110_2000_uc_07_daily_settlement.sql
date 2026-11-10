CREATE TABLE IF NOT EXISTS settlements (
  id SERIAL PRIMARY KEY,
  merchant_id INT NOT NULL REFERENCES merchants(id),
  settlement_date DATE NOT NULL,
  gross_amount NUMERIC(10, 2) NOT NULL CHECK (gross_amount >= 0),
  fee_amount NUMERIC(10, 2) NOT NULL CHECK (fee_amount >= 0),
  net_amount NUMERIC(10, 2) NOT NULL CHECK (net_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING_APPROVAL'
    CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'PAID')),
  approved_by_staff_id INT,
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_settlement_merchant_date UNIQUE (merchant_id, settlement_date)
);

CREATE INDEX IF NOT EXISTS idx_settlements_merchant_date
  ON settlements(merchant_id, settlement_date);

CREATE INDEX IF NOT EXISTS idx_settlements_status
  ON settlements(status);
