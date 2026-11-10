import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ApiExceptionFilter } from '../../../../../shared/api-exception.filter';
import { DomainError } from '../../../../../shared/domain-error';
import { TopUpStudentWallet } from '../../../application/TopUpStudentWallet';
import { PostgresTopUpRepository } from '../../../infrastructure/PostgresTopUpRepository';
import { TopUpWalletController } from '../top-up-wallet.controller';

describe('TopUpWalletController', () => {
  let app: INestApplication;
  let topUpStudentWallet: { execute: jest.Mock };
  let repository: { findById: jest.Mock; confirmAndCredit: jest.Mock };

  beforeAll(async () => {
    topUpStudentWallet = { execute: jest.fn() };
    repository = { findById: jest.fn(), confirmAndCredit: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [TopUpWalletController],
      providers: [
        { provide: TopUpStudentWallet, useValue: topUpStudentWallet },
        { provide: PostgresTopUpRepository, useValue: repository },
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
    await app.close();
  });

  beforeEach(() => {
    topUpStudentWallet.execute.mockReset();
    repository.findById.mockReset();
    repository.confirmAndCredit.mockReset();
  });

  it('AC3.1: successfully initiates top-up and credits wallet', async () => {
    topUpStudentWallet.execute.mockResolvedValue({
      topUpId: '1001',
      studentId: '10',
      amount: '100.00',
      status: 'succeeded',
      walletBalance: '150.00',
    });

    const response = await request(app.getHttpServer())
      .post('/parent/wallet/topup')
      .set('Authorization', 'Bearer valid-parent-token')
      .send({ studentId: 10, amount: '100.00' })
      .expect(200);

    expect(response.body).toEqual({
      topUpId: 1001,
      studentId: 10,
      amount: '100.00',
      walletBalance: '150.00',
      status: 'succeeded',
    });
    expect(topUpStudentWallet.execute).toHaveBeenCalledWith({
      parent: { id: 'valid-parent-token' },
      studentId: '10',
      amount: '100.00',
    });
  });

  it('AC3.7: responds with 202 ACCEPTED when top-up status is pending', async () => {
    topUpStudentWallet.execute.mockResolvedValue({
      topUpId: '1002',
      studentId: '10',
      amount: '100.00',
      status: 'pending',
    });

    const response = await request(app.getHttpServer())
      .post('/parent/wallet/topup')
      .set('Authorization', 'Bearer valid-parent-token')
      .send({ studentId: 10, amount: '100.00' })
      .expect(202);

    expect(response.body).toEqual({
      topUpId: 1002,
      studentId: 10,
      amount: '100.00',
      status: 'pending',
    });
  });

  it('AC3.2/AC3.4: returns 400 INVALID_TOPUP_AMOUNT when policy rejects amount', async () => {
    topUpStudentWallet.execute.mockRejectedValue(
      new DomainError(
        'INVALID_TOPUP_AMOUNT',
        'ยอดเติมเงินต้องไม่น้อยกว่า 50.00 บาทและไม่เกิน 2000.00 บาท',
      ),
    );

    const response = await request(app.getHttpServer())
      .post('/parent/wallet/topup')
      .set('Authorization', 'Bearer valid-parent-token')
      .send({ studentId: 10, amount: '30.00' })
      .expect(400);

    expect(response.body.code).toBe('INVALID_TOPUP_AMOUNT');
  });

  it('AC3.6: returns 401 when parent identity is missing', async () => {
    topUpStudentWallet.execute.mockRejectedValue(
      new DomainError('AUTHENTICATION_REQUIRED'),
    );

    const response = await request(app.getHttpServer())
      .post('/parent/wallet/topup')
      .send({ studentId: 10, amount: '100.00' })
      .expect(401);

    expect(response.body.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('AC3.6: returns 403 when parent has no access to student', async () => {
    topUpStudentWallet.execute.mockRejectedValue(
      new DomainError('PARENT_STUDENT_ACCESS_DENIED'),
    );

    const response = await request(app.getHttpServer())
      .post('/parent/wallet/topup')
      .set('x-parent-id', 'unauthorized-parent')
      .send({ studentId: 10, amount: '100.00' })
      .expect(403);

    expect(response.body.code).toBe('PARENT_STUDENT_ACCESS_DENIED');
  });

  it('AC3.5: returns 404 when student does not exist', async () => {
    topUpStudentWallet.execute.mockRejectedValue(
      new DomainError('STUDENT_NOT_FOUND'),
    );

    const response = await request(app.getHttpServer())
      .post('/parent/wallet/topup')
      .set('Authorization', 'Bearer valid-token')
      .send({ studentId: 9999, amount: '100.00' })
      .expect(404);

    expect(response.body.code).toBe('STUDENT_NOT_FOUND');
  });

  it('AC3.7: returns 502 when payment gateway fails', async () => {
    topUpStudentWallet.execute.mockRejectedValue(
      new DomainError('PAYMENT_GATEWAY_FAILED'),
    );

    const response = await request(app.getHttpServer())
      .post('/parent/wallet/topup')
      .set('Authorization', 'Bearer valid-token')
      .send({ studentId: 10, amount: '100.00' })
      .expect(502);

    expect(response.body.code).toBe('PAYMENT_GATEWAY_FAILED');
  });

  it('AC3.7: retrieves topup status via GET /parent/wallet/topups/:topUpId', async () => {
    repository.findById.mockResolvedValue({
      topUpId: 1001,
      studentId: 10,
      amount: '100.00',
      status: 'succeeded',
      walletBalance: '150.00',
    });

    const response = await request(app.getHttpServer())
      .get('/parent/wallet/topups/1001')
      .expect(200);

    expect(response.body).toEqual({
      topUpId: 1001,
      studentId: 10,
      amount: '100.00',
      status: 'succeeded',
      walletBalance: '150.00',
    });
  });

  it('AC3.7: returns 404 when topup record is not found', async () => {
    repository.findById.mockResolvedValue(null);

    const response = await request(app.getHttpServer())
      .get('/parent/wallet/topups/99999')
      .expect(404);

    expect(response.body.code).toBe('TOPUP_NOT_FOUND');
  });

  it('AC3.8: handles gateway callback replay with duplicate flag', async () => {
    repository.confirmAndCredit.mockRejectedValue(
      new DomainError('INVALID_GATEWAY_EVENT'),
    );

    const response = await request(app.getHttpServer())
      .post('/callbacks/payment-gateway/topup')
      .send({
        gatewayReference: 'gateway-ref-repeat',
        status: 'succeeded',
        amount: '100.00',
      })
      .expect(200);

    expect(response.body).toEqual({ accepted: true, duplicate: true });
  });
});
