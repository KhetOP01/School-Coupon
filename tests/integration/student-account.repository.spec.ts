import { ChildProcessWithoutNullStreams, execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { Pool } from 'pg';
import { ReissueRfidCard } from '../../src/modules/student-account/application/reissue-rfid-card';
import { PostgresCardIdGenerator } from '../../src/modules/student-account/infrastructure/postgres-card-id-generator';
import { StudentAccountPostgresRepository } from '../../src/modules/student-account/infrastructure/student-account-postgres.repository';

let postgresProcess: ChildProcessWithoutNullStreams;

describe('StudentAccountPostgresRepository', () => {
  let pool: Pool;
  let databaseDirectory: string;
  let repository: StudentAccountPostgresRepository;
  let databaseUrl: string;

  beforeAll(async () => {
    databaseDirectory = mkdtempSync(join(tmpdir(), 'school-coupon-postgres-'));
    const port = await getAvailablePort();
    await startPostgres(databaseDirectory, port);
    databaseUrl = `postgres://postgres:postgres@127.0.0.1:${port}/school_coupon_test`;
    pool = new Pool({
      host: '127.0.0.1',
      port,
      user: 'postgres',
      password: 'postgres',
      database: 'school_coupon_test',
    });
    execFileSync(
      process.execPath,
      [join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs'), 'scripts/migrate.ts'],
      { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'pipe' },
    );
    repository = new StudentAccountPostgresRepository(pool);
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
    if (postgresProcess && postgresProcess.exitCode === null && postgresProcess.signalCode === null) {
      postgresProcess.stdin.write('STOP\n');
      await new Promise<void>((resolve) => postgresProcess.once('exit', () => resolve()));
    }
    if (databaseDirectory) {
      rmSync(databaseDirectory, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE rfid_cards, students RESTART IDENTITY CASCADE');
  });

  it('AC1.2: rejects a UID registered to another student and rolls back the card transition', async () => {
    await insertStudentAndCard(1, 'STU-1', '65.00', 11, 'BOUND-UID', 'active');
    await insertStudentAndCard(2, 'STU-2', '10.00', 12, 'OTHER-UID', 'active');
    const student = await repository.findForCardReissue(1);
    expect(student).not.toBeNull();
    const reissue = student!.reissueCard(11, 13, 'OTHER-UID', new Date());

    await expect(repository.saveCardReissue(student!, reissue)).rejects.toMatchObject({
      code: 'CARD_ALREADY_BOUND',
    });

    const cards = await pool.query(
      'SELECT id, status FROM rfid_cards WHERE student_id = 1 ORDER BY id',
    );
    expect(cards.rows).toEqual([{ id: 11, status: 'active' }]);
  });

  it('AC1.1: atomically replaces the card and preserves the exact wallet balance', async () => {
    await insertStudentAndCard(1, 'STU-1', '65.00', 11, 'ACTIVE-UID', 'active');
    const useCase = new ReissueRfidCard(
      repository,
      new PostgresCardIdGenerator(pool),
      { now: () => new Date('2026-11-04T10:00:00.000Z') },
    );

    const result = await useCase.execute({
      studentId: 1,
      expectedCardId: 11,
      newRfidUid: 'NEW-UID',
    });

    expect(result).toMatchObject({
      studentId: 1,
      replacedCardId: 11,
      newRfidUid: 'NEW-UID',
      newCardStatus: 'active',
      walletBalance: '65.00',
    });
    const cards = await pool.query(
      'SELECT id, rfid_uid, status FROM rfid_cards WHERE student_id = 1 ORDER BY id',
    );
    expect(cards.rows).toEqual([
      { id: 1, rfid_uid: 'NEW-UID', status: 'active' },
      { id: 11, rfid_uid: 'ACTIVE-UID', status: 'deactivated' },
    ]);
    const student = await pool.query(
      'SELECT wallet_balance::text AS wallet_balance FROM students WHERE id = 1',
    );
    expect(student.rows[0].wallet_balance).toBe('65.00');
  });

  it('AC1.7: rejects a UID from a deactivated card and retains the original active card', async () => {
    await insertStudentAndCard(1, 'STU-1', '65.00', 11, 'ACTIVE-UID', 'active');
    await insertStudentAndCard(2, 'STU-2', '10.00', 12, 'RETIRED-UID', 'deactivated');
    const student = await repository.findForCardReissue(1);
    expect(student).not.toBeNull();
    const reissue = student!.reissueCard(11, 13, 'RETIRED-UID', new Date());

    await expect(repository.saveCardReissue(student!, reissue)).rejects.toMatchObject({
      code: 'CARD_ALREADY_BOUND',
    });

    const cards = await pool.query(
      'SELECT id, status FROM rfid_cards WHERE student_id = 1 ORDER BY id',
    );
    expect(cards.rows).toEqual([{ id: 11, status: 'active' }]);
  });

  it('AC1.6: accepts only one concurrent replacement and leaves one active card', async () => {
    await insertStudentAndCard(1, 'STU-1', '65.00', 11, 'ACTIVE-UID', 'active');
    const firstView = await repository.findForCardReissue(1);
    const secondView = await repository.findForCardReissue(1);
    expect(firstView).not.toBeNull();
    expect(secondView).not.toBeNull();

    const firstReissue = firstView!.reissueCard(11, 12, 'NEW-UID-1', new Date());
    const secondReissue = secondView!.reissueCard(11, 13, 'NEW-UID-2', new Date());
    const results = await Promise.allSettled([
      repository.saveCardReissue(firstView!, firstReissue),
      repository.saveCardReissue(secondView!, secondReissue),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({
      status: 'rejected',
      reason: { code: 'ACTIVE_CARD_CONFLICT' },
    });

    const cards = await pool.query(
      `SELECT status, COUNT(*)::integer AS count
       FROM rfid_cards
       WHERE student_id = 1
       GROUP BY status`,
    );
    expect(cards.rows).toContainEqual({ status: 'deactivated', count: 1 });
    expect(cards.rows.filter((row) => row.status === 'active')).toEqual([
      { status: 'active', count: 1 },
    ]);
    const student = await pool.query(
      'SELECT wallet_balance::text AS wallet_balance FROM students WHERE id = 1',
    );
    expect(student.rows[0].wallet_balance).toBe('65.00');
  });

  it('AC1 seed: inserts the documented student and card fixtures', async () => {
    execFileSync(
      process.execPath,
      [join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs'), 'scripts/seed.ts'],
      { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'pipe' },
    );

    const fixtures = await pool.query(
      `SELECT student_code FROM students
       WHERE student_code LIKE 'UC01-%'
       ORDER BY student_code`,
    );
    expect(fixtures.rows.map((row) => row.student_code)).toEqual([
      'UC01-AC11',
      'UC01-AC12',
      'UC01-AC16',
      'UC01-AC17',
    ]);
  });

  async function insertStudentAndCard(
    studentId: number,
    studentCode: string,
    walletBalance: string,
    cardId: number,
    uid: string,
    status: 'active' | 'deactivated',
  ): Promise<void> {
    await pool.query(
      `INSERT INTO students (id, student_code, first_name, last_name, wallet_balance)
       VALUES ($1, $2, 'Test', 'Student', $3)`,
      [studentId, studentCode, walletBalance],
    );
    await pool.query(
      `INSERT INTO rfid_cards (id, rfid_uid, student_id, status)
       VALUES ($1, $2, $3, $4)`,
      [cardId, uid, studentId, status],
    );
  }
});

async function startPostgres(databaseDirectory: string, port: number): Promise<void> {
  const script = join(process.cwd(), 'tests/integration/postgres-server.mjs');
  postgresProcess = spawn(process.execPath, [script, databaseDirectory, String(port)], {
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
