'use client';

interface StudentItem {
  id: number;
  studentCode: string;
  name: string;
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

export default function StudentDirectory({
  onSelectReissue,
  onSelectCard,
  onSelectRefund,
}: StudentDirectoryProps) {
  const getBadgeStyle = (status: StudentItem['cardStatus']) => {
    switch (status) {
      case 'active':
        return { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' };
      case 'suspended':
        return { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' };
      case 'deactivated':
        return { background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' };
    }
  };

  const getStatusText = (status: StudentItem['cardStatus']) => {
    switch (status) {
      case 'active':
        return '🟢 พร้อมใช้งาน (Active)';
      case 'suspended':
        return '🟡 ถูกระงับชั่วคราว (Suspended)';
      case 'deactivated':
        return '⚪ ปิดใช้งานถาวร (Deactivated)';
    }
  };

  return (
    <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>📋 ทะเบียนนักเรียนและบัตรตัวอย่างในระบบ</h3>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            คลิกปุ่มการทำงานด้านหลังเพื่อนำรหัสไปใส่ในฟอร์มทดสอบได้ทันที
          </p>
        </div>
        <span style={{ fontSize: '0.8rem', background: '#f8fafc', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#475569' }}>
          ทั้งหมด {SEED_STUDENTS.length} รายการ
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>Student ID</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>รหัสนักเรียน</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>ชื่อ-นามสกุล</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>ยอดเงิน Wallet</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Card ID / UID บัตร</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>สถานะบัตร</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>การทำงานด่วน</th>
            </tr>
          </thead>
          <tbody>
            {SEED_STUDENTS.map((s, idx) => (
              <tr
                key={s.id}
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                }}
              >
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#2563eb' }}>
                  #{s.id}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#334155' }}>
                  <code>{s.studentCode}</code>
                </td>
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500, color: '#0f172a' }}>
                  {s.name}
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.note}</div>
                </td>
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: '#059669' }}>
                  ฿{s.balance}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem' }}>
                  <div style={{ color: '#475569' }}>ID: <strong>{s.cardId}</strong></div>
                  <code style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.rfidUid}</code>
                </td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      ...getBadgeStyle(s.cardStatus),
                    }}
                  >
                    {getStatusText(s.cardStatus)}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                    <button
                      type="button"
                      title="ออกบัตรใหม่ให้นักเรียนคนนี้"
                      onClick={() => onSelectReissue(s.id)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.75rem',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      💳 ออกบัตร
                    </button>
                    <button
                      type="button"
                      title="จัดการระงับ/ปลดระงับบัตรใบนี้"
                      onClick={() => onSelectCard(s.cardId)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.75rem',
                        background: '#fef3c7',
                        color: '#b45309',
                        border: '1px solid #fde68a',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      ❄️ บัตร
                    </button>
                    {Number(s.balance) > 0 && (
                      <button
                        type="button"
                        title="คืนเงินเมื่อนักเรียนย้ายออก"
                        onClick={() => onSelectRefund(s.id)}
                        style={{
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.75rem',
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fecaca',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        💰 คืนเงิน
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
