import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ApiExceptionFilter } from '../../../../../shared/api-exception.filter';
import { DomainError } from '../../../../../shared/domain-error';
import { signMobileToken } from '../../../../../shared/mobile-auth';
import { GetStudentSpendingHistory } from '../../../application/GetStudentSpendingHistory';
import { ParentSpendingHistoryController } from '../parent-spending-history.controller';

describe('ParentSpendingHistoryController', () => {
  let app: INestApplication;
  const mockUseCase = {
    execute: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ParentSpendingHistoryController],
      providers: [
        {
          provide: GetStudentSpendingHistory,
          useValue: mockUseCase,
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

  it('AC12.5: returns spending history for authenticated parent with period and date', async () => {
    const token = signMobileToken({ sub: '1', role: 'parent', name: 'Parent One' });
    mockUseCase.execute.mockResolvedValue({
      studentId: 1,
      period: 'month',
      targetDate: '2026-11',
      summary: { totalSpent: '120.00', completedCount: 2, voidedCount: 0 },
      breakdown: [
        { key: '2026-11-26', label: '26 พ.ย.', totalSpent: '120.00', completedCount: 2 },
      ],
      transactions: [],
    });

    const response = await request(app.getHttpServer())
      .get('/parent/students/1/spending-history?period=month&date=2026-11')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(mockUseCase.execute).toHaveBeenCalledWith({
      parent: { id: '1' },
      studentId: 1,
      period: 'month',
      date: '2026-11',
    });
    expect(response.body.summary.totalSpent).toBe('120.00');
  });

  it('AC12.6: returns 400 INVALID_REQUEST on invalid period and 403 on access denied', async () => {
    const token = signMobileToken({ sub: '1', role: 'parent', name: 'Parent One' });

    await request(app.getHttpServer())
      .get('/parent/students/1/spending-history?period=week')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    mockUseCase.execute.mockRejectedValue(new DomainError('PARENT_STUDENT_ACCESS_DENIED'));
    const denied = await request(app.getHttpServer())
      .get('/parent/students/999/spending-history?period=day&date=2026-11-26')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(denied.body.code).toBe('PARENT_STUDENT_ACCESS_DENIED');
  });
});
