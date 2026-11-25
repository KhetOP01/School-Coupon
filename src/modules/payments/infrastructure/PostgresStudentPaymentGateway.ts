import { Pool } from 'pg';
import {
  OfflineCardCacheGateway,
  OfflineCardCacheItem,
  StudentCardPaymentInfo,
  StudentPaymentAccountGateway,
} from '../application/ports';

interface StudentCardRow {
  card_id: number;
  card_status: 'active' | 'suspended' | 'lost' | 'deactivated';
  student_id: number;
  wallet_balance: string;
  current_daily_limit: string;
}

interface OfflineCardCacheRow {
  rfid_uid: string;
  card_status: 'active' | 'suspended' | 'lost' | 'deactivated';
  wallet_balance: string;
  current_daily_limit: string;
}

export class PostgresStudentPaymentGateway
  implements StudentPaymentAccountGateway, OfflineCardCacheGateway
{
  constructor(private readonly pool: Pool) {}

  async findStudentCardByUid(rfidUid: string): Promise<StudentCardPaymentInfo | null> {
    const result = await this.pool.query<StudentCardRow>(
      `SELECT
         card.id AS card_id,
         card.status AS card_status,
         student.id AS student_id,
         student.wallet_balance::text AS wallet_balance,
         student.current_daily_limit::text AS current_daily_limit
       FROM rfid_cards AS card
       INNER JOIN students AS student ON student.id = card.student_id
       WHERE card.rfid_uid = $1`,
      [rfidUid],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      cardId: row.card_id,
      cardStatus: row.card_status,
      studentId: row.student_id,
      walletBalance: row.wallet_balance,
      currentDailyLimit: row.current_daily_limit,
    };
  }

  async listOfflineCardCache(): Promise<OfflineCardCacheItem[]> {
    const result = await this.pool.query<OfflineCardCacheRow>(
      `SELECT
         card.rfid_uid,
         card.status AS card_status,
         student.wallet_balance::text AS wallet_balance,
         student.current_daily_limit::text AS current_daily_limit
       FROM rfid_cards AS card
       INNER JOIN students AS student ON student.id = card.student_id
       ORDER BY card.id ASC`,
    );

    return result.rows.map((row) => ({
      rfidUid: row.rfid_uid,
      cardStatus: row.card_status,
      walletBalance: row.wallet_balance,
      currentDailyLimit: row.current_daily_limit,
    }));
  }
}
