import { DomainError } from '../../../../shared/domain-error';
import { GetCardReissuePreview } from '../get-card-reissue-preview';
import { StudentAccountRepository } from '../student-account.repository';
import { RfidCard } from '../../domain/rfid-card';
import { Student } from '../../domain/student';

describe('GetCardReissuePreview', () => {
  it('AC1.1: returns the student, replaceable card, and wallet balance', async () => {
    const student = Student.restore({
      id: 101,
      studentCode: 'STU-101',
      firstName: 'Mali',
      lastName: 'Srisuk',
      walletBalance: '65.00',
      currentCard: RfidCard.restore({
        id: 11,
        uid: 'OLD-UID',
        status: 'active',
        issuedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    });
    const repository: jest.Mocked<StudentAccountRepository> = {
      findForCardReissue: jest.fn().mockResolvedValue(student),
      saveCardReissue: jest.fn(),
      findByCardId: jest.fn(),
      findById: jest.fn(),
      saveCardStatus: jest.fn(),
      saveDepartureRefund: jest.fn(),
    };
    const useCase = new GetCardReissuePreview(repository);

    await expect(useCase.execute(101)).resolves.toEqual({
      studentId: 101,
      studentCode: 'STU-101',
      firstName: 'Mali',
      lastName: 'Srisuk',
      expectedCardId: 11,
      oldRfidUid: 'OLD-UID',
      oldCardStatus: 'active',
      walletBalance: '65.00',
    });
  });

  it('AC1.3: reports when the student does not exist', async () => {
    const repository: jest.Mocked<StudentAccountRepository> = {
      findForCardReissue: jest.fn().mockResolvedValue(null),
      saveCardReissue: jest.fn(),
      findByCardId: jest.fn(),
      findById: jest.fn(),
      saveCardStatus: jest.fn(),
      saveDepartureRefund: jest.fn(),
    };
    const useCase = new GetCardReissuePreview(repository);

    await expect(useCase.execute(999)).rejects.toEqual(
      new DomainError('STUDENT_NOT_FOUND'),
    );
  });
});
