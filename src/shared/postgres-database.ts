import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class PostgresDatabase implements OnModuleDestroy {
  readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        'postgres://school_coupon:school_coupon_dev@localhost:5432/school_coupon',
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
