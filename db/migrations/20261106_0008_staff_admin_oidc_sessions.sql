CREATE TABLE staff_admin_sessions (
  session_token_hash BYTEA PRIMARY KEY
    CHECK (octet_length(session_token_hash) = 32),
  provider_issuer TEXT NOT NULL CHECK (length(provider_issuer) > 0),
  staff_subject TEXT NOT NULL CHECK (length(staff_subject) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at),
  CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX idx_staff_admin_sessions_expiry
  ON staff_admin_sessions(expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE staff_admin_oidc_flows (
  state_hash BYTEA PRIMARY KEY
    CHECK (octet_length(state_hash) = 32),
  nonce TEXT NOT NULL CHECK (length(nonce) > 0),
  code_verifier TEXT NOT NULL CHECK (length(code_verifier) > 0),
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  CHECK (expires_at > created_at),
  CHECK (expires_at <= created_at + INTERVAL '5 minutes')
);

CREATE INDEX idx_staff_admin_oidc_flows_expiry
  ON staff_admin_oidc_flows(expires_at);
