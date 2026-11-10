import { DomainError } from '../../../shared/domain-error';
import { StudentAccountRepository } from './student-account.repository';

export class GetCardReissuePreview {
  constructor(private readonly repository: StudentAccountRepository) {}

  async execute(studentId: number) {
    const student = await this.repository.findForCardReissue(studentId);
    if (student === null) {
      throw new DomainError('STUDENT_NOT_FOUND');
    }

    return student.cardReissuePreview();
  }
}
