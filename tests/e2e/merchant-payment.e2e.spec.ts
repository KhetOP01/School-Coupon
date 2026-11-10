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

describe('UC-05 Merchant Payments E2E', () => {
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
      'TRUNCATE TABLE payments, merchants, rfid_cards, students RESTART IDENTITY CASCADE',
    );
  });

  it('AC5.1: processes online payment successfully and deducts wallet', async () => {
    const merchantRes = await database.pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, status)
       VALUES ('M-E2E-1', 'Active Shop', 'active') RETURNING id`,
    );
    const merchantId = merchantRes.rows[0].id;

    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance, current_daily_limit)
       VALUES ('S-E2E-1', 'Niran', 'Kla', 100.00, 200.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    await database.pool.query(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('E2E-UID-1', $1, 'active')`,
      [studentId],
    );

    const response = await request(app.getHttpServer())
      .post('/merchant/payments')
      .set('x-merchant-id', String(merchantId))
      .send({
        rfidUid: 'E2E-UID-1',
        amount: '35.00',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      studentId,
      merchantId,
      amount: '35.00',
      paymentMode: 'ONLINE',
      walletBalance: '65.00',
    });

    const studentDb = await database.pool.query(
      'SELECT wallet_balance::text FROM students WHERE id = $1',
      [studentId],
    );
    expect(studentDb.rows[0].wallet_balance).toBe('65.00');
  });

  it('AC5.5: syncs offline payment, allows negative wallet balance, and checks idempotency on replay (AC5.10)', async () => {
    const merchantRes = await database.pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, status)
       VALUES ('M-E2E-2', 'Offline Merchant', 'active') RETURNING id`,
    );
    const merchantId = merchantRes.rows[0].id;

    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance, current_daily_limit)
       VALUES ('S-E2E-2', 'Chai', 'Dee', 10.00, 200.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    await database.pool.query(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('E2E-UID-2', $1, 'active')`,
      [studentId],
    );

    const offlineTrxId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

    // First Sync (AC5.5)
    const response1 = await request(app.getHttpServer())
      .post('/merchant/payments/sync')
      .set('x-merchant-id', String(merchantId))
      .send({
        offlineTrxId,
        rfidUid: 'E2E-UID-2',
        amount: '30.00',
        offlineCreatedAt: '2026-11-10T09:00:00.000Z',
      })
      .expect(200);

    expect(response1.body).toMatchObject({
      studentId,
      merchantId,
      amount: '30.00',
      paymentMode: 'OFFLINE',
      walletBalance: '-20.00',
      duplicate: false,
    });

    // Replay with same offlineTrxId (AC5.10 Idempotency)
    const response2 = await request(app.getHttpServer())
      .post('/merchant/payments/sync')
      .set('x-merchant-id', String(merchantId))
      .send({
        offlineTrxId,
        rfidUid: 'E2E-UID-2',
        amount: '30.00',
        offlineCreatedAt: '2026-11-10T09:00:00.000Z',
      })
      .expect(200);

    expect(response2.body).toMatchObject({
      studentId,
      merchantId,
      amount: '30.00',
      paymentMode: 'OFFLINE',
      walletBalance: '-20.00',
      duplicate: true,
    });

    const studentDb = await database.pool.query(
      'SELECT wallet_balance::text FROM students WHERE id = $1',
      [studentId],
    );
    expect(studentDb.rows[0].wallet_balance).toBe('-20.00');
  });

  it('AC5.6: rejects payment when daily limit is exceeded', async () => {
    const merchantRes = await database.pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, status)
       VALUES ('M-E2E-3', 'Daily Limit Shop', 'active') RETURNING id`,
    );
    const merchantId = merchantRes.rows[0].id;

    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance, current_daily_limit)
       VALUES ('S-E2E-3', 'Limit', 'Exceed', 500.00, 50.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    await database.pool.query(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('E2E-UID-3', $1, 'active')`,
      [studentId],
    );

    const response = await request(app.getHttpServer())
      .post('/merchant/payments')
      .set('x-merchant-id', String(merchantId))
      .send({
        rfidUid: 'E2E-UID-3',
        amount: '60.00',
      })
      .expect(409);

    expect(response.body).toMatchObject({
      code: 'DAILY_LIMIT_EXCEEDED',
    });
  });

  it('AC5.7: rejects invalid payment amount with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/merchant/payments')
      .set('x-merchant-id', '1')
      .send({
        rfidUid: 'E2E-UID-1',
        amount: '-10.00',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'INVALID_PAYMENT_REQUEST',
    });
  });

  it('AC5.8: rejects unknown card with 404, suspended card with 409', async () => {
    const merchantRes = await database.pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, status)
       VALUES ('M-E2E-4', 'Card Shop', 'active') RETURNING id`,
    );
    const merchantId = merchantRes.rows[0].id;

    // Unknown card
    await request(app.getHttpServer())
      .post('/merchant/payments')
      .set('x-merchant-id', String(merchantId))
      .send({
        rfidUid: 'UNKNOWN-CARD',
        amount: '10.00',
      })
      .expect(404);

    // Suspended card
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance, current_daily_limit)
       VALUES ('S-E2E-4', 'Suspended', 'Student', 100.00, 200.00) RETURNING id`,
    );
    await database.pool.query(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('SUSPENDED-CARD', $1, 'suspended')`,
      [studentRes.rows[0].id],
    );

    await request(app.getHttpServer())
      .post('/merchant/payments')
      .set('x-merchant-id', String(merchantId))
      .send({
        rfidUid: 'SUSPENDED-CARD',
        amount: '10.00',
      })
      .expect(409);
  });

  it('AC5.9: rejects unauthenticated merchant with 401, suspended merchant with 403', async () => {
    // Unauthenticated
    await request(app.getHttpServer())
      .post('/merchant/payments')
      .send({
        rfidUid: 'ANY-CARD',
        amount: '10.00',
      })
      .expect(401);

    // Suspended merchant
    const merchantRes = await database.pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, status)
       VALUES ('M-E2E-SUSP', 'Suspended Shop', 'suspended') RETURNING id`,
    );
    await request(app.getHttpServer())
      .post('/merchant/payments')
      .set('x-merchant-id', String(merchantRes.rows[0].id))
      .send({
        rfidUid: 'ANY-CARD',
        amount: '10.00',
      })
      .expect(403);
  });

  it('AC5.11: rejects online payment when wallet balance is insufficient', async () => {
    const merchantRes = await database.pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, status)
       VALUES ('M-E2E-5', 'Low Balance Shop', 'active') RETURNING id`,
    );
    const merchantId = merchantRes.rows[0].id;

    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance, current_daily_limit)
       VALUES ('S-E2E-5', 'Low', 'Balance', 15.00, 200.00) RETURNING id`,
    );
    await database.pool.query(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('E2E-UID-5', $1, 'active')`,
      [studentRes.rows[0].id],
    );

    const response = await request(app.getHttpServer())
      .post('/merchant/payments')
      .set('x-merchant-id', String(merchantId))
      .send({
        rfidUid: 'E2E-UID-5',
        amount: '35.00',
      })
      .expect(409);

    expect(response.body).toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
    });
  });
});

function restoreEnvironmentVariable(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
