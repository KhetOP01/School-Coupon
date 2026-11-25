import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import {
  CreateStaffUserInput,
  POSTGRES_POOL,
  StaffUser,
  StaffUsers,
  StaffUserSummary,
  UpdateStaffUserInput,
} from '../auth.tokens';

interface StaffUserRow {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  role: 'staff' | 'admin';
  status: 'active' | 'suspended';
  created_at: Date;
  updated_at: Date;
}

function toSummary(row: Omit<StaffUserRow, 'password_hash'>): StaffUserSummary {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

@Injectable()
export class StaffUserRepository implements StaffUsers {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async findByUsername(username: string): Promise<StaffUser | null> {
    const result = await this.pool.query<StaffUserRow>(
      `SELECT id, username, password_hash, full_name, role, status, created_at, updated_at
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: number): Promise<StaffUser | null> {
    const result = await this.pool.query<StaffUserRow>(
      `SELECT id, username, password_hash, full_name, role, status, created_at, updated_at
       FROM staff_users
       WHERE id = $1`,
      [id],
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findAll(): Promise<StaffUserSummary[]> {
    const result = await this.pool.query<Omit<StaffUserRow, 'password_hash'>>(
      `SELECT id, username, full_name, role, status, created_at, updated_at
       FROM staff_users
       ORDER BY id ASC`,
    );
    return result.rows.map(toSummary);
  }

  async create(input: CreateStaffUserInput): Promise<StaffUserSummary> {
    const result = await this.pool.query<Omit<StaffUserRow, 'password_hash'>>(
      `INSERT INTO staff_users (username, password_hash, full_name, role, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id, username, full_name, role, status, created_at, updated_at`,
      [input.username, input.passwordHash, input.fullName, input.role],
    );
    return toSummary(result.rows[0]);
  }

  async update(id: number, input: UpdateStaffUserInput): Promise<StaffUserSummary | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (input.fullName !== undefined) {
      sets.push(`full_name = $${index++}`);
      values.push(input.fullName);
    }
    if (input.role !== undefined) {
      sets.push(`role = $${index++}`);
      values.push(input.role);
    }
    if (input.status !== undefined) {
      sets.push(`status = $${index++}`);
      values.push(input.status);
    }
    if (input.passwordHash !== undefined) {
      sets.push(`password_hash = $${index++}`);
      values.push(input.passwordHash);
    }

    if (sets.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        return null;
      }
      return {
        id: existing.id,
        username: existing.username,
        fullName: existing.fullName,
        role: existing.role,
        status: existing.status,
        createdAt: (existing.createdAt ?? new Date()).toISOString(),
        updatedAt: (existing.updatedAt ?? new Date()).toISOString(),
      };
    }

    sets.push('updated_at = now()');
    values.push(id);

    const result = await this.pool.query<Omit<StaffUserRow, 'password_hash'>>(
      `UPDATE staff_users
       SET ${sets.join(', ')}
       WHERE id = $${index}
       RETURNING id, username, full_name, role, status, created_at, updated_at`,
      values,
    );

    const row = result.rows[0];
    return row ? toSummary(row) : null;
  }
}
