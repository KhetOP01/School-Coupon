import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { parentApi } from '../api/parent-api';
import { HeaderRightActions } from '../components/HeaderRightActions';
import { PeriodPickerModal } from '../components/PeriodPickerModal';
import {
  SpendingHistoryPeriod,
  StudentProfile,
  StudentSpendingHistoryResponse,
} from '../types';

interface SpendingHistoryScreenProps {
  student: StudentProfile;
  students: StudentProfile[];
  topInset?: number;
  onSelectStudent: (studentId: number) => void;
  onLogout?: () => void;
}

const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
] as const;

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const;

function getBangkokTodayString(): string {
  const now = new Date();
  const bangkokMs = now.getTime() + 7 * 60 * 60 * 1000;
  return new Date(bangkokMs).toISOString().slice(0, 10); // YYYY-MM-DD
}

function getDefaultDateForPeriod(period: SpendingHistoryPeriod): string {
  const today = getBangkokTodayString();
  if (period === 'day') return today;
  if (period === 'month') return today.slice(0, 7);
  return today.slice(0, 4);
}

function shiftDateString(
  period: SpendingHistoryPeriod,
  current: string,
  delta: number,
): string {
  if (period === 'day') {
    const [y, m, d] = current.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + delta));
    return dt.toISOString().slice(0, 10);
  }
  if (period === 'month') {
    const [y, m] = current.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
    return dt.toISOString().slice(0, 7);
  }
  const y = Number(current);
  return String(y + delta);
}

function formatPeriodDisplay(period: SpendingHistoryPeriod, target: string): string {
  if (period === 'day') {
    const [y, m, d] = target.split('-').map(Number);
    const monthName = THAI_MONTHS_SHORT[m - 1] ?? String(m);
    return `${d} ${monthName} ${y + 543}`;
  }
  if (period === 'month') {
    const [y, m] = target.split('-').map(Number);
    const monthName = THAI_MONTHS_FULL[m - 1] ?? String(m);
    return `${monthName} ${y + 543}`;
  }
  return `ปี พ.ศ. ${Number(target) + 543}`;
}

function formatTransactionTimestamp(iso: string, period: SpendingHistoryPeriod): string {
  const dt = new Date(iso);
  const bangkok = new Date(dt.getTime() + 7 * 60 * 60 * 1000);
  const hh = String(bangkok.getUTCHours()).padStart(2, '0');
  const mm = String(bangkok.getUTCMinutes()).padStart(2, '0');
  if (period === 'day') {
    return `${hh}:${mm} น.`;
  }
  const day = bangkok.getUTCDate();
  const monthShort = THAI_MONTHS_SHORT[bangkok.getUTCMonth()] ?? '';
  return `${day} ${monthShort} ${hh}:${mm} น.`;
}

function ChartMiniIcon() {
  return (
    <View style={styles.sectionIconBox}>
      <View style={styles.chartBars}>
        <View style={[styles.chartBar, { height: 6 }]} />
        <View style={[styles.chartBar, { height: 11 }]} />
        <View style={[styles.chartBar, { height: 8 }]} />
      </View>
    </View>
  );
}

function ReceiptMiniIcon() {
  return (
    <View style={styles.sectionIconBox}>
      <View style={styles.receiptSheet}>
        <View style={styles.receiptLine} />
        <View style={[styles.receiptLine, { width: 8 }]} />
      </View>
    </View>
  );
}

