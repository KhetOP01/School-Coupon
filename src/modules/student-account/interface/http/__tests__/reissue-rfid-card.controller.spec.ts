import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DomainError } from '../../../../../shared/domain-error';
import { GetCardReissuePreview } from '../../../application/get-card-reissue-preview';
import { ReissueRfidCard } from '../../../application/reissue-rfid-card';
import { ApiExceptionFilter } from '../../../../../shared/api-exception.filter';
import { ReissueRfidCardController } from '../reissue-rfid-card.controller';
import { CardReissuePreviewController } from '../card-reissue-preview.controller';
import { StaffAuthGuard } from '../staff-auth.guard';

describe('Student account HTTP API', () => {
  let app: INestApplication;
  let useCase: { execute: jest.Mock };
  let previewUseCase: { execute: jest.Mock };
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
    useCase = { execute: jest.fn() };
    previewUseCase = { execute: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      controllers: [ReissueRfidCardController, CardReissuePreviewController],
      providers: [
        { provide: ReissueRfidCard, useValue: useCase },
        { provide: GetCardReissuePreview, useValue: previewUseCase },
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
    useCase.execute.mockReset().mockResolvedValue({
      studentId: 101,
      replacedCardId: 11,
      newCardId: 12,
      newRfidUid: 'NEW-UID',
      newCardStatus: 'active',
      walletBalance: '65.00',
    });
    previewUseCase.execute.mockReset().mockResolvedValue({
      studentId: 101,
      studentCode: 'STU-101',
      firstName: 'Mali',
      lastName: 'Srisuk',
      expectedCardId: 11,
      oldRfidUid: 'OLD-UID',
      oldCardStatus: 'active',
      walletBalance: '65.00',
    });
    staffAuthGuard.canActivate.mockClear();
  });

  it('AC1.1: returns the student and replaceable card preview', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/students/101/card-reissue-preview')
      .set('Cookie', 'school_coupon_admin_session=test-session')
      .expect(200);

    expect(response.body.expectedCardId).toBe(11);
    expect(response.body.walletBalance).toBe('65.00');
    expect(previewUseCase.execute).toHaveBeenCalledWith(101);
  });

  it('AC1.1: returns the wallet balance and uses the documented 200 status', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/cards/reissue')
      .set('Cookie', 'school_coupon_admin_session=test-session')
      .send({ studentId: 101, expectedCardId: 11, newRfidUid: 'NEW-UID' });

    expect(response.status).toBe(200);
    expect(response.body.walletBalance).toBe('65.00');
    expect(useCase.execute).toHaveBeenCalledWith({
      studentId: 101,
      expectedCardId: 11,
      newRfidUid: 'NEW-UID',
    });
  });

  it('AC1.4: rejects missing request fields without executing the use case', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/cards/reissue')
      .set('Cookie', 'school_coupon_admin_session=test-session')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'INVALID_REQUEST',
      message: 'Request validation failed.',
    });
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('AC1.5: rejects unauthenticated callers', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/cards/reissue')
      .send({ studentId: 101, expectedCardId: 11, newRfidUid: 'NEW-UID' });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTHENTICATION_REQUIRED');
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('AC1.3: returns 404 when the use case cannot find the student', async () => {
    useCase.execute.mockRejectedValue(new DomainError('STUDENT_NOT_FOUND'));
    const response = await request(app.getHttpServer())
      .post('/admin/cards/reissue')
      .set('Cookie', 'school_coupon_admin_session=test-session')
      .send({ studentId: 999, expectedCardId: 11, newRfidUid: 'NEW-UID' });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('STUDENT_NOT_FOUND');
  });

  it.each(['CARD_ALREADY_BOUND', 'ACTIVE_CARD_CONFLICT'])(
    'AC1.2/AC1.6: maps %s to a conflict response',
    async (code) => {
      useCase.execute.mockRejectedValue(new DomainError(code));
      const response = await request(app.getHttpServer())
        .post('/admin/cards/reissue')
        .set('Cookie', 'school_coupon_admin_session=test-session')
        .send({ studentId: 101, expectedCardId: 11, newRfidUid: 'NEW-UID' });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe(code);
    },
  );
});
