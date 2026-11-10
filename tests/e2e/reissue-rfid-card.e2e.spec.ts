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

describe('POST /admin/cards/reissue', () => {
  const sessionToken = 'uc01-e2e-staff-session';
  let app: INestApplication;
  let database: EmbeddedPostgresDatabase;
  let studentId: number;
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
    const student = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance)
       VALUES ('E2E-STUDENT', 'Test', 'Student', '65.00')
       RETURNING id`,
    );
    studentId = student.rows[0].id;
    await database.pool.query(
      `INSERT INTO rfid_cards (rfid_uid, student_id, status)
       VALUES ('E2E-OLD-UID', $1, 'active')`,
      [studentId],
    );
    await database.pool.query(
      `INSERT INTO staff_admin_sessions
         (session_token_hash, provider_issuer, staff_subject, created_at, expires_at)
       VALUES ($1, 'https://idp.example/', 'staff-e2e', now(), now() + INTERVAL '15 minutes')`,
      [createHash('sha256').update(sessionToken).digest()],
    );
  });

  it('AC1.1: authenticates Staff, replaces the RFID card, and preserves the wallet balance', async () => {
    const originalCard = await database.pool.query<{ id: number }>(
      `SELECT id FROM rfid_cards WHERE student_id = $1 AND status = 'active'`,
      [studentId],
    );

    const response = await request(app.getHttpServer())
      .post('/admin/cards/reissue')
      .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
      .send({
        studentId,
        expectedCardId: originalCard.rows[0].id,
        newRfidUid: 'E2E-NEW-UID',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      studentId,
      replacedCardId: originalCard.rows[0].id,
      newRfidUid: 'E2E-NEW-UID',
      newCardStatus: 'active',
      walletBalance: '65.00',
    });

    const cards = await database.pool.query<{
      id: number;
      rfid_uid: string;
      status: string;
    }>(
      `SELECT id, rfid_uid, status FROM rfid_cards WHERE student_id = $1 ORDER BY id`,
      [studentId],
    );
    expect(cards.rows).toEqual([
      { id: originalCard.rows[0].id, rfid_uid: 'E2E-OLD-UID', status: 'deactivated' },
      { id: response.body.newCardId, rfid_uid: 'E2E-NEW-UID', status: 'active' },
    ]);

    const student = await database.pool.query<{ wallet_balance: string }>(
      'SELECT wallet_balance::text AS wallet_balance FROM students WHERE id = $1',
      [studentId],
    );
    expect(student.rows[0].wallet_balance).toBe('65.00');
  });

  it('AC1.1: previews the student, replaceable card, and wallet before reissue', async () => {
    const response = await request(app.getHttpServer())
      .get(`/admin/students/${studentId}/card-reissue-preview`)
      .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      studentId,
      studentCode: 'E2E-STUDENT',
      firstName: 'Test',
      lastName: 'Student',
      expectedCardId: expect.any(Number),
      oldRfidUid: 'E2E-OLD-UID',
      oldCardStatus: 'active',
      walletBalance: '65.00',
    });
  });

  it('AC1.3: returns not found when previewing an unknown student', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/students/999999/card-reissue-preview')
      .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
      .expect(404);

    expect(response.body.code).toBe('STUDENT_NOT_FOUND');
  });

  it('AC1.1: rejects preview when the student has no active or lost card', async () => {
    const student = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance)
       VALUES ('E2E-NO-CARD', 'No', 'Card', '0.00')
       RETURNING id`,
    );

    const response = await request(app.getHttpServer())
      .get(`/admin/students/${student.rows[0].id}/card-reissue-preview`)
      .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
      .expect(409);

    expect(response.body.code).toBe('CARD_NOT_REPLACEABLE');
  });

  it('AC1.5: rejects a request without Staff authentication', async () => {
    await request(app.getHttpServer())
      .post('/admin/cards/reissue')
      .send({ studentId, expectedCardId: 1, newRfidUid: 'E2E-NEW-UID' })
      .expect(401)
      .expect({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required.',
      });

    const cards = await database.pool.query<{ rfid_uid: string; status: string }>(
      'SELECT rfid_uid, status FROM rfid_cards WHERE student_id = $1',
      [studentId],
    );
    expect(cards.rows).toEqual([{ rfid_uid: 'E2E-OLD-UID', status: 'active' }]);
    const student = await database.pool.query<{ wallet_balance: string }>(
      'SELECT wallet_balance::text AS wallet_balance FROM students WHERE id = $1',
      [studentId],
    );
    expect(student.rows[0].wallet_balance).toBe('65.00');
  });
});

function restoreEnvironmentVariable(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
