import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { POSTGRES_POOL, StaffOidcFlow, StaffOidcFlows } from '../auth.tokens';

@Injectable()
export class StaffOidcFlowRepository implements StaffOidcFlows {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async create(flow: StaffOidcFlow): Promise<void> {
    await this.pool.query(
      'DELETE FROM staff_admin_oidc_flows WHERE expires_at <= $1',
      [flow.createdAt],
    );
    await this.pool.query(
      `INSERT INTO staff_admin_oidc_flows
        (state_hash, nonce, code_verifier, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [flow.stateHash, flow.nonce, flow.codeVerifier, flow.createdAt, flow.expiresAt],
    );
  }

  async consume(
    stateHash: Buffer,
    now: Date,
  ): Promise<Pick<StaffOidcFlow, 'nonce' | 'codeVerifier'> | null> {
    const result = await this.pool.query<{
      nonce: string;
      code_verifier: string;
    }>(
      `DELETE FROM staff_admin_oidc_flows
       WHERE state_hash = $1 AND expires_at > $2
       RETURNING nonce, code_verifier`,
      [stateHash, now],
    );
    const row = result.rows[0];
    return row ? { nonce: row.nonce, codeVerifier: row.code_verifier } : null;
  }
}
