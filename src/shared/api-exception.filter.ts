import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { DomainError } from './domain-error';
import { HTTP_STATUS_BY_ERROR_CODE } from './http-errors';

interface ApiErrorBody {
  code: string;
  message: string;
}

@Catch(DomainError, HttpException)
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError | HttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    if (exception instanceof DomainError) {
      const status = HTTP_STATUS_BY_ERROR_CODE[exception.code];
      if (status === undefined) {
        throw new Error(`No HTTP status is configured for domain error ${exception.code}.`);
      }

      response.status(status).json({ code: exception.code, message: exception.message });
      return;
    }

    const status = exception.getStatus();
    const body = exception.getResponse();
    const apiError = getApiErrorBody(status, body);
    response.status(status).json(apiError);
  }
}

function getApiErrorBody(status: number, body: string | object): ApiErrorBody {
  if (typeof body === 'object' && body !== null && 'code' in body && 'message' in body) {
    return {
      code: String(body.code),
      message: String(body.message),
    };
  }

  if (status === 400) {
    return { code: 'INVALID_REQUEST', message: 'Request validation failed.' };
  }
  if (status === 401) {
    return { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication is required.' };
  }
  if (status === 403) {
    return { code: 'STAFF_ACCESS_REQUIRED', message: 'Staff access is required.' };
  }

  const message =
    typeof body === 'string'
      ? body
      : 'message' in body && typeof body.message === 'string'
        ? body.message
        : 'The request could not be completed.';
  return { code: 'HTTP_ERROR', message };
}
