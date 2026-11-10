ALTER TABLE students
  ADD COLUMN departed_at TIMESTAMPTZ;

CREATE TABLE student_refunds (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) UNIQUE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  processed_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_refunds_student_id
  ON student_refunds(student_id);
