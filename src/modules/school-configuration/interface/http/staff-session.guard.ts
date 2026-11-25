import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Clock } from '../../../../shared/clock';
import {
  STAFF_ADMIN_CLOCK,
  STAFF_ADMIN_SESSIONS,
  STAFF_USERS,
  StaffAdminSessions,
  StaffUsers,
} from '../../auth.tokens';

@Injectable()
export class StaffSessionGuard implements CanActivate {
  constructor(
    @Inject(STAFF_ADMIN_SESSIONS)
    private readonly sessions: StaffAdminSessions,
    @Inject(STAFF_USERS)
    private readonly staffUsers: StaffUsers,
    @Inject(STAFF_ADMIN_CLOCK)
    private readonly clock: Clock,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: { cookie?: string } }>();
    const sessionToken = readCookie(
      request.headers.cookie,
      'school_coupon_admin_session',
    );
    if (!sessionToken) {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required.',
      });
    }

    const tokenHash = createHash('sha256').update(sessionToken).digest();
    const session = await this.sessions.findActive(tokenHash, this.clock.now());
    if (!session) {
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED',
        message: 'The Staff session has expired.',
      });
    }

    const user = await this.staffUsers.findByUsername(session.staffSubject);
    if (user) {
      if (user.status !== 'active') {
        throw new UnauthorizedException({
          code: 'SESSION_EXPIRED',
          message: 'The Staff session has expired.',
        });
      }
      return true;
    }

    if (session.providerIssuer !== 'local') {
      return true;
    }

    throw new UnauthorizedException({
      code: 'SESSION_EXPIRED',
      message: 'The Staff session has expired.',
    });
  }
}

function readCookie(header: string | undefined, name: string): string | undefined {
  const cookie = header
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return cookie?.slice(name.length + 1);
}