export function SpendingHistoryScreen({
  student,
  students,
  topInset = 0,
  onSelectStudent,
  onLogout,
}: SpendingHistoryScreenProps) {
  const [period, setPeriod] = useState<SpendingHistoryPeriod>('day');
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    getDefaultDateForPeriod('day'),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<StudentSpendingHistoryResponse | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const currentDefaultDate = getDefaultDateForPeriod(period);
  const isAtLatest = selectedDate >= currentDefaultDate;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await parentApi.getSpendingHistory(
        student.id,
        period,
        selectedDate,
      );
      setHistory(res);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'ไม่สามารถโหลดประวัติการใช้จ่ายได้';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [student.id, period, selectedDate]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  function handleChangePeriod(nextPeriod: SpendingHistoryPeriod) {
    if (nextPeriod === period) return;
    setPeriod(nextPeriod);
    setSelectedDate(getDefaultDateForPeriod(nextPeriod));
  }

  function handleStepDate(delta: number) {
    const next = shiftDateString(period, selectedDate, delta);
    const maxDate = getDefaultDateForPeriod(period);
    if (next > maxDate) return;
    setSelectedDate(next);
  }

  const maxBreakdownAmount = useMemo(() => {
    if (!history?.breakdown.length) return 1;
    return Math.max(
      1,
      ...history.breakdown.map((b) => parseFloat(b.totalSpent) || 0),
    );
  }, [history]);

  const totalSpentNum = parseFloat(history?.summary.totalSpent ?? '0');
  const periodTitleText =
    period === 'day'
      ? 'ยอดใช้จ่ายรายวัน'
      : period === 'month'
        ? 'ยอดใช้จ่ายรายเดือน'
        : 'ยอดใช้จ่ายรายปี';

  return (
    <View style={styles.screen}>
      {/* Top Royal Blue Header */}
      <View style={[styles.topHeader, { paddingTop: topInset + 10 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerTitle}>ประวัติการใช้จ่าย</Text>
            <Text style={styles.headerSubtitle}>
              {student.firstName} {student.lastName} ({student.studentCode})
            </Text>
          </View>
          <HeaderRightActions
            student={student}
            students={students}
            onSelectStudent={onSelectStudent}
            onLogout={onLogout}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Filter + Date Navigator Card */}
        <View style={styles.filterCard}>
          <View style={styles.periodSegmentRow}>
            {(
              [
                { id: 'day', label: 'รายวัน' },
                { id: 'month', label: 'รายเดือน' },
                { id: 'year', label: 'รายปี' },
              ] as const
            ).map((tab) => {
              const active = period === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.periodBtn, active && styles.periodBtnActive]}
                  onPress={() => handleChangePeriod(tab.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.periodBtnText,
                      active && styles.periodBtnTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.dateNavRow}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => handleStepDate(-1)}
              activeOpacity={0.75}
            >
              <Text style={styles.stepBtnText}>‹</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.dateLabel}>
                {formatPeriodDisplay(period, selectedDate)}
              </Text>
              <Text style={styles.datePickerCaret}>▾</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.stepBtn, isAtLatest && styles.stepBtnDisabled]}
              onPress={() => handleStepDate(1)}
              disabled={isAtLatest}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.stepBtnText,
                  isAtLatest && styles.stepBtnTextDisabled,
                ]}
              >
                ›
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Summary Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroDecorTop} />
          <View style={styles.heroDecorBottom} />

          <Text style={styles.heroLabel}>{periodTitleText}</Text>
          <Text style={styles.heroAmount}>฿{totalSpentNum.toFixed(2)}</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                ชำระสำเร็จ {history?.summary.completedCount ?? 0} รายการ
              </Text>
            </View>
            {(history?.summary.voidedCount ?? 0) > 0 && (
              <View style={styles.heroBadgeMuted}>
                <Text style={styles.heroBadgeText}>
                  ยกเลิก {history?.summary.voidedCount} รายการ
                </Text>
              </View>
            )}
            {period === 'day' && (
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>
                  วงเงิน/วัน ฿{parseFloat(student.currentDailyLimit).toFixed(0)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Breakdown Card (Monthly / Yearly drill-down) */}
        {period !== 'day' && (history?.breakdown.length ?? 0) > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <ChartMiniIcon />
              <Text style={styles.sectionTitle}>
                {period === 'month'
                  ? 'สรุปยอดใช้จ่ายรายวัน (แตะเพื่อดูรายการวันนั้น)'
                  : 'สรุปยอดใช้จ่ายรายเดือน (แตะเพื่อดูรายการเดือนนั้น)'}
              </Text>
            </View>

            <View style={styles.breakdownList}>
              {history!.breakdown.map((item) => {
                const val = parseFloat(item.totalSpent) || 0;
                const pct = Math.max(8, Math.round((val / maxBreakdownAmount) * 100));
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.breakdownItem}
                    onPress={() => {
                      if (period === 'year') {
                        setPeriod('month');
                        setSelectedDate(item.key);
                      } else {
                        setPeriod('day');
                        setSelectedDate(item.key);
                      }
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.breakdownTopRow}>
                      <Text style={styles.breakdownLabel}>{item.label}</Text>
                      <View style={styles.breakdownRight}>
                        <Text style={styles.breakdownCount}>
                          {item.completedCount} รายการ
                        </Text>
                        <Text style={styles.breakdownAmount}>
                          ฿{val.toFixed(2)}
                        </Text>
                        <Text style={styles.breakdownChevron}>›</Text>
                      </View>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${pct}%` }]} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Transactions List Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderBetween}>
            <View style={styles.sectionHeader}>
              <ReceiptMiniIcon />
              <Text style={styles.sectionTitle}>
                รายการใช้จ่าย ({history?.transactions.length ?? 0})
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => void fetchHistory()}
              disabled={loading}
              activeOpacity={0.75}
            >
              <Text style={styles.refreshBtnText}>↻ รีเฟรช</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color="#1D63ED" size="small" />
              <Text style={styles.stateText}>กำลังโหลดประวัติการใช้จ่าย...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => void fetchHistory()}
              >
                <Text style={styles.retryBtnText}>ลองใหม่</Text>
              </TouchableOpacity>
            </View>
          ) : (history?.transactions.length ?? 0) === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.emptyTitle}>ไม่มีรายการใช้จ่ายในช่วงเวลานี้</Text>
              <Text style={styles.stateText}>
                ลองเปลี่ยนวัน เดือน หรือปีด้านบนเพื่อตรวจสอบช่วงเวลาอื่น
              </Text>
            </View>
          ) : (
            <View style={styles.txList}>
              {history!.transactions.map((tx) => {
                const isVoided = tx.status === 'VOIDED';
                return (
                  <View
                    key={tx.paymentId}
                    style={[styles.txRow, isVoided && styles.txRowVoided]}
                  >
                    <View style={styles.txMiddle}>
                      <Text
                        style={[
                          styles.txMerchantName,
                          isVoided && styles.txTextMuted,
                        ]}
                        numberOfLines={1}
                      >
                        {tx.merchantName}
                      </Text>
                      <View style={styles.txMetaRow}>
                        <Text style={styles.txTime}>
                          {formatTransactionTimestamp(tx.createdAt, period)}
                        </Text>
                        <View style={styles.modePill}>
                          <Text style={styles.modePillText}>
                            {tx.paymentMode === 'ONLINE' ? 'ออนไลน์' : 'ออฟไลน์'}
                          </Text>
                        </View>
                        {isVoided && (
                          <View style={styles.voidPill}>
                            <Text style={styles.voidPillText}>ยกเลิกแล้ว</Text>
                          </View>
                        )}
                      </View>
                      {isVoided && tx.voidReason ? (
                        <Text style={styles.voidReasonText} numberOfLines={1}>
                          เหตุผล: {tx.voidReason}
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        isVoided && styles.txAmountVoided,
                      ]}
                    >
                      {isVoided
                        ? `฿${parseFloat(tx.amount).toFixed(2)}`
                        : `-฿${parseFloat(tx.amount).toFixed(2)}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Calendar / Month / Year Picker Modal */}
      <PeriodPickerModal
        visible={pickerVisible}
        period={period}
        selectedDate={selectedDate}
        maxDate={currentDefaultDate}
        onSelect={(nextDate) => setSelectedDate(nextDate)}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EEF4FF',
  },
  topHeader: {
    backgroundColor: '#13429D',
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0B2559',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#DBEAFE',
    fontSize: 12,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 24,
    gap: 12,
  },
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    gap: 10,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  periodSegmentRow: {
    flexDirection: 'row',
    backgroundColor: '#EEF4FF',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodBtnActive: {
    backgroundColor: '#1D63ED',
    shadowColor: '#1D63ED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  periodBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#475569',
  },
  periodBtnTextActive: {
    color: '#FFFFFF',
  },
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  stepBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E40AF',
    lineHeight: 22,
  },
  stepBtnTextDisabled: {
    color: '#94A3B8',
  },
  datePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  dateLabel: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  datePickerCaret: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  heroCard: {
    backgroundColor: '#1E5EEA',
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 4,
  },
  heroDecorTop: {
    position: 'absolute',
    right: -24,
    top: -28,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroDecorBottom: {
    position: 'absolute',
    right: 36,
    bottom: -44,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroLabel: {
    color: '#DBEAFE',
    fontSize: 13,
    fontWeight: '600',
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },
  heroStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  heroBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  heroBadgeMuted: {
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    gap: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  sectionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  chartBar: {
    width: 3.5,
    borderRadius: 1.5,
    backgroundColor: '#2563EB',
  },
  receiptSheet: {
    width: 14,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.8,
    borderColor: '#2563EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
    gap: 2.5,
  },
  receiptLine: {
    width: 6,
    height: 1.8,
    borderRadius: 1,
    backgroundColor: '#2563EB',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  refreshBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  breakdownList: {
    gap: 10,
  },
  breakdownItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  breakdownTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  breakdownLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  breakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownCount: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E40AF',
  },
  breakdownChevron: {
    fontSize: 16,
    fontWeight: '800',
    color: '#94A3B8',
    marginTop: -2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#334155',
  },
  stateText: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  txList: {
    gap: 8,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  txRowVoided: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.78,
  },
  txMiddle: {
    flex: 1,
    gap: 3,
  },
  txMerchantName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  txTextMuted: {
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  txTime: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  modePill: {
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
  },
  modePillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  voidPill: {
    backgroundColor: '#FEE2E2',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
  },
  voidPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B91C1C',
  },
  voidReasonText: {
    fontSize: 11,
    color: '#991B1B',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },
  txAmountVoided: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
});
