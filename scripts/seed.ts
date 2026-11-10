import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';

async function seed(): Promise<void> {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      'postgres://school_coupon:school_coupon_dev@localhost:5432/school_coupon',
  });

  try {
    await pool.query(await readFile(join(process.cwd(), 'db', 'seed.sql'), 'utf8'));
    process.stdout.write('Loaded UC-01 seed data.\n');
  } finally {
    await pool.end();
  }
}

void seed();
