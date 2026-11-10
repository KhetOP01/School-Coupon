import { Pool } from 'pg';
import { DomainError } from '../../../shared/domain-error';
import { StudentAccountRepository } from '../application/student-account.repository';
import { RfidCard, RfidCardStatus } from '../domain/rfid-card';
import { CardReissue, Student } from '../domain/student';

interface StudentCardRow {
  student_id: number;
  student_code: string;
  first_name: string;
  last_name: string;
  wallet_balance: string;
  card_id: number | null;
  rfid_uid: string | null;
  card_status: RfidCardStatus | null;
  issued_at: Date | null;
}

interface StudentIdRow {
  id: number;
}

export class StudentAccountPostgresRepository implements StudentAccountRepository {
  constructor(private readonly pool: Pool) {}

  async findForCardReissue(studentId: number): Promise<Student | null> {
    const result = await this.pool.query<StudentCardRow>(
      `SELECT
         student.id AS student_id,
         student.student_code,
         student.first_name,
         student.last_name,
         student.wallet_balance::text AS wallet_balance,
         card.id AS card_id,
         card.rfid_uid,
         card.status AS card_status,
         card.issued_at
       FROM students AS student
       LEFT JOIN LATERAL (
         SELECT id, rfid_uid, status, issued_at
         FROM rfid_cards
         WHERE student_id = student.id
           AND status IN ('active', 'lost')
         ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, issued_at DESC, id DESC
         LIMIT 1
       ) AS card ON TRUE
       WHERE student.id = $1`,
      [studentId],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    const currentCard =
      row.card_id === null ||
      row.rfid_uid === null ||
      row.card_status === null ||
      row.issued_at === null
        ? null
        : RfidCard.restore({
            id: row.card_id,
            uid: row.rfid_uid,
            status: row.card_status,
            issuedAt: row.issued_at,
          });

    return Student.restore({
      id: row.student_id,
      studentCode: row.student_code,
      firstName: row.first_name,
      lastName: row.last_name,
      walletBalance: row.wallet_balance,
      currentCard,
    });
  }

  async saveCardReissue(student: Student, reissue: CardReissue): Promise<void> {
    const client = await this.pool.connect();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      const studentResult = await client.query<StudentIdRow>(
        'SELECT id FROM students WHERE id = $1 FOR UPDATE',
        [student.id],
      );
      if (studentResult.rowCount !== 1) {
        throw new DomainError('STUDENT_NOT_FOUND');
      }

      const replacedCard = await client.query(
        `UPDATE rfid_cards
         SET status = 'deactivated', updated_at = $3
         WHERE id = $1
           AND student_id = $2
           AND status IN ('active', 'lost')
         RETURNING id`,
        [reissue.replacedCard.id, student.id, reissue.newCard.issuedAt],
      );
      if (replacedCard.rowCount !== 1) {
        throw new DomainError('ACTIVE_CARD_CONFLICT');
      }

      await client.query(
        `INSERT INTO rfid_cards (id, rfid_uid, student_id, status, issued_at, updated_at)
         VALUES ($1, $2, $3, 'active', $4, $4)`,
        [reissue.newCard.id, reissue.newCard.uid, student.id, reissue.newCard.issuedAt],
      );

      await client.query('COMMIT');
      transactionStarted = false;
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            'The card reissue failed and its database transaction could not be rolled back.',
          );
        }
      }
      throw mapPostgresError(error);
    } finally {
      client.release();
    }
  }
}

function mapPostgresError(error: unknown): unknown {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505' &&
    'constraint' in error
  ) {
    if (error.constraint === 'rfid_cards_rfid_uid_key') {
      return new DomainError('CARD_ALREADY_BOUND');
    }
    if (error.constraint === 'uq_active_card_per_student') {
      return new DomainError('ACTIVE_CARD_CONFLICT');
    }
  }

  return error;
}
