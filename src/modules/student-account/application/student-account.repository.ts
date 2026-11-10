import { CardReissue, Student } from '../domain/student';
import { RfidCard } from '../domain/rfid-card';

export interface StudentRefundRecord {
  studentId: number;
  amount: string;
  processedBy: string;
  createdAt: Date;
}

export interface StudentAccountRepository {
  findForCardReissue(studentId: number): Promise<Student | null>;
  saveCardReissue(student: Student, reissue: CardReissue): Promise<void>;
  findByCardId(cardId: number): Promise<Student | null>;
  findById(studentId: number): Promise<Student | null>;
  saveCardStatus(card: RfidCard, updatedAt: Date): Promise<void>;
  saveDepartureRefund(student: Student, refund: StudentRefundRecord | null): Promise<void>;
  saveDailyLimit(student: Student): Promise<void>;
}
