'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

interface SettlementResult {
  id: number;
  merchantId: number;
  settlementDate: string;
  grossAmount: string;
  feeAmount: string;
  netAmount: string;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

interface ApiError {
  code: string;
  message: string;
}

interface SampleSettlement {
  id: string;
  merchantId: number;
  merchantCode: string;
  merchantName: string;
  feePercent: string;
  grossAmount: string;
  feeAmount: string;
  netAmount: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'PAID';
}

const INITIAL_SAMPLES: SampleSettlement[] = [
  {
    id: '701',
    merchantId: 701,
    merchantCode: 'M-701',
    merchantName: 'Juice Shop',
    feePercent: '2.50%',
    grossAmount: '100.00',
    feeAmount: '2.50',
    netAmount: '97.50',
    status: 'PENDING_APPROVAL',
  },
  {
    id: '702',
    merchantId: 702,
    merchantCode: 'M-702',
    merchantName: 'Bakery',
    feePercent: '3.00%',
    grossAmount: '200.00',
    feeAmount: '6.00',
    netAmount: '194.00',
    status: 'APPROVED',
  },
  {
    id: '703',
    merchantId: 703,
    merchantCode: 'M-703',
    merchantName: 'Book Stall',
    feePercent: '1.50%',
    grossAmount: '50.00',
    feeAmount: '0.75',
    netAmount: '49.25',
    status: 'PAID',
  },
];

export default function SettlementApprovalForm() {
  const [samples, setSamples] = useState<SampleSettlement[]>(INITIAL_SAMPLES);
  const [settlementId, setSettlementId] = useState('701');
  const [copiedId, setCopiedId] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [result, setResult] = useState<SettlementResult | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/admin/settlements')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { settlements?: Array<{
        id: number;
        merchantId: number;
        merchantCode: string;
        merchantName: string;
        feePercent: string;
        grossAmount: string;
        feeAmount: string;
        netAmount: string;
        status: 'PENDING_APPROVAL' | 'APPROVED' | 'PAID';
      }> } | null) => {
        if (!active || !data?.settlements) return;
        setSamples(
          data.settlements.map((s) => ({
            id: String(s.id),
            merchantId: s.merchantId,
            merchantCode: s.merchantCode,
            merchantName: s.merchantName,
            feePercent: `${s.feePercent}%`,
            grossAmount: s.grossAmount,
            feeAmount: s.feeAmount,
            netAmount: s.netAmount,
            status: s.status,
          })),
        );
      })
      .catch(() => {
        // Keep fallback samples if API is unreachable
      });
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const pending = samples.filter((s) => s.status === 'PENDING_APPROVAL').length;
    const completed = samples.filter((s) => s.status !== 'PENDING_APPROVAL').length;
    const totalNet = samples.reduce((sum, s) => sum + Number(s.netAmount), 0).toFixed(2);
    return {
      total: samples.length,
      pending,
      completed,
      totalNet,
    };
  }, [samples]);

  const selectedSample = useMemo(
    () => samples.find((s) => s.id === settlementId.trim()),
    [samples, settlementId],
  );

  async function handleApprove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setResult(null);

    const trimmedId = settlementId.trim();
    if (!/^[1-9]\d*$/.test(trimmedId)) {
      setMessage({ type: 'error', text: 'กรุณาระบุ Settlement ID เป็นตัวเลขจำนวนเต็มบวก' });
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/admin/settlements/${encodeURIComponent(trimmedId)}/approve`, {
        method: 'POST',
      });

      if (!response.ok) {
        setMessage({ type: 'error', text: await getErrorMessage(response) });
        return;
      }

      const data = (await response.json()) as SettlementResult;
      setResult(data);
      setSamples((prev) =>
        prev.map((item) =>
          item.id === String(data.id)
            ? {
                ...item,
                status: (data.status as SampleSettlement['status']) || 'APPROVED',
              }
            : item,
        ),
      );
      setMessage({
        type: 'success',
        text: `อนุมัติการโอนเงินสำเร็จ: Settlement ID ${data.id} เปลี่ยนสถานะเป็น ${data.status} เรียบร้อยแล้ว`,
      });
    } catch {
      setMessage({ type: 'error', text: 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง' });
    } finally {
      setBusy(false);
    }
  }

  async function copySettlementId() {
    if (!settlementId.trim()) {
      return;
    }
    try {
      await navigator.clipboard.writeText(settlementId.trim());
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1800);
    } catch {
      // Clipboard API may be unavailable in restricted contexts
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
            สรุปยอดขายรายวันและอนุมัติยอดโอนร้านค้า (UC-07)
          </h2>
          <p style={{ margin: '0.15rem 0 0 0', color: '#64748b', fontSize: '0.82rem' }}>
            ตรวจสอบยอดขายสุทธิหลังหักค่าธรรมเนียม และกดอนุมัติการตัดรอบโอนเงินรอบ T+1 เข้าบัญชีร้านค้า
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
            ตรวจสอบยอดโอนสุทธิ (Net)
            <br />
            ก่อนกดอนุมัติรายการทุกครั้ง
          </span>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '1rem',
        }}
      >
        <KpiCard
          label="รอบสรุปยอดทั้งหมด"
          value={String(stats.total)}
          unit="รายการ"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-4 15H8v-4h2v4zm3 0h-2v-6h2v6zm3 0h-2v-3h2v3zm-3-8V3.5L18.5 9H13z" />
            </svg>
          }
        />
        <KpiCard
          label="รออนุมัติ (Pending)"
          value={String(stats.pending)}
          unit="รายการ"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 11h-2V7h2v6zm0 4h-2v-2h2v2z" />
            </svg>
          }
        />
        <KpiCard
          label="อนุมัติ / โอนแล้ว"
          value={String(stats.completed)}
          unit="รายการ"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          }
        />
        <KpiCard
          label="ยอดโอนสุทธิรวม"
          value={`฿${stats.totalNet}`}
          unit=""
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 18v1c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14c1.1 0 2 .9 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
            </svg>
          }
        />
      </div>

      {/* Main 2-Column Workspace */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.3fr) minmax(340px, 1fr)',
          gap: '1.15rem',
          alignItems: 'start',
        }}
      >
        {/* Left: Sample Settlement Table */}
        <section
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '1.25rem 1.35rem',
            boxShadow: '0 6px 24px rgba(15, 23, 42, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
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
              <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm-4 8H7v-2h6v2z" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                รอบสรุปยอดขายร้านค้าตัวอย่างในระบบ
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>
                คลิกเลือกรอบ Settlement เพื่อดูรายละเอียดและดำเนินการอนุมัติทางด้านขวา
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#f5f8fd', borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
                  <th style={{ padding: '0.7rem 0.6rem', fontWeight: 600 }}>Settlement ID</th>
                  <th style={{ padding: '0.7rem 0.6rem', fontWeight: 600 }}>ร้านค้า</th>
                  <th style={{ padding: '0.7rem 0.6rem', fontWeight: 600 }}>ยอดขาย / ค่าธรรมเนียม</th>
                  <th style={{ padding: '0.7rem 0.6rem', fontWeight: 600 }}>ยอดโอนสุทธิ</th>
                  <th style={{ padding: '0.7rem 0.6rem', fontWeight: 600 }}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((item, idx) => {
                  const isSelected = settlementId.trim() === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSettlementId(item.id);
                        setMessage(null);
                        setResult(null);
                      }}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSelected ? '#eff6ff' : idx % 2 === 0 ? '#ffffff' : '#fafcff',
                        cursor: 'pointer',
                      }}
                    >
                      <td style={{ padding: '0.75rem 0.6rem', fontWeight: 700, color: '#2563eb' }}>
                        #{item.id}
                      </td>
                      <td style={{ padding: '0.75rem 0.6rem' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.merchantName}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          {item.merchantCode} • Fee {item.feePercent}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.6rem', fontSize: '0.79rem', color: '#475569' }}>
                        <div>รวม: ฿{item.grossAmount}</div>
                        <div style={{ color: '#94a3b8' }}>หัก: -฿{item.feeAmount}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.6rem', fontWeight: 700, color: '#16a34a' }}>
                        ฿{item.netAmount}
                      </td>
                      <td style={{ padding: '0.75rem 0.6rem' }}>
                        <SettlementStatusBadge status={item.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right: Approval Form & Result Card */}
        <section
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.35rem',
            background: 'linear-gradient(155deg, #ffffff 60%, #edf4ff 100%)',
            boxShadow: '0 6px 24px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                อนุมัติการโอนเงินร้านค้า
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.15rem 0 0 0' }}>
                ยืนยันการอนุมัติยอดเงินรอบ T+1 เข้าบัญชีร้านค้า
              </p>
            </div>
          </div>

          {/* Selected Preview Box */}
          {selectedSample && (
            <div
              style={{
                background: '#f3f7fd',
                border: '1px solid #dbeafe',
                borderRadius: '12px',
                padding: '0.85rem 0.95rem',
                fontSize: '0.82rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.45rem',
                }}
              >
                <span style={{ fontWeight: 700, color: '#1e3a8a' }}>
                  #{selectedSample.id} • {selectedSample.merchantName}
                </span>
                <SettlementStatusBadge status={selectedSample.status} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>ยอดรวม ฿{selectedSample.grossAmount} (ค่าธรรมเนียม ฿{selectedSample.feeAmount})</span>
                <strong style={{ color: '#16a34a' }}>สุทธิ ฿{selectedSample.netAmount}</strong>
              </div>
            </div>
          )}

          <form onSubmit={handleApprove} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label
                htmlFor="settlement-id-input"
                style={{
                  display: 'block',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  color: '#0f172a',
                  marginBottom: '0.45rem',
                }}
              >
                Settlement ID (รหัสรอบสรุปยอดขาย)
              </label>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                <input
                  id="settlement-id-input"
                  type="text"
                  value={settlementId}
                  onChange={(e) => setSettlementId(e.target.value)}
                  placeholder="เช่น 701, 702, 703"
                  style={{
                    flex: 1,
                    padding: '0.62rem 0.85rem',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: '#0f172a',
                  }}
                />
                <button
                  type="button"
                  onClick={() => void copySettlementId()}
                  title="คัดลอก Settlement ID"
                  style={{
                    padding: '0.62rem 0.8rem',
                    border: 'none',
                    borderLeft: '1px solid #e2e8f0',
                    background: copiedId ? '#ecfdf5' : '#f8fafc',
                    color: copiedId ? '#059669' : '#475569',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {copiedId ? '✓' : '❐'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.72rem 1rem',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                cursor: busy ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '0.88rem',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              <span>{busy ? 'กำลังดำเนินการ...' : 'กดอนุมัติการโอนเงิน (Approve Transfer)'}</span>
            </button>
          </form>

          {message && (
            <div
              role={message.type === 'error' ? 'alert' : 'status'}
              style={{
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: message.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                fontSize: '0.84rem',
                fontWeight: 600,
              }}
            >
              {message.text}
            </div>
          )}

          {result && (
            <div
              style={{
                padding: '0.95rem 1.05rem',
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #bbf7d0',
              }}
            >
              <h4 style={{ fontSize: '0.92rem', margin: '0 0 0.6rem 0', color: '#065f46' }}>
                รายละเอียดผลการอนุมัติ
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '0.45rem 1rem',
                  fontSize: '0.82rem',
                }}
              >
                <DetailItem label="ร้านค้า ID" value={`#${result.merchantId}`} />
                <DetailItem label="วันที่ตัดรอบ" value={result.settlementDate} />
                <DetailItem label="ยอดขายรวม (Gross)" value={`฿${result.grossAmount}`} />
                <DetailItem label="ค่าธรรมเนียม (Fee)" value={`฿${result.feeAmount}`} />
                <DetailItem
                  label="ยอดโอนสุทธิ (Net)"
                  value={<span style={{ color: '#16a34a', fontWeight: 700 }}>฿{result.netAmount}</span>}
                />
                <DetailItem label="ผู้อนุมัติ" value={result.approvedBy ?? '-'} />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  unit,
  icon,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
}) {
  return (
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
          width: '32px',
          height: '32px',
          background: 'transparent',
          color: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
          <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
            {value}
          </span>
          {unit && <span style={{ fontSize: '0.85rem', color: '#475569' }}>{unit}</span>}
        </div>
      </div>
    </div>
  );
}

