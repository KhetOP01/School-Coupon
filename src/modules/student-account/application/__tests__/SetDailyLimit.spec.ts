import { DomainError } from '../../../../shared/domain-error';
import { Student } from '../../domain/student';
import { AuthorizeParentStudentAccess } from '../AuthorizeParentStudentAccess';
import { StudentAccountRepository } from '../student-account.repository';
import { SetDailyLimit } from '../SetDailyLimit';

describe('SetDailyLimit Use Case', () => {
  const fixedNow = new Date('2026-11-10T14:30:00.000Z');
  const clock = { now: () => fixedNow };

  let authorizeParent: AuthorizeParentStudentAccess;
  let mockRepository: jest.Mocked<StudentAccountRepository>;
  let useCase: SetDailyLimit;

  beforeEach(() => {
    const parentStudentAccess = {
      hasAccess: jest.fn().mockImplementation(async (parentId: string, studentId: string) => {
        if (parentId === 'unauthorized-parent') return false;
        return true;
      }),
    };
    authorizeParent = new AuthorizeParentStudentAccess(parentStudentAccess);

    mockRepository = {
      findForCardReissue: jest.fn(),
      saveCardReissue: jest.fn(),
      findByCardId: jest.fn(),
      findById: jest.fn(),
      saveCardStatus: jest.fn(),
      saveDepartureRefund: jest.fn(),
      saveDailyLimit: jest.fn(),
    };

    useCase = new SetDailyLimit(authorizeParent, mockRepository, clock);
  });

  it('AC4.1: successfully sets next daily limit with effective date next day', async () => {
    const student = Student.restore({
      id: 401,
      studentCode: 'STU-401',
      firstName: 'Anan',
      lastName: 'Suk',
      walletBalance: '100.00',
      currentCard: null,
      currentDailyLimit: '100.00',
      nextDailyLimit: '100.00',
    });
    mockRepository.findById.mockResolvedValue(student);

    const result = await useCase.execute({
      parent: { id: 'parent-1' },
      studentId: 401,
      dailyLimit: '150.00',
    });

    expect(result).toEqual({
      studentId: 401,
      currentDailyLimit: '100.00',
      nextDailyLimit: '150.00',
    });
    expect(student.nextDailyLimit).toBe('150.00');
    expect(student.currentDailyLimit).toBe('100.00');
    expect(mockRepository.saveDailyLimit).toHaveBeenCalledWith(student);
  });

  it('AC4.2: rejects invalid daily limit with INVALID_DAILY_LIMIT', async () => {
    await expect(
      useCase.execute({
        parent: { id: 'parent-1' },
        studentId: 401,
        dailyLimit: '-50.00',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'INVALID_DAILY_LIMIT' }));
  });

  it('AC4.3: rejects when student is not found with STUDENT_NOT_FOUND', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        parent: { id: 'parent-1' },
        studentId: 999,
        dailyLimit: '150.00',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'STUDENT_NOT_FOUND' }));
  });

  it('AC4.4: rejects when parent is unauthenticated with AUTHENTICATION_REQUIRED', async () => {
    await expect(
      useCase.execute({
        parent: null,
        studentId: 401,
        dailyLimit: '150.00',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'AUTHENTICATION_REQUIRED' }));
  });

  it('AC4.4: rejects when parent does not manage student with PARENT_STUDENT_ACCESS_DENIED', async () => {
    await expect(
      useCase.execute({
        parent: { id: 'unauthorized-parent' },
        studentId: 401,
        dailyLimit: '150.00',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'PARENT_STUDENT_ACCESS_DENIED' }));
  });

  it('AC4.5: sets daily limit idempotently when called repeatedly with same value', async () => {
    const student = Student.restore({
      id: 401,
      studentCode: 'STU-401',
      firstName: 'Anan',
      lastName: 'Suk',
      walletBalance: '100.00',
      currentCard: null,
      currentDailyLimit: '100.00',
      nextDailyLimit: '150.00',
    });
    mockRepository.findById.mockResolvedValue(student);

    const result = await useCase.execute({
      parent: { id: 'parent-1' },
      studentId: 401,
      dailyLimit: '150.00',
    });

    expect(result).toEqual({
      studentId: 401,
      currentDailyLimit: '100.00',
      nextDailyLimit: '150.00',
    });
    expect(mockRepository.saveDailyLimit).toHaveBeenCalledWith(student);
  });
});
