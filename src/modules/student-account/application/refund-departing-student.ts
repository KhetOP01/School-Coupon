import { DomainError } from '../../../shared/domain-error';
import { Clock } from '../../../shared/clock';
import { StudentAccountRepository, StudentRefundRecord } from './student-account.repository';

export interface RefundDepartingStudentCommand {
  studentId: number;
  processedBy: string;
}

export interface RefundDepartingStudentResult {
  studentId: number;
  studentCode: string;
  refundedAmount: string;
  walletBalance: string;
  cardId: number | null;
  cardStatus: string | null;
  departedAt: string;
}

export class RefundDepartingStudentUseCase {
  constructor(
    private readonly repository: StudentAccountRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: RefundDepartingStudentCommand): Promise<RefundDepartingStudentResult> {
    const student = await this.repository.findById(command.studentId);
    if (student === null) {
      throw new DomainError('STUDENT_NOT_FOUND');
    }

    const now = this.clock.now();
    const { refundedAmount, card } = student.refundDeparture(now);

    const refundRecord: StudentRefundRecord | null =
      parseFloat(refundedAmount) > 0
        ? {
            studentId: student.id,
            amount: refundedAmount,
            processedBy: command.processedBy,
            createdAt: now,
          }
        : null;

    await this.repository.saveDepartureRefund(student, refundRecord);

    return {
      studentId: student.id,
      studentCode: student.studentCode,
      refundedAmount,
      walletBalance: student.walletBalance,
      cardId: card?.id ?? null,
      cardStatus: card?.status ?? null,
      departedAt: now.toISOString(),
    };
  }
}
