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

describe('UC-04 Parent Set Daily Limit E2E', () => {
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
      'TRUNCATE TABLE rfid_cards, students RESTART IDENTITY CASCADE',
    );
  });

  it('AC4.1: sets next daily limit to 150.00 while today limit remains 100.00 with effect next day', async () => {
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance, current_daily_limit, next_daily_limit)
       VALUES ('E2E-AC41', 'Daily', 'Student', 200.00, 100.00, 100.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .patch(`/parent/students/${studentId}/daily-limit`)
      .set('Authorization', 'Bearer parent-token-1')
      .send({ dailyLimit: '150.00' })
      .expect(200);

    expect(response.body).toEqual({
      studentId,
      currentDailyLimit: '100.00',
      nextDailyLimit: '150.00',
    });

    const dbRecord = await database.pool.query(
      `SELECT current_daily_limit::text AS current_daily_limit,
              next_daily_limit::text AS next_daily_limit,
              daily_limit_effective_date
       FROM students WHERE id = $1`,
      [studentId],
    );
    expect(dbRecord.rows[0].current_daily_limit).toBe('100.00');
    expect(dbRecord.rows[0].next_daily_limit).toBe('150.00');
    expect(dbRecord.rows[0].daily_limit_effective_date).not.toBeNull();
  });

  it('AC4.2: rejects invalid daily limit (negative, non-numeric, or >2 decimals) with 400 INVALID_DAILY_LIMIT', async () => {
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance, current_daily_limit, next_daily_limit)
       VALUES ('E2E-AC42', 'Invalid', 'Student', 200.00, 100.00, 100.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const res1 = await request(app.getHttpServer())
      .patch(`/parent/students/${studentId}/daily-limit`)
      .set('Authorization', 'Bearer parent-token-1')
      .send({ dailyLimit: '-50.00' })
      .expect(400);

    expect(res1.body).toMatchObject({
      code: 'INVALID_DAILY_LIMIT',
    });

    const res2 = await request(app.getHttpServer())
      .patch(`/parent/students/${studentId}/daily-limit`)
      .set('Authorization', 'Bearer parent-token-1')
      .send({ dailyLimit: 'invalid-amount' })
      .expect(400);

    expect(res2.body).toMatchObject({
      code: 'INVALID_DAILY_LIMIT',
    });

    const res3 = await request(app.getHttpServer())
      .patch(`/parent/students/${studentId}/daily-limit`)
      .set('Authorization', 'Bearer parent-token-1')
      .send({ dailyLimit: '100.999' })
      .expect(400);

    expect(res3.body).toMatchObject({
      code: 'INVALID_DAILY_LIMIT',
    });
  });

  it('AC4.3: rejects non-existent student with 404 STUDENT_NOT_FOUND', async () => {
    const response = await request(app.getHttpServer())
      .patch('/parent/students/99999/daily-limit')
      .set('Authorization', 'Bearer parent-token-1')
      .send({ dailyLimit: '150.00' })
      .expect(404);

    expect(response.body).toEqual({
      code: 'STUDENT_NOT_FOUND',
      message: 'Student not found.',
    });
  });

  it('AC4.4: rejects unauthenticated caller with 401 AUTHENTICATION_REQUIRED', async () => {
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance, current_daily_limit, next_daily_limit)
       VALUES ('E2E-AC44A', 'NoAuth', 'Student', 200.00, 100.00, 100.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .patch(`/parent/students/${studentId}/daily-limit`)
      .send({ dailyLimit: '150.00' })
      .expect(401);

    expect(response.body).toMatchObject({
      code: 'AUTHENTICATION_REQUIRED',
    });
  });

  it('AC4.4: rejects unauthorized parent with 403 PARENT_STUDENT_ACCESS_DENIED', async () => {
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance, current_daily_limit, next_daily_limit)
       VALUES ('E2E-AC44B', 'NoAccess', 'Student', 200.00, 100.00, 100.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .patch(`/parent/students/${studentId}/daily-limit`)
      .set('x-parent-id', 'denied')
      .send({ dailyLimit: '150.00' })
      .expect(403);

    expect(response.body).toMatchObject({
      code: 'PARENT_STUDENT_ACCESS_DENIED',
    });
  });

  it('AC4.5: sets same daily limit idempotently on repeated calls', async () => {
    const studentRes = await database.pool.query<{ id: number }>(
      `INSERT INTO students (student_code, first_name, last_name, wallet_balance, current_daily_limit, next_daily_limit)
       VALUES ('E2E-AC45', 'Idempotent', 'Student', 200.00, 100.00, 150.00) RETURNING id`,
    );
    const studentId = studentRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .patch(`/parent/students/${studentId}/daily-limit`)
      .set('Authorization', 'Bearer parent-token-1')
      .send({ dailyLimit: '150.00' })
      .expect(200);

    expect(response.body).toEqual({
      studentId,
      currentDailyLimit: '100.00',
      nextDailyLimit: '150.00',
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
