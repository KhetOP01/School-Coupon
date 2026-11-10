import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SystemClock } from '../../../../shared/clock';
import {
  STAFF_SESSION_AUTHORIZER,
  StaffSessionAuthorizer,
} from '../../../school-configuration';

interface StaffRequest {
  headers: {
    cookie?: string;
  };
}

@Injectable()
export class StaffAuthGuard implements CanActivate {
  constructor(
    @Inject(STAFF_SESSION_AUTHORIZER)
    private readonly sessions: StaffSessionAuthorizer,
    private readonly clock: SystemClock,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<StaffRequest>();
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

    if (!(await this.sessions.isActiveStaffSession(sessionToken, this.clock.now()))) {
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED',
        message: 'The Staff session has expired.',
      });
    }

    return true;
  }
}

function readCookie(header: string | undefined, name: string): string | undefined {
  const cookie = header
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return cookie?.slice(name.length + 1);
}
