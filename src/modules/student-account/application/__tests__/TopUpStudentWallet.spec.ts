import { Money } from '../../domain/Money';
import { TopUpPolicy } from '../../domain/TopUpPolicy';
import { TopUpRepository } from '../../domain/TopUpRepository';
import { AuthorizeParentStudentAccess } from '../AuthorizeParentStudentAccess';
import { FindStudentForTopUp } from '../FindStudentForTopUp';
import { PaymentGateway, TopUpIdGenerator } from '../ports';
import { StartTopUpPayment } from '../StartTopUpPayment';
import { TopUpStudentWallet } from '../TopUpStudentWallet';
import { StudentLookup } from '../StudentLookup';
import { ValidateTopUpAmount } from '../ValidateTopUpAmount';

describe('TopUpStudentWallet', () => {
  it('AC3.1: authorizes, validates, requests payment, and returns the credited balance', async () => {
    const calls: string[] = [];
    const parentStudentAccess = {
      hasAccess: jest.fn().mockImplementation(async () => {
        calls.push('authorize');
        return true;
      }),
    };
    const students: StudentLookup = {
      findById: jest.fn().mockImplementation(async (id) => {
        calls.push('find-student');
        return { id };
      }),
    };
    const policyProvider = {
      getTopUpPolicy: jest.fn().mockImplementation(async () => {
        calls.push('read-policy');
        return TopUpPolicy.fromBounds(
          Money.fromDecimal('50.00'),
          Money.fromDecimal('2000.00'),
        );
      }),
    };
    const repository: TopUpRepository = {
      save: jest.fn().mockImplementation(async () => {
        calls.push('save-pending');
      }),
      confirmAndCredit: jest.fn().mockImplementation(async () => {
        calls.push('credit-wallet');
        return Money.fromDecimal('70.00');
      }),
    };
    const gateway: PaymentGateway = {
      requestPayment: jest.fn().mockImplementation(async () => {
        calls.push('request-payment');
        return {
          status: 'succeeded',
          gatewayProvider: 'provider-1',
          gatewayReference: 'gateway-ref-1',
        };
      }),
    };
    const idGenerator: TopUpIdGenerator = {
      next: jest.fn().mockImplementation(() => {
        calls.push('generate-id');
        return 'top-up-1';
      }),
    };
    const useCase = new TopUpStudentWallet(
      new AuthorizeParentStudentAccess(parentStudentAccess),
      new FindStudentForTopUp(students),
      new ValidateTopUpAmount(policyProvider),
      new StartTopUpPayment(repository, gateway),
      idGenerator,
    );

    await expect(
      useCase.execute({
        parent: { id: 'parent-1' },
        studentId: 'student-1',
        amount: '100.00',
      }),
    ).resolves.toEqual({
      topUpId: 'top-up-1',
      studentId: 'student-1',
      amount: '100.00',
      status: 'succeeded',
      walletBalance: '70.00',
    });

    expect(calls).toEqual([
      'authorize',
      'find-student',
      'read-policy',
      'generate-id',
      'save-pending',
      'request-payment',
      'credit-wallet',
    ]);
  });
});
