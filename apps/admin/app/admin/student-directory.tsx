'use client';

import { useMemo, useState } from 'react';

interface StudentItem {
  id: number;
  studentCode: string;
  name: string;
  classroom: string;
  balance: string;
  cardId: number;
  rfidUid: string;
  cardStatus: 'active' | 'suspended' | 'deactivated';
  note: string;
}

const SEED_STUDENTS: StudentItem[] = [
  {
    id: 101,
    studentCode: 'UC01-AC11',
    name: 'Mali Seed',
    classroom: 'นักเรียนชั้น ม.6/1',
    balance: '65.00',
    cardId: 101,
    rfidUid: 'UC01-AC11-OLD',
    cardStatus: 'active',
    note: 'นักเรียนทั่วไป (เหมาะสำหรับทดสอบออกบัตรใหม่ UC-01)',
  },
  {
    id: 102,
    studentCode: 'UC01-AC12',
    name: 'Niran Seed',
    classroom: 'นักเรียนชั้น ม.6/1',
    balance: '0.00',
    cardId: 102,
    rfidUid: 'UC01-AC12-BOUND',
    cardStatus: 'active',
    note: 'ยอดเงิน 0.00 บาท มีบัตรพร้อมใช้งาน',
  },
  {
    id: 106,
    studentCode: 'UC01-AC16',
    name: 'Suda Seed',
    classroom: 'นักเรียนชั้น ม.6/1',
    balance: '20.00',
    cardId: 106,
    rfidUid: 'UC01-AC16-ACTIVE',
    cardStatus: 'active',
    note: 'มีบัตร Active ยอด 20.00 บาท',
  },
  {
    id: 107,
    studentCode: 'UC01-AC17',
    name: 'Anan Seed',
    classroom: 'นักเรียนชั้น ม.6/1',
    balance: '10.00',
    cardId: 107,
    rfidUid: 'UC01-AC17-RETIRED',
    cardStatus: 'deactivated',
    note: 'บัตรถูกยกเลิกถาวร (Deactivated)',
  },
  {
    id: 201,
    studentCode: 'UC02-AC21A',
    name: 'Kanya ParentFreeze',
    classroom: 'นักเรียนชั้น ม.6/2',
    balance: '50.00',
    cardId: 201,
    rfidUid: 'UC02-AC21A-CARD',
    cardStatus: 'active',
    note: 'เหมาะสำหรับทดสอบผู้ปกครองสั่งอายัดบัตร',
  },
  {
    id: 202,
    studentCode: 'UC02-AC21B',
    name: 'Chai StaffSuspend',
    classroom: 'นักเรียนชั้น ม.6/2',
    balance: '40.00',
    cardId: 202,
    rfidUid: 'UC02-AC21B-CARD',
    cardStatus: 'active',
    note: 'เหมาะสำหรับทดสอบเจ้าหน้าที่สั่งระงับบัตร (Freeze)',
  },
  {
    id: 203,
    studentCode: 'UC02-AC22',
    name: 'Somchai DepartureRefund',
    classroom: 'นักเรียนชั้น ม.6/2',
    balance: '250.00',
    cardId: 203,
    rfidUid: 'UC02-AC22-CARD',
    cardStatus: 'active',
    note: 'นักเรียนย้ายออก มียอดคงเหลือ 250 บาท (เหมาะทดสอบคืนเงิน)',
  },
  {
    id: 204,
    studentCode: 'UC02-AC23',
    name: 'Wichai Unfreeze',
    classroom: 'นักเรียนชั้น ม.6/2',
    balance: '30.00',
    cardId: 204,
    rfidUid: 'UC02-AC23-CARD',
    cardStatus: 'suspended',
    note: 'บัตรถูกระงับอยู่ (เหมาะสำหรับทดสอบปลดระงับ Unfreeze)',
  },
  {
    id: 207,
    studentCode: 'UC02-AC27',
    name: 'Sunan ZeroBalance',
    classroom: 'นักเรียนชั้น ม.6/2',
    balance: '0.00',
    cardId: 207,
    rfidUid: 'UC02-AC27-CARD',
    cardStatus: 'active',
    note: 'นักเรียนย้ายออก มียอดเงิน 0.00 บาท',
  },
];

interface StudentDirectoryProps {
  onSelectReissue: (studentId: number) => void;
  onSelectCard: (cardId: number) => void;
  onSelectRefund: (studentId: number) => void;
}

type StatusFilter = 'all' | StudentItem['cardStatus'];

