'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

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

interface CardItem {
  id: string;
  rfidUid: string;
  studentName: string;
  status: 'active' | 'suspended' | 'deactivated';
  hint?: string;
}

interface RefundStudentItem {
  id: string;
  shortName: string;
  fullName: string;
  balance: string;
}

const INITIAL_CARDS: CardItem[] = [
  { id: '101', rfidUid: 'UC01-AC11-OLD', studentName: 'Mali Seed', status: 'active' },
  { id: '102', rfidUid: 'UC01-AC12-BOUND', studentName: 'Niran Seed', status: 'active' },
  { id: '106', rfidUid: 'UC01-AC16-ACTIVE', studentName: 'Suda Seed', status: 'active' },
  { id: '107', rfidUid: 'UC01-AC17-RETIRED', studentName: 'Anan Seed', status: 'deactivated' },
  { id: '201', rfidUid: 'UC02-AC21A-CARD', studentName: 'Kanya ParentFreeze', status: 'active', hint: '(ลองกดระงับ)' },
  { id: '202', rfidUid: 'UC02-AC21B-CARD', studentName: 'Chai StaffSuspend', status: 'active' },
  { id: '203', rfidUid: 'UC02-AC22-CARD', studentName: 'Somchai DepartureRefund', status: 'active' },
  { id: '204', rfidUid: 'UC02-AC23-CARD', studentName: 'Wichai Unfreeze', status: 'suspended' },
  { id: '207', rfidUid: 'UC02-AC27-CARD', studentName: 'Sunan ZeroBalance', status: 'active' },
];

const INITIAL_REFUND_STUDENTS: RefundStudentItem[] = [
  { id: '101', shortName: 'Mali', fullName: 'Mali Seed', balance: '65.00' },
  { id: '102', shortName: 'Niran', fullName: 'Niran Seed', balance: '0.00' },
  { id: '106', shortName: 'Suda', fullName: 'Suda Seed', balance: '20.00' },
  { id: '107', shortName: 'Anan', fullName: 'Anan Seed', balance: '10.00' },
  { id: '201', shortName: 'Kanya', fullName: 'Kanya ParentFreeze', balance: '50.00' },
  { id: '202', shortName: 'Chai', fullName: 'Chai StaffSuspend', balance: '40.00' },
  { id: '203', shortName: 'Somchai', fullName: 'Somchai DepartureRefund', balance: '250.00' },
  { id: '204', shortName: 'Wichai', fullName: 'Wichai Unfreeze', balance: '30.00' },
  { id: '207', shortName: 'Sunan', fullName: 'Sunan ZeroBalance', balance: '0.00' },
];

