-- AC1.1: existing active card and a non-zero wallet to prove that reissue preserves balance.
INSERT INTO students (id, student_code, first_name, last_name, wallet_balance)
VALUES (101, 'UC01-AC11', 'Mali', 'Seed', 65.00)
ON CONFLICT (student_code) DO NOTHING;

INSERT INTO rfid_cards (id, rfid_uid, student_id, status)
SELECT 101, 'UC01-AC11-OLD', id, 'active'
FROM students
WHERE student_code = 'UC01-AC11'
ON CONFLICT (rfid_uid) DO NOTHING;

-- AC1.2: UID belongs to another student and must remain unavailable.
INSERT INTO students (id, student_code, first_name, last_name, wallet_balance)
VALUES (102, 'UC01-AC12', 'Niran', 'Seed', 0.00)
ON CONFLICT (student_code) DO NOTHING;

INSERT INTO rfid_cards (id, rfid_uid, student_id, status)
SELECT 102, 'UC01-AC12-BOUND', id, 'active'
FROM students
WHERE student_code = 'UC01-AC12'
ON CONFLICT (rfid_uid) DO NOTHING;

-- AC1.6: two requests may race to replace this single active card.
INSERT INTO students (id, student_code, first_name, last_name, wallet_balance)
VALUES (106, 'UC01-AC16', 'Suda', 'Seed', 20.00)
ON CONFLICT (student_code) DO NOTHING;

INSERT INTO rfid_cards (id, rfid_uid, student_id, status)
SELECT 106, 'UC01-AC16-ACTIVE', id, 'active'
FROM students
WHERE student_code = 'UC01-AC16'
ON CONFLICT (rfid_uid) DO NOTHING;

-- AC1.7: a deactivated UID is still permanently reserved.
INSERT INTO students (id, student_code, first_name, last_name, wallet_balance)
VALUES (107, 'UC01-AC17', 'Anan', 'Seed', 10.00)
ON CONFLICT (student_code) DO NOTHING;

INSERT INTO rfid_cards (id, rfid_uid, student_id, status)
SELECT 107, 'UC01-AC17-RETIRED', id, 'deactivated'
FROM students
WHERE student_code = 'UC01-AC17'
ON CONFLICT (rfid_uid) DO NOTHING;

-- AC1.3: the missing-student case is represented by the absence of that student.
-- AC1.4: invalid requests are rejected before database access and need no row.

-- AC1.5: expired and revoked sessions exercise denial paths only; no active
-- session credential is seeded. Successful sign-in is created through OIDC.
INSERT INTO staff_admin_sessions (
  session_token_hash, provider_issuer, staff_subject, created_at, expires_at
)
VALUES (
  decode(repeat('11', 32), 'hex'),
  'https://idp.example.edu/',
  'UC01-AC15-EXPIRED',
  now() - INTERVAL '2 hours',
  now() - INTERVAL '1 hour'
)
ON CONFLICT (session_token_hash) DO NOTHING;

INSERT INTO staff_admin_sessions (
  session_token_hash, provider_issuer, staff_subject, created_at, expires_at, revoked_at
)
VALUES (
  decode(repeat('22', 32), 'hex'),
  'https://idp.example.edu/',
  'UC01-AC15-REVOKED',
  now() - INTERVAL '2 hours',
  now() + INTERVAL '1 day',
  now() - INTERVAL '1 hour'
)
ON CONFLICT (session_token_hash) DO NOTHING;

-- Expired OIDC flows are safe test fixtures and cannot complete sign-in.
INSERT INTO staff_admin_oidc_flows (
  state_hash, nonce, code_verifier, created_at, expires_at
)
VALUES (
  decode(repeat('33', 32), 'hex'),
  'UC01-AC15-expired-nonce',
  'UC01-AC15-expired-verifier',
  now() - INTERVAL '10 minutes',
  now() - INTERVAL '5 minutes'
)
ON CONFLICT (state_hash) DO NOTHING;

SELECT setval(pg_get_serial_sequence('students', 'id'), GREATEST((SELECT MAX(id) FROM students), 1), TRUE);
SELECT setval(pg_get_serial_sequence('rfid_cards', 'id'), GREATEST((SELECT MAX(id) FROM rfid_cards), 1), TRUE);

-- UC-02 Seed Data
-- AC2.1a: Parent freeze (report lost)
INSERT INTO students (id, student_code, first_name, last_name, wallet_balance)
VALUES (201, 'UC02-AC21A', 'Kanya', 'ParentFreeze', 50.00)
ON CONFLICT (student_code) DO NOTHING;

INSERT INTO rfid_cards (id, rfid_uid, student_id, status)
SELECT 201, 'UC02-AC21A-CARD', id, 'active'
FROM students WHERE student_code = 'UC02-AC21A'
ON CONFLICT (rfid_uid) DO NOTHING;

-- AC2.1b: Staff suspend card
INSERT INTO students (id, student_code, first_name, last_name, wallet_balance)
VALUES (202, 'UC02-AC21B', 'Chai', 'StaffSuspend', 40.00)
ON CONFLICT (student_code) DO NOTHING;

