import {
  DailyLimitResponse,
  FreezeCardResponse,
  ParentLoginResponse,
  ParentUser,
  SpendingHistoryPeriod,
  StudentProfile,
  StudentSpendingHistoryResponse,
  TopUpRequest,
  TopUpResponse,
} from '../types';

export class ParentApiClient {
  private baseUrl: string;
  private parentId: string;
  private token: string | null;

  constructor(options?: { baseUrl?: string; parentId?: string }) {
    this.baseUrl = options?.baseUrl ?? 'http://192.168.1.53'; // LAN IP for Expo Go
    this.parentId = options?.parentId ?? 'parent-1';
    this.token = null;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  setParentId(id: string) {
    this.parentId = id;
  }

  setSession(token: string, parentId: number) {
    this.token = token;
    this.parentId = String(parentId);
  }

  logout() {
    this.token = null;
    this.parentId = 'parent-1';
  }

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-parent-id': this.parentId,
      Authorization: `Bearer ${this.token ?? this.parentId}`,
    };
  }

  /**
   * เข้าสู่ระบบผู้ปกครองด้วยเบอร์โทรศัพท์และรหัส PIN
   */
  async login(phone: string, pin: string): Promise<ParentLoginResponse> {
    const res = await fetch(`${this.baseUrl}/parent/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim(), pin: pin.trim() }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as {
        code?: string;
        message?: string;
      };
      const error = new Error(err.message ?? `เข้าสู่ระบบไม่สำเร็จ (${res.status})`) as Error & {
        code?: string;
      };
      error.code = err.code;
      throw error;
    }

    const data = (await res.json()) as ParentLoginResponse;
    this.setSession(data.token, data.parent.id);
    return data;
  }

  /**
   * ลงทะเบียนผู้ปกครองใหม่และผูกกับรหัสนักเรียน (รองรับหลายคน)
   */
  async register(params: {
    phone: string;
    fullName: string;
    pin: string;
    studentCode?: string;
    studentCodes?: string[];
  }): Promise<ParentLoginResponse> {
    const codes = [
      ...(params.studentCodes ?? []),
      ...(params.studentCode ? [params.studentCode] : []),
    ]
      .map((c) => c.trim())
      .filter(Boolean);

    const res = await fetch(`${this.baseUrl}/parent/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: params.phone.trim(),
        fullName: params.fullName.trim(),
        pin: params.pin.trim(),
        studentCode: codes[0] ?? '',
        studentCodes: codes,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `ลงทะเบียนผู้ปกครองไม่สำเร็จ (${res.status})`);
    }

    const data = (await res.json()) as ParentLoginResponse;
    this.setSession(data.token, data.parent.id);
    return data;
  }

  /**
   * ดึงข้อมูลผู้ปกครองและรายชื่อนักเรียนล่าสุด
   */
  async getMe(): Promise<{ parent: ParentUser; students: StudentProfile[] }> {
    const res = await fetch(`${this.baseUrl}/parent/auth/me`, {
      headers: this.headers,
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      const error = new Error(
        err.message ?? `ไม่สามารถโหลดข้อมูลผู้ใช้ได้ (${res.status})`,
      ) as Error & { status?: number };
      error.status = res.status;
      throw error;
    }

    return (await res.json()) as { parent: ParentUser; students: StudentProfile[] };
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
   * Sandbox helper: ยิง Callback/Webhook จำลองการชำระเงินสำเร็จเข้า Backend จริง
   */
  async simulateGatewayPayment(
    gatewayReference: string,
    amount: string,
  ): Promise<{ accepted: boolean; walletBalance?: string }> {
    const res = await fetch(`${this.baseUrl}/callbacks/payment-gateway/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gatewayReference,
        status: 'succeeded',
        amount,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `Callback failed (${res.status})`);
    }

    return (await res.json()) as { accepted: boolean; walletBalance?: string };
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
   * ดูประวัติการใช้จ่ายของนักเรียนรายวัน / รายเดือน / รายปี
   */
  async getSpendingHistory(
    studentId: number,
    period: SpendingHistoryPeriod,
    date: string,
  ): Promise<StudentSpendingHistoryResponse> {
    const query = new URLSearchParams({ period, date }).toString();
    const res = await fetch(
      `${this.baseUrl}/parent/students/${studentId}/spending-history?${query}`,
      {
        headers: this.headers,
      },
    );

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(
        err.message ?? `ไม่สามารถโหลดประวัติการใช้จ่ายได้ (${res.status})`,
      );
    }

    return (await res.json()) as StudentSpendingHistoryResponse;
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