export default function CardManagementForm({
  initialCardId,
  initialStudentId,
}: {
  initialCardId?: number;
  initialStudentId?: number;
}) {
  const [cards, setCards] = useState<CardItem[]>(INITIAL_CARDS);
  const [refundStudents, setRefundStudents] = useState<RefundStudentItem[]>(INITIAL_REFUND_STUDENTS);
  const [cardId, setCardId] = useState(initialCardId ? String(initialCardId) : '');
  const [cardFilter, setCardFilter] = useState('');
  const [studentId, setStudentId] = useState(initialStudentId ? String(initialStudentId) : '');
  const [studentFilter, setStudentFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [cardMessage, setCardMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refundMessage, setRefundMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/admin/students')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { students?: Array<{
        id: number;
        firstName: string;
        name: string;
        walletBalance: string;
        cardId: number | null;
        rfidUid: string | null;
        cardStatus: string | null;
      }> } | null) => {
        if (!active || !data?.students) return;
        setCards(
          data.students
            .filter((s) => s.cardId !== null && s.rfidUid !== null)
            .map((s) => ({
              id: String(s.cardId),
              rfidUid: s.rfidUid!,
              studentName: s.name,
              status:
                s.cardStatus === 'active' || s.cardStatus === 'suspended' || s.cardStatus === 'deactivated'
                  ? s.cardStatus
                  : 'suspended',
            })),
        );
        setRefundStudents(
          data.students.map((s) => ({
            id: String(s.id),
            shortName: s.firstName,
            fullName: s.name,
            balance: s.walletBalance,
          })),
        );
      })
      .catch(() => {
        // Keep fallback seed lists if API is unreachable
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredCards = useMemo(() => {
    const query = cardFilter.trim().toLowerCase();
    if (!query) {
      return cards;
    }
    if (/^\d+$/.test(query)) {
      return cards.filter((c) => c.id.startsWith(query));
    }
    return cards.filter(
      (c) =>
        c.id.startsWith(query) ||
        c.rfidUid.toLowerCase().includes(query) ||
        c.studentName.toLowerCase().includes(query),
    );
  }, [cards, cardFilter]);

  const filteredRefundStudents = useMemo(() => {
    const query = studentFilter.trim().toLowerCase();
    if (!query) {
      return refundStudents;
    }
    if (/^\d+$/.test(query)) {
      return refundStudents.filter((s) => s.id.startsWith(query));
    }
    return refundStudents.filter(
      (s) =>
        s.id.startsWith(query) ||
        s.shortName.toLowerCase().includes(query) ||
        s.fullName.toLowerCase().includes(query),
    );
  }, [refundStudents, studentFilter]);

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
      const nextStatus = action === 'freeze' ? 'suspended' : 'active';
      setCards((prev) =>
        prev.map((c) => (c.id === String(data.cardId) ? { ...c, status: nextStatus } : c)),
      );
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

  function resolveRefundStudentId(rawValue: string): string {
    const trimmed = rawValue.trim();
    if (/^[1-9]\d*$/.test(trimmed)) {
      return trimmed;
    }
    const lower = trimmed.toLowerCase();
    const matched = refundStudents.find(
      (s) =>
        s.shortName.toLowerCase() === lower ||
        s.fullName.toLowerCase().includes(lower),
    );
    return matched ? matched.id : trimmed;
  }

  async function handleRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const resolvedStudentId = resolveRefundStudentId(studentId);
    if (!/^[1-9]\d*$/.test(resolvedStudentId)) {
      setRefundMessage({ type: 'error', text: 'กรุณาระบุ Student ID เป็นตัวเลขจำนวนเต็มบวก' });
      return;
    }

    if (!confirm(`คุณต้องการยืนยันการคืนเงินทั้งหมดและปิดบัตรนักเรียนรหัส ${resolvedStudentId} ถาวรหรือไม่?`)) {
      return;
    }

    setBusy(true);
    setRefundMessage(null);
    try {
      const response = await fetch(`/admin/students/${encodeURIComponent(resolvedStudentId)}/refund`, {
        method: 'POST',
      });
      if (!response.ok) {
        setRefundMessage({ type: 'error', text: await getErrorMessage(response) });
        return;
      }
      const data = (await response.json()) as RefundResult;
      setRefundStudents((prev) =>
        prev.map((s) => (s.id === String(data.studentId) ? { ...s, balance: '0.00' } : s)),
      );
      setCards((prev) =>
        prev.map((c) => (c.id === String(data.studentId) ? { ...c, status: 'deactivated' } : c)),
      );
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
          alignItems: 'start',
        }}
      >
        {/* Left Card: Freeze / Unfreeze */}
        <section
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.35rem',
            background: '#ffffff',
            boxShadow: '0 6px 24px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
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
                <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.1-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  ระงับ / ปลดระงับบัตรชั่วคราว (UC-02)
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.18rem 0 0 0' }}>
                  ใช้เมื่อผู้ปกครองแจ้งขอระงับบัตร หรือพบว่านักเรียนลืมบัตรไว้
                </p>
              </div>
            </div>

            {/* Search Card ID Input */}
            <div>
              <label
                htmlFor="freeze-card-id"
                style={{
                  display: 'block',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  color: '#0f172a',
                  marginBottom: '0.4rem',
                }}
              >
                ค้นหารหัสบัตร (Card ID)
              </label>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  paddingLeft: '0.8rem',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  id="freeze-card-id"
                  type="text"
                  value={cardId}
                  onChange={(e) => {
                    setCardId(e.target.value);
                    setCardFilter(e.target.value);
                  }}
                  placeholder="กรอกรหัสบัตร เช่น 201, 202, 204"
                  style={{
                    flex: 1,
                    padding: '0.6rem 0.7rem',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: '#0f172a',
                  }}
                />
              </div>
            </div>

            {/* Blue Search Results Box */}
            <div
              style={{
                background: '#e8f3ff',
                border: '1px solid #93c5fd',
                borderRadius: '12px',
                padding: '0.85rem 0.9rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '0.6rem',
                }}
              >
                ส่วนผลลัพธ์การค้นหา
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                  maxHeight: '185px',
                  overflowY: 'auto',
                  paddingRight: '0.2rem',
                }}
              >
                {filteredCards.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#475569', padding: '0.5rem 0.25rem' }}>
                    ไม่พบรหัสบัตรในรายการตัวอย่าง
                  </div>
                ) : (
                  filteredCards.map((c) => {
                    const selected = cardId.trim() === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCardId(c.id);
                          setCardFilter('');
                          setCardMessage(null);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.55rem',
                          width: '100%',
                          textAlign: 'left',
                          background: selected ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
                          border: selected ? '1.5px solid #2563eb' : '1px solid transparent',
                          padding: '0.5rem 0.72rem',
                          borderRadius: '9px',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          color: '#0f172a',
                          fontWeight: selected ? 600 : 500,
                        }}
                      >
                        <span
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '9999px',
                            border: selected ? '5px solid #2563eb' : '1.5px solid #94a3b8',
                            background: '#ffffff',
                            boxSizing: 'border-box',
                            flexShrink: 0,
                          }}
                        />
                        <span>Card #{c.id}</span>
                        <CardStatusPill status={c.status} detailed={selected || c.status === 'suspended'} />
                        {c.hint && selected && (
                          <span style={{ fontSize: '0.76rem', color: '#475569' }}>{c.hint}</span>
                        )}
                      </button>
                    );
                  })
                )}
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
            background: '#ffffff',
            boxShadow: '0 6px 24px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: '1rem',
          }}
        >
          <form
            id="departure-refund-form"
            onSubmit={handleRefund}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}
          >
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
                <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15v1h-2v-1H9v-2h4c.55 0 1-.45 1-1s-.45-1-1-1h-2c-1.66 0-3-1.34-3-3 0-1.3.84-2.4 2-2.82V6h2v1h2v2h-4c-.55 0-1 .45-1 1s.45 1 1 1h2c1.66 0 3 1.34 3 3 0 1.3-.84 2.4-2 2.82z" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  คืนเงินนักเรียนย้ายออก (Departure Refund)
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.18rem 0 0 0' }}>
                  บันทึกการคืนเงินคงเหลือทั้งหมดให้แก่นักเรียน พร้อมปิดใช้งานบัตรถาวรเมื่อย้ายออก
                </p>
              </div>
            </div>

            {/* Search Student Input */}
            <div>
              <label
                htmlFor="refund-student-id"
                style={{
                  display: 'block',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  color: '#0f172a',
                  marginBottom: '0.4rem',
                }}
              >
                ค้นหารายชื่อ หรือรหัส (ID)
              </label>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  paddingLeft: '0.8rem',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  id="refund-student-id"
                  type="text"
                  value={studentId}
                  onChange={(e) => {
                    setStudentId(e.target.value);
                    setStudentFilter(e.target.value);
                  }}
                  placeholder="กรอกรหัสนักเรียน เช่น 203, 207, Mali"
                  style={{
                    flex: 1,
                    padding: '0.6rem 0.7rem',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '0.9rem',
                    color: '#0f172a',
                  }}
                />
              </div>
            </div>

            {/* Warm Cream Student Results Box */}
            <div
              style={{
                background: '#fef7db',
                padding: '0.85rem 0.9rem',
                borderRadius: '12px',
                border: '1px solid #f5d167',
              }}
            >
              <div
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '0.6rem',
                }}
              >
                ส่วนผลลัพธ์ข้อมูล
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                  maxHeight: '185px',
                  overflowY: 'auto',
                  paddingRight: '0.2rem',
                }}
              >
                {filteredRefundStudents.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#78350f', padding: '0.5rem 0.25rem' }}>
                    ไม่พบนักเรียนในรายการตัวอย่าง
                  </div>
                ) : (
                  filteredRefundStudents.map((s) => {
                    const selected = studentId.trim() === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setStudentId(s.id);
                          setStudentFilter('');
                          setRefundMessage(null);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.6rem',
                          width: '100%',
                          textAlign: 'left',
                          background: selected ? '#fffbeb' : '#ffffff',
                          border: `1.5px solid ${selected ? '#d97706' : '#e2e8f0'}`,
                          padding: '0.48rem 0.75rem',
                          borderRadius: '9px',
                          fontSize: '0.81rem',
                          cursor: 'pointer',
                          color: '#0f172a',
                          fontWeight: selected ? 600 : 500,
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem' }}>
                          <span
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '9999px',
                              border: selected ? '5px solid #d97706' : '1.5px solid #cbd5e1',
                              background: '#ffffff',
                              boxSizing: 'border-box',
                              flexShrink: 0,
                            }}
                          />
                          <span>
                            Student #{s.id} ({s.shortName})
                          </span>
                        </span>
                        <span
                          style={{
                            color: selected ? '#b45309' : '#475569',
                            fontWeight: selected ? 700 : 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ยอดเงินคืน ฿{s.balance}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </form>

          <div>
            <button
              type="submit"
              form="departure-refund-form"
              disabled={busy}
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.72rem 1rem',
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                cursor: busy ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '0.88rem',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 18v1c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14c1.1 0 2 .9 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
              </svg>
              <span>ดำเนินการคืนเงินและยกเลิกบัตร (Refund)</span>
            </button>

            {refundMessage && (
              <div
                role={refundMessage.type === 'error' ? 'alert' : 'status'}
                style={{
                  marginTop: '0.85rem',
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
          </div>
        </section>
      </div>
    </div>
  );
}

function CardStatusPill({
  status,
  detailed,
}: {
  status: CardItem['status'];
  detailed?: boolean;
}) {
  if (status === 'active') {
    return (
      <span
        style={{
          padding: '0.12rem 0.55rem',
          borderRadius: '9999px',
          background: '#16a34a',
          color: '#ffffff',
          fontSize: '0.73rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {detailed ? 'Active (ใช้งานอยู่)' : 'Active'}
      </span>
    );
  }
  if (status === 'suspended') {
    return (
      <span
        style={{
          padding: '0.12rem 0.55rem',
          borderRadius: '9999px',
          background: '#ea580c',
          color: '#ffffff',
          fontSize: '0.73rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        Suspended (ระงับชั่วคราว)
      </span>
    );
  }
  return (
    <span
      style={{
        padding: '0.12rem 0.55rem',
        borderRadius: '9999px',
        background: '#64748b',
        color: '#ffffff',
        fontSize: '0.73rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      Deactivated
    </span>
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
