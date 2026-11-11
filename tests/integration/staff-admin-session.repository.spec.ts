import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { StaffAdminSessionRepository } from '../../src/modules/school-configuration/infrastructure/staff-admin-session.repository';
import { StaffOidcFlowRepository } from '../../src/modules/school-configuration/infrastructure/staff-oidc-flow.repository';
import {
  createEmbeddedPostgresDatabase,
  EmbeddedPostgresDatabase,
} from '../helpers/embedded-postgres';

describe('StaffAdminSessionRepository and StaffOidcFlowRepository (PostgreSQL)', () => {
  let database: EmbeddedPostgresDatabase;
  let pool: Pool;
  let sessionRepository: StaffAdminSessionRepository;
  let flowRepository: StaffOidcFlowRepository;

  beforeAll(async () => {
    database = await createEmbeddedPostgresDatabase();
    pool = database.pool;
    sessionRepository = new StaffAdminSessionRepository(pool);
    flowRepository = new StaffOidcFlowRepository(pool);
  }, 120_000);

  afterAll(async () => {
    await database?.close();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE staff_admin_oidc_flows, staff_admin_sessions CASCADE');
  });

  it('AC8.1: persists only the opaque session hash and resolves its active session', async () => {
    const now = new Date('2026-11-11T12:00:00.000Z');
    const expiresAt = new Date('2026-11-11T13:00:00.000Z');
    const sessionTokenHash = randomBytes(32);

    await sessionRepository.create({
      sessionTokenHash,
      providerIssuer: 'http://127.0.0.1:43127',
      staffSubject: 'staff-123',
      createdAt: now,
      expiresAt,
    });

    const stored = await pool.query<{
      session_token_hash: Buffer;
      staff_subject: string;
      provider_issuer: string;
      expires_at: Date;
      revoked_at: Date | null;
    }>(
      'SELECT session_token_hash, staff_subject, provider_issuer, expires_at, revoked_at FROM staff_admin_sessions WHERE session_token_hash = $1',
      [sessionTokenHash],
    );
    expect(stored.rows).toHaveLength(1);
    expect(stored.rows[0].session_token_hash).toEqual(sessionTokenHash);
    expect(stored.rows[0].staff_subject).toBe('staff-123');
    expect(stored.rows[0].provider_issuer).toBe('http://127.0.0.1:43127');
    expect(stored.rows[0].revoked_at).toBeNull();

    const activeSession = await sessionRepository.findActive(sessionTokenHash, now);
    expect(activeSession).not.toBeNull();
    expect(activeSession?.sessionTokenHash).toEqual(sessionTokenHash);
    expect(activeSession?.staffSubject).toBe('staff-123');
    expect(activeSession?.providerIssuer).toBe('http://127.0.0.1:43127');
  });

  it('AC8.1 & AC8.4: creates and consumes an OIDC flow exactly once', async () => {
    const now = new Date('2026-11-11T12:00:00.000Z');
    const stateHash = randomBytes(32);

    await flowRepository.create({
      stateHash,
      nonce: 'one-time-nonce',
      codeVerifier: 'one-time-code-verifier',
      createdAt: now,
      expiresAt: new Date('2026-11-11T12:05:00.000Z'),
    });

    // First consume succeeds
    const consumed = await flowRepository.consume(stateHash, now);
    expect(consumed).toEqual({
      nonce: 'one-time-nonce',
      codeVerifier: 'one-time-code-verifier',
    });

    // Second consume returns null (one-time use)
    const secondConsume = await flowRepository.consume(stateHash, now);
    expect(secondConsume).toBeNull();
  });

  it('AC8.4: does not consume an expired OIDC flow', async () => {
    const created = new Date('2026-11-11T12:00:00.000Z');
    const expired = new Date('2026-11-11T12:05:00.000Z');
    const checkTime = new Date('2026-11-11T12:05:01.000Z');
    const stateHash = randomBytes(32);

    await flowRepository.create({
      stateHash,
      nonce: 'expired-nonce',
      codeVerifier: 'expired-verifier',
      createdAt: created,
      expiresAt: expired,
    });

    const result = await flowRepository.consume(stateHash, checkTime);
    expect(result).toBeNull();
  });

  it('AC8.6: findActive returns null when session is expired', async () => {
    const now = new Date('2026-11-11T12:00:00.000Z');
    const expiresAt = new Date('2026-11-11T12:30:00.000Z');
    const laterTime = new Date('2026-11-11T12:30:01.000Z');
    const sessionTokenHash = randomBytes(32);

    await sessionRepository.create({
      sessionTokenHash,
      providerIssuer: 'http://127.0.0.1:43127',
      staffSubject: 'staff-expired',
      createdAt: now,
      expiresAt,
    });

    const activeBefore = await sessionRepository.findActive(sessionTokenHash, now);
    expect(activeBefore).not.toBeNull();

    const activeAfter = await sessionRepository.findActive(sessionTokenHash, laterTime);
    expect(activeAfter).toBeNull();
  });

  it('AC8.7: revoke marks session with revoked_at and findActive returns null', async () => {
    const now = new Date('2026-11-11T12:00:00.000Z');
    const expiresAt = new Date('2026-11-11T13:00:00.000Z');
    const revokeTime = new Date('2026-11-11T12:15:00.000Z');
    const sessionTokenHash = randomBytes(32);

    await sessionRepository.create({
      sessionTokenHash,
      providerIssuer: 'http://127.0.0.1:43127',
      staffSubject: 'staff-revoke',
      createdAt: now,
      expiresAt,
    });

    const revoked = await sessionRepository.revoke(sessionTokenHash, revokeTime);
    expect(revoked).toBe(true);

    const active = await sessionRepository.findActive(sessionTokenHash, revokeTime);
    expect(active).toBeNull();

    // Revoking again returns false (already revoked)
    const revokeAgain = await sessionRepository.revoke(sessionTokenHash, revokeTime);
    expect(revokeAgain).toBe(false);
  });

  it('AC8.1: enforces CHECK constraint expires_at > created_at', async () => {
    const now = new Date('2026-11-11T12:00:00.000Z');
    const invalidExpiresAt = new Date('2026-11-11T11:59:59.000Z');
    const sessionTokenHash = randomBytes(32);

    await expect(
      sessionRepository.create({
        sessionTokenHash,
        providerIssuer: 'http://127.0.0.1:43127',
        staffSubject: 'staff-bad-time',
        createdAt: now,
        expiresAt: invalidExpiresAt,
      }),
    ).rejects.toThrow();
  });
});
