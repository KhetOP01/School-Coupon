export interface StudentProfile {
  id: number;
  studentCode: string;
  firstName: string;
  lastName: string;
  walletBalance: string;
  currentDailyLimit: string;
  nextDailyLimit: string;
  card?: {
    id: number;
    rfidUid: string;
    status: 'active' | 'suspended' | 'lost' | 'deactivated';
  };
}

export interface TopUpRequest {
  studentId: number;
  amount: string;
}

export interface TopUpResponse {
  topUpId: number;
  studentId: number;
  amount: string;
  walletBalance?: string;
  status: 'pending' | 'succeeded' | 'failed';
  gatewayReference?: string | null;
  qrImageUrl?: string | null;
}

export interface DailyLimitResponse {
  studentId: number;
  currentDailyLimit: string;
  nextDailyLimit: string;
  effectiveDate: string;
}

export interface FreezeCardResponse {
  cardId: number;
  status: 'lost';
}

export interface ParentUser {
  id: number;
  phone: string;
  fullName: string;
}

export interface ParentLoginResponse {
  token: string;
  parent: ParentUser;
  students: StudentProfile[];
}
