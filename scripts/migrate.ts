import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';

async function migrate(): Promise<void> {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      'postgres://school_coupon:school_coupon_dev@localhost:5432/school_coupon',
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const migrationDirectory = join(process.cwd(), 'db', 'migrations');
    const migrations = (await readdir(migrationDirectory))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const migration of migrations) {
      const applied = await pool.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1',
        [migration],
      );
      if (applied.rowCount !== 0) {
        continue;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(await readFile(join(migrationDirectory, migration), 'utf8'));
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [migration]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      process.stdout.write(`Applied ${migration}\n`);
    }
  } finally {
    await pool.end();
  }
}

void migrate();
