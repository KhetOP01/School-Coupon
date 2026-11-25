CREATE TABLE IF NOT EXISTS canteen_stalls (
  id SERIAL PRIMARY KEY,
  stall_code VARCHAR(30) NOT NULL UNIQUE
    CHECK (length(trim(stall_code)) > 0),
  winner_name VARCHAR(150) NOT NULL
    CHECK (length(trim(winner_name)) > 0),
  winner_phone VARCHAR(30) NOT NULL
    CHECK (length(trim(winner_phone)) > 0),
  fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 2.00
    CHECK (fee_percent >= 0 AND fee_percent <= 100),
  merchant_id INTEGER UNIQUE REFERENCES merchants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
