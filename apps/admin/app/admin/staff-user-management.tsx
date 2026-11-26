'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import StatusFilterButton from './status-filter-button';

interface StaffUserItem {
  id: number;
  username: string;
  fullName: string;
  role: 'staff' | 'admin';
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

interface StaffUserManagementProps {
  currentUsername: string;
}

type UserStatusFilter = 'all' | 'admin_active' | 'staff_active' | 'suspended';

export default function StaffUserManagement({ currentUsername }: StaffUserManagementProps) {
  const [users, setUsers] = useState<StaffUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Create form state
  const [createOpen, setCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'staff' | 'admin'>('staff');

  // Edit user modal state
  const [editTarget, setEditTarget] = useState<StaffUserItem | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<'staff' | 'admin'>('staff');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');
  const [editPassword, setEditPassword] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/admin/staff-users', { cache: 'no-store' });
      if (response.status === 401) {
        window.location.assign('/admin/login?error=session_error');
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? 'ไม่สามารถโหลดรายชื่อผู้ใช้งานได้');
        return;
      }
      const data = (await response.json()) as { items: StaffUserItem[] };
      setUsers(data.items ?? []);
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter === 'admin_active' && !(u.role === 'admin' && u.status === 'active')) {
        return false;
      }
      if (statusFilter === 'staff_active' && !(u.role === 'staff' && u.status === 'active')) {
        return false;
      }
      if (statusFilter === 'suspended' && u.status !== 'suspended') {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [users, search, statusFilter]);

