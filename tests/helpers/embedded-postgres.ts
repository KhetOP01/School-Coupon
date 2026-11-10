import { ChildProcessWithoutNullStreams, execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Pool } from 'pg';

export interface EmbeddedPostgresDatabase {
  pool: Pool;
  databaseUrl: string;
  close(): Promise<void>;
}

export async function createEmbeddedPostgresDatabase(): Promise<EmbeddedPostgresDatabase> {
  const databaseDirectory = mkdtempSync(join(tmpdir(), 'school-coupon-postgres-'));
  let postgresProcess: ChildProcessWithoutNullStreams | undefined;

  try {
    const port = await getAvailablePort();
    postgresProcess = await startPostgres(databaseDirectory, port);
    const databaseUrl = new URL(`postgres://127.0.0.1:${port}/school_coupon_test`);
    databaseUrl.username = 'postgres';
    databaseUrl.password = 'postgres';
    execFileSync(
      process.execPath,
      [join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs'), 'scripts/migrate.ts'],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: databaseUrl.toString() },
        stdio: 'pipe',
      },
    );

    const pool = new Pool({ connectionString: databaseUrl.toString() });
    return {
      pool,
      databaseUrl: databaseUrl.toString(),
      async close(): Promise<void> {
        await pool.end();
        await stopPostgres(postgresProcess);
        rmSync(databaseDirectory, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await stopPostgres(postgresProcess);
    rmSync(databaseDirectory, { recursive: true, force: true });
    throw error;
  }
}

async function startPostgres(
  databaseDirectory: string,
  port: number,
): Promise<ChildProcessWithoutNullStreams> {
  const script = join(__dirname, '..', 'integration', 'postgres-server.mjs');
  const postgresProcess = spawn(process.execPath, [script, databaseDirectory, String(port)], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  await new Promise<void>((resolve, reject) => {
    let output = '';
    postgresProcess.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes(`READY:${port}`)) {
        resolve();
      }
    });
    postgresProcess.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    postgresProcess.once('error', reject);
    postgresProcess.once('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Embedded PostgreSQL exited with code ${code}: ${output}`));
      }
    });
  });

  return postgresProcess;
}

async function stopPostgres(
  postgresProcess: ChildProcessWithoutNullStreams | undefined,
): Promise<void> {
  if (postgresProcess && postgresProcess.exitCode === null && postgresProcess.signalCode === null) {
    postgresProcess.stdin.write('STOP\n');
    await new Promise<void>((resolve) => postgresProcess.once('exit', () => resolve()));
  }
}

async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        server.close();
        reject(new Error('Could not allocate a local TCP port.'));
        return;
      }

      const { port } = address;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}
