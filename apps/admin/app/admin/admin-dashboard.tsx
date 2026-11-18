'use client';

import { useState } from 'react';
import CardReissueForm from './reissue-form';
import CardManagementForm from './card-management-form';
import SettlementApprovalForm from './settlement-approval-form';
import StudentDirectory from './student-directory';

type ActiveTab = 'directory' | 'reissue' | 'cards' | 'settlements';

export default function AdminDashboard({ sessionExpiry }: { sessionExpiry?: string }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('directory');
  const [hoveredTab, setHoveredTab] = useState<ActiveTab | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | undefined>(undefined);
  const [selectedCardId, setSelectedCardId] = useState<number | undefined>(undefined);
  const [formKey, setFormKey] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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

  function openReissueForStudent(studentId: number) {
    setSelectedStudentId(studentId);
    setFormKey((k) => k + 1);
    setActiveTab('reissue');
  }

  function openCardManagementForCard(cardId: number) {
    setSelectedCardId(cardId);
    setSelectedStudentId(undefined);
    setFormKey((k) => k + 1);
    setActiveTab('cards');
  }

  function openCardManagement() {
    setSelectedCardId(undefined);
    setSelectedStudentId(undefined);
    setFormKey((k) => k + 1);
    setActiveTab('cards');
  }

  const navTabs: Array<{
    id: ActiveTab;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'directory',
      title: 'ทะเบียนนักเรียน',
      subtitle: '(Directory)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      ),
    },
    {
      id: 'reissue',
      title: 'ออกบัตรใหม่',
      subtitle: '(UC-01)',
      icon: (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
        </svg>
      ),
    },
    {
      id: 'cards',
      title: 'อายัด/คืนเงินนักเรียน',
      subtitle: '(UC-02)',
      icon: (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
        </svg>
      ),
    },
    {
      id: 'settlements',
      title: 'อนุมัติยอดโอนร้านค้า',
      subtitle: '(UC-07)',
      icon: (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-4 15H8v-4h2v4zm3 0h-2v-6h2v6zm3 0h-2v-3h2v3zm-3-8V3.5L18.5 9H13z" />
        </svg>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#eef4fb' }}>
      {/* Left Sidebar */}
      <aside
        style={{
          width: '245px',
          flexShrink: 0,
          background: 'linear-gradient(180deg, #1b3161 0%, #102044 100%)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          padding: '1.35rem 0.9rem 1rem',
          boxSizing: 'border-box',
        }}
      >
        <div>
          {/* School Logo */}
          <div style={{ textAlign: 'center', marginBottom: '1.65rem', padding: '0 0.25rem' }}>
            <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '0.55rem' }}>
              <svg width="46" height="46" viewBox="0 0 64 64" fill="none">
                <path d="M32 6V16" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M32 6H42L39 10L42 14H32V6Z" fill="#f97316" />
                <path d="M18 28L32 18L46 28V52H18V28Z" fill="#ffffff" />
                <path d="M8 34L18 28V52H8V34Z" fill="#dbeafe" />
                <path d="M56 34L46 28V52H56V34Z" fill="#dbeafe" />
                <circle cx="32" cy="27" r="3" fill="#1e3a8a" />
                <rect x="28" y="38" width="8" height="14" rx="1" fill="#1e3a8a" />
                <rect x="22" y="33" width="4" height="5" rx="0.5" fill="#1e3a8a" />
                <rect x="38" y="33" width="4" height="5" rx="0.5" fill="#1e3a8a" />
              </svg>
            </div>
            <div style={{ fontSize: '0.96rem', fontWeight: 700, lineHeight: 1.35, color: '#ffffff' }}>
              ระบบจัดการ
              <br />
              คูปองดิจิทัลโรงเรียน
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.35, marginTop: '0.35rem' }}>
              School Cashless RFID
              <br />
              Administration Portal
            </div>
          </div>

          {/* Sidebar Nav (moved from top tabs) */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isHovered = hoveredTab === tab.id && !isActive;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  onMouseEnter={() => setHoveredTab(tab.id)}
                  onMouseLeave={() => setHoveredTab((prev) => (prev === tab.id ? null : prev))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.72rem 0.85rem',
                    borderRadius: '11px',
                    border: isActive
                      ? '1px solid rgba(147, 197, 253, 0.35)'
                      : isHovered
                        ? '1px solid rgba(255, 255, 255, 0.14)'
                        : '1px solid transparent',
                    background: isActive
                      ? 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)'
                      : isHovered
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'transparent',
                    color: isActive || isHovered ? '#ffffff' : '#cbd5e1',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: isActive ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      background: 'transparent',
                      color: isActive || isHovered ? '#ffffff' : '#cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {tab.icon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.86rem',
                        fontWeight: isActive ? 700 : 600,
                        lineHeight: 1.25,
                        color: isActive || isHovered ? '#ffffff' : '#e2e8f0',
                      }}
                    >
                      {tab.title}
                    </div>
                    <div
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 500,
                        color: isActive || isHovered ? 'rgba(255, 255, 255, 0.88)' : '#94a3b8',
                        marginTop: '0.1rem',
                      }}
                    >
                      {tab.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Silhouette & Version */}
        <div style={{ position: 'relative', paddingTop: '4.5rem' }}>
          <svg
            width="175"
            height="100"
            viewBox="0 0 180 110"
            fill="none"
            style={{
              position: 'absolute',
              left: '-10px',
              bottom: '16px',
              opacity: 0.08,
              pointerEvents: 'none',
            }}
          >
            <path d="M55 42L90 18L125 42V108H55V42Z" fill="#ffffff" />
            <path d="M22 58L55 42V108H22V58Z" fill="#ffffff" />
            <path d="M158 58L125 42V108H158V58Z" fill="#ffffff" />
            <rect x="82" y="72" width="16" height="36" fill="#102044" />
          </svg>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', paddingLeft: '0.5rem', position: 'relative' }}>
            v1.0.0
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          background: 'linear-gradient(180deg, #ddeaf9 0%, #edf3fb 190px, #f4f7fc 100%)',
          position: 'relative',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Full-width Top Nav Bar */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid #e2e8f0',
            padding: '0.85rem 1.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: '#0f172a', lineHeight: 1.2 }}>
              ระบบจัดการคูปองดิจิทัลโรงเรียน
            </h1>
            <p style={{ margin: '0.15rem 0 0 0', color: '#475569', fontSize: '0.8rem' }}>
              School Cashless RFID Administration Portal (Staff Admin)
            </p>
          </div>

          {/* Right Staff Profile */}
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.2rem 0.35rem',
                borderRadius: '9999px',
              }}
            >
              <span
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '9999px',
                  background: '#1e3a8a',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                SA
              </span>
              <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                สมชาย ใจดี
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {profileMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(15, 23, 42, 0.14)',
                  padding: '0.6rem',
                  minWidth: '210px',
                  zIndex: 30,
                }}
              >
                <div
                  style={{
                    padding: '0.35rem 0.5rem 0.55rem',
                    borderBottom: '1px solid #f1f5f9',
                    marginBottom: '0.4rem',
                  }}
                >
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0f172a' }}>สมชาย ใจดี</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    Staff Admin{sessionExpiry ? ` • หมดอายุ ${new Date(sessionExpiry).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.65rem',
                    fontSize: '0.84rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#b91c1c',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {loggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ (Logout)'}
                </button>
              </div>
            )}
          </div>
        </header>

        <div style={{ padding: '1.25rem 1.6rem 2rem', position: 'relative', flex: 1 }}>
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: '0',
              top: '0',
              width: '260px',
              height: '130px',
              pointerEvents: 'none',
              opacity: 0.35,
              background:
                'radial-gradient(circle at 75% 45%, rgba(59, 130, 246, 0.25), transparent 70%)',
            }}
          />

          <div style={{ maxWidth: '1160px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            {/* Tab Panels */}
            <main>
              {activeTab === 'directory' && (
                <StudentDirectory
                  onSelectReissue={openReissueForStudent}
                  onManageCards={openCardManagement}
                />
              )}

              {activeTab === 'reissue' && (
                <CardReissueForm
                  key={`reissue-${formKey}`}
                  initialStudentId={selectedStudentId}
                  onBackToDirectory={() => setActiveTab('directory')}
                  onGoToCardManagement={openCardManagementForCard}
                />
              )}

              {activeTab === 'cards' && (
                <CardManagementForm
                  key={`cards-${formKey}`}
                  initialCardId={selectedCardId}
                  initialStudentId={selectedStudentId}
                />
              )}

              {activeTab === 'settlements' && <SettlementApprovalForm />}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
