import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ApiExceptionFilter } from '../../../../../shared/api-exception.filter';
import { DomainError } from '../../../../../shared/domain-error';
import { ProcessOnlinePayment } from '../../../application/ProcessOnlinePayment';
import { SyncOfflinePayment } from '../../../application/SyncOfflinePayment';
import { VoidPayment } from '../../../application/VoidPayment';
import { MerchantPaymentController } from '../merchant-payment.controller';

describe('MerchantPaymentController', () => {
  let app: INestApplication;
  const mockProcessOnlinePayment = {
    execute: jest.fn(),
  };
  const mockSyncOfflinePayment = {
    execute: jest.fn(),
  };
  const mockVoidPayment = {
    execute: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [MerchantPaymentController],
      providers: [
        {
          provide: ProcessOnlinePayment,
          useValue: mockProcessOnlinePayment,
        },
        {
          provide: SyncOfflinePayment,
          useValue: mockSyncOfflinePayment,
        },
        {
          provide: VoidPayment,
          useValue: mockVoidPayment,
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

  it('AC5.1: processes online payment with 201 Created', async () => {
    const fixedDate = new Date('2026-11-10T10:00:00.000Z');
    mockProcessOnlinePayment.execute.mockResolvedValue({
      paymentId: '550e8400-e29b-41d4-a716-446655440000',
      studentId: 101,
      merchantId: 1,
      amount: '35.00',
      paymentMode: 'ONLINE',
      walletBalance: '65.00',
      createdAt: fixedDate,
    });

    const response = await request(app.getHttpServer())
      .post('/merchant/payments')
      .set('Authorization', 'Bearer merchant-token-1')
      .set('x-merchant-id', '1')
      .send({
        rfidUid: '04A1B2C3D4',
        amount: '35.00',
      })
      .expect(201);

    expect(response.body).toEqual({
      paymentId: '550e8400-e29b-41d4-a716-446655440000',
      studentId: 101,
      merchantId: 1,
      amount: '35.00',
      paymentMode: 'ONLINE',
      walletBalance: '65.00',
      createdAt: fixedDate.toISOString(),
    });
  });

  it('AC5.5: syncs offline payment with 200 OK', async () => {
    const fixedDate = new Date('2026-11-10T09:00:00.000Z');
    mockSyncOfflinePayment.execute.mockResolvedValue({
      paymentId: '550e8400-e29b-41d4-a716-446655440001',
      studentId: 101,
      merchantId: 1,
      amount: '30.00',
      paymentMode: 'OFFLINE',
      walletBalance: '20.00',
      duplicate: false,
      createdAt: fixedDate,
    });

    const response = await request(app.getHttpServer())
      .post('/merchant/payments/sync')
      .set('x-merchant-id', '1')
      .send({
        offlineTrxId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        rfidUid: '04A1B2C3D4',
        amount: '30.00',
        offlineCreatedAt: '2026-11-10T09:00:00.000Z',
      })
      .expect(200);

    expect(response.body).toEqual({
      paymentId: '550e8400-e29b-41d4-a716-446655440001',
      studentId: 101,
      merchantId: 1,
      amount: '30.00',
      paymentMode: 'OFFLINE',
      walletBalance: '20.00',
      duplicate: false,
      createdAt: fixedDate.toISOString(),
    });
  });

  it('AC5.7: rejects invalid payment amount with 400 INVALID_PAYMENT_REQUEST', async () => {
    mockProcessOnlinePayment.execute.mockRejectedValue(
      new DomainError('INVALID_PAYMENT_REQUEST', 'Amount is invalid.'),
    );

    const response = await request(app.getHttpServer())
      .post('/merchant/payments')
      .set('x-merchant-id', '1')
      .send({
        rfidUid: '04A1B2C3D4',
        amount: '-35.00',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'INVALID_PAYMENT_REQUEST',
    });
  });

  it('AC5.8: returns 404 when card is not found', async () => {
    mockProcessOnlinePayment.execute.mockRejectedValue(
      new DomainError('CARD_NOT_FOUND', 'Card not found.'),
    );

    const response = await request(app.getHttpServer())
      .post('/merchant/payments')
      .set('x-merchant-id', '1')
      .send({
        rfidUid: 'UNKNOWN',
        amount: '35.00',
      })
      .expect(404);

    expect(response.body).toMatchObject({
      code: 'CARD_NOT_FOUND',
    });
  });

  it('AC5.11: returns 409 when wallet balance is insufficient', async () => {
    mockProcessOnlinePayment.execute.mockRejectedValue(
      new DomainError('INSUFFICIENT_BALANCE', 'Insufficient balance.'),
    );

    const response = await request(app.getHttpServer())
      .post('/merchant/payments')
      .set('x-merchant-id', '1')
      .send({
        rfidUid: '04A1B2C3D4',
        amount: '350.00',
      })
      .expect(409);

    expect(response.body).toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
    });
  });

  it('AC5.6: returns 409 when daily limit is exceeded', async () => {
    mockProcessOnlinePayment.execute.mockRejectedValue(
      new DomainError('DAILY_LIMIT_EXCEEDED', 'Daily limit exceeded.'),
    );

    const response = await request(app.getHttpServer())
      .post('/merchant/payments')
      .set('x-merchant-id', '1')
      .send({
        rfidUid: '04A1B2C3D4',
        amount: '35.00',
      })
      .expect(409);

    expect(response.body).toMatchObject({
      code: 'DAILY_LIMIT_EXCEEDED',
    });
  });

  it('AC6.1: voids a payment successfully with 200 OK', async () => {
    const fixedDate = new Date('2026-11-10T11:00:00.000Z');
    mockVoidPayment.execute.mockResolvedValue({
      paymentId: '550e8400-e29b-41d4-a716-446655440000',
      studentId: 101,
      merchantId: 1,
      amount: '35.00',
      status: 'VOIDED',
      walletBalance: '100.00',
      voidedAt: fixedDate,
    });

    const response = await request(app.getHttpServer())
      .post('/merchant/payments/550e8400-e29b-41d4-a716-446655440000/void')
      .set('x-merchant-id', '1')
      .send({ reason: 'Customer cancelled' })
      .expect(200);

    expect(response.body).toEqual({
      paymentId: '550e8400-e29b-41d4-a716-446655440000',
      studentId: 101,
      merchantId: 1,
      amount: '35.00',
      status: 'VOIDED',
      walletBalance: '100.00',
      voidedAt: fixedDate.toISOString(),
    });
  });

  it('AC6.2: returns 400 INVALID_VOID_PERIOD for past-day payment', async () => {
    mockVoidPayment.execute.mockRejectedValue(
      new DomainError(
        'INVALID_VOID_PERIOD',
        'Payment can only be voided on the same day before 23:59:59.',
      ),
    );

    const response = await request(app.getHttpServer())
      .post('/merchant/payments/550e8400-e29b-41d4-a716-446655440000/void')
      .set('x-merchant-id', '1')
      .send()
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'INVALID_VOID_PERIOD',
    });
  });

  it('AC6.3: returns 404 PAYMENT_NOT_FOUND when payment does not exist', async () => {
    mockVoidPayment.execute.mockRejectedValue(
      new DomainError('PAYMENT_NOT_FOUND', 'Payment not found.'),
    );

    const response = await request(app.getHttpServer())
      .post('/merchant/payments/550e8400-e29b-41d4-a716-446655440000/void')
      .set('x-merchant-id', '1')
      .send()
      .expect(404);

    expect(response.body).toMatchObject({
      code: 'PAYMENT_NOT_FOUND',
    });
  });

  it('AC6.4: returns 403 MERCHANT_ACCESS_DENIED when merchant does not own payment', async () => {
    mockVoidPayment.execute.mockRejectedValue(
      new DomainError('MERCHANT_ACCESS_DENIED', 'Merchant access is denied.'),
    );

    const response = await request(app.getHttpServer())
      .post('/merchant/payments/550e8400-e29b-41d4-a716-446655440000/void')
      .set('x-merchant-id', '2')
      .send()
      .expect(403);

    expect(response.body).toMatchObject({
      code: 'MERCHANT_ACCESS_DENIED',
    });
  });

  it('AC6.5: returns 409 PAYMENT_ALREADY_VOIDED when already voided', async () => {
    mockVoidPayment.execute.mockRejectedValue(
      new DomainError('PAYMENT_ALREADY_VOIDED', 'Payment has already been voided.'),
    );

    const response = await request(app.getHttpServer())
      .post('/merchant/payments/550e8400-e29b-41d4-a716-446655440000/void')
      .set('x-merchant-id', '1')
      .send()
      .expect(409);

    expect(response.body).toMatchObject({
      code: 'PAYMENT_ALREADY_VOIDED',
    });
  });

  it('AC6.7: returns 400 INVALID_REQUEST when ID is not a valid UUID', async () => {
    const response = await request(app.getHttpServer())
      .post('/merchant/payments/invalid-uuid-format/void')
      .set('x-merchant-id', '1')
      .send()
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'INVALID_REQUEST',
    });
  });
});
