import {
  DailyLimitResponse,
  FreezeCardResponse,
  StudentProfile,
  TopUpRequest,
  TopUpResponse,
} from '../types';

export class ParentApiClient {
  private baseUrl: string;
  private parentId: string;

  constructor(options?: { baseUrl?: string; parentId?: string }) {
    this.baseUrl = options?.baseUrl ?? 'http://10.0.2.2:3000'; // Default Android emulator host
    this.parentId = options?.parentId ?? 'parent-1';
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  setParentId(id: string) {
    this.parentId = id;
  }

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-parent-id': this.parentId,
      Authorization: `Bearer ${this.parentId}`,
    };
  }

  /**
   * UC-03: เติมเงินเข้า Wallet นักเรียน
   */
  async topUp(req: TopUpRequest): Promise<TopUpResponse> {
    const res = await fetch(`${this.baseUrl}/parent/wallet/topup`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `Top-up failed with status ${res.status}`);
    }

    return (await res.json()) as TopUpResponse;
  }

  /**
   * UC-03: ตรวจสอบสถานะการเติมเงิน
   */
  async getTopUpStatus(topUpId: number): Promise<TopUpResponse> {
    const res = await fetch(`${this.baseUrl}/parent/wallet/topups/${topUpId}`, {
      headers: this.headers,
    });

    if (!res.ok) {
      throw new Error(`Failed to check top-up status (${res.status})`);
    }

    return (await res.json()) as TopUpResponse;
  }

  /**
   * UC-04: กำหนดวงเงินใช้จ่ายรายวัน (มีผลวันถัดไป 00:00 น.)
   */
  async setDailyLimit(studentId: number, dailyLimit: string): Promise<DailyLimitResponse> {
    const res = await fetch(`${this.baseUrl}/parent/students/${studentId}/daily-limit`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({ dailyLimit }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `Setting daily limit failed (${res.status})`);
    }

    return (await res.json()) as DailyLimitResponse;
  }

  /**
   * UC-02: อายัดบัตรเมื่อทำบัตรหาย
   */
  async reportLostCard(cardId: number): Promise<FreezeCardResponse> {
    const res = await fetch(`${this.baseUrl}/parent/cards/${cardId}/freeze`, {
      method: 'PATCH',
      headers: this.headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `Freezing card failed (${res.status})`);
    }

    return (await res.json()) as FreezeCardResponse;
  }
}

export const parentApi = new ParentApiClient();
