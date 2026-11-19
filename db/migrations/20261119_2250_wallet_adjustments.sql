CREATE TABLE IF NOT EXISTS wallet_adjustments (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  previous_balance NUMERIC(10, 2) NOT NULL,
  new_balance NUMERIC(10, 2) NOT NULL CHECK (new_balance >= 0),
  delta NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_adjustments_student_created
  ON wallet_adjustments(student_id, created_at DESC);
