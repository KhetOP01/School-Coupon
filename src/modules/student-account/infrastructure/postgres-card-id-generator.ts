import { Pool } from 'pg';
import { CardIdGenerator } from '../application/ports';

interface GeneratedId {
  id: number;
}

export class PostgresCardIdGenerator implements CardIdGenerator {
  constructor(private readonly pool: Pool) {}

  async next(): Promise<number> {
    const result = await this.pool.query<GeneratedId>(
      `SELECT nextval(pg_get_serial_sequence('rfid_cards', 'id'))::integer AS id`,
    );
    const generatedId = result.rows[0]?.id;
    if (generatedId === undefined) {
      throw new Error('PostgreSQL did not return an RFID card identifier.');
    }
    return generatedId;
  }
}
