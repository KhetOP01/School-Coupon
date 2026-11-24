import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { POSTGRES_POOL, StaffUser, StaffUsers } from '../auth.tokens';

interface StaffUserRow {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  role: 'staff' | 'admin';
  status: 'active' | 'suspended';
}

@Injectable()
export class StaffUserRepository implements StaffUsers {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async findByUsername(username: string): Promise<StaffUser | null> {
    const result = await this.pool.query<StaffUserRow>(
      `SELECT id, username, password_hash, full_name, role, status
       FROM staff_users
       WHERE username = $1`,
      [username],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      fullName: row.full_name,
      role: row.role,
      status: row.status,
    };
  }
}
