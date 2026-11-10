import { PaymentAmount } from './PaymentAmount';

export type PaymentMode = 'ONLINE' | 'OFFLINE';

export interface CreateOnlinePaymentProps {
  id: string;
  studentId: number;
  merchantId: number;
  cardId: number;
  amount: PaymentAmount;
  createdAt: Date;
}

export interface CreateOfflineSyncPaymentProps {
  id: string;
  studentId: number;
  merchantId: number;
  cardId: number;
  amount: PaymentAmount;
  offlineTrxId: string;
  createdAt: Date;
}

export interface RestoredPaymentProps {
  id: string;
  studentId: number;
  merchantId: number;
  cardId: number;
  amount: PaymentAmount;
  paymentMode: PaymentMode;
  offlineTrxId: string | null;
  createdAt: Date;
}

export class Payment {
  private constructor(
    readonly id: string,
    readonly studentId: number,
    readonly merchantId: number,
    readonly cardId: number,
    readonly amount: PaymentAmount,
    readonly paymentMode: PaymentMode,
    readonly offlineTrxId: string | null,
    readonly createdAt: Date,
  ) {}

  static createOnline(props: CreateOnlinePaymentProps): Payment {
    return new Payment(
      props.id,
      props.studentId,
      props.merchantId,
      props.cardId,
      props.amount,
      'ONLINE',
      null,
      props.createdAt,
    );
  }

  static createOfflineSync(props: CreateOfflineSyncPaymentProps): Payment {
    return new Payment(
      props.id,
      props.studentId,
      props.merchantId,
      props.cardId,
      props.amount,
      'OFFLINE',
      props.offlineTrxId,
      props.createdAt,
    );
  }

  static restore(props: RestoredPaymentProps): Payment {
    return new Payment(
      props.id,
      props.studentId,
      props.merchantId,
      props.cardId,
      props.amount,
      props.paymentMode,
      props.offlineTrxId,
      props.createdAt,
    );
  }
}
