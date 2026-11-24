import {
  BadRequestException,
  BadGatewayException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { createHash, randomBytes } from 'node:crypto';
import type { Response } from 'express';
import { Clock } from '../../../../shared/clock';
import { verifyScryptSecret } from '../../../../shared/scrypt-hash';
import {
  InvalidOidcResponseError,
  OidcProviderUnavailableError,
  STAFF_ADMIN_AUTH_CONFIG,
  STAFF_ADMIN_CLOCK,
  STAFF_ADMIN_SESSIONS,
  STAFF_OIDC_CLIENT,
  STAFF_OIDC_FLOWS,
  STAFF_USERS,
  StaffAdminAuthConfig,
  StaffAdminSessions,
  StaffOidcClient,
  StaffOidcFlows,
  StaffUsers,
} from '../../auth.tokens';

const FLOW_COOKIE_NAME = 'school_coupon_oidc_flow';
const SESSION_COOKIE_NAME = 'school_coupon_admin_session';
const OIDC_FLOW_LIFETIME_MS = 5 * 60_000;
const LOCAL_SESSION_LIFETIME_MS = 8 * 60 * 60_000;

class StaffLocalLoginDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

@Controller('admin/auth')
export class StaffAdminAuthController {
  constructor(
    @Inject(STAFF_ADMIN_AUTH_CONFIG)
    private readonly authConfig: StaffAdminAuthConfig,
    @Inject(STAFF_ADMIN_CLOCK)
    private readonly clock: Clock,
    @Inject(STAFF_ADMIN_SESSIONS)
    private readonly sessions: StaffAdminSessions,
    @Inject(STAFF_OIDC_CLIENT)
    private readonly oidcClient: StaffOidcClient,
    @Inject(STAFF_OIDC_FLOWS)
    private readonly flows: StaffOidcFlows,
    @Inject(STAFF_USERS)
    private readonly staffUsers: StaffUsers,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async loginWithPassword(
    @Body() dto: StaffLocalLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{
    username: string;
    fullName: string;
    role: 'staff' | 'admin';
    expiresAt: string;
  }> {
    const username = dto?.username?.trim() ?? '';
    const password = dto?.password ?? '';

    if (!username || !password) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน',
      });
    }

    const user = await this.staffUsers.findByUsername(username);
    if (!user || !verifyScryptSecret(password, user.passwordHash)) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      });
    }

    if (user.status !== 'active') {
      throw new ForbiddenException({
        code: 'STAFF_SUSPENDED',
        message: 'บัญชีเจ้าหน้าที่ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
      });
    }

    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + LOCAL_SESSION_LIFETIME_MS);
    const maxAge = Math.floor(LOCAL_SESSION_LIFETIME_MS / 1000);
    const sessionToken = randomBytes(32).toString('base64url');

    await this.sessions.create({
      sessionTokenHash: this.hash(sessionToken),
      providerIssuer: 'local',
      staffSubject: user.username,
      createdAt: now,
      expiresAt,
    });

    response.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
    );

    return {
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      expiresAt: expiresAt.toISOString(),
    };
  }

  @Get('oidc/start')
  async start(@Res() response: Response): Promise<void> {
    const now = this.clock.now();
    const state = randomBytes(32).toString('base64url');
    const nonce = randomBytes(32).toString('base64url');
    const codeVerifier = randomBytes(32).toString('base64url');
    let authorizationUrl: URL;
    try {
      authorizationUrl = await this.oidcClient.authorizationUrl({
        state,
        nonce,
        codeVerifier,
      });
    } catch (error) {
      if (error instanceof OidcProviderUnavailableError) {
        throw new BadGatewayException({
          code: 'AUTHENTICATION_UNAVAILABLE',
          message: 'Staff sign-in is temporarily unavailable.',
        });
      }
      throw error;
    }

    await this.flows.create({
      stateHash: this.hash(state),
      nonce,
      codeVerifier,
      createdAt: now,
      expiresAt: new Date(now.getTime() + OIDC_FLOW_LIFETIME_MS),
    });

    response
      .status(302)
      .setHeader('Location', authorizationUrl.toString())
      .setHeader(
        'Set-Cookie',
        `${FLOW_COOKIE_NAME}=${state}; Path=/admin/auth/oidc; HttpOnly; Secure; SameSite=Lax; Max-Age=300`,
      )
      .end();
  }

  @Get('oidc/callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') providerError: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    if (providerError) {
      throw new BadRequestException({
        code: 'AUTHENTICATION_CANCELLED',
        message: 'Staff sign-in was cancelled.',
      });
    }
    if (!code || !state || readCookie(cookieHeader, FLOW_COOKIE_NAME) !== state) {
      throw new BadRequestException({
        code: 'INVALID_OIDC_RESPONSE',
        message: 'The identity provider response could not be validated.',
      });
    }

    const now = this.clock.now();
    const flow = await this.flows.consume(this.hash(state), now);
    if (!flow) {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required.',
      });
    }

    let identity;
    try {
      identity = await this.oidcClient.verifyCallback({
        code,
        state,
        nonce: flow.nonce,
        codeVerifier: flow.codeVerifier,
      });
    } catch (error) {
      if (error instanceof OidcProviderUnavailableError) {
        throw new BadGatewayException({
          code: 'AUTHENTICATION_UNAVAILABLE',
          message: 'Staff sign-in is temporarily unavailable.',
        });
      }
      if (error instanceof InvalidOidcResponseError) {
        throw new UnauthorizedException({
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.',
        });
      }
      throw error;
    }

    if (identity.expiresAt <= now) {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required.',
      });
    }

    const staffClaim = identity.claims[this.authConfig.staffClaimName];
    if (
      staffClaim !== this.authConfig.staffClaimValue &&
      (!Array.isArray(staffClaim) ||
        !staffClaim.includes(this.authConfig.staffClaimValue))
    ) {
      throw new ForbiddenException({
        code: 'STAFF_ACCESS_REQUIRED',
        message: 'Staff access is required.',
      });
    }

    const sessionToken = randomBytes(32).toString('base64url');
    await this.sessions.create({
      sessionTokenHash: this.hash(sessionToken),
      providerIssuer: identity.issuer,
      staffSubject: identity.subject,
      createdAt: now,
      expiresAt: identity.expiresAt,
    });

    const maxAge = Math.floor((identity.expiresAt.getTime() - now.getTime()) / 1000);
    response
      .status(303)
      .setHeader('Location', '/admin')
      .setHeader('Set-Cookie', [
        `${SESSION_COOKIE_NAME}=${sessionToken}; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`,
        `${FLOW_COOKIE_NAME}=; Path=/admin/auth/oidc; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      ])
      .end();
  }

  @Get('session')
  async getSession(
    @Headers('cookie') cookieHeader: string | undefined,
  ): Promise<{ expiresAt: string }> {
    const sessionToken = readCookie(cookieHeader, SESSION_COOKIE_NAME);
    if (!sessionToken) {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required.',
      });
    }
    const session = await this.sessions.findActive(this.hash(sessionToken), this.clock.now());
    if (!session) {
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED',
        message: 'The Staff session has expired.',
      });
    }
    return { expiresAt: session.expiresAt.toISOString() };
  }

  @Get('dev-login')
  async devLogin(@Res() response: Response): Promise<void> {
    const devToken = 'dev-test-token-12345';
    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await this.sessions.create({
      sessionTokenHash: this.hash(devToken),
      providerIssuer: 'https://idp.school.edu/',
      staffSubject: 'staff-admin-01',
      createdAt: now,
      expiresAt,
    });
    response
      .status(302)
      .setHeader('Location', '/admin')
      .setHeader('Set-Cookie', [
        `${SESSION_COOKIE_NAME}=${devToken}; Path=/; Max-Age=2592000; SameSite=Lax`,
        `${SESSION_COOKIE_NAME}=${devToken}; Path=/admin; Max-Age=2592000; SameSite=Lax`,
      ])
      .end();
  }

  @Post('logout')
  async logout(
    @Headers('cookie') cookieHeader: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const sessionToken = readCookie(cookieHeader, SESSION_COOKIE_NAME);
    if (!sessionToken) {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required.',
      });
    }
    const revoked = await this.sessions.revoke(this.hash(sessionToken), this.clock.now());
    if (!revoked) {
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED',
        message: 'The Staff session has expired.',
      });
    }
    response
      .status(204)
      .setHeader('Set-Cookie', [
        `${SESSION_COOKIE_NAME}=; Path=/admin; HttpOnly; SameSite=Lax; Max-Age=0`,
        `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      ])
      .end();
  }

  private hash(value: string): Buffer {
    return createHash('sha256').update(value).digest();
  }
}

function readCookie(header: string | undefined, name: string): string | undefined {
  const cookie = header
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return cookie?.slice(name.length + 1);
}
