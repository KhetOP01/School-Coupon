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

describe('UC-06 Void Payment E2E', () => {
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
      'TRUNCATE TABLE payment_voids, payments, merchants, rfid_cards, students RESTART IDENTITY CASCADE',
    );
  });

  it('AC6.1: voids same-day payment successfully without scanning card and refunds wallet balance', async () => {
    const merchantRes = await database.pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, status)
       VALUES ('M-VOID-1', 'Void Merchant 1', 'active') RETURNING id`,
    );
    const merchantId = merchantRes.rows[0].id;

    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance, current_daily_limit)
       VALUES ('S-VOID-1', 'Somchai', 'Void', 60.00, 200.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const cardRes = await database.pool.query<{ id: number }>(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('UID-VOID-1', $1, 'active') RETURNING id`,
      [studentId],
    );
    const cardId = cardRes.rows[0].id;

    const paymentRes = await database.pool.query<{ id: string }>(
      `INSERT INTO payments (id, student_id, merchant_id, card_id, amount, payment_mode, status, created_at)
       VALUES ('60000000-0000-0000-0000-000000000001', $1, $2, $3, 40.00, 'ONLINE', 'COMPLETED', now())
       RETURNING id`,
      [studentId, merchantId, cardId],
    );
    const paymentId = paymentRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .post(`/merchant/payments/${paymentId}/void`)
      .set('x-merchant-id', String(merchantId))
      .send({ reason: 'Customer changed mind' })
      .expect(200);

    expect(response.body).toMatchObject({
      paymentId,
      studentId,
      merchantId,
      amount: '40.00',
      status: 'VOIDED',
      walletBalance: '100.00',
    });

    // Verify DB states
    const studentDb = await database.pool.query<{ wallet_balance: string }>(
      'SELECT wallet_balance::text FROM students WHERE id = $1',
      [studentId],
    );
    expect(studentDb.rows[0].wallet_balance).toBe('100.00');

    const paymentDb = await database.pool.query<{ status: string; void_reason: string }>(
      'SELECT status, void_reason FROM payments WHERE id = $1',
      [paymentId],
    );
    expect(paymentDb.rows[0].status).toBe('VOIDED');
    expect(paymentDb.rows[0].void_reason).toBe('Customer changed mind');

    const voidDb = await database.pool.query<{ amount: string }>(
      'SELECT amount::text FROM payment_voids WHERE payment_id = $1',
      [paymentId],
    );
    expect(voidDb.rows[0].amount).toBe('40.00');
  });

  it('AC6.2: rejects void with 400 INVALID_VOID_PERIOD when payment was made on a past day', async () => {
    const merchantRes = await database.pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, status)
       VALUES ('M-VOID-2', 'Void Merchant 2', 'active') RETURNING id`,
    );
    const merchantId = merchantRes.rows[0].id;

    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance, current_daily_limit)
       VALUES ('S-VOID-2', 'Suda', 'Past', 50.00, 200.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const cardRes = await database.pool.query<{ id: number }>(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('UID-VOID-2', $1, 'active') RETURNING id`,
      [studentId],
    );
    const cardId = cardRes.rows[0].id;

    const paymentRes = await database.pool.query<{ id: string }>(
      `INSERT INTO payments (id, student_id, merchant_id, card_id, amount, payment_mode, status, created_at)
       VALUES ('60000000-0000-0000-0000-000000000002', $1, $2, $3, 50.00, 'ONLINE', 'COMPLETED', now() - INTERVAL '2 days')
       RETURNING id`,
      [studentId, merchantId, cardId],
    );
    const paymentId = paymentRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .post(`/merchant/payments/${paymentId}/void`)
      .set('x-merchant-id', String(merchantId))
      .send()
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'INVALID_VOID_PERIOD',
    });

    // Wallet balance must not change
    const studentDb = await database.pool.query<{ wallet_balance: string }>(
      'SELECT wallet_balance::text FROM students WHERE id = $1',
      [studentId],
    );
    expect(studentDb.rows[0].wallet_balance).toBe('50.00');
  });

  it('AC6.3: returns 404 PAYMENT_NOT_FOUND when payment ID does not exist', async () => {
    const merchantRes = await database.pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, status)
       VALUES ('M-VOID-3', 'Void Merchant 3', 'active') RETURNING id`,
    );
    const merchantId = merchantRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .post('/merchant/payments/00000000-0000-0000-0000-000000000999/void')
      .set('x-merchant-id', String(merchantId))
      .send()
      .expect(404);

    expect(response.body).toMatchObject({
      code: 'PAYMENT_NOT_FOUND',
    });
  });

  it('AC6.4: returns 401 when unauthenticated and 403 when merchant is not the owner', async () => {
    const merchantRes1 = await database.pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, status)
       VALUES ('M-VOID-4A', 'Owner Merchant', 'active') RETURNING id`,
    );
    const merchant1Id = merchantRes1.rows[0].id;

    const merchantRes2 = await database.pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, status)
       VALUES ('M-VOID-4B', 'Other Merchant', 'active') RETURNING id`,
    );
    const merchant2Id = merchantRes2.rows[0].id;

    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance, current_daily_limit)
       VALUES ('S-VOID-4', 'Student', 'AC64', 70.00, 200.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const cardRes = await database.pool.query<{ id: number }>(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('UID-VOID-4', $1, 'active') RETURNING id`,
      [studentId],
    );
    const cardId = cardRes.rows[0].id;

    const paymentRes = await database.pool.query<{ id: string }>(
      `INSERT INTO payments (id, student_id, merchant_id, card_id, amount, payment_mode, status, created_at)
       VALUES ('60000000-0000-0000-0000-000000000004', $1, $2, $3, 30.00, 'ONLINE', 'COMPLETED', now())
       RETURNING id`,
      [studentId, merchant1Id, cardId],
    );
    const paymentId = paymentRes.rows[0].id;

    // Unauthenticated
    const res401 = await request(app.getHttpServer())
      .post(`/merchant/payments/${paymentId}/void`)
      .send()
      .expect(401);
    expect(res401.body).toMatchObject({ code: 'AUTHENTICATION_REQUIRED' });

    // Non-owner merchant
    const res403 = await request(app.getHttpServer())
      .post(`/merchant/payments/${paymentId}/void`)
      .set('x-merchant-id', String(merchant2Id))
      .send()
      .expect(403);
    expect(res403.body).toMatchObject({ code: 'MERCHANT_ACCESS_DENIED' });
  });

  it('AC6.5: returns 409 PAYMENT_ALREADY_VOIDED when repeated void is attempted', async () => {
    const merchantRes = await database.pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, status)
       VALUES ('M-VOID-5', 'Void Merchant 5', 'active') RETURNING id`,
    );
    const merchantId = merchantRes.rows[0].id;

    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance, current_daily_limit)
       VALUES ('S-VOID-5', 'Student', 'AC65', 75.00, 200.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const cardRes = await database.pool.query<{ id: number }>(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('UID-VOID-5', $1, 'active') RETURNING id`,
      [studentId],
    );
    const cardId = cardRes.rows[0].id;

    const paymentRes = await database.pool.query<{ id: string }>(
      `INSERT INTO payments (id, student_id, merchant_id, card_id, amount, payment_mode, status, created_at)
       VALUES ('60000000-0000-0000-0000-000000000005', $1, $2, $3, 25.00, 'ONLINE', 'COMPLETED', now())
       RETURNING id`,
      [studentId, merchantId, cardId],
    );
    const paymentId = paymentRes.rows[0].id;

    // First void -> 200 OK
    await request(app.getHttpServer())
      .post(`/merchant/payments/${paymentId}/void`)
      .set('x-merchant-id', String(merchantId))
      .send()
      .expect(200);

    // Repeated void -> 409 Conflict
    const response = await request(app.getHttpServer())
      .post(`/merchant/payments/${paymentId}/void`)
      .set('x-merchant-id', String(merchantId))
      .send()
      .expect(409);

    expect(response.body).toMatchObject({
      code: 'PAYMENT_ALREADY_VOIDED',
    });
  });

  it('AC6.7: returns 400 INVALID_REQUEST when transaction ID format is invalid', async () => {
    const response = await request(app.getHttpServer())
      .post('/merchant/payments/not-a-valid-uuid/void')
      .set('x-merchant-id', '1')
      .send()
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'INVALID_REQUEST',
    });
  });
});

function restoreEnvironmentVariable(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