INSERT INTO rfid_cards (id, rfid_uid, student_id, status)
SELECT 202, 'UC02-AC21B-CARD', id, 'active'
FROM students WHERE student_code = 'UC02-AC21B'
ON CONFLICT (rfid_uid) DO NOTHING;

-- AC2.2: Departing student with 250.00 THB balance for refund
INSERT INTO students (id, student_code, first_name, last_name, wallet_balance)
VALUES (203, 'UC02-AC22', 'Somchai', 'DepartureRefund', 250.00)
ON CONFLICT (student_code) DO NOTHING;

INSERT INTO rfid_cards (id, rfid_uid, student_id, status)
SELECT 203, 'UC02-AC22-CARD', id, 'active'
FROM students WHERE student_code = 'UC02-AC22'
ON CONFLICT (rfid_uid) DO NOTHING;

-- AC2.3: Suspended card ready to be unfrozen
INSERT INTO students (id, student_code, first_name, last_name, wallet_balance)
VALUES (204, 'UC02-AC23', 'Wichai', 'Unfreeze', 30.00)
ON CONFLICT (student_code) DO NOTHING;

INSERT INTO rfid_cards (id, rfid_uid, student_id, status)
SELECT 204, 'UC02-AC23-CARD', id, 'suspended'
FROM students WHERE student_code = 'UC02-AC23'
ON CONFLICT (rfid_uid) DO NOTHING;

-- AC2.6: Departing student whose refund was already processed
INSERT INTO students (id, student_code, first_name, last_name, wallet_balance, departed_at)
VALUES (206, 'UC02-AC26', 'Prasert', 'AlreadyRefunded', 0.00, now() - INTERVAL '1 day')
ON CONFLICT (student_code) DO NOTHING;

INSERT INTO rfid_cards (id, rfid_uid, student_id, status)
SELECT 206, 'UC02-AC26-CARD', id, 'deactivated'
FROM students WHERE student_code = 'UC02-AC26'
ON CONFLICT (rfid_uid) DO NOTHING;

INSERT INTO student_refunds (id, student_id, amount, processed_by, created_at)
SELECT 206, id, 100.00, 'staff-admin-seed', now() - INTERVAL '1 day'
FROM students WHERE student_code = 'UC02-AC26'
ON CONFLICT (student_id) DO NOTHING;

-- AC2.7: Departing student with 0.00 THB balance
INSERT INTO students (id, student_code, first_name, last_name, wallet_balance)
VALUES (207, 'UC02-AC27', 'Sunan', 'ZeroBalanceRefund', 0.00)
ON CONFLICT (student_code) DO NOTHING;

INSERT INTO rfid_cards (id, rfid_uid, student_id, status)
SELECT 207, 'UC02-AC27-CARD', id, 'active'
FROM students WHERE student_code = 'UC02-AC27'
ON CONFLICT (rfid_uid) DO NOTHING;

SELECT setval(pg_get_serial_sequence('students', 'id'), GREATEST((SELECT MAX(id) FROM students), 1), TRUE);
SELECT setval(pg_get_serial_sequence('rfid_cards', 'id'), GREATEST((SELECT MAX(id) FROM rfid_cards), 1), TRUE);
SELECT setval(pg_get_serial_sequence('student_refunds', 'id'), GREATEST((SELECT MAX(id) FROM student_refunds), 1), TRUE);

-- UC-03 Seed Data
INSERT INTO students (id, student_code, first_name, last_name, wallet_balance)
VALUES
  (301, 'UC03-AC31', 'UC03', 'AC31', 0.00),
  (302, 'UC03-AC32', 'UC03', 'AC32', 0.00),
  (303, 'UC03-AC33', 'UC03', 'AC33', -30.00),
  (304, 'UC03-AC34', 'UC03', 'AC34', 0.00),
  (306, 'UC03-AC36', 'UC03', 'AC36', 0.00),
  (307, 'UC03-AC37', 'UC03', 'AC37', 0.00),
  (308, 'UC03-AC38', 'UC03', 'AC38', 100.00),
  (309, 'UC03-AC39', 'UC03', 'AC39', 0.00)
ON CONFLICT (student_code) DO NOTHING;

INSERT INTO wallet_topups (
  id,
  student_id,
  amount,
  status,
  gateway_provider,
  gateway_reference
)
SELECT 308, id, 100.00, 'succeeded', 'seed-gateway', 'UC03-AC38'
FROM students
WHERE student_code = 'UC03-AC38'
ON CONFLICT (id) DO NOTHING;

INSERT INTO wallet_ledger_entries (id, student_id, topup_id, amount)
SELECT 308, id, 308, 100.00
FROM students
WHERE student_code = 'UC03-AC38'
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('students', 'id'), GREATEST((SELECT MAX(id) FROM students), 1), TRUE);
SELECT setval(pg_get_serial_sequence('wallet_topups', 'id'), GREATEST((SELECT MAX(id) FROM wallet_topups), 1), TRUE);
SELECT setval(pg_get_serial_sequence('wallet_ledger_entries', 'id'), GREATEST((SELECT MAX(id) FROM wallet_ledger_entries), 1), TRUE);


