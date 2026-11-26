'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import StallManagement from './stall-management';
import StatusFilterButton from './status-filter-button';

interface AdminMerchantItem {
  id: number;
  merchantCode: string;
  name: string;
  status: 'active' | 'suspended' | 'inactive';
  stallCode: string | null;
  createdAt: string;
}

interface StallOptionItem {
  id: number;
  stallCode: string;
  winnerName: string;
  merchantId: number | null;
}

type MerchantStatusFilter = 'all' | 'active' | 'suspended' | 'inactive';

export default function MerchantManagement() {
  const [subTab, setSubTab] = useState<'merchants' | 'stalls'>('merchants');
  const [merchants, setMerchants] = useState<AdminMerchantItem[]>([]);
  const [stalls, setStalls] = useState<StallOptionItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<MerchantStatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Create merchant modal
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newStallCode, setNewStallCode] = useState('');

  // Edit merchant modal
  const [editTarget, setEditTarget] = useState<AdminMerchantItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended' | 'inactive'>('active');
  const [editPin, setEditPin] = useState('');
  const [editStallCode, setEditStallCode] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete merchant confirm modal
  const [deleteTarget, setDeleteTarget] = useState<AdminMerchantItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadMerchants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [merchantsRes, stallsRes] = await Promise.all([
        fetch('/admin/merchants', { cache: 'no-store' }),
        fetch('/admin/stalls', { cache: 'no-store' }),
      ]);
      if (merchantsRes.status === 401 || stallsRes.status === 401) {
        window.location.assign('/admin/login?error=session_error');
        return;
      }
      if (!merchantsRes.ok) {
        const body = (await merchantsRes.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? 'ไม่สามารถโหลดรายชื่อร้านค้าได้');
        return;
      }
      const data = (await merchantsRes.json()) as { items: AdminMerchantItem[] };
      setMerchants(data.items ?? []);
      if (stallsRes.ok) {
        const stallsData = (await stallsRes.json()) as { items: StallOptionItem[] };
        setStalls(stallsData.items ?? []);
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'merchants') {
      void loadMerchants();
    }
  }, [subTab, loadMerchants]);

  async function handleCreateMerchant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!newCode.trim() || !newName.trim() || !/^\d{6}$/.test(newPin.trim())) {
      setError('กรุณากรอกรหัสร้าน ชื่อร้าน และ PIN ตัวเลข 6 หลักให้ครบถ้วน');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/admin/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantCode: newCode.trim().toUpperCase(),
          name: newName.trim(),
          pin: newPin.trim(),
          stallCode: newStallCode || null,
        }),
      });
      if (response.status === 401) {
        window.location.assign('/admin/login?error=session_error');
        return;
      }
      const body = (await response.json().catch(() => null)) as
        | (AdminMerchantItem & { message?: string })
        | null;
      if (!response.ok) {
        setError(body?.message ?? 'ไม่สามารถเพิ่มร้านค้าได้');
        return;
      }
      setNewCode('');
      setNewName('');
      setNewPin('');
      setNewStallCode('');
      setCreateOpen(false);
      await loadMerchants();
      setNotice(`เพิ่มร้านค้า "${body?.merchantCode ?? ''}" เรียบร้อยแล้ว`);
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setCreating(false);
    }
  }

  function openEditModal(item: AdminMerchantItem) {
    setEditTarget(item);
    setEditName(item.name);
    setEditStatus(item.status);
    setEditPin('');
    setEditStallCode(item.stallCode ?? '');
    setError('');
    setNotice('');
  }

  async function handleEditMerchant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget) {
      return;
    }
    if (!editName.trim()) {
      setError('กรุณากรอกชื่อร้านค้า');
      return;
    }
    if (editPin.trim() && !/^\d{6}$/.test(editPin.trim())) {
      setError('รหัส PIN ร้านค้าต้องเป็นตัวเลข 6 หลัก');
      return;
    }

    setSavingEdit(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/admin/merchants/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          status: editStatus,
          stallCode: editStallCode || null,
          ...(editPin.trim() ? { pin: editPin.trim() } : {}),
        }),
      });
      if (response.status === 401) {
        window.location.assign('/admin/login?error=session_error');
        return;
      }
      const body = (await response.json().catch(() => null)) as
        | (AdminMerchantItem & { message?: string })
        | null;
      if (!response.ok) {
        setError(body?.message ?? 'ไม่สามารถแก้ไขข้อมูลร้านค้าได้');
        return;
      }
      setEditTarget(null);
      await loadMerchants();
      setNotice(`บันทึกข้อมูลร้าน "${editTarget.merchantCode}" เรียบร้อยแล้ว`);
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteMerchant() {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/admin/merchants/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (response.status === 401) {
        window.location.assign('/admin/login?error=session_error');
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? 'ไม่สามารถลบร้านค้าได้');
        setDeleteTarget(null);
        return;
      }
      setMerchants((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setNotice(`ลบร้านค้า "${deleteTarget.merchantCode}" เรียบร้อยแล้ว`);
      setDeleteTarget(null);
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setDeleting(false);
    }
  }

  const activeCount = merchants.filter((m) => m.status === 'active').length;
  const suspendedCount = merchants.filter((m) => m.status === 'suspended').length;
  const inactiveCount = merchants.filter((m) => m.status === 'inactive').length;
  const filteredMerchants =
    statusFilter === 'all'
      ? merchants
      : merchants.filter((m) => m.status === statusFilter);

  function toggleStatusFilter(next: Exclude<MerchantStatusFilter, 'all'>) {
    setStatusFilter((prev) => (prev === next ? 'all' : next));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
      {/* Sub-tab switcher */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setSubTab('merchants')}
          style={{
            padding: '0.55rem 1.05rem',
            borderRadius: '10px',
            border: subTab === 'merchants' ? 'none' : '1px solid #cbd5e1',
            background: subTab === 'merchants' ? '#1e3a8a' : '#ffffff',
            color: subTab === 'merchants' ? '#ffffff' : '#334155',
            fontWeight: 700,
            fontSize: '0.86rem',
            cursor: 'pointer',
          }}
        >
          รายชื่อร้านค้า ({merchants.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('stalls')}
          style={{
            padding: '0.55rem 1.05rem',
            borderRadius: '10px',
            border: subTab === 'stalls' ? 'none' : '1px solid #cbd5e1',
            background: subTab === 'stalls' ? '#1e3a8a' : '#ffffff',
            color: subTab === 'stalls' ? '#ffffff' : '#334155',
            fontWeight: 700,
            fontSize: '0.86rem',
            cursor: 'pointer',
          }}
        >
          ล็อคประมูลร้านค้า (Canteen Stalls)
        </button>
      </div>

      {subTab === 'stalls' ? (
        <StallManagement />
      ) : (
        <>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: '1 1 360px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                  จัดการร้านค้า (Merchants)
                </h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                  เพิ่มร้านค้า แก้ไขชื่อร้าน สถานะ (เปิด/ระงับ) และรีเซ็ต PIN 6 หลัก
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <StatusFilterButton
                  label="ทั้งหมด"
                  value={merchants.length}
                  bg="#f1f5f9"
                  color="#334155"
                  active={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                />
                <StatusFilterButton
                  label="เปิดใช้งาน"
                  value={activeCount}
                  bg="#ecfdf5"
                  color="#047857"
                  active={statusFilter === 'active'}
                  onClick={() => toggleStatusFilter('active')}
                />
                <StatusFilterButton
                  label="ถูกระงับ"
                  value={suspendedCount}
                  bg="#fef2f2"
                  color="#b91c1c"
                  active={statusFilter === 'suspended'}
                  onClick={() => toggleStatusFilter('suspended')}
                />
                <StatusFilterButton
                  label="ปิดชั่วคราว"
                  value={inactiveCount}
                  bg="#f8fafc"
                  color="#475569"
                  active={statusFilter === 'inactive'}
                  onClick={() => toggleStatusFilter('inactive')}
                />
              </div>
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
              + เพิ่มร้านค้าใหม่
            </button>
          </section>

          {error && !createOpen && !editTarget && (
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
                กำลังโหลดรายชื่อร้านค้า...
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                      <th style={thStyle}>รหัสร้าน</th>
                      <th style={thStyle}>ชื่อร้านค้า</th>
                      <th style={thStyle}>ล็อคประมูล</th>
                      <th style={thStyle}>สถานะ</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMerchants.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.merchantCode}</span>
                        </td>
                        <td style={tdStyle}>{item.name}</td>
                        <td style={tdStyle}>{item.stallCode ?? '-'}</td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: '9999px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              background:
                                item.status === 'active'
                                  ? '#dcfce7'
                                  : item.status === 'suspended'
                                    ? '#fee2e2'
                                    : '#f1f5f9',
                              color:
                                item.status === 'active'
                                  ? '#166534'
                                  : item.status === 'suspended'
                                    ? '#991b1b'
                                    : '#475569',
                            }}
                          >
                            {item.status === 'active'
                              ? 'เปิดใช้งาน'
                              : item.status === 'suspended'
                                ? 'ถูกระงับ'
                                : 'ปิดชั่วคราว'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.45rem' }}>
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
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
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredMerchants.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            padding: '1.5rem 0.5rem',
                            textAlign: 'center',
                            color: '#64748b',
                            fontSize: '0.86rem',
                          }}
                        >
                          ไม่พบร้านค้าที่ตรงกับสถานะที่เลือก
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {deleteTarget && (
            <div style={modalBackdropStyle}>
              <div style={modalCardStyle}>
                <h4 style={{ margin: 0, fontSize: '1.02rem', color: '#0f172a' }}>
                  ยืนยันการลบร้านค้า: {deleteTarget.merchantCode}
                </h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569' }}>
                  คุณต้องการลบร้านค้า &quot;{deleteTarget.name}&quot; ออกจากระบบใช่หรือไม่? (หากร้านค้ามีประวัติการชำระเงินแล้ว ระบบจะไม่อนุญาตให้ลบ)
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
                    onClick={() => void handleDeleteMerchant()}
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
                    {deleting ? 'กำลังลบ...' : 'ยืนยันลบร้านค้า'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {createOpen && (
            <div style={modalBackdropStyle}>
              <form onSubmit={handleCreateMerchant} style={modalCardStyle}>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.02rem', color: '#0f172a' }}>
                    เพิ่มร้านค้าใหม่ (กรณีพิเศษ)
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                    สำหรับร้านค้าพิเศษที่ไม่ต้องผูกล็อคประมูล (ร้านที่ประมูลล็อคให้เพิ่มในแท็บล็อคประมูลและลงทะเบียนผ่านแอป)
                  </p>
                </div>

                {error && <div style={modalErrorStyle}>{error}</div>}

                <div>
                  <label style={labelStyle}>รหัสร้านค้า (เช่น M-002)</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="M-002"
                    autoFocus
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>ชื่อร้านค้า</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="เช่น ร้านข้าวแกงแม่นิด"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>PIN (6 หลัก)</label>
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    maxLength={6}
                    placeholder="123456"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>ล็อคประมูล (ถ้ามี)</label>
                  <select
                    value={newStallCode}
                    onChange={(e) => setNewStallCode(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">- ไม่ผูกล็อคประมูล -</option>
                    {stalls
                      .filter((s) => s.merchantId === null)
                      .map((s) => (
                        <option key={s.id} value={s.stallCode}>
                          {s.stallCode} — {s.winnerName}
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.55rem', marginTop: '0.35rem' }}>
                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => setCreateOpen(false)}
                    style={cancelBtnStyle}
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" disabled={creating} style={saveBtnStyle}>
                    {creating ? 'กำลังสร้าง...' : 'สร้างร้านค้า'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {editTarget && (
            <div style={modalBackdropStyle}>
              <form onSubmit={handleEditMerchant} style={modalCardStyle}>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.02rem', color: '#0f172a' }}>
                    แก้ไขร้านค้า: {editTarget.merchantCode}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                    แก้ไขชื่อร้าน สถานะ หรือรีเซ็ต PIN 6 หลัก
                  </p>
                </div>

                {error && <div style={modalErrorStyle}>{error}</div>}

                <div>
                  <label style={labelStyle}>ชื่อร้านค้า</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>สถานะ</label>
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as 'active' | 'suspended' | 'inactive')
                    }
                    style={inputStyle}
                  >
                    <option value="active">เปิดใช้งาน</option>
                    <option value="suspended">ถูกระงับ</option>
                    <option value="inactive">ปิดชั่วคราว</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>ล็อคประมูล</label>
                  <select
                    value={editStallCode}
                    onChange={(e) => setEditStallCode(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">- ไม่ผูกล็อคประมูล -</option>
                    {stalls
                      .filter((s) => s.merchantId === null || s.merchantId === editTarget.id)
                      .map((s) => (
                        <option key={s.id} value={s.stallCode}>
                          {s.stallCode} — {s.winnerName}
                          {s.merchantId === editTarget.id ? ' (ล็อคปัจจุบัน)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>รีเซ็ต PIN ใหม่ (6 หลัก, เว้นว่างถ้าไม่เปลี่ยน)</label>
                  <input
                    type="password"
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value)}
                    maxLength={6}
                    placeholder="••••••"
                    style={inputStyle}
                  />
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
                    ลบร้านค้า
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
                    <button type="submit" disabled={savingEdit} style={saveBtnStyle}>
                      {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}

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

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
  padding: '1rem',
};

const modalCardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '16px',
  padding: '1.45rem',
  width: '100%',
  maxWidth: '440px',
  boxShadow: '0 18px 36px rgba(15, 23, 42, 0.2)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
};

const modalErrorStyle: React.CSSProperties = {
  background: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#991b1b',
  borderRadius: '10px',
  padding: '0.65rem 0.85rem',
  fontSize: '0.82rem',
};

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

const saveBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  border: 'none',
  background: '#2563eb',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.84rem',
  cursor: 'pointer',
};
