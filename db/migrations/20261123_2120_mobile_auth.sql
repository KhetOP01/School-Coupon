CREATE TABLE IF NOT EXISTS parents (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  pin_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parent_students (
  parent_id INT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship VARCHAR(30) NOT NULL DEFAULT 'guardian',
  PRIMARY KEY (parent_id, student_id)
);

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);

-- Demo parent accounts (PIN: 123456)
INSERT INTO parents (id, phone, pin_hash, full_name, status)
VALUES
  (1, '0812345678', 'scrypt:a1b2c3d4e5f60718293a4b5c6d7e8f90:bf6bdd1693dc31289e14d0eca9d8dd21d9e5d6945a99a798b2bbd904873d4578962b2471595c04a15459dab8ff124511d0288e7e5d3c60b4a850d8211c4903db', 'คุณสมศรี ใจดี', 'active'),
  (2, '0899999999', 'scrypt:a1b2c3d4e5f60718293a4b5c6d7e8f90:bf6bdd1693dc31289e14d0eca9d8dd21d9e5d6945a99a798b2bbd904873d4578962b2471595c04a15459dab8ff124511d0288e7e5d3c60b4a850d8211c4903db', 'คุณวิชัย รักเรียน', 'active')
ON CONFLICT (phone) DO NOTHING;

SELECT setval(pg_get_serial_sequence('parents', 'id'), GREATEST((SELECT MAX(id) FROM parents), 1), TRUE);

-- Link demo parent #1 to demo students 1..5 if they exist
INSERT INTO parent_students (parent_id, student_id, relationship)
SELECT p.id, s.id, 'guardian'
FROM parents p
JOIN students s ON s.id IN (1, 2, 3, 4, 5)
WHERE p.phone = '0812345678'
ON CONFLICT (parent_id, student_id) DO NOTHING;

-- Link demo parent #2 to demo student 2 if exists
INSERT INTO parent_students (parent_id, student_id, relationship)
SELECT p.id, s.id, 'guardian'
FROM parents p
JOIN students s ON s.id = 2
WHERE p.phone = '0899999999'
ON CONFLICT (parent_id, student_id) DO NOTHING;

-- Default PIN (123456) for existing merchants without a PIN
UPDATE merchants
SET pin_hash = 'scrypt:a1b2c3d4e5f60718293a4b5c6d7e8f90:bf6bdd1693dc31289e14d0eca9d8dd21d9e5d6945a99a798b2bbd904873d4578962b2471595c04a15459dab8ff124511d0288e7e5d3c60b4a850d8211c4903db'
WHERE pin_hash IS NULL;
