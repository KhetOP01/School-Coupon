'use client';

import { useState } from 'react';
import CardReissueForm from './reissue-form';
import CardManagementForm from './card-management-form';
import SettlementApprovalForm from './settlement-approval-form';

export default function AdminDashboard({ sessionExpiry }: { sessionExpiry?: string }) {
  const [activeTab, setActiveTab] = useState<'reissue' | 'cards' | 'settlements'>('reissue');
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/admin/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    window.location.href = '/admin/auth/oidc/start';
  }

  const tabButtonStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.25rem',
    border: 'none',
    borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
    background: isActive ? '#f8fafc' : 'transparent',
    color: isActive ? '#2563eb' : '#64748b',
    fontWeight: (isActive ? 700 : 500) as number,
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '1.25rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', margin: 0, color: '#0f172a' }}>🏫 ระบบจัดการคูปองดิจิทัลโรงเรียน</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            School Cashless RFID Administration Portal (Staff Admin)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {sessionExpiry && (
            <span style={{ fontSize: '0.8rem', color: '#059669', background: '#ecfdf5', padding: '0.35rem 0.65rem', borderRadius: '9999px', border: '1px solid #a7f3d0' }}>
              ● เข้าสู่ระบบแล้ว (Active)
            </span>
          )}
          <button
            type="button"
            disabled={loggingOut}
            onClick={handleLogout}
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.85rem',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              color: '#334155',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {loggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ (Logout)'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('reissue')}
          style={tabButtonStyle(activeTab === 'reissue')}
        >
          💳 ออกบัตรใหม่ (UC-01)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cards')}
          style={tabButtonStyle(activeTab === 'cards')}
        >
          ❄️ อายัด/คืนเงินนักเรียน (UC-02)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settlements')}
          style={tabButtonStyle(activeTab === 'settlements')}
        >
          📊 อนุมัติยอดโอนร้านค้า (UC-07)
        </button>
      </nav>

      {/* Tab Panels */}
      <main>
        {activeTab === 'reissue' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>ออกบัตร RFID ทดแทนกรณีบัตรหาย/ชำรุด</h2>
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                ค้นหานักเรียน ตรวจสอบบัตรเดิมและยอด Wallet คงเหลือ ก่อนแตะสแกนผูกบัตรใบใหม่
              </p>
            </div>
            <CardReissueForm />
          </div>
        )}

        {activeTab === 'cards' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>จัดการสถานะบัตรและคืนเงินนักเรียนย้ายออก</h2>
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                ระงับบัตรชั่วคราวตามที่ผู้ปกครองแจ้ง หรือทำเรื่องคืนเงินและปิดบัตรถาวรเมื่อย้ายออก
              </p>
            </div>
            <CardManagementForm />
          </div>
        )}

        {activeTab === 'settlements' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>สรุปยอดขายรายวันและอนุมัติการโอนเงิน</h2>
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                ตรวจสอบรายการยอดขายสุทธิของร้านค้าที่ตัดรอบเมื่อสิ้นวัน และกดอนุมัติการโอนเงิน
              </p>
            </div>
            <SettlementApprovalForm />
          </div>
        )}
      </main>
    </div>
  );
}
