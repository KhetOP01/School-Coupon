import { Pool } from 'pg';
import { StaffUserRepository } from '../../src/modules/school-configuration/infrastructure/staff-user.repository';
import {
  createEmbeddedPostgresDatabase,
  EmbeddedPostgresDatabase,
} from '../helpers/embedded-postgres';

describe('StaffUserRepository (PostgreSQL)', () => {
  let database: EmbeddedPostgresDatabase;
  let pool: Pool;
  let repository: StaffUserRepository;

  beforeAll(async () => {
    database = await createEmbeddedPostgresDatabase();
    pool = database.pool;
    repository = new StaffUserRepository(pool);
  }, 120_000);

  afterAll(async () => {
    await database?.close();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE staff_users RESTART IDENTITY CASCADE');
  });

  it('AC9.1: finds an active staff user by username', async () => {
    await pool.query(
      `INSERT INTO staff_users (username, password_hash, full_name, role, status)
       VALUES ('admin', 'scrypt:salt:hash', 'สมชาย ใจดี', 'admin', 'active')`,
    );

    const found = await repository.findByUsername('admin');

    expect(found).not.toBeNull();
    expect(found?.username).toBe('admin');
    expect(found?.passwordHash).toBe('scrypt:salt:hash');
    expect(found?.fullName).toBe('สมชาย ใจดี');
    expect(found?.role).toBe('admin');
    expect(found?.status).toBe('active');
  });

  it('AC9.3: returns null when username does not exist', async () => {
    const found = await repository.findByUsername('nonexistent');
    expect(found).toBeNull();
  });

  it('AC9.4: returns suspended status for suspended staff user', async () => {
    await pool.query(
      `INSERT INTO staff_users (username, password_hash, full_name, role, status)
       VALUES ('staff_suspended', 'scrypt:salt:hash', 'สมหญิง ถูกระงับ', 'staff', 'suspended')`,
    );

    const found = await repository.findByUsername('staff_suspended');

    expect(found).not.toBeNull();
    expect(found?.status).toBe('suspended');
    expect(found?.role).toBe('staff');
  });
});