export default function StudentDirectory({
  onSelectReissue,
  onSelectCard,
  onSelectRefund,
}: StudentDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const counts = useMemo(() => {
    return {
      total: SEED_STUDENTS.length,
      active: SEED_STUDENTS.filter((s) => s.cardStatus === 'active').length,
      suspended: SEED_STUDENTS.filter((s) => s.cardStatus === 'suspended').length,
      deactivated: SEED_STUDENTS.filter((s) => s.cardStatus === 'deactivated').length,
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return SEED_STUDENTS.filter((student) => {
      if (statusFilter !== 'all' && student.cardStatus !== statusFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        student.name.toLowerCase().includes(query) ||
        student.studentCode.toLowerCase().includes(query) ||
        student.rfidUid.toLowerCase().includes(query) ||
        String(student.id).includes(query) ||
        String(student.cardId).includes(query)
      );
    });
  }, [searchQuery, statusFilter]);

  const filterLabel: Record<StatusFilter, string> = {
    all: 'ตัวกรอง',
    active: 'พร้อมใช้งาน',
    suspended: 'ถูกระงับชั่วคราว',
    deactivated: 'ปิดใช้งานถาวร',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
      {/* 4 KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Total */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '0.95rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.9rem',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '9999px',
              background: '#dbeafe',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 500 }}>ทั้งหมด</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
                {counts.total}
              </span>
              <span style={{ fontSize: '0.88rem', color: '#475569' }}>รายการ</span>
            </div>
          </div>
        </div>

        {/* Active */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '0.95rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.9rem',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '9999px',
              background: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 500 }}>ใช้งานอยู่</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
                {counts.active}
              </span>
              <span style={{ fontSize: '0.88rem', color: '#475569' }}>รายการ</span>
            </div>
          </div>
        </div>

        {/* Suspended */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '0.95rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.9rem',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '9999px',
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 500 }}>ถูกระงับชั่วคราว</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
                {counts.suspended}
              </span>
              <span style={{ fontSize: '0.88rem', color: '#475569' }}>รายการ</span>
            </div>
          </div>
        </div>

        {/* Deactivated */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '0.95rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.9rem',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '9999px',
              background: '#f3e8ff',
              color: '#9333ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9A7.902 7.902 0 0 1 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1A7.902 7.902 0 0 1 20 12c0 4.42-3.58 8-8 8z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 500 }}>ถูกยกเลิก</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
                {counts.deactivated}
              </span>
              <span style={{ fontSize: '0.88rem', color: '#475569' }}>รายการ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Directory Table Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem 1.35rem',
          boxShadow: '0 6px 24px rgba(15, 23, 42, 0.05)',
        }}
      >
        {/* Table Card Header + Search/Filter */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                color: '#ea580c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                ทะเบียนนักเรียนและบัตรตัวอย่างในระบบ
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                คลิกดูรายละเอียดและจัดการสถานะการใช้งานได้ทันที
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.45rem 0.85rem',
                minWidth: '270px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อนักเรียน, เลขบัตร หรือ ID Card..."
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '0.84rem',
                  color: '#0f172a',
                  width: '100%',
                }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: statusFilter === 'all' ? '#ffffff' : '#eff6ff',
                  border: statusFilter === 'all' ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                  borderRadius: '10px',
                  padding: '0.48rem 0.85rem',
                  fontSize: '0.84rem',
                  color: statusFilter === 'all' ? '#334155' : '#1d4ed8',
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                <span>{filterLabel[statusFilter]}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {filterOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 6px)',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
                    padding: '0.35rem',
                    minWidth: '190px',
                    zIndex: 20,
                  }}
                >
                  {(
                    [
                      ['all', 'ทั้งหมด (All)'],
                      ['active', 'พร้อมใช้งาน (Active)'],
                      ['suspended', 'ถูกระงับชั่วคราว (Suspended)'],
                      ['deactivated', 'ปิดใช้งานถาวร (Deactivated)'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(value);
                        setFilterOpen(false);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.45rem 0.65rem',
                        border: 'none',
                        borderRadius: '6px',
                        background: statusFilter === value ? '#eff6ff' : 'transparent',
                        color: statusFilter === value ? '#1d4ed8' : '#334155',
                        fontWeight: statusFilter === value ? 600 : 400,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f5f8fd', borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
                <th style={{ padding: '0.75rem 0.65rem', textAlign: 'center', width: '44px', fontWeight: 600 }}>#</th>
                <th style={{ padding: '0.75rem 0.65rem', fontWeight: 600 }}>
                  รหัสนักเรียน
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>(Student ID)</div>
                </th>
                <th style={{ padding: '0.75rem 0.65rem', fontWeight: 600 }}>ชื่อ - นามสกุล</th>
                <th style={{ padding: '0.75rem 0.65rem', fontWeight: 600 }}>
                  ยอดเงินใน
                  <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>Wallet</div>
                </th>
                <th style={{ padding: '0.75rem 0.65rem', fontWeight: 600 }}>
                  Card ID /
                  <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>UID บัตร</div>
                </th>
                <th style={{ padding: '0.75rem 0.65rem', fontWeight: 600 }}>สถานะบัตร</th>
                <th style={{ padding: '0.75rem 0.65rem', textAlign: 'center', fontWeight: 600 }}>การทำงานด่วน</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    ไม่พบข้อมูลนักเรียนที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 0 ? '#ffffff' : '#fafcff',
                    }}
                  >
                    <td style={{ padding: '0.75rem 0.65rem', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          borderRadius: '9999px',
                          background: '#eef3fb',
                          color: '#334155',
                          fontWeight: 600,
                          fontSize: '0.78rem',
                        }}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.65rem', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700, color: '#2563eb', marginRight: '0.55rem' }}>#{s.id}</span>
                      <span style={{ color: '#475569', fontSize: '0.8rem', fontWeight: 500 }}>{s.studentCode}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.65rem' }} title={s.note}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.name}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.1rem' }}>{s.classroom}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.65rem', fontWeight: 700, color: '#16a34a', whiteSpace: 'nowrap' }}>
                      ฿{s.balance}
                    </td>
                    <td style={{ padding: '0.75rem 0.65rem', fontSize: '0.78rem', lineHeight: 1.35 }}>
                      <div style={{ color: '#334155', fontWeight: 600 }}>ID: {s.cardId}</div>
                      <div style={{ color: '#64748b' }}>{s.rfidUid}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.65rem' }}>
                      <StatusBadge status={s.cardStatus} />
                    </td>
                    <td style={{ padding: '0.75rem 0.65rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'nowrap' }}>
                        <button
                          type="button"
                          title="ออกบัตรใหม่ให้นักเรียนคนนี้"
                          onClick={() => onSelectReissue(s.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.34rem 0.62rem',
                            fontSize: '0.75rem',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: '7px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                          </svg>
                          ออกบัตร
                        </button>
                        <button
                          type="button"
                          title="จัดการระงับ/ปลดระงับบัตรใบนี้"
                          onClick={() => onSelectCard(s.cardId)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.34rem 0.62rem',
                            fontSize: '0.75rem',
                            background: '#fef9c3',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                            borderRadius: '7px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10 0h2v2h-2v-2zm2-2h2v2h-2v-2zm0 4h2v2h-2v-2zm-2 2h2v2h-2v-2zm4-2h2v4h-2v-4zm-2 4h2v2h-2v-2z" />
                          </svg>
                          บัตร
                        </button>
                        <button
                          type="button"
                          title="คืนเงินและปิดบัตรเมื่อนักเรียนย้ายออก"
                          onClick={() => onSelectRefund(s.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.34rem 0.62rem',
                            fontSize: '0.75rem',
                            background: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            borderRadius: '7px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z" />
                          </svg>
                          คืนเงิน
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '1rem',
            marginTop: '0.25rem',
            borderTop: '1px solid #f1f5f9',
            fontSize: '0.82rem',
            color: '#64748b',
          }}
        >
          <span>
            {filteredStudents.length === 0
              ? 'แสดง 0 จาก 0 รายการ'
              : `แสดง 1–${filteredStudents.length} จาก ${filteredStudents.length} รายการ`}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              disabled
              aria-label="Previous page"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#94a3b8',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'not-allowed',
              }}
            >
              ‹
            </button>
            <span
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: '#2563eb',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              1
            </span>
            <button
              type="button"
              disabled
              aria-label="Next page"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#94a3b8',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'not-allowed',
              }}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: StudentItem['cardStatus'] }) {
  if (status === 'active') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.28rem 0.7rem',
          borderRadius: '9999px',
          background: '#ecfdf5',
          color: '#047857',
          border: '1px solid #bbf7d0',
          fontSize: '0.75rem',
          fontWeight: 600,
          lineHeight: 1.25,
        }}
      >
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '9999px',
            background: '#22c55e',
            flexShrink: 0,
          }}
        />
        <span>
          พร้อมใช้งาน
          <br />
          (Active)
        </span>
      </span>
    );
  }

  if (status === 'suspended') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.28rem 0.7rem',
          borderRadius: '9999px',
          background: '#fef9c3',
          color: '#b45309',
          border: '1px solid #fde68a',
          fontSize: '0.75rem',
          fontWeight: 600,
          lineHeight: 1.25,
        }}
      >
        <span
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '9999px',
            background: '#f59e0b',
            color: '#ffffff',
            fontSize: '0.55rem',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ⏸
        </span>
        <span>
          ถูกระงับชั่วคราว
          <br />
          (Suspended)
        </span>
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.28rem 0.7rem',
        borderRadius: '9999px',
        background: '#f1f5f9',
        color: '#475569',
        border: '1px solid #cbd5e1',
        fontSize: '0.75rem',
        fontWeight: 600,
        lineHeight: 1.25,
      }}
    >
      <span
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '9999px',
          background: '#94a3b8',
          flexShrink: 0,
        }}
      />
      <span>
        ปิดใช้งานถาวร
        <br />
        (Deactivated)
      </span>
    </span>
  );
}
