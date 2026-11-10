import { AuthorizeParentStudentAccess } from '../AuthorizeParentStudentAccess';

describe('AuthorizeParentStudentAccess', () => {
  it('AC3.6: rejects a caller without an authenticated Parent identity', async () => {
    const access = {
      hasAccess: jest.fn().mockResolvedValue(false),
    };
    const useCase = new AuthorizeParentStudentAccess(access);

    await expect(
      useCase.execute({ parent: null, studentId: 'student-1' }),
    ).rejects.toMatchObject({
      name: 'DomainError',
      code: 'AUTHENTICATION_REQUIRED',
    });

    expect(access.hasAccess).not.toHaveBeenCalled();
  });

  it('AC3.6: rejects an authenticated Parent without access to the Student', async () => {
    const access = {
      hasAccess: jest.fn().mockResolvedValue(false),
    };
    const useCase = new AuthorizeParentStudentAccess(access);
    const parent = { id: 'parent-1' };

    await expect(
      useCase.execute({ parent, studentId: 'student-1' }),
    ).rejects.toMatchObject({
      name: 'DomainError',
      code: 'PARENT_STUDENT_ACCESS_DENIED',
    });

    expect(access.hasAccess).toHaveBeenCalledWith('parent-1', 'student-1');
  });
});
