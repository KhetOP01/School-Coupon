import { Module } from '@nestjs/common';
import { Clock, SystemClock } from '../../shared/clock';
import { PostgresDatabase } from '../../shared/postgres-database';
import {
  POSTGRES_POOL,
  STAFF_ADMIN_AUTH_CONFIG,
  STAFF_ADMIN_CLOCK,
  STAFF_ADMIN_SESSIONS,
  STAFF_OIDC_CLIENT,
  STAFF_OIDC_FLOWS,
  STAFF_SESSION_AUTHORIZER,
  StaffAdminAuthConfig,
  StaffAdminSessions,
  StaffSessionAuthorizer,
} from './auth.tokens';
import { createHash } from 'node:crypto';
import { OpenIdStaffClient } from './infrastructure/open-id-staff-client';
import { StaffAdminSessionRepository } from './infrastructure/staff-admin-session.repository';
import { StaffOidcFlowRepository } from './infrastructure/staff-oidc-flow.repository';
import { StaffAdminAuthController } from './interface/http/staff-admin-auth.controller';

function requiredSetting(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required Staff OIDC setting: ${name}`);
  }
  return value;
}

@Module({
  controllers: [StaffAdminAuthController],
  providers: [
    PostgresDatabase,
    {
      provide: POSTGRES_POOL,
      useFactory: (database: PostgresDatabase) => database.pool,
      inject: [PostgresDatabase],
    },
    {
      provide: STAFF_ADMIN_AUTH_CONFIG,
      useFactory: (): StaffAdminAuthConfig => {
        const issuer = requiredSetting('STAFF_OIDC_ISSUER');
        return {
          issuer,
          clientId: requiredSetting('STAFF_OIDC_CLIENT_ID'),
          clientSecret: requiredSetting('STAFF_OIDC_CLIENT_SECRET'),
          redirectUri: requiredSetting('STAFF_OIDC_REDIRECT_URI'),
          staffClaimName: requiredSetting('STAFF_CLAIM_NAME'),
          staffClaimValue: requiredSetting('STAFF_CLAIM_VALUE'),
          testOnlyAllowInsecureIssuer:
            process.env.NODE_ENV === 'test' && new URL(issuer).hostname === '127.0.0.1',
        };
      },
    },
    {
      provide: STAFF_ADMIN_CLOCK,
      useFactory: (): Clock => new SystemClock(),
    },
    {
      provide: STAFF_ADMIN_SESSIONS,
      useClass: StaffAdminSessionRepository,
    },
    {
      provide: STAFF_OIDC_CLIENT,
      useClass: OpenIdStaffClient,
    },
    {
      provide: STAFF_OIDC_FLOWS,
      useClass: StaffOidcFlowRepository,
    },
    {
      provide: STAFF_SESSION_AUTHORIZER,
      useFactory: (sessions: StaffAdminSessions): StaffSessionAuthorizer => ({
        async isActiveStaffSession(sessionToken, now) {
          const hash = createHash('sha256').update(sessionToken).digest();
          return (await sessions.findActive(hash, now)) !== null;
        },
      }),
      inject: [STAFF_ADMIN_SESSIONS],
    },
  ],
  exports: [STAFF_SESSION_AUTHORIZER],
})
export class SchoolConfigurationModule {}