  function toggleStatusFilter(next: Exclude<UserStatusFilter, 'all'>) {
    setStatusFilter((prev) => (prev === next ? 'all' : next));
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');

    const username = newUsername.trim();
    const fullName = newFullName.trim();
    if (!username || !fullName || newPassword.length < 8) {
      setError('กรุณากรอกชื่อผู้ใช้ ชื่อ-นามสกุล และรหัสผ่านอย่างน้อย 8 ตัวอักษร');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/admin/staff-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          fullName,
          password: newPassword,
          role: newRole,
        }),
      });
      if (response.status === 401) {
        window.location.assign('/admin/login?error=session_error');
        return;
      }
      const body = (await response.json().catch(() => null)) as
        | (StaffUserItem & { message?: string })
        | null;
      if (!response.ok) {
        setError(body?.message ?? 'ไม่สามารถสร้างบัญชีผู้ใช้งานได้');
        return;
      }
      if (body) {
        setUsers((prev) => [...prev, body]);
      }
      setNewUsername('');
      setNewFullName('');
      setNewPassword('');
      setNewRole('staff');
      setCreateOpen(false);
      setNotice(`สร้างบัญชี "${username}" เรียบร้อยแล้ว`);
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setCreating(false);
    }
  }

  async function patchUser(
    user: StaffUserItem,
    payload: { fullName?: string; role?: 'staff' | 'admin'; status?: 'active' | 'suspended'; password?: string },
    successMessage: string,
  ) {
    setBusyId(user.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/admin/staff-users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.status === 401) {
        window.location.assign('/admin/login?error=session_error');
        return false;
      }
      const body = (await response.json().catch(() => null)) as
        | (StaffUserItem & { message?: string })
        | null;
      if (!response.ok) {
        setError(body?.message ?? 'ไม่สามารถอัปเดตข้อมูลผู้ใช้งานได้');
        return false;
      }
      if (body) {
        setUsers((prev) => prev.map((item) => (item.id === user.id ? body : item)));
      }
      setNotice(successMessage);
      return true;
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      return false;
    } finally {
      setBusyId(null);
    }
  }

  function openEditModal(user: StaffUserItem) {
    setEditTarget(user);
    setEditFullName(user.fullName);
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditPassword('');
    setError('');
    setNotice('');
  }

  async function handleEditUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget) {
      return;
    }
    const trimmedName = editFullName.trim();
    if (!trimmedName) {
      setError('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    if (editPassword && editPassword.length < 8) {
      setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }

    const payload: {
      fullName?: string;
      role?: 'staff' | 'admin';
      status?: 'active' | 'suspended';
      password?: string;
    } = {
      fullName: trimmedName,
      role: editRole,
      status: editStatus,
    };
    if (editPassword) {
      payload.password = editPassword;
    }

    const ok = await patchUser(
      editTarget,
      payload,
      `บันทึกการแก้ไขข้อมูลของ "${editTarget.username}" เรียบร้อยแล้ว`,
    );
    if (ok) {
      setEditTarget(null);
      setEditPassword('');
    }
  }

  const adminCount = users.filter((u) => u.role === 'admin' && u.status === 'active').length;
  const staffCount = users.filter((u) => u.role === 'staff' && u.status === 'active').length;
  const suspendedCount = users.filter((u) => u.status === 'suspended').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
      {/* Header & Stats */}
      <section
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #dbe6f5',
          padding: '1.35rem 1.5rem',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              จัดการบัญชีผู้ใช้งาน Web Admin (Staff / Admin)
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              เพิ่มบัญชีเจ้าหน้าที่ ปรับสิทธิ์การใช้งาน (Admin / Staff) ระงับบัญชี และรีเซ็ตรหัสผ่าน (เข้าถึงได้เฉพาะ Admin)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <StatusFilterButton
              label="ทั้งหมด"
              value={users.length}
              bg="#f1f5f9"
              color="#334155"
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            />
            <StatusFilterButton
              label="Admin ใช้งานอยู่"
              value={adminCount}
              bg="#eff6ff"
              color="#1d4ed8"
              active={statusFilter === 'admin_active'}
              onClick={() => toggleStatusFilter('admin_active')}
            />
            <StatusFilterButton
              label="Staff ใช้งานอยู่"
              value={staffCount}
              bg="#ecfdf5"
              color="#047857"
              active={statusFilter === 'staff_active'}
              onClick={() => toggleStatusFilter('staff_active')}
            />
            <StatusFilterButton
              label="ถูกระงับ"
              value={suspendedCount}
              bg="#fef2f2"
              color="#b91c1c"
              active={statusFilter === 'suspended'}
              onClick={() => toggleStatusFilter('suspended')}
            />
          </div>
        </div>
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

      {/* Users Table */}
      <section
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #dbe6f5',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>
            รายชื่อผู้ใช้งานทั้งหมด ({filteredUsers.length})
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อผู้ใช้ หรือชื่อ-นามสกุล..."
              style={{ ...inputStyle, width: '250px' }}
            />
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
                whiteSpace: 'nowrap',
              }}
            >
              + เพิ่มผู้ใช้งาน
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
            กำลังโหลดรายชื่อผู้ใช้งาน...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={thStyle}>Username</th>
                  <th style={thStyle}>ชื่อ-นามสกุล</th>
                  <th style={thStyle}>บทบาท</th>
                  <th style={thStyle}>สถานะ</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isSelf = user.username === currentUsername;
                  const isBusy = busyId === user.id;
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{user.username}</span>
                        {isSelf && (
                          <span
                            style={{
                              marginLeft: '0.45rem',
                              fontSize: '0.72rem',
                              background: '#e0e7ff',
                              color: '#3730a3',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '9999px',
                              fontWeight: 600,
                            }}
                          >
                            บัญชีคุณ
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>{user.fullName}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            background: user.role === 'admin' ? '#dbeafe' : '#f1f5f9',
                            color: user.role === 'admin' ? '#1e40af' : '#334155',
                          }}
                        >
                          {user.role === 'admin' ? 'Admin' : 'Staff'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            background: user.status === 'active' ? '#dcfce7' : '#fee2e2',
                            color: user.status === 'active' ? '#166534' : '#991b1b',
                          }}
                        >
                          {user.status === 'active' ? 'ใช้งานอยู่' : 'ถูกระงับ'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => openEditModal(user)}
                            style={actionBtnStyle(isBusy, '#1d4ed8')}
                          >
                            แก้ไข
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
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
                      ไม่พบผู้ใช้งานที่ตรงกับตัวกรอง
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create User Modal */}
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
            onSubmit={handleCreateUser}
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
                เพิ่มบัญชีผู้ใช้งานใหม่
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                สร้างบัญชีสำหรับเจ้าหน้าที่ (Staff) หรือผู้ดูแลระบบ (Admin)
              </p>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '10px', padding: '0.65rem 0.85rem', fontSize: '0.82rem' }}>
                {error}
              </div>
            )}

            <div>
              <label style={labelStyle}>ชื่อผู้ใช้ (Username)</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="เช่น staff01"
                disabled={creating}
                autoFocus
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>ชื่อ-นามสกุล</label>
              <input
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="เช่น สมหญิง ใจดี"
                disabled={creating}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>รหัสผ่าน (อย่างน้อย 8 ตัว)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={creating}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>บทบาท (Role)</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'staff' | 'admin')}
                disabled={creating}
                style={inputStyle}
              >
                <option value="staff">Staff (เจ้าหน้าที่)</option>
                <option value="admin">Admin (ผู้ดูแลระบบ)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.55rem', marginTop: '0.35rem' }}>
              <button
                type="button"
                disabled={creating}
                onClick={() => setCreateOpen(false)}
                style={actionBtnStyle(creating)}
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
                {creating ? 'กำลังสร้าง...' : 'สร้างบัญชีผู้ใช้'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User Modal */}
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
            onSubmit={handleEditUser}
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
                แก้ไขบัญชีผู้ใช้: {editTarget.username}
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                แก้ไขชื่อ-นามสกุล บทบาท สถานะ หรือเปลี่ยนรหัสผ่าน
              </p>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '10px', padding: '0.65rem 0.85rem', fontSize: '0.82rem' }}>
                {error}
              </div>
            )}

            <div>
              <label style={labelStyle}>ชื่อ-นามสกุล</label>
              <input
                type="text"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                autoFocus
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>บทบาท (Role)</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as 'staff' | 'admin')}
                  disabled={editTarget.username === currentUsername}
                  style={inputStyle}
                >
                  <option value="staff">Staff (เจ้าหน้าที่)</option>
                  <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>สถานะ</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'active' | 'suspended')}
                  disabled={editTarget.username === currentUsername}
                  style={inputStyle}
                >
                  <option value="active">ใช้งานอยู่</option>
                  <option value="suspended">ถูกระงับ</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>รหัสผ่านใหม่ (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)</label>
              <input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.55rem', marginTop: '0.35rem' }}>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                style={actionBtnStyle(false)}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={busyId === editTarget.id}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </form>
        </div>
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

function actionBtnStyle(disabled: boolean, color = '#1e293b'): React.CSSProperties {
  return {
    padding: '0.35rem 0.65rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    background: disabled ? '#f1f5f9' : '#ffffff',
    color: disabled ? '#94a3b8' : color,
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
