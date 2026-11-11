'use client';

import { FormEvent, useState } from 'react';

interface CardResult {
  cardId: number;
  status: string;
}

interface RefundResult {
  studentId: number;
  refundedAmount: string;
  walletBalance: string;
  cardStatus: string;
}

interface ApiError {
  code: string;
  message: string;
}

export default function CardManagementForm() {
  const [cardId, setCardId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [busy, setBusy] = useState(false);
  const [cardMessage, setCardMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refundMessage, setRefundMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleFreeze(action: 'freeze' | 'unfreeze') {
    if (!/^[1-9]\d*$/.test(cardId)) {
      setCardMessage({ type: 'error', text: 'กรุณาระบุ Card ID เป็นตัวเลขจำนวนเต็มบวก' });
      return;
    }

    setBusy(true);
    setCardMessage(null);
    try {
      const response = await fetch(`/admin/cards/${encodeURIComponent(cardId)}/${action}`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        setCardMessage({ type: 'error', text: await getErrorMessage(response) });
        return;
      }
      const data = (await response.json()) as CardResult;
      const actionText = action === 'freeze' ? 'ระงับบัตรชั่วคราว (Suspended)' : 'ปลดการระงับบัตร (Active)';
      setCardMessage({
        type: 'success',
        text: `ดำเนินการสำเร็จ: บัตร ID ${data.cardId} สถานะปัจจุบันคือ ${actionText}`,
      });
    } catch {
      setCardMessage({ type: 'error', text: 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง' });
    } finally {
      setBusy(false);
    }
  }

  async function handleRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[1-9]\d*$/.test(studentId)) {
      setRefundMessage({ type: 'error', text: 'กรุณาระบุ Student ID เป็นตัวเลขจำนวนเต็มบวก' });
      return;
    }

    if (!confirm(`คุณต้องการยืนยันการคืนเงินและปิดบัญชีนักเรียนรหัส ${studentId} หรือไม่?`)) {
      return;
    }

    setBusy(true);
    setRefundMessage(null);
    try {
      const response = await fetch(`/admin/students/${encodeURIComponent(studentId)}/refund`, {
        method: 'POST',
      });
      if (!response.ok) {
        setRefundMessage({ type: 'error', text: await getErrorMessage(response) });
        return;
      }
      const data = (await response.json()) as RefundResult;
      setRefundMessage({
        type: 'success',
        text: `คืนเงินสำเร็จ: ยอดเงินที่คืน ${data.refundedAmount} บาท, ยอดคงเหลือใน Wallet กลายเป็น 0.00 บาท, สถานะบัตรเปลี่ยนเป็น ${data.cardStatus}`,
      });
    } catch {
      setRefundMessage({ type: 'error', text: 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
      {/* Section 1: Freeze / Unfreeze */}
      <section style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', background: '#fff' }}>
        <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '0.5rem' }}>❄️ ระงับ / ปลดระงับบัตรชั่วคราว (UC-02)</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          ใช้เมื่อผู้ปกครองแจ้งขอระงับบัตร หรือพบว่านักเรียนลืมบัตรไว้
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Card ID (รหัสบัตรในระบบ):
            <input
              type="text"
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              placeholder="เช่น 1, 2, 3"
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

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleFreeze('freeze')}
              style={{
                flex: 1,
                padding: '0.6rem 1rem',
                background: '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              ระงับบัตร (Freeze)
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleFreeze('unfreeze')}
              style={{
                flex: 1,
                padding: '0.6rem 1rem',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              ปลดระงับ (Unfreeze)
            </button>
          </div>
        </div>

        {cardMessage && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              borderRadius: '6px',
              background: cardMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
              color: cardMessage.type === 'success' ? '#065f46' : '#991b1b',
              border: `1px solid ${cardMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
              fontSize: '0.9rem',
            }}
          >
            {cardMessage.text}
          </div>
        )}
      </section>

      {/* Section 2: Departure Refund */}
      <section style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', background: '#fff' }}>
        <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '0.5rem' }}>💰 คืนเงินนักเรียนย้ายออก (Departure Refund)</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          ปิดบัตรถาวรและคืนยอดเงินคงเหลือในกระเป๋าเงินทั้งหมดเมื่อนักเรียนสำเร็จการศึกษาหรือย้ายโรงเรียน
        </p>

        <form onSubmit={handleRefund} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Student ID (รหัสนักเรียนในระบบ):
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="เช่น 101, 102"
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
              marginTop: '0.5rem',
              padding: '0.6rem 1rem',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ทำเรื่องคืนเงินและยกเลิกบัตร (Refund)
          </button>
        </form>

        {refundMessage && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              borderRadius: '6px',
              background: refundMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
              color: refundMessage.type === 'success' ? '#065f46' : '#991b1b',
              border: `1px solid ${refundMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
              fontSize: '0.9rem',
            }}
          >
            {refundMessage.text}
          </div>
        )}
      </section>
    </div>
  );
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const errorBody = (await response.json()) as ApiError;
    if (errorBody?.code === 'CARD_NOT_FOUND') return 'ไม่พบข้อมูลบัตร RFID นี้ในระบบ';
    if (errorBody?.code === 'STUDENT_NOT_FOUND') return 'ไม่พบข้อมูลนักเรียนนี้ในระบบ';
    if (errorBody?.code === 'CARD_STATUS_CONFLICT') return 'สถานะบัตรไม่ถูกต้องสำหรับการดำเนินการนี้';
    if (errorBody?.code === 'REFUND_ALREADY_PROCESSED') return 'นักเรียนคนนี้ได้ทำเรื่องคืนเงินและปิดบัตรไปแล้ว';
    if (errorBody?.code === 'STUDENT_DEPARTED') return 'นักเรียนคนนี้ได้ย้ายออกไปแล้ว';
    if (errorBody?.message) return errorBody.message;
  } catch {
    // Ignore JSON parse failure
  }
  return `ระบบปฏิเสธคำขอ (HTTP ${response.status})`;
}
