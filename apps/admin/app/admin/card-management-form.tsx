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

const QUICK_CARDS = [
  { id: '201', desc: 'Card #201 (Active - ลองกดระงับ)' },
  { id: '202', desc: 'Card #202 (Active - ลองกดระงับ)' },
  { id: '204', desc: 'Card #204 (Suspended - ลองกดปลดระงับ)' },
];

const QUICK_REFUND_STUDENTS = [
  { id: '203', desc: 'Student #203 (Somchai • ยอด ฿250.00)' },
  { id: '207', desc: 'Student #207 (Sunan • ยอด ฿0.00)' },
  { id: '101', desc: 'Student #101 (Mali • ยอด ฿65.00)' },
];

export default function CardManagementForm({
  initialCardId,
  initialStudentId,
}: {
  initialCardId?: number;
  initialStudentId?: number;
}) {
  const [cardId, setCardId] = useState(initialCardId ? String(initialCardId) : '201');
  const [studentId, setStudentId] = useState(initialStudentId ? String(initialStudentId) : '');
  const [copiedCardId, setCopiedCardId] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cardMessage, setCardMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refundMessage, setRefundMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleFreeze(action: 'freeze' | 'unfreeze') {
    if (!/^[1-9]\d*$/.test(cardId.trim())) {
      setCardMessage({ type: 'error', text: 'กรุณาระบุ Card ID เป็นตัวเลขจำนวนเต็มบวก' });
      return;
    }

    setBusy(true);
    setCardMessage(null);
    try {
      const response = await fetch(`/admin/cards/${encodeURIComponent(cardId.trim())}/${action}`, {
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
    const trimmedStudentId = studentId.trim();
    if (!/^[1-9]\d*$/.test(trimmedStudentId)) {
      setRefundMessage({ type: 'error', text: 'กรุณาระบุ Student ID เป็นตัวเลขจำนวนเต็มบวก' });
      return;
    }

    if (!confirm(`คุณต้องการยืนยันการคืนเงินทั้งหมดและปิดบัตรนักเรียนรหัส ${trimmedStudentId} ถาวรหรือไม่?`)) {
      return;
    }

    setBusy(true);
    setRefundMessage(null);
    try {
      const response = await fetch(`/admin/students/${encodeURIComponent(trimmedStudentId)}/refund`, {
        method: 'POST',
      });
      if (!response.ok) {
        setRefundMessage({ type: 'error', text: await getErrorMessage(response) });
        return;
      }
      const data = (await response.json()) as RefundResult;
      setRefundMessage({
        type: 'success',
        text: `คืนเงินสำเร็จ: ยอดเงินที่คืน ฿${data.refundedAmount} บาท, ยอดคงเหลือใน Wallet กลายเป็น ฿0.00 บาท, สถานะบัตรเปลี่ยนเป็น ${data.cardStatus}`,
      });
    } catch {
      setRefundMessage({ type: 'error', text: 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง' });
    } finally {
      setBusy(false);
    }
  }

  async function copyCardId() {
    if (!cardId.trim()) {
      return;
    }
    try {
      await navigator.clipboard.writeText(cardId.trim());
      setCopiedCardId(true);
      setTimeout(() => setCopiedCardId(false), 1800);
    } catch {
      // Clipboard API may be unavailable in restricted contexts
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      {/* Top Banner Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1rem 1.35rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 6px 24px rgba(15, 23, 42, 0.05)',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            จัดการสถานะบัตรและคืนเงินนักเรียนย้ายออก
          </h2>
          <p style={{ margin: '0.15rem 0 0 0', color: '#64748b', fontSize: '0.82rem' }}>
            ระบบสำหรับตรวจสอบข้อมูลและจัดการสถานะบัตร พร้อมทั้งคืนเงินคงเหลือให้กับนักเรียน
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: '#f4f8ff',
            border: '1px solid #dbeafe',
            borderRadius: '11px',
            padding: '0.55rem 0.9rem',
            fontSize: '0.79rem',
            color: '#334155',
            lineHeight: 1.35,
          }}
        >
          <span
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '9999px',
              background: '#2563eb',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            i
          </span>
          <span>
            กรุณาตรวจสอบข้อมูลให้ถูกต้อง
            <br />
            ก่อนทำรายการทุกครั้ง
          </span>
        </div>
      </div>

      {/* 2-Column Action Cards */}
      <div
        style={{
          display: 'grid',
          gap: '1.15rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          alignItems: 'stretch',
        }}
      >
        {/* Left Card: Freeze / Unfreeze */}
        <section
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.35rem',
            background: 'linear-gradient(155deg, #ffffff 60%, #edf4ff 100%)',
            boxShadow: '0 6px 24px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Card Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '9999px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.1-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.08rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  ระงับ / ปลดระงับบัตรชั่วคราว (UC-02)
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.81rem', margin: '0.18rem 0 0 0' }}>
                  ใช้เมื่อผู้ปกครองแจ้งขอระงับบัตร หรือพบว่านักเรียนลืมบัตรไว้
                </p>
              </div>
            </div>

            {/* Selection Box */}
            <div
              style={{
                background: '#f3f7fd',
                padding: '0.85rem 0.95rem',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '0.6rem',
                }}
              >
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '9999px',
                    background: '#2563eb',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                  }}
                >
                  i
                </span>
                <span>ตัวเลือกการดำเนินการ (บัตรตัวอย่าง)</span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {QUICK_CARDS.map((c) => {
                  const selected = cardId.trim() === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCardId(c.id);
                        setCardMessage(null);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: selected ? '#eff6ff' : '#ffffff',
                        border: `1.5px solid ${selected ? '#3b82f6' : '#cbd5e1'}`,
                        padding: '0.42rem 0.72rem',
                        borderRadius: '9px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        color: selected ? '#1d4ed8' : '#334155',
                        fontWeight: selected ? 700 : 500,
                        boxShadow: selected ? '0 2px 8px rgba(37, 99, 235, 0.12)' : 'none',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.8 }}>
                        <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.1-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                      </svg>
                      <span>{c.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card ID Input */}
            <div>
              <label
                htmlFor="freeze-card-id"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  color: '#0f172a',
                  marginBottom: '0.45rem',
                }}
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '9999px',
                    background: '#2563eb',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.68rem',
                  }}
                >
                  🪪
                </span>
                <span>Card ID (รหัสบัตรในระบบ)</span>
              </label>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                <input
                  id="freeze-card-id"
                  type="text"
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value)}
                  placeholder="เช่น 201, 202, 204"
                  style={{
                    flex: 1,
                    padding: '0.62rem 0.85rem',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: '#0f172a',
                  }}
                />
                <button
                  type="button"
                  onClick={() => void copyCardId()}
                  title="คัดลอก Card ID"
                  style={{
                    padding: '0.62rem 0.8rem',
                    border: 'none',
                    borderLeft: '1px solid #e2e8f0',
                    background: copiedCardId ? '#ecfdf5' : '#f1f5f9',
                    color: copiedCardId ? '#059669' : '#475569',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {copiedCardId ? '✓' : '❐'}
                </button>
              </div>
            </div>
          </div>

          {/* Freeze / Unfreeze Buttons + Feedback */}
          <div>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleFreeze('freeze')}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.68rem 1rem',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                </svg>
                <span>ระงับบัตร (Freeze)</span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => handleFreeze('unfreeze')}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.68rem 1rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>ปลดระงับ (Unfreeze)</span>
              </button>
            </div>

            {cardMessage && (
              <div
                role={cardMessage.type === 'error' ? 'alert' : 'status'}
                style={{
                  marginTop: '0.85rem',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '10px',
                  background: cardMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  color: cardMessage.type === 'success' ? '#065f46' : '#991b1b',
                  border: `1px solid ${cardMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                  fontSize: '0.84rem',
                  fontWeight: 600,
                }}
              >
                {cardMessage.text}
              </div>
            )}
          </div>
        </section>

        {/* Right Card: Departure Refund */}
        <section
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.35rem',
            background: 'linear-gradient(155deg, #ffffff 60%, #fff4e8 100%)',
            boxShadow: '0 6px 24px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Card Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '9999px',
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  color: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15v1h-2v-1H9v-2h4c.55 0 1-.45 1-1s-.45-1-1-1h-2c-1.66 0-3-1.34-3-3 0-1.3.84-2.4 2-2.82V6h2v1h2v2h-4c-.55 0-1 .45-1 1s.45 1 1 1h2c1.66 0 3 1.34 3 3 0 1.3-.84 2.4-2 2.82z" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.08rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  คืนเงินนักเรียนย้ายออก (Departure Refund)
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.81rem', margin: '0.18rem 0 0 0' }}>
                  บันทึกการคืนเงินคงเหลือทั้งหมดให้แก่นักเรียน พร้อมปิดใช้งานบัตรถาวรเมื่อย้ายออก
                </p>
              </div>
            </div>

            {/* Warm Cream Student Quick-Pick Panel */}
            <div
              style={{
                background: '#fefaf0',
                padding: '0.85rem 0.95rem',
                borderRadius: '12px',
                border: '1px solid #fde68a',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#92400e',
                  marginBottom: '0.55rem',
                }}
              >
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '9999px',
                    background: '#f59e0b',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                  }}
                >
                  i
                </span>
                <span>เลือกนักเรียนตัวอย่าง (คืนเงินยอดคงเหลือทั้งหมด)</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.42rem' }}>
                {QUICK_REFUND_STUDENTS.map((s) => {
                  const selected = studentId.trim() === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setStudentId(s.id);
                        setRefundMessage(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        width: '100%',
                        textAlign: 'left',
                        background: '#ffffff',
                        border: `1.5px solid ${selected ? '#2563eb' : '#e2e8f0'}`,
                        padding: '0.48rem 0.75rem',
                        borderRadius: '9px',
                        fontSize: '0.81rem',
                        cursor: 'pointer',
                        color: selected ? '#0f172a' : '#475569',
                        fontWeight: selected ? 700 : 500,
                      }}
                    >
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '9999px',
                          border: selected ? '5px solid #2563eb' : '1.5px solid #cbd5e1',
                          background: '#ffffff',
                          boxSizing: 'border-box',
                          flexShrink: 0,
                        }}
                      />
                      <span>{s.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Student ID Input + Submit */}
            <form onSubmit={handleRefund} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label
                  htmlFor="refund-student-id"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    color: '#0f172a',
                    marginBottom: '0.45rem',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#2563eb">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM9 8.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zM13 16H5v-1c0-1.33 2.67-2 4-2s4 .67 4 2v1zm6-1h-5v-1.5h5V15zm0-3h-5v-1.5h5V12z" />
                  </svg>
                  <span>Student ID (รหัสนักเรียนในระบบ)</span>
                </label>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    paddingRight: '0.75rem',
                  }}
                >
                  <input
                    id="refund-student-id"
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="กรอกรหัสนักเรียน เช่น 203, 207"
                    style={{
                      flex: 1,
                      padding: '0.62rem 0.85rem',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: '0.9rem',
                      color: '#0f172a',
                    }}
                  />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.72rem 1rem',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 18v1c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14c1.1 0 2 .9 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                </svg>
                <span>ดำเนินการคืนเงินและยกเลิกบัตร (Refund)</span>
              </button>
            </form>
          </div>

          {refundMessage && (
            <div
              role={refundMessage.type === 'error' ? 'alert' : 'status'}
              style={{
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                background: refundMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: refundMessage.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${refundMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                fontSize: '0.84rem',
                fontWeight: 600,
              }}
            >
              {refundMessage.text}
            </div>
          )}
        </section>
      </div>
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
