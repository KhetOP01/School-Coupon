import { INestApplication } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { once } from 'node:events';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ApiExceptionFilter } from '../../src/shared/api-exception.filter';
import {
  InvalidOidcResponseError,
  OidcProviderUnavailableError,
  STAFF_OIDC_CLIENT,
  StaffAdminAuthConfig,
} from '../../src/modules/school-configuration/auth.tokens';
import { OpenIdStaffClient } from '../../src/modules/school-configuration/infrastructure/open-id-staff-client';
import { createEmbeddedPostgresDatabase, EmbeddedPostgresDatabase } from '../helpers/embedded-postgres';

type JoseModule = typeof import('jose');
type OpenIdClientModule = typeof import('openid-client');

function loadJose(): Promise<JoseModule> {
  return eval('import("jose")');
}
function loadOpenIdClient(): Promise<OpenIdClientModule> {
  return eval('import("openid-client")');
}

describe('Staff Admin OIDC Authentication (UC-08)', () => {
  let app: INestApplication;
  let database: EmbeddedPostgresDatabase;
  const oidcClient = {
    authorizationUrl: jest.fn(),
    verifyCallback: jest.fn(),
  };
  const originalEnvironment = new Map<string, string | undefined>();
  const settings: Record<string, string> = {
    STAFF_OIDC_ISSUER: 'http://127.0.0.1:43127',
    STAFF_OIDC_CLIENT_ID: 'school-coupon-admin-test',
    STAFF_OIDC_CLIENT_SECRET: 'local-only-test-client-secret',
    STAFF_OIDC_REDIRECT_URI: 'http://127.0.0.1:3000/admin/auth/oidc/callback',
    STAFF_CLAIM_NAME: 'groups',
    STAFF_CLAIM_VALUE: 'staff',
  };

  // Local OIDC test provider
  let server: Server;
  let localIssuer: string;
  let idToken: string | undefined;
  let expectedCodeChallenge: string | null;
  let receivedCodeVerifier: string | null;
  let receivedRedirectUri: string | null;
  let publicJwk: Record<string, unknown>;
  let privateKey: CryptoKey;

  beforeAll(async () => {
    database = await createEmbeddedPostgresDatabase();
    for (const [name, value] of Object.entries({
      DATABASE_URL: database.databaseUrl,
      ...settings,
    })) {
      originalEnvironment.set(name, process.env[name]);
      process.env[name] = value;
    }

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(STAFF_OIDC_CLIENT)
      .useValue(oidcClient)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();

    // Start local OIDC mock server
    await loadOpenIdClient();
    const jose = await loadJose();
    const keyPair = await jose.generateKeyPair('RS256');
    privateKey = keyPair.privateKey;
    publicJwk = {
      ...(await jose.exportJWK(keyPair.publicKey)),
      kid: 'uc08-local-oidc-key',
      alg: 'RS256',
      use: 'sig',
    };
    expectedCodeChallenge = null;
    receivedCodeVerifier = null;
    receivedRedirectUri = null;

    server = createServer((req, res) => {
      const requestUrl = new URL(req.url ?? '/', localIssuer);
      if (
        req.method === 'GET' &&
        requestUrl.pathname === '/.well-known/openid-configuration'
      ) {
        sendOidcJson(res, {
          issuer: localIssuer,
          authorization_endpoint: `${localIssuer}/authorize`,
          token_endpoint: `${localIssuer}/token`,
          jwks_uri: `${localIssuer}/jwks`,
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
          token_endpoint_auth_methods_supported: ['client_secret_post'],
          grant_types_supported: ['authorization_code'],
        });
        return;
      }

      if (req.method === 'GET' && requestUrl.pathname === '/jwks') {
        sendOidcJson(res, { keys: [publicJwk] });
        return;
      }

      if (req.method === 'POST' && requestUrl.pathname === '/token') {
        void readOidcRequestBody(req).then(async (body) => {
          const parameters = new URLSearchParams(body);
          receivedCodeVerifier = parameters.get('code_verifier');
          receivedRedirectUri = parameters.get('redirect_uri');
          const openid = await loadOpenIdClient();
          const challenge = receivedCodeVerifier
            ? await openid.calculatePKCECodeChallenge(receivedCodeVerifier)
            : null;
          if (
            parameters.get('client_id') !== 'school-coupon-uc08-test' ||
            parameters.get('client_secret') !== 'local-only-test-secret' ||
            parameters.get('code') !== 'uc08-local-code' ||
            challenge !== expectedCodeChallenge ||
            !idToken
          ) {
            sendOidcJson(res, { error: 'invalid_grant' }, 400);
            return;
          }
          sendOidcJson(res, {
            access_token: 'local-only-test-access-token',
            token_type: 'Bearer',
            expires_in: 300,
            id_token: idToken,
          });
        });
        return;
      }

      sendOidcJson(res, { error: 'not_found' }, 404);
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address() as AddressInfo;
    localIssuer = `http://127.0.0.1:${address.port}`;
  }, 120_000);

  afterAll(async () => {
    server?.closeAllConnections();
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
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
    oidcClient.authorizationUrl.mockReset().mockImplementation(
      async ({ state }: { state: string }) =>
        new URL(`https://idp.example/authorize?state=${state}`),
    );
    oidcClient.verifyCallback.mockReset().mockResolvedValue({
      issuer: settings.STAFF_OIDC_ISSUER,
      subject: 'staff-1',
      expiresAt: new Date(Date.now() + 5 * 60_000),
      claims: { groups: ['staff'] },
    });
    await database.pool.query('TRUNCATE staff_admin_oidc_flows, staff_admin_sessions');
  });

  describe('Staff OIDC sign-in flow', () => {
    it('AC8.1: starts Staff OIDC sign-in and sets a short-lived HttpOnly flow cookie', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/auth/oidc/start')
        .expect(302);

      expect(response.headers.location).toMatch(/^https:\/\/.+/);
      expect(response.headers['set-cookie']).toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            /^school_coupon_oidc_flow=[A-Za-z0-9_-]+; Path=\/admin\/auth\/oidc; HttpOnly; Secure; SameSite=Lax; Max-Age=300/,
          ),
        ]),
      );
      const state = response.headers['set-cookie'][0].match(
        /^school_coupon_oidc_flow=([A-Za-z0-9_-]+)/,
      )?.[1];
      expect(state).toBeDefined();
      expect(oidcClient.authorizationUrl).toHaveBeenCalledTimes(1);

      const storedFlows = await database.pool.query<{
        state_hash: Buffer;
        nonce: string;
        code_verifier: string;
        expires_at: Date;
      }>(
        `SELECT state_hash, nonce, code_verifier, expires_at
         FROM staff_admin_oidc_flows`,
      );
      expect(storedFlows.rows).toHaveLength(1);
      expect(storedFlows.rows[0].state_hash).toEqual(
        createHash('sha256').update(state!).digest(),
      );
      expect(storedFlows.rows[0].nonce).toHaveLength(43);
      expect(storedFlows.rows[0].code_verifier).toHaveLength(43);
      expect(storedFlows.rows[0].expires_at.getTime()).toBeGreaterThan(Date.now());
    });

    it('AC8.1: creates a hash-only Staff session from a valid OIDC callback', async () => {
      const startResponse = await request(app.getHttpServer())
        .get('/admin/auth/oidc/start')
        .expect(302);
      const state = startResponse.headers['set-cookie'][0].match(
        /^school_coupon_oidc_flow=([A-Za-z0-9_-]+)/,
      )?.[1];
      expect(state).toBeDefined();

      const callback = await request(app.getHttpServer())
        .get(`/admin/auth/oidc/callback?code=local-code&state=${state}`)
        .set('Cookie', `school_coupon_oidc_flow=${state}`)
        .expect(303);

      expect(callback.headers.location).toBe('/admin');
      const setCookies = callback.headers['set-cookie'];
      const sessionCookie = (Array.isArray(setCookies) ? setCookies : [setCookies]).find(
        (cookie: string) => cookie.startsWith('school_coupon_admin_session='),
      );
      expect(sessionCookie).toMatch(
        /^school_coupon_admin_session=[A-Za-z0-9_-]+; Path=\/admin; HttpOnly; Secure; SameSite=Lax/,
      );
      if (!sessionCookie) {
        throw new Error('Expected the callback to set a Staff session cookie.');
      }
      expect(oidcClient.verifyCallback).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'local-code', state }),
      );
      const sessionToken = sessionCookie.match(
        /^school_coupon_admin_session=([A-Za-z0-9_-]+)/,
      )?.[1];

      const storedSessions = await database.pool.query<{
        session_token_hash: Buffer;
        staff_subject: string;
      }>(
        `SELECT session_token_hash, staff_subject FROM staff_admin_sessions`,
      );
      expect(storedSessions.rows).toEqual([
        {
          session_token_hash: createHash('sha256').update(sessionToken!).digest(),
          staff_subject: 'staff-1',
        },
      ]);

      await request(app.getHttpServer())
        .get('/admin/auth/session')
        .set('Cookie', `school_coupon_admin_session=${sessionToken}`)
        .expect(200)
        .expect(({ body }) => expect(body.expiresAt).toBeDefined());
    });

    it('AC8.2: denies an identity without Staff access and does not create a session', async () => {
      oidcClient.verifyCallback.mockResolvedValue({
        issuer: settings.STAFF_OIDC_ISSUER,
        subject: 'parent-1',
        expiresAt: new Date(Date.now() + 5 * 60_000),
        claims: { groups: ['parents'] },
      });
      const startResponse = await request(app.getHttpServer())
        .get('/admin/auth/oidc/start')
        .expect(302);
      const state = startResponse.headers['set-cookie'][0].match(
        /^school_coupon_oidc_flow=([A-Za-z0-9_-]+)/,
      )?.[1];

      const callback = await request(app.getHttpServer())
        .get(`/admin/auth/oidc/callback?code=local-code&state=${state}`)
        .set('Cookie', `school_coupon_oidc_flow=${state}`)
        .expect(403);

      expect(callback.body.code).toBe('STAFF_ACCESS_REQUIRED');
      expect(callback.headers['set-cookie']).toBeUndefined();
      const storedSessions = await database.pool.query(
        'SELECT session_token_hash FROM staff_admin_sessions',
      );
      expect(storedSessions.rows).toHaveLength(0);
    });

    it('AC8.3: rejects Admin API access without a session', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/auth/session')
        .expect(401);

      expect(response.body.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('AC8.4: rejects malformed callbacks with 400 INVALID_OIDC_RESPONSE', async () => {
      const startResponse = await request(app.getHttpServer())
        .get('/admin/auth/oidc/start')
        .expect(302);
      const state = startResponse.headers['set-cookie'][0].match(
        /^school_coupon_oidc_flow=([A-Za-z0-9_-]+)/,
      )?.[1];

      // Missing code
      const resNoCode = await request(app.getHttpServer())
        .get(`/admin/auth/oidc/callback?state=${state}`)
        .set('Cookie', `school_coupon_oidc_flow=${state}`)
        .expect(400);
      expect(resNoCode.body.code).toBe('INVALID_OIDC_RESPONSE');

      // Missing state
      const resNoState = await request(app.getHttpServer())
        .get(`/admin/auth/oidc/callback?code=local-code`)
        .set('Cookie', `school_coupon_oidc_flow=${state}`)
        .expect(400);
      expect(resNoState.body.code).toBe('INVALID_OIDC_RESPONSE');

      // State mismatch with flow cookie
      const resMismatch = await request(app.getHttpServer())
        .get(`/admin/auth/oidc/callback?code=local-code&state=${state}`)
        .set('Cookie', 'school_coupon_oidc_flow=other-state')
        .expect(400);
      expect(resMismatch.body.code).toBe('INVALID_OIDC_RESPONSE');

      const storedSessions = await database.pool.query('SELECT session_token_hash FROM staff_admin_sessions');
      expect(storedSessions.rows).toHaveLength(0);
    });

    it('AC8.4: rejects reused or expired state with 401 AUTHENTICATION_REQUIRED', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/auth/oidc/callback?code=local-code&state=nonexistent-state')
        .set('Cookie', 'school_coupon_oidc_flow=nonexistent-state')
        .expect(401);

      expect(response.body.code).toBe('AUTHENTICATION_REQUIRED');
      const storedSessions = await database.pool.query('SELECT session_token_hash FROM staff_admin_sessions');
      expect(storedSessions.rows).toHaveLength(0);
    });

    it('AC8.4: rejects callback when ID token verification fails with 401 AUTHENTICATION_REQUIRED', async () => {
      oidcClient.verifyCallback.mockRejectedValue(new InvalidOidcResponseError());

      const startResponse = await request(app.getHttpServer())
        .get('/admin/auth/oidc/start')
        .expect(302);
      const state = startResponse.headers['set-cookie'][0].match(
        /^school_coupon_oidc_flow=([A-Za-z0-9_-]+)/,
      )?.[1];

      const callback = await request(app.getHttpServer())
        .get(`/admin/auth/oidc/callback?code=local-code&state=${state}`)
        .set('Cookie', `school_coupon_oidc_flow=${state}`)
        .expect(401);

      expect(callback.body.code).toBe('AUTHENTICATION_REQUIRED');
      const storedSessions = await database.pool.query('SELECT session_token_hash FROM staff_admin_sessions');
      expect(storedSessions.rows).toHaveLength(0);
    });

    it('AC8.5: handles user cancellation with 400 AUTHENTICATION_CANCELLED', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/auth/oidc/callback?error=access_denied&error_description=User+cancelled')
        .expect(400);

      expect(response.body.code).toBe('AUTHENTICATION_CANCELLED');
      const storedSessions = await database.pool.query('SELECT session_token_hash FROM staff_admin_sessions');
      expect(storedSessions.rows).toHaveLength(0);
    });

    it('AC8.5: returns 502 AUTHENTICATION_UNAVAILABLE when OIDC provider fails during start or callback', async () => {
      // Failure at start
      oidcClient.authorizationUrl.mockRejectedValue(new OidcProviderUnavailableError());
      const startRes = await request(app.getHttpServer())
        .get('/admin/auth/oidc/start')
        .expect(502);
      expect(startRes.body.code).toBe('AUTHENTICATION_UNAVAILABLE');

      // Reset authorizationUrl for callback failure test
      oidcClient.authorizationUrl.mockReset().mockImplementation(
        async ({ state }: { state: string }) =>
          new URL(`https://idp.example/authorize?state=${state}`),
      );
      const startResponse = await request(app.getHttpServer())
        .get('/admin/auth/oidc/start')
        .expect(302);
      const state = startResponse.headers['set-cookie'][0].match(
        /^school_coupon_oidc_flow=([A-Za-z0-9_-]+)/,
      )?.[1];

      // Failure at callback
      oidcClient.verifyCallback.mockRejectedValue(new OidcProviderUnavailableError());
      const callbackRes = await request(app.getHttpServer())
        .get(`/admin/auth/oidc/callback?code=local-code&state=${state}`)
        .set('Cookie', `school_coupon_oidc_flow=${state}`)
        .expect(502);
      expect(callbackRes.body.code).toBe('AUTHENTICATION_UNAVAILABLE');
    });

    it('AC8.6: rejects expired and revoked Staff sessions', async () => {
      const expiredToken = 'uc08-expired-session-token';
      const revokedToken = 'uc08-revoked-session-token';
      await database.pool.query(
        `INSERT INTO staff_admin_sessions
           (session_token_hash, provider_issuer, staff_subject, created_at, expires_at, revoked_at)
         VALUES
           ($1, $2, 'expired-staff', now() - INTERVAL '2 hours', now() - INTERVAL '1 hour', NULL),
           ($3, $2, 'revoked-staff', now() - INTERVAL '2 hours', now() + INTERVAL '1 hour', now())`,
        [
          createHash('sha256').update(expiredToken).digest(),
          settings.STAFF_OIDC_ISSUER,
          createHash('sha256').update(revokedToken).digest(),
        ],
      );

      for (const token of [expiredToken, revokedToken]) {
        const response = await request(app.getHttpServer())
          .get('/admin/auth/session')
          .set('Cookie', `school_coupon_admin_session=${token}`)
          .expect(401);

        expect(response.body.code).toBe('SESSION_EXPIRED');
      }
    });

    it('AC8.7: revokes a Staff session on logout and rejects the old cookie', async () => {
      const token = 'uc08-logout-session-token';
      await database.pool.query(
        `INSERT INTO staff_admin_sessions
           (session_token_hash, provider_issuer, staff_subject, created_at, expires_at)
         VALUES ($1, $2, 'logout-staff', now(), now() + INTERVAL '15 minutes')`,
        [createHash('sha256').update(token).digest(), settings.STAFF_OIDC_ISSUER],
      );

      await request(app.getHttpServer())
        .post('/admin/auth/logout')
        .set('Cookie', `school_coupon_admin_session=${token}`)
        .expect(204)
        .expect('Set-Cookie', /school_coupon_admin_session=; Path=\/admin;.*Max-Age=0/);

      const response = await request(app.getHttpServer())
        .get('/admin/auth/session')
        .set('Cookie', `school_coupon_admin_session=${token}`)
        .expect(401);
      expect(response.body.code).toBe('SESSION_EXPIRED');
    });
  });

  describe('OpenIdStaffClient local provider verification', () => {
    it('AC8.4: verifies issuer, audience, nonce, signature, and PKCE with a local OIDC provider', async () => {
      const config: StaffAdminAuthConfig = {
        issuer: localIssuer,
        clientId: 'school-coupon-uc08-test',
        clientSecret: 'local-only-test-secret',
        redirectUri: `${localIssuer}/admin/auth/oidc/callback`,
        staffClaimName: 'groups',
        staffClaimValue: 'staff',
        testOnlyAllowInsecureIssuer: true,
      };
      const client = new OpenIdStaffClient(config);
      const codeVerifier = 'local-test-code-verifier-long-enough-for-pkce-12345';
      const authorizationUrl = await client.authorizationUrl({
        state: 'uc08-local-state',
        nonce: 'uc08-local-nonce',
        codeVerifier,
      });
      expectedCodeChallenge = authorizationUrl.searchParams.get('code_challenge');
      const jose = await loadJose();
      idToken = await new jose.SignJWT({
        groups: ['staff'],
        nonce: authorizationUrl.searchParams.get('nonce'),
      })
        .setProtectedHeader({ alg: 'RS256', kid: 'uc08-local-oidc-key' })
        .setIssuer(localIssuer)
        .setAudience(config.clientId)
        .setSubject('local-staff-1')
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(privateKey);

      const identity = await client.verifyCallback({
        code: 'uc08-local-code',
        state: authorizationUrl.searchParams.get('state') as string,
        nonce: authorizationUrl.searchParams.get('nonce') as string,
        codeVerifier,
      });

      expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe('S256');
      expect(receivedCodeVerifier).toBe(codeVerifier);
      expect(receivedRedirectUri).toBe(config.redirectUri);
      expect(identity.issuer).toBe(localIssuer);
      expect(identity.subject).toBe('local-staff-1');
      expect(identity.claims.groups).toEqual(['staff']);
    });
  });
});

function sendOidcJson(
  response: import('node:http').ServerResponse,
  value: object,
  statusCode = 200,
): void {
  response.writeHead(statusCode, { 'content-type': 'application/json' });
  response.end(JSON.stringify(value));
}

async function readOidcRequestBody(
  request: import('node:http').IncomingMessage,
): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}
