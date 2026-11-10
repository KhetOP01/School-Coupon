CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  student_code VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  wallet_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rfid_cards (
  id SERIAL PRIMARY KEY,
  rfid_uid VARCHAR(50) NOT NULL UNIQUE,
  student_id INTEGER NOT NULL REFERENCES students(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'lost', 'deactivated')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rfid_cards_student_id
  ON rfid_cards(student_id);

CREATE UNIQUE INDEX uq_active_card_per_student
  ON rfid_cards(student_id)
  WHERE status = 'active';
