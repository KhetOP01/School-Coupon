import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ApiExceptionFilter } from '../../../../../shared/api-exception.filter';
import { DomainError } from '../../../../../shared/domain-error';
import { FreezeCardUseCase } from '../../../application/freeze-card';
import { RefundDepartingStudentUseCase } from '../../../application/refund-departing-student';
import { UnfreezeCardUseCase } from '../../../application/unfreeze-card';
import { FreezeCardController } from '../freeze-card.controller';
import { RefundStudentController } from '../refund-student.controller';
import { StaffAuthGuard } from '../staff-auth.guard';
import { UnfreezeCardController } from '../unfreeze-card.controller';

describe('Card Freeze and Refund HTTP Controllers', () => {
  let app: INestApplication;
  let freezeCardUseCase: { execute: jest.Mock };
  let unfreezeCardUseCase: { execute: jest.Mock };
  let refundUseCase: { execute: jest.Mock };

  const staffAuthGuard = {
    canActivate: jest.fn((context) => {
      const requestContext = context.switchToHttp().getRequest();
      if (!requestContext.headers.cookie?.includes('school_coupon_admin_session=')) {
        throw new UnauthorizedException({
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.',
        });
      }
      return true;
    }),
  };

  beforeAll(async () => {
    freezeCardUseCase = { execute: jest.fn() };
    unfreezeCardUseCase = { execute: jest.fn() };
    refundUseCase = { execute: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [FreezeCardController, UnfreezeCardController, RefundStudentController],
      providers: [
        { provide: FreezeCardUseCase, useValue: freezeCardUseCase },
        { provide: UnfreezeCardUseCase, useValue: unfreezeCardUseCase },
        { provide: RefundDepartingStudentUseCase, useValue: refundUseCase },
      ],
    })
      .overrideGuard(StaffAuthGuard)
      .useValue(staffAuthGuard)
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
    await app.close();
  });

  beforeEach(() => {
    freezeCardUseCase.execute.mockReset();
    unfreezeCardUseCase.execute.mockReset();
    refundUseCase.execute.mockReset();
    staffAuthGuard.canActivate.mockClear();
  });

  it('AC2.1: staff suspends card via PATCH /admin/cards/:cardId/freeze', async () => {
    freezeCardUseCase.execute.mockResolvedValue({
      cardId: 101,
      studentId: 10,
      rfidUid: 'CARD-101',
      status: 'suspended',
      updatedAt: '2026-11-10T10:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .patch('/admin/cards/101/freeze')
      .set('Cookie', 'school_coupon_admin_session=valid-session')
      .expect(200);

    expect(response.body).toEqual({
      cardId: 101,
      studentId: 10,
      rfidUid: 'CARD-101',
      status: 'suspended',
      updatedAt: '2026-11-10T10:00:00.000Z',
    });
    expect(freezeCardUseCase.execute).toHaveBeenCalledWith({
      cardId: 101,
      targetStatus: 'suspended',
    });
  });

  it('AC2.1: parent reports lost via PATCH /parent/cards/:cardId/freeze', async () => {
    freezeCardUseCase.execute.mockResolvedValue({
      cardId: 101,
      studentId: 10,
      rfidUid: 'CARD-101',
      status: 'lost',
      updatedAt: '2026-11-10T10:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .patch('/parent/cards/101/freeze')
      .expect(200);

    expect(response.body).toEqual({
      cardId: 101,
      studentId: 10,
      rfidUid: 'CARD-101',
      status: 'lost',
      updatedAt: '2026-11-10T10:00:00.000Z',
    });
    expect(freezeCardUseCase.execute).toHaveBeenCalledWith({
      cardId: 101,
      targetStatus: 'lost',
    });
  });

  it('AC2.3: staff unfreezes suspended card via PATCH /admin/cards/:cardId/unfreeze', async () => {
    unfreezeCardUseCase.execute.mockResolvedValue({
      cardId: 102,
      studentId: 20,
      rfidUid: 'CARD-102',
      status: 'active',
      updatedAt: '2026-11-10T11:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .patch('/admin/cards/102/unfreeze')
      .set('Cookie', 'school_coupon_admin_session=valid-session')
      .expect(200);

    expect(response.body).toEqual({
      cardId: 102,
      studentId: 20,
      rfidUid: 'CARD-102',
      status: 'active',
      updatedAt: '2026-11-10T11:00:00.000Z',
    });
    expect(unfreezeCardUseCase.execute).toHaveBeenCalledWith({ cardId: 102 });
  });

  it('AC2.2: staff processes departure refund via POST /admin/students/:studentId/refund', async () => {
    refundUseCase.execute.mockResolvedValue({
      studentId: 30,
      studentCode: 'STU-30',
      refundedAmount: '120.00',
      walletBalance: '0.00',
      cardId: 103,
      cardStatus: 'deactivated',
      departedAt: '2026-11-10T12:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .post('/admin/students/30/refund')
      .set('Cookie', 'school_coupon_admin_session=valid-session')
      .expect(200);

    expect(response.body).toEqual({
      studentId: 30,
      studentCode: 'STU-30',
      refundedAmount: '120.00',
      walletBalance: '0.00',
      cardId: 103,
      cardStatus: 'deactivated',
      departedAt: '2026-11-10T12:00:00.000Z',
    });
    expect(refundUseCase.execute).toHaveBeenCalledWith({
      studentId: 30,
      processedBy: 'staff-admin',
    });
  });

  it('AC2.4: rejects unauthenticated requests to admin endpoints', async () => {
    await request(app.getHttpServer()).patch('/admin/cards/101/freeze').expect(401);
    await request(app.getHttpServer()).patch('/admin/cards/101/unfreeze').expect(401);
    await request(app.getHttpServer()).post('/admin/students/10/refund').expect(401);
  });

  it('AC2.5: returns 404 when card or student is not found', async () => {
    freezeCardUseCase.execute.mockRejectedValue(new DomainError('CARD_NOT_FOUND'));
    unfreezeCardUseCase.execute.mockRejectedValue(new DomainError('CARD_NOT_FOUND'));
    refundUseCase.execute.mockRejectedValue(new DomainError('STUDENT_NOT_FOUND'));

    const resFreeze = await request(app.getHttpServer())
      .patch('/admin/cards/999/freeze')
      .set('Cookie', 'school_coupon_admin_session=valid-session')
      .expect(404);
    expect(resFreeze.body.code).toBe('CARD_NOT_FOUND');

    const resUnfreeze = await request(app.getHttpServer())
      .patch('/admin/cards/999/unfreeze')
      .set('Cookie', 'school_coupon_admin_session=valid-session')
      .expect(404);
    expect(resUnfreeze.body.code).toBe('CARD_NOT_FOUND');

    const resRefund = await request(app.getHttpServer())
      .post('/admin/students/999/refund')
      .set('Cookie', 'school_coupon_admin_session=valid-session')
      .expect(404);
    expect(resRefund.body.code).toBe('STUDENT_NOT_FOUND');
  });

  it('AC2.6: returns 409 when refund already processed or student already departed', async () => {
    refundUseCase.execute.mockRejectedValue(new DomainError('REFUND_ALREADY_PROCESSED'));

    const response = await request(app.getHttpServer())
      .post('/admin/students/30/refund')
      .set('Cookie', 'school_coupon_admin_session=valid-session')
      .expect(409);
    expect(response.body.code).toBe('REFUND_ALREADY_PROCESSED');
  });
});
