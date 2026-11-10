import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ApiExceptionFilter } from '../../../../../shared/api-exception.filter';
import { DomainError } from '../../../../../shared/domain-error';
import { StaffAuthGuard } from '../../../../student-account/interface/http/staff-auth.guard';
import { ApproveSettlement } from '../../../application/ApproveSettlement';
import { Settlement } from '../../../domain/Settlement';
import { SettlementController } from '../settlement.controller';

describe('SettlementController', () => {
  let app: INestApplication;
  const mockApproveSettlement = {
    execute: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [SettlementController],
      providers: [
        {
          provide: ApproveSettlement,
          useValue: mockApproveSettlement,
        },
      ],
    })
      .overrideGuard(StaffAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

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

  it('AC7.2: approves a settlement with 200 OK', async () => {
    const fixedDate = new Date('2026-11-10T23:59:59.000Z');
    const approveDate = new Date('2026-11-11T09:00:00.000Z');
    const settlement = Settlement.restore({
      id: 1,
      merchantId: 101,
      settlementDate: '2026-11-10',
      grossAmount: '1000.00',
      feeAmount: '20.00',
      netAmount: '980.00',
      status: 'APPROVED',
      approvedBy: 'staff-admin',
      approvedAt: approveDate,
      createdAt: fixedDate,
    });
    mockApproveSettlement.execute.mockResolvedValue(settlement);

    const response = await request(app.getHttpServer())
      .post('/admin/settlements/1/approve')
      .expect(200);

    expect(response.body).toEqual({
      id: 1,
      merchantId: 101,
      settlementDate: '2026-11-10',
      grossAmount: '1000.00',
      feeAmount: '20.00',
      netAmount: '980.00',
      status: 'APPROVED',
      approvedBy: 'staff-admin',
      approvedAt: approveDate.toISOString(),
      createdAt: fixedDate.toISOString(),
    });
  });

  it('AC7.4: returns 404 SETTLEMENT_NOT_FOUND when settlement does not exist', async () => {
    mockApproveSettlement.execute.mockRejectedValue(
      new DomainError('SETTLEMENT_NOT_FOUND', 'Settlement not found.'),
    );

    const response = await request(app.getHttpServer())
      .post('/admin/settlements/999/approve')
      .expect(404);

    expect(response.body).toMatchObject({
      code: 'SETTLEMENT_NOT_FOUND',
    });
  });

  it('AC7.6: returns 409 SETTLEMENT_NOT_PENDING when settlement is not in pending status', async () => {
    mockApproveSettlement.execute.mockRejectedValue(
      new DomainError(
        'SETTLEMENT_NOT_PENDING',
        'Settlement is not in pending approval state.',
      ),
    );

    const response = await request(app.getHttpServer())
      .post('/admin/settlements/1/approve')
      .expect(409);

    expect(response.body).toMatchObject({
      code: 'SETTLEMENT_NOT_PENDING',
    });
  });

  it('AC7.8: returns 400 INVALID_REQUEST when ID is not an integer', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/settlements/invalid-id/approve')
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'INVALID_REQUEST',
    });
  });
});
