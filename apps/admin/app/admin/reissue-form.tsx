'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

interface CardReissuePreview {
  studentId: number;
  studentCode: string;
  firstName: string;
  lastName: string;
  expectedCardId: number;
  oldRfidUid: string;
  oldCardStatus: 'active' | 'lost';
  walletBalance: string;
}

interface CardReissueResult {
  newRfidUid: string;
  walletBalance: string;
  newCardStatus: 'active';
}

interface ApiError {
  code: string;
  message: string;
}

interface CardReissueFormProps {
  initialStudentId?: number;
  onBackToDirectory?: () => void;
  onGoToCardManagement?: (cardId: number) => void;
}

const QUICK_STUDENTS = [
  { id: '101', code: 'UC01-AC11', name: 'Mali Seed', rfid: 'UC01-AC11-OLD', bal: '฿65.00' },
  { id: '106', code: 'UC01-AC16', name: 'Suda Seed', rfid: 'UC01-AC16-ACTIVE', bal: '฿20.00' },
  { id: '201', code: 'UC02-AC21A', name: 'Kanya', rfid: 'UC02-AC21A-CARD', bal: '฿50.00' },
  { id: '204', code: 'UC02-AC23', name: 'Wichai', rfid: 'UC02-AC23-CARD', bal: '฿30.00' },
];

