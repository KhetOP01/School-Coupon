'use client';

import { FormEvent, useState } from 'react';

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

export default function CardReissueForm() {
  const [studentId, setStudentId] = useState('');
  const [preview, setPreview] = useState<CardReissuePreview | null>(null);
  const [rfidUid, setRfidUid] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<CardReissueResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookupStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setResult(null);
    setPreview(null);

    if (!/^[1-9]\d*$/.test(studentId)) {
      setError('กรุณาระบุ Student ID เป็นจำนวนเต็มบวก');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        `/admin/students/${encodeURIComponent(studentId)}/card-reissue-preview`,
        { cache: 'no-store' },
      );
      if (!response.ok) {
        setError(await getErrorMessage(response));
        return;
      }
      setPreview((await response.json()) as CardReissuePreview);
    } catch {
      setError('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง');
    } finally {
      setBusy(false);
    }
  }

  async function reissueCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview) {
      return;
    }
    if (!rfidUid.trim() || rfidUid.length > 50) {
      setError('กรุณาสแกน RFID UID ที่มีความยาวไม่เกิน 50 ตัวอักษร');
      return;
    }

    setBusy(true);
    setError('');
    setResult(null);
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
      setResult((await response.json()) as CardReissueResult);
      setPreview(null);
      setRfidUid('');
    } catch {
      setError('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      const response = await fetch('/admin/auth/logout', { method: 'POST' });
      if (response.ok) {
        window.location.assign('/admin/auth/oidc/start');
        return;
      }
      setError(await getErrorMessage(response));
    } catch {
      setError('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <form onSubmit={lookupStudent}>
        <label htmlFor="studentId">Student ID</label>
        <input
          id="studentId"
          inputMode="numeric"
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
          required
        />
        <button type="submit" disabled={busy}>
          ค้นหานักเรียน
        </button>
      </form>

      {preview && (
        <form onSubmit={reissueCard}>
          <h2>ตรวจสอบข้อมูลนักเรียน</h2>
          <dl>
            <dt>รหัสนักเรียน</dt>
            <dd>{preview.studentCode}</dd>
            <dt>ชื่อ</dt>
            <dd>
              {preview.firstName} {preview.lastName}
            </dd>
            <dt>บัตรเดิม</dt>
            <dd>
              {preview.oldRfidUid} ({preview.oldCardStatus})
            </dd>
            <dt>ยอด Wallet</dt>
            <dd>{preview.walletBalance} บาท</dd>
          </dl>
          <label htmlFor="rfidUid">สแกน RFID UID ใหม่</label>
          <input
            id="rfidUid"
            value={rfidUid}
            onChange={(event) => setRfidUid(event.target.value)}
            maxLength={50}
            required
          />
          <button type="submit" disabled={busy}>
            ยืนยันเปลี่ยนบัตร
          </button>
        </form>
      )}

      {error && <p role="alert">{error}</p>}
      {result && (
        <p role="status">
          ออกบัตรใหม่สำเร็จ: {result.newRfidUid}; ยอด Wallet คงเดิม {result.walletBalance} บาท
        </p>
      )}
      <button type="button" onClick={logout} disabled={busy}>
        ออกจากระบบ
      </button>
    </section>
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
