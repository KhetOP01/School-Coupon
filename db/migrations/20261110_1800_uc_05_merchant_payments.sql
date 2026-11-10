CREATE TABLE IF NOT EXISTS merchants (
  id SERIAL PRIMARY KEY,
  merchant_code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  fee_percent NUMERIC(4, 2) NOT NULL DEFAULT 2.00,
  bank_account_no VARCHAR(50),
  bank_name VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id INT NOT NULL REFERENCES students(id),
  merchant_id INT NOT NULL REFERENCES merchants(id),
  card_id INT NOT NULL REFERENCES rfid_cards(id),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_mode VARCHAR(10) NOT NULL CHECK (payment_mode IN ('ONLINE', 'OFFLINE')),
  offline_trx_id UUID UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_student_created
  ON payments(student_id, created_at);

CREATE INDEX IF NOT EXISTS idx_payments_merchant_created
  ON payments(merchant_id, created_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_wallet_balance_floor'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_wallet_balance_floor CHECK (wallet_balance >= -500.00);
  END IF;
END $$;
