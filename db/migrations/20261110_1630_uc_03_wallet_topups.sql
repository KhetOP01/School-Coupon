CREATE TABLE IF NOT EXISTS system_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  min_topup_amount NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
  max_topup_amount NUMERIC(10, 2) NOT NULL DEFAULT 2000.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO system_settings (id, min_topup_amount, max_topup_amount)
VALUES (1, 50.00, 2000.00)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS wallet_topups (
  id BIGSERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(id),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  status VARCHAR(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed')),
  gateway_provider VARCHAR(100),
  gateway_reference VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wallet_topups_gateway_reference_pair
    CHECK ((gateway_provider IS NULL) = (gateway_reference IS NULL)),
  CONSTRAINT wallet_topups_succeeded_has_gateway_reference
    CHECK (status <> 'succeeded' OR gateway_reference IS NOT NULL),
  CONSTRAINT wallet_topups_id_student_unique
    UNIQUE (id, student_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_topups_gateway_reference
  ON wallet_topups(gateway_provider, gateway_reference)
  WHERE gateway_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_topups_student_created
  ON wallet_topups(student_id, created_at);

CREATE TABLE IF NOT EXISTS wallet_ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(id),
  topup_id BIGINT NOT NULL UNIQUE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wallet_ledger_entries_topup_student_fk
    FOREIGN KEY (topup_id, student_id) REFERENCES wallet_topups(id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_entries_student_created
  ON wallet_ledger_entries(student_id, created_at);
