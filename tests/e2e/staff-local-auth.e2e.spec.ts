import { INestApplication, ValidationPipe } from '@nestjs/common';
import { createHash, scryptSync } from 'node:crypto';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ApiExceptionFilter } from '../../src/shared/api-exception.filter';
import {
  createEmbeddedPostgresDatabase,
  EmbeddedPostgresDatabase,
} from '../helpers/embedded-postgres';

function hashTestPassword(password: string): string {
  const salt = 'b2c3d4e5f60718293a4b5c6d7e8f9011';
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

describe('Staff Admin Local Password Authentication (UC-09)', () => {
  let app: INestApplication;
  let database: EmbeddedPostgresDatabase;
  const originalEnvironment = new Map<string, string | undefined>();
  const settings: Record<string, string> = {
    STAFF_OIDC_ISSUER: 'http://127.0.0.1:43127',
    STAFF_OIDC_CLIENT_ID: 'school-coupon-admin-test',
    STAFF_OIDC_CLIENT_SECRET: 'local-only-test-client-secret',
    STAFF_OIDC_REDIRECT_URI: 'http://127.0.0.1:3000/admin/auth/oidc/callback',
    STAFF_CLAIM_NAME: 'groups',
    STAFF_CLAIM_VALUE: 'staff',
  };

  beforeAll(async () => {
    database = await createEmbeddedPostgresDatabase();
    for (const [name, value] of Object.entries({
      DATABASE_URL: database.databaseUrl,
      ...settings,
    })) {
      originalEnvironment.set(name, process.env[name]);
      process.env[name] = value;
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }, 30_000);

  beforeEach(async () => {
    await database.pool.query(
      'TRUNCATE staff_admin_sessions, staff_users RESTART IDENTITY CASCADE',
    );
    const passwordHash = hashTestPassword('admin1234');
    await database.pool.query(
      `INSERT INTO staff_users (username, password_hash, full_name, role, status)
       VALUES
         ('admin', $1, 'สมชาย ใจดี', 'admin', 'active'),
         ('staff_suspended', $1, 'สมหญิง ถูกระงับ', 'staff', 'suspended')`,
      [passwordHash],
    );
  });

  it('AC9.1: logs in an active staff user with valid username and password and sets HttpOnly cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ username: 'admin', password: 'admin1234' })
      .expect(200);

    expect(response.body.username).toBe('admin');
    expect(response.body.fullName).toBe('สมชาย ใจดี');
    expect(response.body.role).toBe('admin');
    expect(response.body.expiresAt).toBeDefined();

    const setCookies = response.headers['set-cookie'];
    const cookieList = Array.isArray(setCookies) ? setCookies : [setCookies];
    const sessionCookie = cookieList.find((cookie: string) =>
      cookie.startsWith('school_coupon_admin_session='),
    );
    expect(sessionCookie).toMatch(
      /^school_coupon_admin_session=[A-Za-z0-9_-]+; Path=\/; HttpOnly; SameSite=Lax/,
    );

    const token = sessionCookie?.match(
      /^school_coupon_admin_session=([A-Za-z0-9_-]+)/,
    )?.[1];
    expect(token).toBeDefined();

    const stored = await database.pool.query<{
      session_token_hash: Buffer;
      provider_issuer: string;
      staff_subject: string;
    }>(
      'SELECT session_token_hash, provider_issuer, staff_subject FROM staff_admin_sessions',
    );
    expect(stored.rows).toEqual([
      {
        session_token_hash: createHash('sha256').update(token!).digest(),
        provider_issuer: 'local',
        staff_subject: 'admin',
      },
    ]);
  });

  it('AC9.2: rejects blank or missing username/password with 400 INVALID_REQUEST', async () => {
    const emptyRes = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ username: '   ', password: '' })
      .expect(400);

    expect(emptyRes.body.code).toBe('INVALID_REQUEST');

    const missingRes = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({})
      .expect(400);

    expect(missingRes.body.code).toBe('INVALID_REQUEST');

    const stored = await database.pool.query('SELECT session_token_hash FROM staff_admin_sessions');
    expect(stored.rows).toHaveLength(0);
  });

  it('AC9.3: rejects unknown username or wrong password with 401 INVALID_CREDENTIALS', async () => {
    const wrongUser = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ username: 'unknown', password: 'admin1234' })
      .expect(401);

    expect(wrongUser.body.code).toBe('INVALID_CREDENTIALS');
    expect(wrongUser.headers['set-cookie']).toBeUndefined();

    const wrongPassword = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ username: 'admin', password: 'wrong-password' })
      .expect(401);

    expect(wrongPassword.body.code).toBe('INVALID_CREDENTIALS');
    expect(wrongPassword.body.message).toBe(wrongUser.body.message);
    expect(wrongPassword.headers['set-cookie']).toBeUndefined();

    const stored = await database.pool.query('SELECT session_token_hash FROM staff_admin_sessions');
    expect(stored.rows).toHaveLength(0);
  });

  it('AC9.4: rejects suspended staff user with 403 STAFF_SUSPENDED', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ username: 'staff_suspended', password: 'admin1234' })
      .expect(403);

    expect(response.body.code).toBe('STAFF_SUSPENDED');
    expect(response.headers['set-cookie']).toBeUndefined();

    const stored = await database.pool.query('SELECT session_token_hash FROM staff_admin_sessions');
    expect(stored.rows).toHaveLength(0);
  });

  it('AC9.5: supports GET /admin/auth/session and POST /admin/auth/logout after local login', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ username: 'admin', password: 'admin1234' })
      .expect(200);

    const setCookies = loginRes.headers['set-cookie'];
    const cookieList = Array.isArray(setCookies) ? setCookies : [setCookies];
    const sessionCookie = cookieList.find((cookie: string) =>
      cookie.startsWith('school_coupon_admin_session='),
    );
    const token = sessionCookie?.match(
      /^school_coupon_admin_session=([A-Za-z0-9_-]+)/,
    )?.[1];

    await request(app.getHttpServer())
      .get('/admin/auth/session')
      .set('Cookie', `school_coupon_admin_session=${token}`)
      .expect(200)
      .expect(({ body }) => expect(body.expiresAt).toBeDefined());

    await request(app.getHttpServer())
      .post('/admin/auth/logout')
      .set('Cookie', `school_coupon_admin_session=${token}`)
      .expect(204);

    const afterLogout = await request(app.getHttpServer())
      .get('/admin/auth/session')
      .set('Cookie', `school_coupon_admin_session=${token}`)
      .expect(401);

    expect(afterLogout.body.code).toBe('SESSION_EXPIRED');
  });
});
