import { createHash } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { GenerateDailySettlements } from '../../src/modules/merchant-settlement';
import { STAFF_OIDC_CLIENT } from '../../src/modules/school-configuration/auth.tokens';
import { ApiExceptionFilter } from '../../src/shared/api-exception.filter';
import {
  createEmbeddedPostgresDatabase,
  EmbeddedPostgresDatabase,
} from '../helpers/embedded-postgres';

describe('UC-07 Daily Settlement E2E', () => {
  let app: INestApplication;
  let database: EmbeddedPostgresDatabase;
  let generateSettlements: GenerateDailySettlements;
  const originalEnvironment = new Map<string, string | undefined>();
  const sessionToken = 'settlement-e2e-staff-token-12345';
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

    generateSettlements = app.get(GenerateDailySettlements);
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
      'TRUNCATE settlements, staff_admin_sessions, payment_voids, payments, merchants, rfid_cards, students RESTART IDENTITY CASCADE',
    );
    await database.pool.query(
      `INSERT INTO staff_admin_sessions
         (session_token_hash, provider_issuer, staff_subject, created_at, expires_at)
       VALUES ($1, 'https://idp.example/', 'staff-e2e', now(), now() + INTERVAL '1 hour')`,
      [createHash('sha256').update(sessionToken).digest()],
    );
  });

  it('AC7.1 & AC7.3: generates settlements excluding voided payments, and skips duplicates', async () => {
    // Setup 2 merchants
    const m1 = await database.pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, fee_percent, status)
       VALUES ('M-SETTLE-E2E-1', 'Stall A', 2.00, 'active') RETURNING id`,
    );
    const m1Id = m1.rows[0].id;

    const m2 = await database.pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, fee_percent, status)
       VALUES ('M-SETTLE-E2E-2', 'Stall B', 3.00, 'active') RETURNING id`,
    );
    const m2Id = m2.rows[0].id;

    // Student & card
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance)
       VALUES ('S-E2E-SETTLE', 'Student', 'Settle', 500.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const cardRes = await database.pool.query<{ id: number }>(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('UID-E2E-SETTLE', $1, 'active') RETURNING id`,
      [studentId],
    );
    const cardId = cardRes.rows[0].id;

    // M1: 2 completed payments (100.00 and 50.00), 1 voided payment (40.00)
    await database.pool.query(
      `INSERT INTO payments (id, student_id, merchant_id, card_id, amount, payment_mode, status, created_at)
       VALUES
         ('71000000-0000-0000-0000-000000000001', $1, $2, $3, 100.00, 'ONLINE', 'COMPLETED', '2026-11-10 10:00:00+00'),
         ('71000000-0000-0000-0000-000000000002', $1, $2, $3, 50.00, 'ONLINE', 'COMPLETED', '2026-11-10 11:00:00+00'),
         ('71000000-0000-0000-0000-000000000003', $1, $2, $3, 40.00, 'ONLINE', 'VOIDED', '2026-11-10 12:00:00+00')`,
      [studentId, m1Id, cardId],
    );

    // M2: 1 completed payment (200.00)
    await database.pool.query(
      `INSERT INTO payments (id, student_id, merchant_id, card_id, amount, payment_mode, status, created_at)
       VALUES ('71000000-0000-0000-0000-000000000004', $1, $2, $3, 200.00, 'ONLINE', 'COMPLETED', '2026-11-10 14:00:00+00')`,
      [studentId, m2Id, cardId],
    );

    // AC7.1: Run generation
    const genResult = await generateSettlements.execute({ settlementDate: '2026-11-10' });
    expect(genResult.createdCount).toBe(2);
    expect(genResult.skippedCount).toBe(0);

    // Verify M1 settlement in DB: Gross = 150.00, Fee = 3.00 (2%), Net = 147.00
    const m1Db = await database.pool.query<{
      gross_amount: string;
      fee_amount: string;
      net_amount: string;
      status: string;
    }>(
      'SELECT gross_amount::text, fee_amount::text, net_amount::text, status FROM settlements WHERE merchant_id = $1',
      [m1Id],
    );
    expect(m1Db.rows[0]).toMatchObject({
      gross_amount: '150.00',
      fee_amount: '3.00',
      net_amount: '147.00',
      status: 'PENDING_APPROVAL',
    });

    // Verify M2 settlement in DB: Gross = 200.00, Fee = 6.00 (3%), Net = 194.00
    const m2Db = await database.pool.query<{
      gross_amount: string;
      fee_amount: string;
      net_amount: string;
      status: string;
    }>(
      'SELECT gross_amount::text, fee_amount::text, net_amount::text, status FROM settlements WHERE merchant_id = $1',
      [m2Id],
    );
    expect(m2Db.rows[0]).toMatchObject({
      gross_amount: '200.00',
      fee_amount: '6.00',
      net_amount: '194.00',
      status: 'PENDING_APPROVAL',
    });

    // AC7.3: Run repeated generation on the same day -> Idempotent
    const repeatResult = await generateSettlements.execute({ settlementDate: '2026-11-10' });
    expect(repeatResult.createdCount).toBe(0);
    expect(repeatResult.skippedCount).toBe(2);
  });

  it('AC7.2 & AC7.7: approves a pending settlement, and repeated approval is idempotent', async () => {
    const merchantRes = await database.pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, fee_percent, status)
       VALUES ('M-SETTLE-E2E-3', 'Stall C', 2.00, 'active') RETURNING id`,
    );
    const merchantId = merchantRes.rows[0].id;

    const settlementRes = await database.pool.query<{ id: number }>(
      `INSERT INTO settlements (merchant_id, settlement_date, gross_amount, fee_amount, net_amount, status)
       VALUES ($1, '2026-11-10', 500.00, 10.00, 490.00, 'PENDING_APPROVAL') RETURNING id`,
      [merchantId],
    );
    const settlementId = settlementRes.rows[0].id;

    // AC7.2: First approve
    const response = await request(app.getHttpServer())
      .post(`/admin/settlements/${settlementId}/approve`)
      .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: settlementId,
      merchantId,
      settlementDate: '2026-11-10',
      grossAmount: '500.00',
      feeAmount: '10.00',
      netAmount: '490.00',
      status: 'APPROVED',
      approvedBy: 'staff-admin',
    });
    expect(response.body.approvedAt).toBeDefined();

    // AC7.7: Repeated approve call returns 200 OK idempotent
    const repeatResponse = await request(app.getHttpServer())
      .post(`/admin/settlements/${settlementId}/approve`)
      .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
      .expect(200);

    expect(repeatResponse.body).toMatchObject({
      id: settlementId,
      status: 'APPROVED',
      approvedBy: 'staff-admin',
    });
  });

  it('AC7.4: returns 404 SETTLEMENT_NOT_FOUND when settlement does not exist', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/settlements/99999/approve')
      .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
      .expect(404);

    expect(response.body).toMatchObject({
      code: 'SETTLEMENT_NOT_FOUND',
    });
  });

  it('AC7.5: returns 401 AUTHENTICATION_REQUIRED when not logged in', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/settlements/1/approve')
      .expect(401);

    expect(response.body).toMatchObject({
      code: 'AUTHENTICATION_REQUIRED',
    });
  });

  it('AC7.6: returns 409 SETTLEMENT_NOT_PENDING when settlement is in PAID status', async () => {
    const merchantRes = await database.pool.query<{ id: number }>(
      `INSERT INTO merchants (merchant_code, name, fee_percent, status)
       VALUES ('M-SETTLE-E2E-4', 'Stall D', 2.00, 'active') RETURNING id`,
    );
    const merchantId = merchantRes.rows[0].id;

    const settlementRes = await database.pool.query<{ id: number }>(
      `INSERT INTO settlements (merchant_id, settlement_date, gross_amount, fee_amount, net_amount, status)
       VALUES ($1, '2026-11-10', 300.00, 6.00, 294.00, 'PAID') RETURNING id`,
      [merchantId],
    );
    const settlementId = settlementRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .post(`/admin/settlements/${settlementId}/approve`)
      .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
      .expect(409);

    expect(response.body).toMatchObject({
      code: 'SETTLEMENT_NOT_PENDING',
    });
  });

  it('AC7.8: returns 400 INVALID_REQUEST when settlement ID is not a positive integer', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/settlements/not-a-number/approve')
      .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
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
