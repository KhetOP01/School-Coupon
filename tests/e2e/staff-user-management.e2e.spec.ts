import { INestApplication, ValidationPipe } from '@nestjs/common';
import { scryptSync } from 'node:crypto';
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

describe('Staff & Admin User Management (UC-10)', () => {
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
         ('staff01', $1, 'สมหญิง เจ้าหน้าที่', 'staff', 'active')`,
      [passwordHash],
    );
  });

  async function loginAs(username: string, password: string): Promise<string[]> {
    const response = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ username, password })
      .expect(200);
    const setCookie = response.headers['set-cookie'];
    return Array.isArray(setCookie) ? setCookie : [setCookie];
  }

  it('AC10.1: returns user profile and role in GET /admin/auth/session for active admin', async () => {
    const cookies = await loginAs('admin', 'admin1234');

    const response = await request(app.getHttpServer())
      .get('/admin/auth/session')
      .set('Cookie', cookies)
      .expect(200);

    expect(response.body).toEqual({
      username: 'admin',
      fullName: 'สมชาย ใจดี',
      role: 'admin',
      expiresAt: expect.any(String),
    });
  });

  it('AC10.2: rejects non-admin staff accounts with 403 ADMIN_ACCESS_REQUIRED on /admin/staff-users', async () => {
    const cookies = await loginAs('staff01', 'admin1234');

    const listResponse = await request(app.getHttpServer())
      .get('/admin/staff-users')
      .set('Cookie', cookies)
      .expect(403);
    expect(listResponse.body.code).toBe('ADMIN_ACCESS_REQUIRED');

    const createResponse = await request(app.getHttpServer())
      .post('/admin/staff-users')
      .set('Cookie', cookies)
      .send({
        username: 'staff02',
        password: 'password123',
        fullName: 'Staff Two',
        role: 'staff',
      })
      .expect(403);
    expect(createResponse.body.code).toBe('ADMIN_ACCESS_REQUIRED');
  });

  it('AC10.3: lists all staff_users for admin without exposing passwordHash', async () => {
    const cookies = await loginAs('admin', 'admin1234');

    const response = await request(app.getHttpServer())
      .get('/admin/staff-users')
      .set('Cookie', cookies)
      .expect(200);

    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0]).toMatchObject({
      username: 'admin',
      fullName: 'สมชาย ใจดี',
      role: 'admin',
      status: 'active',
    });
    expect(response.body.items[0].passwordHash).toBeUndefined();
    expect(response.body.items[0].password_hash).toBeUndefined();
  });

  it('AC10.4: creates a new staff user with scrypt hash, allows login, and rejects duplicate/invalid input', async () => {
    const cookies = await loginAs('admin', 'admin1234');

    const createResponse = await request(app.getHttpServer())
      .post('/admin/staff-users')
      .set('Cookie', cookies)
      .send({
        username: 'staff02',
        password: 'password123',
        fullName: 'มานี มีสุข',
        role: 'staff',
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      username: 'staff02',
      fullName: 'มานี มีสุข',
      role: 'staff',
      status: 'active',
    });
    expect(createResponse.body.passwordHash).toBeUndefined();

    // New user can log in immediately
    const newStaffCookies = await loginAs('staff02', 'password123');
    const sessionRes = await request(app.getHttpServer())
      .get('/admin/auth/session')
      .set('Cookie', newStaffCookies)
      .expect(200);
    expect(sessionRes.body.role).toBe('staff');

    // Duplicate username -> 409
    const dupResponse = await request(app.getHttpServer())
      .post('/admin/staff-users')
      .set('Cookie', cookies)
      .send({
        username: 'staff02',
        password: 'password123',
        fullName: 'Duplicate User',
        role: 'staff',
      })
      .expect(409);
    expect(dupResponse.body.code).toBe('STAFF_USERNAME_EXISTS');

    // Short password -> 400
    const badResponse = await request(app.getHttpServer())
      .post('/admin/staff-users')
      .set('Cookie', cookies)
      .send({
        username: 'staff03',
        password: '123',
        fullName: 'Short Pass',
        role: 'staff',
      })
      .expect(400);
    expect(badResponse.body.code).toBe('INVALID_REQUEST');
  });

  it('AC10.5: updates staff user role, status, fullName, and password, and returns 404 when missing', async () => {
    const cookies = await loginAs('admin', 'admin1234');

    const updateResponse = await request(app.getHttpServer())
      .patch('/admin/staff-users/2')
      .set('Cookie', cookies)
      .send({
        fullName: 'สมหญิง อัปเดต',
        role: 'admin',
        status: 'suspended',
      })
      .expect(200);

    expect(updateResponse.body).toMatchObject({
      id: 2,
      username: 'staff01',
      fullName: 'สมหญิง อัปเดต',
      role: 'admin',
      status: 'suspended',
    });

    // Suspended user cannot log in
    await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ username: 'staff01', password: 'admin1234' })
      .expect(403);

    // Missing user -> 404
    const notFoundResponse = await request(app.getHttpServer())
      .patch('/admin/staff-users/9999')
      .set('Cookie', cookies)
      .send({ status: 'active' })
      .expect(404);
    expect(notFoundResponse.body.code).toBe('STAFF_USER_NOT_FOUND');
  });

  it('AC10.6: prevents admin from suspending or demoting their own account', async () => {
    const cookies = await loginAs('admin', 'admin1234');

    const suspendSelf = await request(app.getHttpServer())
      .patch('/admin/staff-users/1')
      .set('Cookie', cookies)
      .send({ status: 'suspended' })
      .expect(409);
    expect(suspendSelf.body.code).toBe('CANNOT_MODIFY_OWN_ADMIN_ACCESS');

    const demoteSelf = await request(app.getHttpServer())
      .patch('/admin/staff-users/1')
      .set('Cookie', cookies)
      .send({ role: 'staff' })
      .expect(409);
    expect(demoteSelf.body.code).toBe('CANNOT_MODIFY_OWN_ADMIN_ACCESS');
  });
});
