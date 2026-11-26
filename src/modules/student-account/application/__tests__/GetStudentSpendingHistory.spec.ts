import { DomainError } from '../../../../shared/domain-error';
import { AuthorizeParentStudentAccess } from '../AuthorizeParentStudentAccess';
import { GetStudentSpendingHistory } from '../GetStudentSpendingHistory';
import { ParentStudentAccess, StudentSpendingHistoryGateway } from '../ports';

describe('GetStudentSpendingHistory Use Case', () => {
  const fixedNow = new Date('2026-11-26T06:00:00.000Z'); // 2026-11-26 13:00 Asia/Bangkok
  const clock = { now: () => fixedNow };

  let parentAccess: jest.Mocked<ParentStudentAccess>;
  let historyGateway: jest.Mocked<StudentSpendingHistoryGateway>;
  let authorizeParent: AuthorizeParentStudentAccess;
  let useCase: GetStudentSpendingHistory;

  beforeEach(() => {
    parentAccess = {
      hasAccess: jest.fn().mockResolvedValue(true),
    };
    historyGateway = {
      getSpendingHistory: jest.fn(),
    };
    authorizeParent = new AuthorizeParentStudentAccess(parentAccess);
    useCase = new GetStudentSpendingHistory(authorizeParent, historyGateway, clock);
  });

  it('AC12.1: defaults to Bangkok today when period and date are omitted', async () => {
    historyGateway.getSpendingHistory.mockResolvedValue({
      studentId: 1,
      period: 'day',
      targetDate: '2026-11-26',
      summary: { totalSpent: '50.00', completedCount: 1, voidedCount: 0 },
      breakdown: [],
      transactions: [],
    });

    const result = await useCase.execute({
      parent: { id: '1' },
      studentId: 1,
    });

    expect(historyGateway.getSpendingHistory).toHaveBeenCalledWith(1, 'day', '2026-11-26');
    expect(result.targetDate).toBe('2026-11-26');
    expect(result.summary.totalSpent).toBe('50.00');
  });

  it('AC12.2: resolves current month and year in Asia/Bangkok when date is omitted', async () => {
    historyGateway.getSpendingHistory.mockResolvedValue({
      studentId: 1,
      period: 'month',
      targetDate: '2026-11',
      summary: { totalSpent: '250.00', completedCount: 4, voidedCount: 1 },
      breakdown: [],
      transactions: [],
    });

    await useCase.execute({ parent: { id: '1' }, studentId: 1, period: 'month' });
    expect(historyGateway.getSpendingHistory).toHaveBeenCalledWith(1, 'month', '2026-11');

    await useCase.execute({ parent: { id: '1' }, studentId: 1, period: 'year' });
    expect(historyGateway.getSpendingHistory).toHaveBeenCalledWith(1, 'year', '2026');
  });

  it('AC12.3: rejects unauthenticated parent and unauthorized student access', async () => {
    await expect(
      useCase.execute({ parent: null, studentId: 1, period: 'day' }),
    ).rejects.toThrow(new DomainError('AUTHENTICATION_REQUIRED'));

    parentAccess.hasAccess.mockResolvedValueOnce(false);
    await expect(
      useCase.execute({ parent: { id: '99' }, studentId: 1, period: 'day' }),
    ).rejects.toThrow(new DomainError('PARENT_STUDENT_ACCESS_DENIED'));
  });

  it('AC12.4: rejects invalid date format for selected period', async () => {
    await expect(
      useCase.execute({
        parent: { id: '1' },
        studentId: 1,
        period: 'day',
        date: '2026-11',
      }),
    ).rejects.toThrow(DomainError);

    await expect(
      useCase.execute({
        parent: { id: '1' },
        studentId: 1,
        period: 'month',
        date: '2026-13',
      }),
    ).rejects.toThrow(DomainError);

    await expect(
      useCase.execute({
        parent: { id: '1' },
        studentId: 1,
        period: 'year',
        date: '26',
      }),
    ).rejects.toThrow(DomainError);
  });
});
