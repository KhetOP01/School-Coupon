ALTER TABLE students
  ADD COLUMN current_daily_limit NUMERIC(10, 2) NOT NULL DEFAULT 200.00 CHECK (current_daily_limit >= 0),
  ADD COLUMN next_daily_limit NUMERIC(10, 2) NOT NULL DEFAULT 200.00 CHECK (next_daily_limit >= 0),
  ADD COLUMN daily_limit_effective_date DATE;
