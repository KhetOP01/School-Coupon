import { INestApplication, ValidationPipe } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { STAFF_OIDC_CLIENT } from '../../src/modules/school-configuration/auth.tokens';
import { ApiExceptionFilter } from '../../src/shared/api-exception.filter';
import {
  createEmbeddedPostgresDatabase,
  EmbeddedPostgresDatabase,
} from '../helpers/embedded-postgres';

describe('UC-02 Card Freeze and Departure Refund E2E', () => {
  const sessionToken = 'uc02-e2e-staff-session';
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
      'TRUNCATE staff_admin_oidc_flows, staff_admin_sessions, rfid_cards, students RESTART IDENTITY CASCADE',
    );
    await database.pool.query(
      `INSERT INTO staff_admin_sessions
         (session_token_hash, provider_issuer, staff_subject, created_at, expires_at)
       VALUES ($1, 'https://idp.example/', 'staff-e2e', now(), now() + INTERVAL '15 minutes')`,
      [createHash('sha256').update(sessionToken).digest()],
    );
  });

  it('AC2.1: staff suspends an active card', async () => {
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance)
       VALUES ('E2E-AC21-STAFF', 'Staff', 'Freeze', '100.00') RETURNING id`,
    );
    const cardRes = await database.pool.query<{ id: number }>(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('UID-FREEZE-STAFF', $1, 'active') RETURNING id`,
      [studentRes.rows[0].id],
    );
    const cardId = cardRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .patch(`/admin/cards/${cardId}/freeze`)
      .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      cardId,
      studentId: studentRes.rows[0].id,
      rfidUid: 'UID-FREEZE-STAFF',
      status: 'suspended',
    });

    const cardDb = await database.pool.query(
      'SELECT status FROM rfid_cards WHERE id = $1',
      [cardId],
    );
    expect(cardDb.rows[0].status).toBe('suspended');
  });

  it('AC2.1: parent reports lost card and freezes it', async () => {
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance)
       VALUES ('E2E-AC21-PARENT', 'Parent', 'Freeze', '50.00') RETURNING id`,
    );
    const cardRes = await database.pool.query<{ id: number }>(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('UID-FREEZE-PARENT', $1, 'active') RETURNING id`,
      [studentRes.rows[0].id],
    );
    const cardId = cardRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .patch(`/parent/cards/${cardId}/freeze`)
      .expect(200);

    expect(response.body).toMatchObject({
      cardId,
      studentId: studentRes.rows[0].id,
      rfidUid: 'UID-FREEZE-PARENT',
      status: 'lost',
    });

    const cardDb = await database.pool.query(
      'SELECT status FROM rfid_cards WHERE id = $1',
      [cardId],
    );
    expect(cardDb.rows[0].status).toBe('lost');
  });

  it('AC2.3: staff unfreezes suspended card back to active', async () => {
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance)
       VALUES ('E2E-AC23', 'Unfreeze', 'Student', '80.00') RETURNING id`,
    );
    const cardRes = await database.pool.query<{ id: number }>(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('UID-UNFREEZE', $1, 'suspended') RETURNING id`,
      [studentRes.rows[0].id],
    );
    const cardId = cardRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .patch(`/admin/cards/${cardId}/unfreeze`)
      .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      cardId,
      studentId: studentRes.rows[0].id,
      rfidUid: 'UID-UNFREEZE',
      status: 'active',
    });

    const cardDb = await database.pool.query(
      'SELECT status FROM rfid_cards WHERE id = $1',
      [cardId],
    );
    expect(cardDb.rows[0].status).toBe('active');
  });

  it('AC2.2: staff processes departure refund with positive balance', async () => {
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance)
       VALUES ('E2E-AC22', 'Departure', 'Student', '250.00') RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;
    const cardRes = await database.pool.query<{ id: number }>(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('UID-REFUND', $1, 'active') RETURNING id`,
      [studentId],
    );
    const cardId = cardRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .post(`/admin/students/${studentId}/refund`)
      .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      studentId,
      studentCode: 'E2E-AC22',
      refundedAmount: '250.00',
      walletBalance: '0.00',
      cardId,
      cardStatus: 'deactivated',
    });

    const studentDb = await database.pool.query(
      'SELECT wallet_balance::text AS wallet_balance, departed_at FROM students WHERE id = $1',
      [studentId],
    );
    expect(studentDb.rows[0].wallet_balance).toBe('0.00');
    expect(studentDb.rows[0].departed_at).not.toBeNull();

    const cardDb = await database.pool.query(
      'SELECT status FROM rfid_cards WHERE id = $1',
      [cardId],
    );
    expect(cardDb.rows[0].status).toBe('deactivated');

    const refundDb = await database.pool.query(
      'SELECT amount::text AS amount FROM student_refunds WHERE student_id = $1',
      [studentId],
    );
    expect(refundDb.rows[0].amount).toBe('250.00');
  });

  it('AC2.6: rejects duplicate departure refund with 409 conflict', async () => {
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance)
       VALUES ('E2E-AC26', 'Duplicate', 'Refund', '100.00') RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    // First refund succeeds
    await request(app.getHttpServer())
      .post(`/admin/students/${studentId}/refund`)
      .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
      .expect(200);

    // Second refund fails
    const response = await request(app.getHttpServer())
      .post(`/admin/students/${studentId}/refund`)
      .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
      .expect(409);

    expect(response.body.code).toBe('REFUND_ALREADY_PROCESSED');
  });

  it('AC2.7: processes zero-balance departure refund without inserting refund record', async () => {
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance)
       VALUES ('E2E-AC27', 'Zero', 'Balance', '0.00') RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;
    const cardRes = await database.pool.query<{ id: number }>(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('UID-ZERO-BAL', $1, 'active') RETURNING id`,
      [studentId],
    );
    const cardId = cardRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .post(`/admin/students/${studentId}/refund`)
      .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      studentId,
      refundedAmount: '0.00',
      walletBalance: '0.00',
      cardId,
      cardStatus: 'deactivated',
    });

    const refundDb = await database.pool.query(
      'SELECT COUNT(*)::integer AS count FROM student_refunds WHERE student_id = $1',
      [studentId],
    );
    expect(refundDb.rows[0].count).toBe(0);
  });

  it('AC2.4: rejects unauthenticated requests with 401', async () => {
    await request(app.getHttpServer()).patch('/admin/cards/1/freeze').expect(401);
    await request(app.getHttpServer()).patch('/admin/cards/1/unfreeze').expect(401);
    await request(app.getHttpServer()).post('/admin/students/1/refund').expect(401);
  });

  it('AC2.5: returns 404 when target card or student does not exist', async () => {
    const cardFreezeRes = await request(app.getHttpServer())
      .patch('/admin/cards/99999/freeze')
      .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
      .expect(404);
    expect(cardFreezeRes.body.code).toBe('CARD_NOT_FOUND');

    const studentRefundRes = await request(app.getHttpServer())
      .post('/admin/students/99999/refund')
      .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
      .expect(404);
    expect(studentRefundRes.body.code).toBe('STUDENT_NOT_FOUND');
  });
});

function restoreEnvironmentVariable(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
