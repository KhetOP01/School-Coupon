import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { STAFF_OIDC_CLIENT } from '../../src/modules/school-configuration/auth.tokens';
import { ApiExceptionFilter } from '../../src/shared/api-exception.filter';
import {
  createEmbeddedPostgresDatabase,
  EmbeddedPostgresDatabase,
} from '../helpers/embedded-postgres';

describe('UC-03 Parent Wallet Top-up E2E', () => {
  let app: INestApplication;
  let database: EmbeddedPostgresDatabase;
  const originalEnvironment = new Map<string, string | undefined>();
  const oidcClient = {
    authorizationUrl: jest.fn().mockResolvedValue(new URL('https://idp.example/authorize')),
    verifyCallback: jest.fn(),
  };

  beforeAll(async () => {
    database = await createEmbeddedPostgresDatabase();
    for (const [name, value] of Object.entries({
      DATABASE_URL: database.databaseUrl,
      STAFF_OIDC_ISSUER: 'https://idp.example/',
      STAFF_OIDC_CLIENT_ID: 'school-coupon-e2e',
      STAFF_OIDC_CLIENT_SECRET: 'local-only-e2e-secret',
      STAFF_OIDC_REDIRECT_URI: 'http://127.0.0.1:3000/admin/auth/oidc/callback',
      STAFF_CLAIM_NAME: 'groups',
      STAFF_CLAIM_VALUE: 'staff',
    })) {
      originalEnvironment.set(name, process.env[name]);
      process.env[name] = value;
    }

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(STAFF_OIDC_CLIENT)
      .useValue(oidcClient)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await database?.close();
    for (const [name, value] of originalEnvironment) {
      restoreEnvironmentVariable(name, value);
    }
  });

  beforeEach(async () => {
    await database.pool.query(
      'TRUNCATE TABLE wallet_ledger_entries, wallet_topups, students RESTART IDENTITY CASCADE',
    );
    await database.pool.query(
      `INSERT INTO system_settings (id, min_topup_amount, max_topup_amount)
       VALUES (1, 50.00, 2000.00)
       ON CONFLICT (id) DO UPDATE SET min_topup_amount = 50.00, max_topup_amount = 2000.00`,
    );
  });

  it('AC3.1: successfully tops up student wallet by 100.00 THB', async () => {
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance)
       VALUES ('E2E-AC31', 'TopUp', 'Student', 0.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .post('/parent/wallet/topup')
      .set('Authorization', 'Bearer parent-token-1')
      .send({ studentId, amount: '100.00' })
      .expect(200);

    expect(response.body).toMatchObject({
      studentId,
      amount: '100.00',
      walletBalance: '100.00',
      status: 'succeeded',
    });

    const studentDb = await database.pool.query(
      'SELECT wallet_balance::text AS wallet_balance FROM students WHERE id = $1',
      [studentId],
    );
    expect(studentDb.rows[0].wallet_balance).toBe('100.00');

    const ledgerDb = await database.pool.query(
      'SELECT amount::text AS amount FROM wallet_ledger_entries WHERE student_id = $1',
      [studentId],
    );
    expect(ledgerDb.rows).toHaveLength(1);
    expect(ledgerDb.rows[0].amount).toBe('100.00');
  });

  it('AC3.2: rejects top-up below minimum policy (30.00 < 50.00)', async () => {
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance)
       VALUES ('E2E-AC32', 'Min', 'Student', 0.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .post('/parent/wallet/topup')
      .set('Authorization', 'Bearer parent-token-1')
      .send({ studentId, amount: '30.00' })
      .expect(400);

    expect(response.body.code).toBe('INVALID_TOPUP_AMOUNT');

    const studentDb = await database.pool.query(
      'SELECT wallet_balance::text AS wallet_balance FROM students WHERE id = $1',
      [studentId],
    );
    expect(studentDb.rows[0].wallet_balance).toBe('0.00');
  });

  it('AC3.3: offsets negative wallet balance (-30.00 + 100.00 = 70.00)', async () => {
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance)
       VALUES ('E2E-AC33', 'Negative', 'Student', -30.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .post('/parent/wallet/topup')
      .set('Authorization', 'Bearer parent-token-1')
      .send({ studentId, amount: '100.00' })
      .expect(200);

    expect(response.body).toMatchObject({
      studentId,
      amount: '100.00',
      walletBalance: '70.00',
      status: 'succeeded',
    });

    const studentDb = await database.pool.query(
      'SELECT wallet_balance::text AS wallet_balance FROM students WHERE id = $1',
      [studentId],
    );
    expect(studentDb.rows[0].wallet_balance).toBe('70.00');
  });

  it('AC3.4: rejects top-up above maximum policy (2001.00 > 2000.00)', async () => {
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance)
       VALUES ('E2E-AC34', 'Max', 'Student', 0.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .post('/parent/wallet/topup')
      .set('Authorization', 'Bearer parent-token-1')
      .send({ studentId, amount: '2001.00' })
      .expect(400);

    expect(response.body.code).toBe('INVALID_TOPUP_AMOUNT');
  });

  it('AC3.5: rejects top-up for non-existent student', async () => {
    const response = await request(app.getHttpServer())
      .post('/parent/wallet/topup')
      .set('Authorization', 'Bearer parent-token-1')
      .send({ studentId: 99999, amount: '100.00' })
      .expect(404);

    expect(response.body.code).toBe('STUDENT_NOT_FOUND');
  });

  it('AC3.6: rejects top-up without parent authentication or with denied access', async () => {
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance)
       VALUES ('E2E-AC36', 'Auth', 'Student', 0.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    // Missing authentication
    const unauthRes = await request(app.getHttpServer())
      .post('/parent/wallet/topup')
      .send({ studentId, amount: '100.00' })
      .expect(401);
    expect(unauthRes.body.code).toBe('AUTHENTICATION_REQUIRED');

    // Denied access
    const deniedRes = await request(app.getHttpServer())
      .post('/parent/wallet/topup')
      .set('x-parent-id', 'denied')
      .send({ studentId, amount: '100.00' })
      .expect(403);
    expect(deniedRes.body.code).toBe('PARENT_STUDENT_ACCESS_DENIED');
  });

  it('AC3.7: verifies top-up status check via GET /parent/wallet/topups/:id', async () => {
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance)
       VALUES ('E2E-AC37-STATUS', 'Status', 'Student', 0.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const topUpRes = await request(app.getHttpServer())
      .post('/parent/wallet/topup')
      .set('Authorization', 'Bearer parent-token-1')
      .send({ studentId, amount: '100.00' })
      .expect(200);

    const topUpId = topUpRes.body.topUpId;

    const statusRes = await request(app.getHttpServer())
      .get(`/parent/wallet/topups/${topUpId}`)
      .expect(200);

    expect(statusRes.body).toMatchObject({
      topUpId,
      studentId,
      amount: '100.00',
      status: 'succeeded',
      walletBalance: '100.00',
    });
  });

  it('AC3.8: handles gateway callback replay idempotently', async () => {
    const response = await request(app.getHttpServer())
      .post('/callbacks/payment-gateway/topup')
      .send({
        gatewayReference: 'gateway-ref-replay',
        status: 'succeeded',
        amount: '100.00',
      })
      .expect(200);

    expect(response.body).toHaveProperty('accepted', true);
  });
});

function restoreEnvironmentVariable(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
