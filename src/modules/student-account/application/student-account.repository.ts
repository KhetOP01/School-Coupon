import { CardReissue, Student } from '../domain/student';

export interface StudentAccountRepository {
  findForCardReissue(studentId: number): Promise<Student | null>;
  saveCardReissue(student: Student, reissue: CardReissue): Promise<void>;
}
