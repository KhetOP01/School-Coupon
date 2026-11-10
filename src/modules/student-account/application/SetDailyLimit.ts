import { DomainError } from '../../../shared/domain-error';
import { DailyLimitAmount } from '../domain/DailyLimitAmount';
import { AuthorizeParentStudentAccess } from './AuthorizeParentStudentAccess';
import { Clock } from './ports';
import { StudentAccountRepository } from './student-account.repository';

export interface SetDailyLimitInput {
  readonly parent: { id: string } | null;
  readonly studentId: number;
  readonly dailyLimit: string;
}

export interface SetDailyLimitResult {
  readonly studentId: number;
  readonly currentDailyLimit: string;
  readonly nextDailyLimit: string;
}

export class SetDailyLimit {
  constructor(
    private readonly authorizeParent: AuthorizeParentStudentAccess,
    private readonly repository: StudentAccountRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: SetDailyLimitInput): Promise<SetDailyLimitResult> {
    const limitAmount = DailyLimitAmount.fromString(input.dailyLimit);

    await this.authorizeParent.execute({
      parent: input.parent,
      studentId: String(input.studentId),
    });

    const student = await this.repository.findById(input.studentId);
    if (!student) {
      throw new DomainError('STUDENT_NOT_FOUND', 'Student not found.');
    }

    const now = this.clock.now();
    student.setDailyLimit(limitAmount, now);
    await this.repository.saveDailyLimit(student);

    return {
      studentId: student.id,
      currentDailyLimit: student.currentDailyLimit,
      nextDailyLimit: student.nextDailyLimit,
    };
  }
}
