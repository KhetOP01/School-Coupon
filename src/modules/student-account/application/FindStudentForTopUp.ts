import { DomainError } from '../../../shared/domain-error';
import { StudentLookup, StudentReference } from './StudentLookup';

export class FindStudentForTopUp {
  constructor(private readonly students: StudentLookup) {}

  async execute(studentId: string): Promise<StudentReference> {
    const student = await this.students.findById(studentId);
    if (student === null) {
      throw new DomainError('STUDENT_NOT_FOUND');
    }

    return student;
  }
}
