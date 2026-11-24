CREATE TABLE IF NOT EXISTS staff_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE
    CHECK (length(trim(username)) > 0),
  password_hash VARCHAR(255) NOT NULL
    CHECK (length(password_hash) > 0),
  full_name VARCHAR(150) NOT NULL
    CHECK (length(trim(full_name)) > 0),
  role VARCHAR(30) NOT NULL DEFAULT 'staff'
    CHECK (role IN ('staff', 'admin')),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
