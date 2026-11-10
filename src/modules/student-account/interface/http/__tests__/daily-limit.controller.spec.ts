import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ApiExceptionFilter } from '../../../../../shared/api-exception.filter';
import { DomainError } from '../../../../../shared/domain-error';
import { SetDailyLimit } from '../../../application/SetDailyLimit';
import { DailyLimitController } from '../daily-limit.controller';

describe('DailyLimitController', () => {
  let app: INestApplication;
  const mockSetDailyLimit = {
    execute: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [DailyLimitController],
      providers: [
        {
          provide: SetDailyLimit,
          useValue: mockSetDailyLimit,
        },
      ],
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
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('AC4.1: updates daily limit with 200 OK and returns current and next limit', async () => {
    mockSetDailyLimit.execute.mockResolvedValue({
      studentId: 101,
      currentDailyLimit: '100.00',
      nextDailyLimit: '150.00',
    });

    const response = await request(app.getHttpServer())
      .patch('/parent/students/101/daily-limit')
      .set('Authorization', 'Bearer parent-token-1')
      .send({ dailyLimit: '150.00' })
      .expect(200);

    expect(response.body).toEqual({
      studentId: 101,
      currentDailyLimit: '100.00',
      nextDailyLimit: '150.00',
    });
    expect(mockSetDailyLimit.execute).toHaveBeenCalledWith({
      parent: { id: 'parent-token-1' },
      studentId: 101,
      dailyLimit: '150.00',
    });
  });

  it('AC4.2: returns 400 INVALID_DAILY_LIMIT when dailyLimit format is invalid', async () => {
    const response = await request(app.getHttpServer())
      .patch('/parent/students/101/daily-limit')
      .set('Authorization', 'Bearer parent-token-1')
      .send({ dailyLimit: '-10.00' })
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'INVALID_DAILY_LIMIT',
    });
  });

  it('AC4.3: returns 404 STUDENT_NOT_FOUND when student does not exist', async () => {
    mockSetDailyLimit.execute.mockRejectedValue(
      new DomainError('STUDENT_NOT_FOUND', 'Student not found.'),
    );

    const response = await request(app.getHttpServer())
      .patch('/parent/students/999/daily-limit')
      .set('Authorization', 'Bearer parent-token-1')
      .send({ dailyLimit: '150.00' })
      .expect(404);

    expect(response.body).toEqual({
      code: 'STUDENT_NOT_FOUND',
      message: 'Student not found.',
    });
  });

  it('AC4.4: returns 401 when parent identity is missing', async () => {
    mockSetDailyLimit.execute.mockRejectedValue(
      new DomainError('AUTHENTICATION_REQUIRED', 'Authentication is required.'),
    );

    const response = await request(app.getHttpServer())
      .patch('/parent/students/101/daily-limit')
      .send({ dailyLimit: '150.00' })
      .expect(401);

    expect(response.body).toEqual({
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication is required.',
    });
  });

  it('AC4.4: returns 403 when parent has no access to student', async () => {
    mockSetDailyLimit.execute.mockRejectedValue(
      new DomainError('PARENT_STUDENT_ACCESS_DENIED', 'Parent student access denied.'),
    );

    const response = await request(app.getHttpServer())
      .patch('/parent/students/101/daily-limit')
      .set('Authorization', 'Bearer unauthorized-parent')
      .send({ dailyLimit: '150.00' })
      .expect(403);

    expect(response.body).toEqual({
      code: 'PARENT_STUDENT_ACCESS_DENIED',
      message: 'Parent student access denied.',
    });
  });

  it('AC4.5: returns 200 OK idempotently on repeated same-value request', async () => {
    mockSetDailyLimit.execute.mockResolvedValue({
      studentId: 101,
      currentDailyLimit: '100.00',
      nextDailyLimit: '150.00',
    });

    const response = await request(app.getHttpServer())
      .patch('/parent/students/101/daily-limit')
      .set('x-parent-id', 'parent-123')
      .send({ dailyLimit: '150.00' })
      .expect(200);

    expect(response.body).toEqual({
      studentId: 101,
      currentDailyLimit: '100.00',
      nextDailyLimit: '150.00',
    });
    expect(mockSetDailyLimit.execute).toHaveBeenCalledWith({
      parent: { id: 'parent-123' },
      studentId: 101,
      dailyLimit: '150.00',
    });
  });
});