export default function CardReissueForm({
  initialStudentId,
  onBackToDirectory,
  onGoToCardManagement,
}: CardReissueFormProps) {
  const [searchInput, setSearchInput] = useState(
    initialStudentId ? String(initialStudentId) : '101',
  );
  const [preview, setPreview] = useState<CardReissuePreview | null>(null);
  const [rfidUid, setRfidUid] = useState('');
  const [reissueOpen, setReissueOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [infoNotice, setInfoNotice] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<CardReissueResult | null>(null);
  const [busy, setBusy] = useState(false);
  const rfidInputRef = useRef<HTMLInputElement>(null);

  const resolveStudentId = useCallback((rawInput: string): string => {
    const trimmed = rawInput.trim();
    if (/^[1-9]\d*$/.test(trimmed)) {
      return trimmed;
    }
    const lower = trimmed.toLowerCase();
    const matched = QUICK_STUDENTS.find(
      (item) =>
        item.code.toLowerCase() === lower ||
        item.name.toLowerCase().includes(lower) ||
        item.rfid.toLowerCase() === lower,
    );
    return matched ? matched.id : trimmed;
  }, []);

  const fetchPreviewById = useCallback(async (targetId: string) => {
    setError('');
    setResult(null);
    setInfoNotice('');
    setReissueOpen(false);

    if (!/^[1-9]\d*$/.test(targetId)) {
      setPreview(null);
      setError('กรุณาระบุ Student ID เป็นจำนวนเต็มบวก (เช่น 101, 106, 201)');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        `/admin/students/${encodeURIComponent(targetId)}/card-reissue-preview`,
        { cache: 'no-store' },
      );
      if (!response.ok) {
        setPreview(null);
        setError(await getErrorMessage(response));
        return;
      }
      setPreview((await response.json()) as CardReissuePreview);
    } catch {
      setPreview(null);
      setError('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void fetchPreviewById(initialStudentId ? String(initialStudentId) : '101');
  }, [initialStudentId, fetchPreviewById]);

  async function lookupStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const resolvedId = resolveStudentId(searchInput);
    await fetchPreviewById(resolvedId);
  }

  async function reissueCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview) {
      return;
    }
    if (!rfidUid.trim() || rfidUid.trim().length > 50) {
      setError('กรุณาสแกน RFID UID ที่มีความยาวไม่เกิน 50 ตัวอักษร');
      return;
    }

    setBusy(true);
    setError('');
    setResult(null);
    setInfoNotice('');
    try {
      const response = await fetch('/admin/cards/reissue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: preview.studentId,
          expectedCardId: preview.expectedCardId,
          newRfidUid: rfidUid.trim(),
        }),
      });
      if (!response.ok) {
        setError(await getErrorMessage(response));
        return;
      }
      const data = (await response.json()) as CardReissueResult;
      setResult(data);
      setRfidUid('');
      setReissueOpen(false);
      await fetchPreviewById(String(preview.studentId));
      setResult(data);
    } catch {
      setError('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง');
    } finally {
      setBusy(false);
    }
  }

  async function copyCardUid(uid: string) {
    try {
      await navigator.clipboard.writeText(uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 1800);
    } catch {
      // Clipboard API may be unavailable in restricted contexts
    }
  }

  function handleOpenReissuePanel() {
    setReissueOpen(true);
    setError('');
    setInfoNotice('');
    setTimeout(() => {
      rfidInputRef.current?.focus();
    }, 50);
  }

  const activeNumericId = resolveStudentId(searchInput);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1.05rem' }}>
      {/* Top Search & Quick Select Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.2rem 1.35rem',
          boxShadow: '0 6px 24px rgba(15, 23, 42, 0.05)',
        }}
      >
        {/* Header Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              ออกบัตร RFID ทดแทนกรณีบัตรหาย/ชำรุด
            </h2>
            <p style={{ margin: '0.15rem 0 0 0', color: '#64748b', fontSize: '0.82rem' }}>
              ค้นหานักเรียน ตรวจสอบประวัติ และออกบัตรใหม่ พร้อมคงยอดเงิน Wallet เดิมไว้ทั้งหมด
            </p>
          </div>

          <button
            type="button"
            onClick={() => setGuideOpen((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.42rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: guideOpen ? '#eff6ff' : '#f8fafc',
              color: guideOpen ? '#1d4ed8' : '#334155',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
            </svg>
            <span>คู่มือการใช้งาน</span>
            <span>›</span>
          </button>
        </div>

        {guideOpen && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.8rem 1rem',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: '0.82rem',
              color: '#334155',
              lineHeight: 1.6,
            }}
          >
            <strong>ขั้นตอนการออกบัตรทดแทน (UC-01):</strong> (1) ค้นหานักเรียนด้วย Student ID เช่น <code>101</code> หรือคลิกเลือกจากปุ่มตัวอย่างด้านล่าง → (2) ตรวจสอบชื่อ ยอด Wallet และบัตรเดิม → (3) กด <strong>ออกบัตรใหม่</strong> แล้วสแกนหรือสุ่มรหัส RFID UID ใบใหม่ → (4) กด <strong>ยืนยันเปลี่ยนบัตร</strong> ระบบจะอายัดบัตรเดิมและโอนยอดเงินไปบัตรใหม่ทันที
          </div>
        )}

        {/* Search Bar */}
        <form
          onSubmit={lookupStudent}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.85rem',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '11px',
              padding: '0.58rem 0.95rem',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              id="studentId"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="ค้นหาด้วย รหัสนักเรียน, ชื่อ-นามสกุล หรือเลขบัตร RFID..."
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.88rem',
                color: '#0f172a',
                width: '100%',
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.62rem 1.3rem',
              borderRadius: '11px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span>{busy ? 'กำลังค้นหา...' : 'ค้นหา'}</span>
          </button>
        </form>

        {/* Quick Select Student Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.82rem',
              color: '#475569',
              fontWeight: 600,
              marginRight: '0.2rem',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            เลือกนักเรียน :
          </span>

          {QUICK_STUDENTS.map((s) => {
            const isSelected = activeNumericId === s.id || preview?.studentId === Number(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSearchInput(s.id);
                  void fetchPreviewById(s.id);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.78rem',
                  borderRadius: '9999px',
                  border: isSelected ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                  background: isSelected ? '#eff6ff' : '#f8fafc',
                  color: isSelected ? '#1d4ed8' : '#334155',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.75 }}>
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <span>
                  ID: <strong>{s.id}</strong> ({s.name} - {s.bal})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: '12px',
            padding: '0.85rem 1.1rem',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          role="status"
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#047857',
            borderRadius: '12px',
            padding: '0.9rem 1.15rem',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          ออกบัตรใหม่สำเร็จ: {result.newRfidUid} • ยอด Wallet คงเดิม ฿{result.walletBalance} บาท (สถานะ: {result.newCardStatus})
        </div>
      )}

      {infoNotice && (
        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            borderRadius: '12px',
            padding: '0.85rem 1.1rem',
            fontSize: '0.86rem',
            fontWeight: 500,
          }}
        >
          {infoNotice}
        </div>
      )}

      {/* Student Profile & Card Details Card */}
      {preview && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '1.35rem 1.5rem',
            boxShadow: '0 6px 24px rgba(15, 23, 42, 0.05)',
          }}
        >
          {/* Top Student Identity + Wallet/UID Summary */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.25rem',
              paddingBottom: '1.2rem',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            {/* Avatar + Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
              <div
                style={{
                  width: '86px',
                  height: '86px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)',
                  border: '3px solid #eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <svg width="74" height="74" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="31" r="14" fill="#f6c7a6" />
                  <path d="M25 29c0-10 7-17 15-17s15 7 15 17c-2-5-7-8-15-8s-13 3-15 8z" fill="#3b2f2f" />
                  <circle cx="35" cy="31" r="1.7" fill="#1e293b" />
                  <circle cx="45" cy="31" r="1.7" fill="#1e293b" />
                  <path d="M36 37c2 2 6 2 8 0" stroke="#9a5b4a" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M18 76c2-15 11-22 22-22s20 7 22 22H18z" fill="#ffffff" />
                  <path d="M32 54l8 10 8-10" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
                </svg>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      borderRadius: '9999px',
                      padding: '0.15rem 0.6rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                    }}
                  >
                    Student ID
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: preview.oldCardStatus === 'active' ? '#ecfdf5' : '#fef3c7',
                      color: preview.oldCardStatus === 'active' ? '#047857' : '#b45309',
                      border:
                        preview.oldCardStatus === 'active'
                          ? '1px solid #bbf7d0'
                          : '1px solid #fde68a',
                      borderRadius: '9999px',
                      padding: '0.15rem 0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '9999px',
                        background: preview.oldCardStatus === 'active' ? '#16a34a' : '#f59e0b',
                      }}
                    />
                    {preview.oldCardStatus === 'active' ? 'ใช้งานได้ปกติ' : 'แจ้งบัตรหาย (Lost)'}
                  </span>
                </div>

                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                  {preview.studentId}
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', marginTop: '0.15rem' }}>
                  {preview.firstName} {preview.lastName}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.1rem' }}>
                  มัธยมศึกษาปีที่ {preview.studentId < 200 ? '6/1' : '6/2'}
                </div>
              </div>
            </div>

            {/* Wallet & Card UID Summary Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '0.9rem 1.25rem',
                gap: '1.5rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 18v1c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14c1.1 0 2 .9 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>ยอดเงินใน Wallet</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#2563eb', lineHeight: 1.15 }}>
                    ฿{preview.walletBalance}
                  </div>
                </div>
              </div>

              <div style={{ width: '1px', height: '42px', background: '#e2e8f0' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.1-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Card ID / UID</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.1rem' }}>
                    <span style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a' }}>
                      {preview.oldRfidUid}
                    </span>
                    <button
                      type="button"
                      title="คัดลอกรหัส UID"
                      onClick={() => void copyCardUid(preview.oldRfidUid)}
                      style={{
                        border: '1px solid #cbd5e1',
                        background: copiedUid ? '#ecfdf5' : '#ffffff',
                        color: copiedUid ? '#059669' : '#475569',
                        borderRadius: '6px',
                        padding: '0.18rem 0.35rem',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                      }}
                    >
                      {copiedUid ? '✓' : '❐'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Details Grid + Card Illustration */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.65fr) minmax(240px, 0.85fr)',
              gap: '1.5rem',
              paddingTop: '1.15rem',
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '0.85rem',
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#2563eb">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM9 8.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zM13 16H5v-1c0-1.33 2.67-2 4-2s4 .67 4 2v1zm6-1h-5v-1.5h5V15zm0-3h-5v-1.5h5V12z" />
                </svg>
                <span>ข้อมูลเพิ่มเติม</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '0.65rem 1.5rem',
                  fontSize: '0.86rem',
                }}
              >
                <InfoRow label="รหัสนักเรียน" value={preview.studentCode} />
                <InfoRow label="รหัส RFID UID" value={preview.oldRfidUid} />
                <InfoRow label="ชื่อ-นามสกุล" value={`${preview.firstName} ${preview.lastName}`} />
                <InfoRow
                  label="สถานะบัตร"
                  value={
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: preview.oldCardStatus === 'active' ? '#ecfdf5' : '#fef3c7',
                        color: preview.oldCardStatus === 'active' ? '#047857' : '#b45309',
                        padding: '0.12rem 0.55rem',
                        borderRadius: '9999px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '9999px',
                          background: preview.oldCardStatus === 'active' ? '#16a34a' : '#f59e0b',
                        }}
                      />
                      {preview.oldCardStatus === 'active' ? 'ใช้งานได้ปกติ' : 'แจ้งหาย (Lost)'}
                    </span>
                  }
                />
                <InfoRow label="รหัสบัตรเดิม" value={`Card #${preview.expectedCardId} (${preview.oldCardStatus})`} />
                <InfoRow label="สิทธิ์การใช้งาน" value="นักเรียน" />
                <InfoRow
                  label="ยอด Wallet"
                  value={<span style={{ color: '#16a34a', fontWeight: 700 }}>฿{preview.walletBalance}</span>}
                />
                <InfoRow label="ระดับชั้น" value={preview.studentId < 200 ? 'มัธยมศึกษาปีที่ 6/1' : 'มัธยมศึกษาปีที่ 6/2'} />
              </div>
            </div>

            {/* Right Card Illustration Box */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.2rem 1rem',
                textAlign: 'center',
              }}
            >
              <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '0.45rem' }}>
                <svg width="96" height="72" viewBox="0 0 110 80" fill="none">
                  <g transform="rotate(-12 52 40)">
                    <rect x="14" y="16" width="76" height="48" rx="8" fill="url(#rfidCardGrad)" />
                    <rect x="22" y="26" width="16" height="12" rx="2.5" fill="#93c5fd" />
                    <path d="M52 28c4 4 4 12 0 16" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
                    <path d="M58 24c6 6 6 18 0 24" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
                    <path d="M64 20c8 8 8 24 0 32" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
                  </g>
                  <circle cx="84" cy="54" r="13" fill={preview.oldCardStatus === 'active' ? '#22c55e' : '#f59e0b'} stroke="#ffffff" strokeWidth="2.5" />
                  <path
                    d={preview.oldCardStatus === 'active' ? 'M78.5 54.5l3.8 3.8 7.2-7.8' : 'M84 48v7M84 59v1'}
                    stroke="#ffffff"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <defs>
                    <linearGradient id="rfidCardGrad" x1="14" y1="16" x2="90" y2="64" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#3b82f6" />
                      <stop offset="1" stopColor="#1d4ed8" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a' }}>
                {preview.oldCardStatus === 'active' ? 'บัตรพร้อมใช้งาน' : 'บัตรถูกแจ้งหาย'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                {preview.oldCardStatus === 'active'
                  ? 'สามารถใช้งานและออกบัตรใหม่ทดแทนได้'
                  : 'พร้อมดำเนินการออกบัตรใบใหม่ทดแทน'}
              </div>
            </div>
          </div>

          {/* Expandable New RFID Scan Form */}
          {reissueOpen && (
            <form
              onSubmit={reissueCard}
              style={{
                marginTop: '1.25rem',
                padding: '1rem 1.15rem',
                borderRadius: '12px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label htmlFor="rfidUid" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e3a8a' }}>
                  สแกนหรือกรอก RFID UID สำหรับบัตรใบใหม่
                </label>
                <button
                  type="button"
                  onClick={() => setRfidUid('RFID-TEST-' + Math.floor(100000 + Math.random() * 900000))}
                  style={{
                    fontSize: '0.78rem',
                    color: '#1d4ed8',
                    background: '#ffffff',
                    border: '1px solid #93c5fd',
                    borderRadius: '7px',
                    padding: '0.3rem 0.7rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  🎲 คลิกเพื่อสุ่ม UID บัตรใหม่
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
                <input
                  ref={rfidInputRef}
                  id="rfidUid"
                  value={rfidUid}
                  onChange={(event) => setRfidUid(event.target.value)}
                  placeholder="เช่น RFID-TEST-998811"
                  maxLength={50}
                  required
                  style={{
                    flex: 1,
                    minWidth: '220px',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '9px',
                    border: '1px solid #93c5fd',
                    background: '#ffffff',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '9px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: busy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {busy ? 'กำลังออกบัตร...' : 'ยืนยันเปลี่ยนบัตร'}
                </button>
                <button
                  type="button"
                  onClick={() => setReissueOpen(false)}
                  style={{
                    padding: '0.6rem 0.95rem',
                    borderRadius: '9px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Bottom Action Footer Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          paddingTop: '0.2rem',
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (onBackToDirectory) {
              onBackToDirectory();
            } else {
              setPreview(null);
              setSearchInput('');
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1.05rem',
            borderRadius: '10px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#334155',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
          }}
        >
          <span>←</span>
          <span>กลับไปหน้าค้นหา</span>
        </button>

        {preview && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleOpenReissuePanel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1.05rem',
                borderRadius: '10px',
                border: '1px solid #bfdbfe',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.1-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
              </svg>
              <span>ออกบัตรใหม่</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setInfoNotice(
                  'การเติมเงินเข้า Wallet ทำผ่านแอปผู้ปกครอง (Parent Mobile App: POST /parent/wallet/topup) ยอดเงินจะผูกกับบัญชีนักเรียนและโอนมาบัตรใหม่อัตโนมัติ',
                )
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1.1rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2zm0 2c4.42 0 8 1.34 8 2.5S16.42 9 12 9 4 7.66 4 6.5 7.58 4 12 4zm0 16c-4.42 0-8-1.34-8-2.5V14.7c1.82 1.1 4.72 1.8 8 1.8s6.18-.7 8-1.8v2.8c0 1.16-3.58 2.5-8 2.5z" />
              </svg>
              <span>เติมเงิน</span>
            </button>

            <button
              type="button"
              onClick={() => onGoToCardManagement?.(preview.expectedCardId)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1.05rem',
                borderRadius: '10px',
                border: '1px solid #fecaca',
                background: '#fee2e2',
                color: '#b91c1c',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
              </svg>
              <span>ระงับบัตร</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ color: '#475569', minWidth: '104px', flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#94a3b8' }}>:</span>
      <span style={{ color: '#0f172a', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const error = (await response.json()) as ApiError;
    switch (error.code) {
      case 'STUDENT_NOT_FOUND':
        return 'ไม่พบนักเรียน';
      case 'CARD_ALREADY_BOUND':
        return 'RFID UID นี้เคยลงทะเบียนแล้ว';
      case 'ACTIVE_CARD_CONFLICT':
        return 'ข้อมูลบัตรเปลี่ยนแปลง กรุณาค้นหานักเรียนใหม่';
      case 'CARD_NOT_REPLACEABLE':
        return 'ไม่พบบัตร active/lost ที่เปลี่ยนได้';
      case 'AUTHENTICATION_REQUIRED':
      case 'SESSION_EXPIRED':
        window.location.assign('/admin/auth/oidc/start');
        return 'กรุณาเข้าสู่ระบบใหม่';
      case 'STAFF_ACCESS_REQUIRED':
        return 'บัญชีนี้ไม่มีสิทธิ์ Staff';
      default:
        return error.message || 'คำขอไม่สำเร็จ กรุณาลองอีกครั้ง';
    }
  } catch {
    return `คำขอไม่สำเร็จ (HTTP ${response.status})`;
  }
}
