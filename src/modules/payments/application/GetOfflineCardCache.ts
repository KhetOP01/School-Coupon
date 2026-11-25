import { DomainError } from '../../../shared/domain-error';
import { MerchantGateway, OfflineCardCacheGateway, OfflineCardCacheItem } from './ports';

export interface GetOfflineCardCacheResult {
  readonly syncedAt: Date;
  readonly cards: OfflineCardCacheItem[];
}

export class GetOfflineCardCache {
  constructor(
    private readonly merchantGateway: MerchantGateway,
    private readonly cardCacheGateway: OfflineCardCacheGateway,
    private readonly clock: { now(): Date },
  ) {}

  async execute(merchantInput: { id: number } | null): Promise<GetOfflineCardCacheResult> {
    if (!merchantInput) {
      throw new DomainError('AUTHENTICATION_REQUIRED', 'Merchant authentication is required.');
    }

    const merchant = await this.merchantGateway.findMerchantById(merchantInput.id);
    if (!merchant || merchant.status !== 'active') {
      throw new DomainError('MERCHANT_ACCESS_DENIED', 'Merchant access is denied.');
    }

    const cards = await this.cardCacheGateway.listOfflineCardCache();
    return {
      syncedAt: this.clock.now(),
      cards,
    };
  }
}
