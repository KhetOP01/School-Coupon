import { OfflinePaymentRecord } from '../types';

export class OfflineStorageManager {
  private cachedBalances: Map<string, number> = new Map();
  private queue: OfflinePaymentRecord[] = [];

  constructor() {
    // Seed some initial cached balances for testing
    this.cachedBalances.set('E200001906070123456789AB', 150.0);
    this.cachedBalances.set('E20000190607000000000001', 80.0);
  }

  getCachedBalance(rfidUid: string): number | null {
    return this.cachedBalances.get(rfidUid) ?? null;
  }

  updateCachedBalance(rfidUid: string, newBalance: number) {
    this.cachedBalances.set(rfidUid, newBalance);
  }

  getPendingQueue(): OfflinePaymentRecord[] {
    return this.queue.filter((r) => !r.synced);
  }

  getAllQueue(): OfflinePaymentRecord[] {
    return [...this.queue];
  }

  /**
   * BR-PAY-03: ตรวจสอบว่ามีรายการสะสมเกิน 12 ชั่วโมงหรือไม่
   */
  isOfflineLocked(now: Date = new Date()): boolean {
    const pending = this.getPendingQueue();
    if (pending.length === 0) return false;

    const oldestTime = new Date(pending[0].createdAt).getTime();
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    return now.getTime() - oldestTime > twelveHoursMs;
  }

  /**
   * BR-PAY-01: บันทึกรายการชำระเงินแบบ Offline
   */
  processOfflinePayment(params: {
    merchantId: number;
    rfidUid: string;
    amount: number;
    now?: Date;
  }): { record: OfflinePaymentRecord; remainingBalance: number } {
    const now = params.now ?? new Date();

    if (this.isOfflineLocked(now)) {
      throw new Error(
        'แอปสะสมรายการ Offline เกิน 12 ชั่วโมงแล้ว กรุณาเชื่อมต่ออินเทอร์เน็ตเพื่อ Sync ข้อมูลก่อนทำรายการต่อ (BR-PAY-03)',
      );
    }

    if (params.amount > 100.0) {
      throw new Error('ยอดชำระแบบ Offline สูงสุดต้องไม่เกิน 100.00 บาท ต่อรายการ (BR-PAY-01)');
    }

    const currentBal = this.getCachedBalance(params.rfidUid) ?? 0;
    if (currentBal < params.amount) {
      throw new Error(`ยอดเงินในบัตรไม่พอชำระ (ยอดเงินในเครื่อง: ฿${currentBal.toFixed(2)})`);
    }

    const remainingBalance = currentBal - params.amount;
    this.updateCachedBalance(params.rfidUid, remainingBalance);

    const record: OfflinePaymentRecord = {
      offlineTrxId: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      merchantId: params.merchantId,
      rfidUid: params.rfidUid,
      amount: params.amount.toFixed(2),
      createdAt: now.toISOString(),
      synced: false,
    };

    this.queue.push(record);
    return { record, remainingBalance };
  }

  markAsSynced(offlineTrxIds: string[]) {
    const idSet = new Set(offlineTrxIds);
    for (const item of this.queue) {
      if (idSet.has(item.offlineTrxId)) {
        item.synced = true;
      }
    }
  }

  clearQueue() {
    this.queue = [];
  }
}

export const offlineStorage = new OfflineStorageManager();
