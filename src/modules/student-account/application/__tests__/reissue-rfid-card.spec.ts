import { DomainError } from '../../../../shared/domain-error';
import { ReissueRfidCard } from '../reissue-rfid-card';
import { StudentAccountRepository } from '../student-account.repository';
import { CardIdGenerator, Clock } from '../ports';

describe('ReissueRfidCard', () => {
  it('AC1.3: rejects when the student does not exist', async () => {
    const repository: jest.Mocked<StudentAccountRepository> = {
      findForCardReissue: jest.fn().mockResolvedValue(null),
      saveCardReissue: jest.fn(),
    };
    const cardIdGenerator: CardIdGenerator = { next: jest.fn().mockResolvedValue(2) };
    const clock: Clock = { now: () => new Date('2026-11-04T10:00:00.000Z') };
    const useCase = new ReissueRfidCard(repository, cardIdGenerator, clock);

    await expect(
      useCase.execute({ studentId: 999, expectedCardId: 1, newRfidUid: 'NEW-UID' }),
    ).rejects.toEqual(new DomainError('STUDENT_NOT_FOUND'));
    expect(repository.saveCardReissue).not.toHaveBeenCalled();
  });
});
