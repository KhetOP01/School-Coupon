import { Pool } from 'pg';

export const POSTGRES_POOL = 'POSTGRES_POOL';
export const STAFF_ADMIN_AUTH_CONFIG = 'STAFF_ADMIN_AUTH_CONFIG';
export const STAFF_ADMIN_CLOCK = 'STAFF_ADMIN_CLOCK';
export const STAFF_ADMIN_SESSIONS = 'STAFF_ADMIN_SESSIONS';
export const STAFF_OIDC_CLIENT = 'STAFF_OIDC_CLIENT';
export const STAFF_OIDC_FLOWS = 'STAFF_OIDC_FLOWS';
export const STAFF_SESSION_AUTHORIZER = 'STAFF_SESSION_AUTHORIZER';

export interface StaffAdminAuthConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  staffClaimName: string;
  staffClaimValue: string;
  testOnlyAllowInsecureIssuer: boolean;
}

export interface StaffAdminClock {
  now(): Date;
}

export interface StaffAdminSession {
  sessionTokenHash: Buffer;
  providerIssuer: string;
  staffSubject: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface StaffAdminSessions {
  create(session: StaffAdminSession): Promise<void>;
  findActive(sessionTokenHash: Buffer, now: Date): Promise<StaffAdminSession | null>;
  revoke(sessionTokenHash: Buffer, now: Date): Promise<boolean>;
}

export interface StaffOidcFlow {
  stateHash: Buffer;
  nonce: string;
  codeVerifier: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface StaffOidcFlows {
  create(flow: StaffOidcFlow): Promise<void>;
  consume(
    stateHash: Buffer,
    now: Date,
  ): Promise<Pick<StaffOidcFlow, 'nonce' | 'codeVerifier'> | null>;
}

export interface StaffOidcCallbackInput {
  code: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}

export interface VerifiedStaffIdentity {
  issuer: string;
  subject: string;
  expiresAt: Date;
  claims: Record<string, unknown>;
}

export interface StaffOidcClient {
  authorizationUrl(input: {
    state: string;
    nonce: string;
    codeVerifier: string;
  }): Promise<URL>;
  verifyCallback(input: StaffOidcCallbackInput): Promise<VerifiedStaffIdentity>;
}

export interface StaffSessionAuthorizer {
  isActiveStaffSession(sessionToken: string, now: Date): Promise<boolean>;
}

export type StaffAdminPool = Pool;

export class OidcProviderUnavailableError extends Error {
  constructor() {
    super('The configured identity provider is unavailable.');
    this.name = 'OidcProviderUnavailableError';
  }
}

export class InvalidOidcResponseError extends Error {
  constructor() {
    super('The identity provider response could not be validated.');
    this.name = 'InvalidOidcResponseError';
  }
}
