import {
  MerchantLoginResponse,
  OfflinePaymentRecord,
  PaymentResponse,
  VoidResponse,
} from '../types';

export class MerchantApiClient {
  private baseUrl: string;
  private merchantId: string;
  private token: string | null;

  constructor(options?: { baseUrl?: string; merchantId?: string }) {
    this.baseUrl = options?.baseUrl ?? 'http://192.168.1.78';
    this.merchantId = options?.merchantId ?? '1'; // Default test merchant
    this.token = null;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  setMerchantId(id: string) {
    this.merchantId = id;
  }

  setSession(token: string, merchantId: number) {
    this.token = token;
    this.merchantId = String(merchantId);
  }

  logout() {
    this.token = null;
    this.merchantId = '1';
  }

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-merchant-id': this.merchantId,
      Authorization: `Bearer ${this.token ?? this.merchantId}`,
    };
  }

  /**
   * เข้าสู่ระบบร้านค้าด้วยรหัสร้านค้า (เช่น M-001) และรหัส PIN
   */
  async login(merchantCode: string, pin: string): Promise<MerchantLoginResponse> {
    const res = await fetch(`${this.baseUrl}/merchant/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantCode: merchantCode.trim(),
        pin: pin.trim(),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `เข้าสู่ระบบร้านค้าไม่สำเร็จ (${res.status})`);
    }

    const data = (await res.json()) as MerchantLoginResponse;
    this.setSession(data.token, data.merchant.id);
    return data;
  }

  /**
   * UC-05: ชำระเงินแบบ Online
   */
  async processOnlinePayment(params: {
    rfidUid: string;
    amount: string;
  }): Promise<PaymentResponse> {
    const res = await fetch(`${this.baseUrl}/merchant/payments`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        rfidUid: params.rfidUid,
        amount: params.amount,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `Payment failed (${res.status})`);
    }

    return (await res.json()) as PaymentResponse;
  }

  /**
   * UC-05: ซิงก์รายการ Offline ขึ้น Server
   */
  async syncOfflinePayment(record: OfflinePaymentRecord): Promise<PaymentResponse> {
    // Generate valid UUID if needed
    let uuid = record.offlineTrxId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
      uuid = '11111111-2222-3333-4444-555555555555';
    }

    const res = await fetch(`${this.baseUrl}/merchant/payments/sync`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        offlineTrxId: uuid,
        rfidUid: record.rfidUid,
        amount: record.amount,
        offlineCreatedAt: record.createdAt,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `Offline sync failed (${res.status})`);
    }

    return (await res.json()) as PaymentResponse;
  }

  /**
   * UC-06: ยกเลิกรายการชำระเงิน (Void Transaction ภายในวันเดียวกัน)
   */
  async voidPayment(paymentId: string, reason?: string): Promise<VoidResponse> {
    const res = await fetch(`${this.baseUrl}/merchant/payments/${paymentId}/void`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ reason: reason ?? 'Customer requested void' }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `Void payment failed (${res.status})`);
    }

    return (await res.json()) as VoidResponse;
  }
}

export const merchantApi = new MerchantApiClient();
