import { Settlement } from '../domain/Settlement';

export interface MerchantDailySales {
  readonly merchantId: number;
  readonly feePercent: string;
  readonly grossAmount: string;
}

export interface MerchantSalesGateway {
  getDailySalesByMerchant(date: string): Promise<MerchantDailySales[]>;
}

export interface SettlementRepository {
  findSettlementById(id: number): Promise<Settlement | null>;
  findSettlementByMerchantAndDate(merchantId: number, date: string): Promise<Settlement | null>;
  saveSettlement(settlement: Settlement): Promise<Settlement>;
  saveApprovedSettlement(settlement: Settlement): Promise<Settlement>;
}
