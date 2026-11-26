'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

interface CanteenStallItem {
  id: number;
  stallCode: string;
  winnerName: string;
  winnerPhone: string;
  feePercent: string;
  merchantId: number | null;
  merchantCode: string | null;
  merchantName: string | null;
  createdAt: string;
}

export default function StallManagement() {
  const [stalls, setStalls] = useState<CanteenStallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [stallCode, setStallCode] = useState('');
  const [winnerName, setWinnerName] = useState('');
  const [winnerPhone, setWinnerPhone] = useState('');
  const [feePercent, setFeePercent] = useState('2.00');

  // Edit modal state
  const [editTarget, setEditTarget] = useState<CanteenStallItem | null>(null);
  const [editWinnerName, setEditWinnerName] = useState('');
  const [editWinnerPhone, setEditWinnerPhone] = useState('');
  const [editFeePercent, setEditFeePercent] = useState('2.00');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState<CanteenStallItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadStalls = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/admin/stalls', { cache: 'no-store' });
      if (response.status === 401) {
        window.location.assign('/admin/login?error=session_error');
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? 'ไม่สามารถโหลดรายการล็อคร้านค้าได้');
        return;
      }
      const data = (await response.json()) as { items: CanteenStallItem[] };
      setStalls(data.items ?? []);
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStalls();
  }, [loadStalls]);

  async function handleCreateStall(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!stallCode.trim() || !winnerName.trim() || !winnerPhone.trim()) {
      setError('กรุณากรอกเลขที่ล็อค ชื่อผู้ชนะประมูล และเบอร์โทรให้ครบถ้วน');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/admin/stalls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stallCode: stallCode.trim().toUpperCase(),
          winnerName: winnerName.trim(),
          winnerPhone: winnerPhone.trim(),
          feePercent: feePercent.trim() || '2.00',
        }),
      });
      if (response.status === 401) {
        window.location.assign('/admin/login?error=session_error');
        return;
      }
      const body = (await response.json().catch(() => null)) as
        | (CanteenStallItem & { message?: string })
        | null;
      if (!response.ok) {
        setError(body?.message ?? 'ไม่สามารถเพิ่มข้อมูลล็อคร้านค้าได้');
        return;
      }
      if (body) {
        setStalls((prev) => [...prev, body]);
      }
      setStallCode('');
      setWinnerName('');
      setWinnerPhone('');
      setFeePercent('2.00');
      setCreateOpen(false);
      setNotice(`เพิ่มล็อคประมูล "${body?.stallCode ?? ''}" เรียบร้อยแล้ว`);
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setCreating(false);
    }
  }

  function openEditModal(stall: CanteenStallItem) {
    setEditTarget(stall);
    setEditWinnerName(stall.winnerName);
    setEditWinnerPhone(stall.winnerPhone);
    setEditFeePercent(stall.feePercent);
    setError('');
    setNotice('');
  }

  async function handleEditStall(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget) {
      return;
    }
    if (!editWinnerName.trim() || !editWinnerPhone.trim()) {
      setError('กรุณากรอกชื่อผู้ชนะประมูลและเบอร์โทรให้ครบถ้วน');
      return;
    }

    setSavingEdit(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/admin/stalls/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winnerName: editWinnerName.trim(),
          winnerPhone: editWinnerPhone.trim(),
          feePercent: editFeePercent.trim() || '2.00',
        }),
      });
      if (response.status === 401) {
        window.location.assign('/admin/login?error=session_error');
        return;
      }
      const body = (await response.json().catch(() => null)) as
        | (CanteenStallItem & { message?: string })
        | null;
      if (!response.ok) {
        setError(body?.message ?? 'ไม่สามารถแก้ไขข้อมูลล็อคประมูลได้');
        return;
      }
      if (body) {
        setStalls((prev) => prev.map((item) => (item.id === editTarget.id ? body : item)));
      }
      setEditTarget(null);
      setNotice(`บันทึกการแก้ไขล็อค "${editTarget.stallCode}" เรียบร้อยแล้ว`);
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteStall() {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/admin/stalls/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (response.status === 401) {
        window.location.assign('/admin/login?error=session_error');
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? 'ไม่สามารถลบข้อมูลล็อคประมูลได้');
        setDeleteTarget(null);
        return;
      }
      setStalls((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setNotice(`ลบข้อมูลล็อค "${deleteTarget.stallCode}" เรียบร้อยแล้ว`);
      setDeleteTarget(null);
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
      <section
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #dbe6f5',
          padding: '1.35rem 1.5rem',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
            จัดการล็อคประมูลร้านค้า (Canteen Stalls)
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem', color: '#64748b' }}>
            บันทึกผู้ชนะประมูลล็อคเพื่อให้ร้านค้าใช้ยืนยันตัวตนตอนลงทะเบียนในแอปร้านค้า (apps/merchant-mobile)
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError('');
            setNotice('');
            setCreateOpen(true);
          }}
          style={{
            padding: '0 1.05rem',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            height: '40px',
          }}
        >
          + เพิ่มผู้ชนะประมูลล็อค
        </button>
      </section>

      {error && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '12px',
            padding: '0.8rem 1rem',
            fontSize: '0.88rem',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            borderRadius: '12px',
            padding: '0.8rem 1rem',
            fontSize: '0.88rem',
            fontWeight: 500,
          }}
        >
          {notice}
        </div>
      )}

      <section
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #dbe6f5',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
        }}
      >
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
            กำลังโหลดรายการล็อคประมูล...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={thStyle}>เลขที่ล็อค</th>
                  <th style={thStyle}>ผู้ชนะประมูล</th>
                  <th style={thStyle}>เบอร์โทรยืนยัน</th>
                  <th style={thStyle}>ค่าธรรมเนียม</th>
                  <th style={thStyle}>สถานะลงทะเบียน</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {stalls.map((stall) => (
                  <tr key={stall.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{stall.stallCode}</span>
                    </td>
                    <td style={tdStyle}>{stall.winnerName}</td>
                    <td style={tdStyle}>{stall.winnerPhone}</td>
                    <td style={tdStyle}>{stall.feePercent}%</td>
                    <td style={tdStyle}>
                      {stall.merchantCode ? (
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            background: '#dcfce7',
                            color: '#166534',
                          }}
                        >
                          ลงทะเบียนแล้ว ({stall.merchantCode}: {stall.merchantName})
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            background: '#fef3c7',
                            color: '#92400e',
                          }}
                        >
                          รอร้านค้าลงทะเบียน
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(stall)}
                        style={{
                          padding: '0.35rem 0.7rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#1d4ed8',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        แก้ไข
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <form
            onSubmit={handleEditStall}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.45rem',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 18px 36px rgba(15, 23, 42, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div>
              <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.02rem', color: '#0f172a' }}>
                แก้ไขล็อคประมูล: {editTarget.stallCode}
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                แก้ไขชื่อผู้ชนะประมูล เบอร์โทรยืนยัน หรือค่าธรรมเนียม (%)
              </p>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '10px', padding: '0.65rem 0.85rem', fontSize: '0.82rem' }}>
                {error}
              </div>
            )}

            <div>
              <label style={labelStyle}>ชื่อผู้ชนะประมูล</label>
              <input
                type="text"
                value={editWinnerName}
                onChange={(e) => setEditWinnerName(e.target.value)}
                autoFocus
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>เบอร์โทรยืนยัน</label>
                <input
                  type="text"
                  value={editWinnerPhone}
                  onChange={(e) => setEditWinnerPhone(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>ค่าธรรมเนียม (%)</label>
                <input
                  type="text"
                  value={editFeePercent}
                  onChange={(e) => setEditFeePercent(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.55rem', marginTop: '0.35rem' }}>
              <button
                type="button"
                disabled={savingEdit}
                onClick={() => {
                  const target = editTarget;
                  setEditTarget(null);
                  setError('');
                  setNotice('');
                  setDeleteTarget(target);
                }}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                ลบล็อค
              </button>
              <div style={{ display: 'flex', gap: '0.55rem' }}>
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setEditTarget(null)}
                  style={cancelBtnStyle}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: savingEdit ? 'wait' : 'pointer',
                  }}
                >
                  {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.45rem',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 18px 36px rgba(15, 23, 42, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <h4 style={{ margin: 0, fontSize: '1.02rem', color: '#0f172a' }}>
              ยืนยันการลบล็อคประมูล: {deleteTarget.stallCode}
            </h4>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569' }}>
              คุณต้องการลบข้อมูลล็อค &quot;{deleteTarget.stallCode}&quot; ({deleteTarget.winnerName}) ออกจากระบบใช่หรือไม่?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.55rem', marginTop: '0.35rem' }}>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                style={cancelBtnStyle}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDeleteStall()}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: deleting ? 'wait' : 'pointer',
                }}
              >
                {deleting ? 'กำลังลบ...' : 'ยืนยันลบล็อค'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <form
            onSubmit={handleCreateStall}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.45rem',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 18px 36px rgba(15, 23, 42, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div>
              <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.02rem', color: '#0f172a' }}>
                เพิ่มข้อมูลผู้ชนะประมูลล็อค
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                ร้านค้าจะต้องกรอกเลขที่ล็อคและเบอร์โทรนี้ให้ตรงกันจึงจะลงทะเบียนในแอปได้
              </p>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '10px', padding: '0.65rem 0.85rem', fontSize: '0.82rem' }}>
                {error}
              </div>
            )}

            <div>
              <label style={labelStyle}>เลขที่ล็อค (Stall Code)</label>
              <input
                type="text"
                value={stallCode}
                onChange={(e) => setStallCode(e.target.value)}
                placeholder="เช่น A-04"
                autoFocus
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>ชื่อผู้ชนะประมูล</label>
              <input
                type="text"
                value={winnerName}
                onChange={(e) => setWinnerName(e.target.value)}
                placeholder="เช่น ร้านข้าวมันไก่นายเอก"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>เบอร์โทรยืนยัน</label>
                <input
                  type="text"
                  value={winnerPhone}
                  onChange={(e) => setWinnerPhone(e.target.value)}
                  placeholder="0844444444"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>ค่าธรรมเนียม (%)</label>
                <input
                  type="text"
                  value={feePercent}
                  onChange={(e) => setFeePercent(e.target.value)}
                  placeholder="2.00"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.55rem', marginTop: '0.35rem' }}>
              <button
                type="button"
                disabled={creating}
                onClick={() => setCreateOpen(false)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={creating}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: creating ? 'wait' : 'pointer',
                }}
              >
                {creating ? 'กำลังบันทึก...' : 'บันทึกล็อคประมูล'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '0.45rem 0.9rem',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  color: '#475569',
  fontWeight: 600,
  fontSize: '0.84rem',
  cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '0.35rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.55rem 0.75rem',
  borderRadius: '9px',
  border: '1px solid #cbd5e1',
  background: '#f8fafc',
  fontSize: '0.86rem',
  color: '#0f172a',
  outline: 'none',
  height: '40px',
};

const thStyle: React.CSSProperties = {
  padding: '0.65rem 0.5rem',
  fontWeight: 700,
  fontSize: '0.8rem',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 0.5rem',
  verticalAlign: 'middle',
};
