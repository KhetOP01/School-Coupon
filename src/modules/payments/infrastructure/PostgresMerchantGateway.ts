import { Pool } from 'pg';
import { MerchantGateway, MerchantInfo } from '../application/ports';

interface MerchantRow {
  id: number;
  merchant_code: string;
  status: 'active' | 'suspended' | 'inactive';
}

export class PostgresMerchantGateway implements MerchantGateway {
  constructor(private readonly pool: Pool) {}

  async findMerchantById(id: number): Promise<MerchantInfo | null> {
    const result = await this.pool.query<MerchantRow>(
      `SELECT id, merchant_code, status
       FROM merchants
       WHERE id = $1`,
      [id],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      merchantCode: row.merchant_code,
      status: row.status,
    };
  }
}
