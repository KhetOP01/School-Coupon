'use client';

import { FormEvent, useState } from 'react';

interface SettlementResult {
  id: number;
  merchantId: number;
  settlementDate: string;
  grossAmount: string;
  feeAmount: string;
  netAmount: string;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

interface ApiError {
  code: string;
  message: string;
}

export default function SettlementApprovalForm() {
  const [settlementId, setSettlementId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [result, setResult] = useState<SettlementResult | null>(null);

  async function handleApprove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setResult(null);

    if (!/^[1-9]\d*$/.test(settlementId)) {
      setMessage({ type: 'error', text: 'กรุณาระบุ Settlement ID เป็นตัวเลขจำนวนเต็มบวก' });
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/admin/settlements/${encodeURIComponent(settlementId)}/approve`, {
        method: 'POST',
      });

      if (!response.ok) {
        setMessage({ type: 'error', text: await getErrorMessage(response) });
        return;
      }

      const data = (await response.json()) as SettlementResult;
      setResult(data);
      setMessage({
        type: 'success',
        text: `อนุมัติการโอนเงินสำเร็จ: Settlement ID ${data.id} เปลี่ยนสถานะเป็น ${data.status} เรียบร้อยแล้ว`,
      });
    } catch {
      setMessage({ type: 'error', text: 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', background: '#fff', maxWidth: '640px' }}>
      <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '0.5rem' }}>📊 อนุมัติยอดโอนเงินร้านค้าประจำวัน (UC-07)</h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        ตรวจสอบยอดขายสุทธิหลังหักค่าธรรมเนียม และกดอนุมัติการตัดรอบโอนเงินเข้าบัญชีธนาคารร้านค้า
      </p>

      <form onSubmit={handleApprove} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>
          Settlement ID (รหัสรอบสรุปยอดขาย):
          <input
            type="text"
            value={settlementId}
            onChange={(e) => setSettlementId(e.target.value)}
            placeholder="เช่น 1, 2, 701"
            style={{
              width: '100%',
              padding: '0.5rem',
              marginTop: '0.25rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '1rem',
            }}
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          style={{
            padding: '0.65rem 1.25rem',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          {busy ? 'กำลังดำเนินการ...' : 'กดอนุมัติการโอนเงิน (Approve Transfer)'}
        </button>
      </form>

      {message && (
        <div
          style={{
            marginTop: '1.25rem',
            padding: '0.75rem',
            borderRadius: '6px',
            background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            fontSize: '0.9rem',
          }}
        >
          {message.text}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1rem', marginTop: 0, marginBottom: '0.5rem', color: '#1e293b' }}>รายละเอียดผลการอนุมัติ:</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <li><strong>ร้านค้า ID:</strong> {result.merchantId}</li>
            <li><strong>วันที่ตัดรอบ:</strong> {result.settlementDate}</li>
            <li><strong>ยอดขายรวม (Gross):</strong> {result.grossAmount} บาท</li>
            <li><strong>ค่าธรรมเนียมโรงเรียน (Fee):</strong> {result.feeAmount} บาท</li>
            <li><strong>ยอดโอนสุทธิ (Net):</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>{result.netAmount} บาท</span></li>
            <li><strong>สถานะ:</strong> <span style={{ padding: '0.2rem 0.5rem', background: '#d1fae5', color: '#065f46', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>{result.status}</span></li>
            <li><strong>ผู้อนุมัติ:</strong> {result.approvedBy ?? '-'}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const errorBody = (await response.json()) as ApiError;
    if (errorBody?.code === 'SETTLEMENT_NOT_FOUND') return 'ไม่พบรายการ Settlement รหัสนี้ในระบบ';
    if (errorBody?.code === 'SETTLEMENT_NOT_PENDING') return 'Settlement นี้ไม่อยู่ในสถานะรออนุมัติ (อาจดำเนินการไปแล้ว)';
    if (errorBody?.code === 'STAFF_ACCESS_REQUIRED') return 'ต้องใช้สิทธิ์ Staff ในการอนุมัติยอดขาย';
    if (errorBody?.message) return errorBody.message;
  } catch {
    // Ignore JSON parse failure
  }
  return `ระบบปฏิเสธคำขอ (HTTP ${response.status})`;
}
