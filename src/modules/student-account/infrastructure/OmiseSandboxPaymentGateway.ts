import { GatewayPaymentResult, PaymentGateway } from '../application/ports';
import { TopUp } from '../domain/TopUp';

interface OmiseSourceResponse {
  id: string;
  scannable_code?: {
    image?: {
      download_uri?: string;
    };
  };
}

interface OmiseChargeResponse {
  id: string;
  status: string;
  source?: OmiseSourceResponse;
}

/**
 * PaymentGateway supporting 3 modes:
 * 1. OMISE_SECRET_KEY set -> real Omise Sandbox PromptPay QR charge (pending + webhook)
 * 2. TOPUP_QR_MODE=sandbox -> local PromptPay QR sandbox (pending + callback/simulate)
 * 3. Default (test/CI) -> instant-succeeded mock so existing E2E tests remain untouched
 */
export class OmiseSandboxPaymentGateway implements PaymentGateway {
  async requestPayment(topUp: TopUp): Promise<GatewayPaymentResult> {
    if (topUp.studentId === 'fail') {
      return { status: 'failed' };
    }

    const omiseKey = process.env.OMISE_SECRET_KEY?.trim();
    if (omiseKey) {
      return this.createOmisePromptPayCharge(omiseKey, topUp);
    }

    if (process.env.TOPUP_QR_MODE === 'sandbox') {
      const ref = `sandbox-${topUp.id}`;
      const qrPayload = `PROMPTPAY|SCHOOL-COUPON|TOPUP:${topUp.id}|AMOUNT:${topUp.amount.money.toString()}`;
      return {
        status: 'pending',
        gatewayProvider: 'promptpay-sandbox',
        gatewayReference: ref,
        qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrPayload)}`,
      };
    }

    return {
      status: 'succeeded',
      gatewayProvider: 'promptpay-qr',
      gatewayReference: `pp-${topUp.id}`,
    };
  }

  private async createOmisePromptPayCharge(
    secretKey: string,
    topUp: TopUp,
  ): Promise<GatewayPaymentResult> {
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
    const amountSatang = Math.round(Number(topUp.amount.money.toString()) * 100);

    const sourceRes = await fetch('https://api.omise.co/sources', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'promptpay',
        amount: amountSatang,
        currency: 'thb',
      }),
    });
    if (!sourceRes.ok) {
      return { status: 'failed' };
    }
    const source = (await sourceRes.json()) as OmiseSourceResponse;

    const chargeRes = await fetch('https://api.omise.co/charges', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountSatang,
        currency: 'thb',
        source: source.id,
        metadata: {
          topUpId: topUp.id,
          studentId: topUp.studentId,
        },
      }),
    });
    if (!chargeRes.ok) {
      return { status: 'failed' };
    }
    const charge = (await chargeRes.json()) as OmiseChargeResponse;

    return {
      status: 'pending',
      gatewayProvider: 'omise-promptpay',
      gatewayReference: charge.id,
      qrImageUrl: charge.source?.scannable_code?.image?.download_uri,
    };
  }
}
