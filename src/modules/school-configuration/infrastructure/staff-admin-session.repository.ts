import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import {
  POSTGRES_POOL,
  StaffAdminSession,
  StaffAdminSessions,
} from '../auth.tokens';

@Injectable()
export class StaffAdminSessionRepository implements StaffAdminSessions {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async create(session: StaffAdminSession): Promise<void> {
    await this.pool.query(
      `INSERT INTO staff_admin_sessions
        (session_token_hash, provider_issuer, staff_subject, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        session.sessionTokenHash,
        session.providerIssuer,
        session.staffSubject,
        session.createdAt,
        session.expiresAt,
      ],
    );
  }

  async findActive(
    sessionTokenHash: Buffer,
    now: Date,
  ): Promise<StaffAdminSession | null> {
    const result = await this.pool.query<{
      session_token_hash: Buffer;
      provider_issuer: string;
      staff_subject: string;
      created_at: Date;
      expires_at: Date;
    }>(
      `SELECT session_token_hash, provider_issuer, staff_subject, created_at, expires_at
       FROM staff_admin_sessions
       WHERE session_token_hash = $1 AND expires_at > $2 AND revoked_at IS NULL`,
      [sessionTokenHash, now],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      sessionTokenHash: row.session_token_hash,
      providerIssuer: row.provider_issuer,
      staffSubject: row.staff_subject,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }

  async revoke(sessionTokenHash: Buffer, now: Date): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE staff_admin_sessions
       SET revoked_at = $2, updated_at = $2
       WHERE session_token_hash = $1 AND expires_at > $2 AND revoked_at IS NULL`,
      [sessionTokenHash, now],
    );
    return result.rowCount === 1;
  }
}
