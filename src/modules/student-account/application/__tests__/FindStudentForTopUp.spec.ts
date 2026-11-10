import { FindStudentForTopUp } from '../FindStudentForTopUp';

describe('FindStudentForTopUp', () => {
  it('AC3.5: rejects a missing Student before any create or save calls', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(null),
      createTopUp: jest.fn(),
      saveWallet: jest.fn(),
    };
    const useCase = new FindStudentForTopUp(repository);

    await expect(useCase.execute('student-404')).rejects.toMatchObject({
      name: 'DomainError',
      code: 'STUDENT_NOT_FOUND',
    });

    expect(repository.findById).toHaveBeenCalledWith('student-404');
    expect(repository.createTopUp).not.toHaveBeenCalled();
    expect(repository.saveWallet).not.toHaveBeenCalled();
  });
});
