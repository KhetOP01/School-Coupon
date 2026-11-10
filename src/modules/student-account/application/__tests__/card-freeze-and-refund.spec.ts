import { RfidCard } from '../../domain/rfid-card';
import { Student } from '../../domain/student';
import { FreezeCardUseCase } from '../freeze-card';
import { UnfreezeCardUseCase } from '../unfreeze-card';
import { RefundDepartingStudentUseCase } from '../refund-departing-student';
import { StudentAccountRepository, StudentRefundRecord } from '../student-account.repository';

class InMemoryStudentAccountRepository implements StudentAccountRepository {
  private students = new Map<number, Student>();
  private cardToStudent = new Map<number, number>();
  public savedRefunds: StudentRefundRecord[] = [];
  public updatedCardStatuses: { cardId: number; status: string; updatedAt: Date }[] = [];

  addStudent(student: Student): void {
    this.students.set(student.id, student);
    if (student.currentCard) {
      this.cardToStudent.set(student.currentCard.id, student.id);
    }
  }

  async findForCardReissue(studentId: number): Promise<Student | null> {
    return this.students.get(studentId) ?? null;
  }

  async saveCardReissue(): Promise<void> {}

  async findByCardId(cardId: number): Promise<Student | null> {
    const studentId = this.cardToStudent.get(cardId);
    if (!studentId) return null;
    return this.students.get(studentId) ?? null;
  }

  async findById(studentId: number): Promise<Student | null> {
    return this.students.get(studentId) ?? null;
  }

  async saveCardStatus(card: RfidCard, updatedAt: Date): Promise<void> {
    this.updatedCardStatuses.push({ cardId: card.id, status: card.status, updatedAt });
  }

  async saveDepartureRefund(student: Student, refund: StudentRefundRecord | null): Promise<void> {
    if (refund) {
      this.savedRefunds.push(refund);
    }
  }

  async saveDailyLimit(): Promise<void> {}
}

describe('UC-02 Application Use Cases: Card Freeze & Refund', () => {
  const fixedNow = new Date('2026-11-10T12:00:00.000Z');
  const clock = { now: () => fixedNow };
  let repository: InMemoryStudentAccountRepository;

  beforeEach(() => {
    repository = new InMemoryStudentAccountRepository();
  });

  it('AC2.1a: freezes card as lost when parent reports it', async () => {
    const student = Student.restore({
      id: 201,
      studentCode: 'STU-201',
      firstName: 'Kanya',
      lastName: 'Srisuk',
      walletBalance: '50.00',
      currentCard: RfidCard.restore({
        id: 10,
        uid: 'CARD-10',
        status: 'active',
        issuedAt: new Date('2026-01-01T00:00:00Z'),
      }),
    });
    repository.addStudent(student);

    const useCase = new FreezeCardUseCase(repository, clock);
    const result = await useCase.execute({ cardId: 10, targetStatus: 'lost' });

    expect(result).toEqual({
      cardId: 10,
      studentId: 201,
      rfidUid: 'CARD-10',
      status: 'lost',
      updatedAt: fixedNow.toISOString(),
    });
    expect(repository.updatedCardStatuses).toHaveLength(1);
  });

  it('AC2.1b: suspends card on staff admin freeze request', async () => {
    const student = Student.restore({
      id: 202,
      studentCode: 'STU-202',
      firstName: 'Chai',
      lastName: 'Srisuk',
      walletBalance: '40.00',
      currentCard: RfidCard.restore({
        id: 20,
        uid: 'CARD-20',
        status: 'active',
        issuedAt: new Date('2026-01-01T00:00:00Z'),
      }),
    });
    repository.addStudent(student);

    const useCase = new FreezeCardUseCase(repository, clock);
    const result = await useCase.execute({ cardId: 20, targetStatus: 'suspended' });

    expect(result.status).toBe('suspended');
    expect(repository.updatedCardStatuses[0].status).toBe('suspended');
  });

  it('AC2.3: unfreezes a suspended card back to active', async () => {
    const student = Student.restore({
      id: 203,
      studentCode: 'STU-203',
      firstName: 'Wichai',
      lastName: 'Srisuk',
      walletBalance: '30.00',
      currentCard: RfidCard.restore({
        id: 30,
        uid: 'CARD-30',
        status: 'suspended',
        issuedAt: new Date('2026-01-01T00:00:00Z'),
      }),
    });
    repository.addStudent(student);

    const useCase = new UnfreezeCardUseCase(repository, clock);
    const result = await useCase.execute({ cardId: 30 });

    expect(result.status).toBe('active');
    expect(repository.updatedCardStatuses[0].status).toBe('active');
  });

  it('AC2.2: processes departure refund with positive balance', async () => {
    const student = Student.restore({
      id: 204,
      studentCode: 'STU-204',
      firstName: 'Somchai',
      lastName: 'Srisuk',
      walletBalance: '250.00',
      currentCard: RfidCard.restore({
        id: 40,
        uid: 'CARD-40',
        status: 'active',
        issuedAt: new Date('2026-01-01T00:00:00Z'),
      }),
    });
    repository.addStudent(student);

    const useCase = new RefundDepartingStudentUseCase(repository, clock);
    const result = await useCase.execute({ studentId: 204, processedBy: 'staff-admin-1' });

    expect(result).toEqual({
      studentId: 204,
      studentCode: 'STU-204',
      refundedAmount: '250.00',
      walletBalance: '0.00',
      cardId: 40,
      cardStatus: 'deactivated',
      departedAt: fixedNow.toISOString(),
    });
    expect(repository.savedRefunds).toEqual([
      {
        studentId: 204,
        amount: '250.00',
        processedBy: 'staff-admin-1',
        createdAt: fixedNow,
      },
    ]);
  });

  it('AC2.7: processes departure refund with 0.00 balance without refund record', async () => {
    const student = Student.restore({
      id: 205,
      studentCode: 'STU-205',
      firstName: 'Sunan',
      lastName: 'Srisuk',
      walletBalance: '0.00',
      currentCard: RfidCard.restore({
        id: 50,
        uid: 'CARD-50',
        status: 'active',
        issuedAt: new Date('2026-01-01T00:00:00Z'),
      }),
    });
    repository.addStudent(student);

    const useCase = new RefundDepartingStudentUseCase(repository, clock);
    const result = await useCase.execute({ studentId: 205, processedBy: 'staff-admin-1' });

    expect(result.refundedAmount).toBe('0.00');
    expect(result.cardStatus).toBe('deactivated');
    expect(repository.savedRefunds).toHaveLength(0);
  });

  it('AC2.5: throws CARD_NOT_FOUND when card is missing', async () => {
    const useCase = new FreezeCardUseCase(repository, clock);
    await expect(useCase.execute({ cardId: 999, targetStatus: 'suspended' })).rejects.toThrow(
      'CARD_NOT_FOUND',
    );
  });

  it('AC2.5: throws STUDENT_NOT_FOUND when student is missing', async () => {
    const useCase = new RefundDepartingStudentUseCase(repository, clock);
    await expect(useCase.execute({ studentId: 999, processedBy: 'staff-admin-1' })).rejects.toThrow(
      'STUDENT_NOT_FOUND',
    );
  });
});