function SettlementStatusBadge({ status }: { status: SampleSettlement['status'] }) {
  if (status === 'PENDING_APPROVAL') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.2rem 0.6rem',
          borderRadius: '9999px',
          background: '#fef9c3',
          color: '#b45309',
          border: '1px solid #fde68a',
          fontSize: '0.73rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ width: '7px', height: '7px', borderRadius: '9999px', background: '#f59e0b' }} />
        รออนุมัติ
      </span>
    );
  }
  if (status === 'APPROVED') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.2rem 0.6rem',
          borderRadius: '9999px',
          background: '#eff6ff',
          color: '#1d4ed8',
          border: '1px solid #bfdbfe',
          fontSize: '0.73rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ width: '7px', height: '7px', borderRadius: '9999px', background: '#2563eb' }} />
        อนุมัติแล้ว
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.2rem 0.6rem',
        borderRadius: '9999px',
        background: '#ecfdf5',
        color: '#047857',
        border: '1px solid #bbf7d0',
        fontSize: '0.73rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: '7px', height: '7px', borderRadius: '9999px', background: '#16a34a' }} />
      โอนเงินแล้ว
    </span>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: '#64748b', fontSize: '0.74rem' }}>{label}</div>
      <div style={{ color: '#0f172a', fontWeight: 600, marginTop: '0.08rem' }}>{value}</div>
    </div>
  );
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const errorBody = (await response.json()) as ApiError;
    if (errorBody?.code === 'SETTLEMENT_NOT_FOUND') return 'ไม่พบรายการ Settlement รหัสนี้ในระบบ';
    if (errorBody?.code === 'SETTLEMENT_NOT_PENDING') return 'Settlement นี้ไม่อยู่ในสถานะรออนุมัติ (อาจดำเนินการไปแล้ว)';
    if (errorBody?.code === 'STAFF_ACCESS_REQUIRED') return 'ต้องใช้สิทธิ์ Staff ในการอนุมัติยอดขาย';
    if (errorBody?.message) return errorBody.message;
  } catch {
    // Ignore JSON parse failure
  }
  return `ระบบปฏิเสธคำขอ (HTTP ${response.status})`;
}
