import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SpendingHistoryPeriod } from '../types';

interface PeriodPickerModalProps {
  visible: boolean;
  period: SpendingHistoryPeriod;
  selectedDate: string;
  maxDate: string;
  onSelect: (nextDate: string) => void;
  onClose: () => void;
}

const WEEKDAYS_THAI = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const;

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

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function buildCalendarRows(year: number, month: number): Array<Array<number | null>> {
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: Array<Array<number | null>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

/**
 * Interactive Day Calendar / Month Grid / Year Grid modal matching parent-mobile theme.
 */
export function PeriodPickerModal({
  visible,
  period,
  selectedDate,
  maxDate,
  onSelect,
  onClose,
}: PeriodPickerModalProps) {
  const maxYear = Number(maxDate.slice(0, 4));
  const maxMonth = maxDate.length >= 7 ? Number(maxDate.slice(5, 7)) : 12;

  const initialYear = Number(selectedDate.slice(0, 4)) || maxYear;
  const initialMonth =
    selectedDate.length >= 7 ? Number(selectedDate.slice(5, 7)) : maxMonth;

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [yearPageEnd, setYearPageEnd] = useState(maxYear);

  useEffect(() => {
    if (!visible) return;
    const y = Number(selectedDate.slice(0, 4)) || maxYear;
    const m = selectedDate.length >= 7 ? Number(selectedDate.slice(5, 7)) : maxMonth;
    setViewYear(y);
    setViewMonth(m);
    setYearPageEnd(Math.max(y, maxYear));
  }, [visible, selectedDate, maxYear, maxMonth]);

  function stepCalendarMonth(delta: number) {
    const dt = new Date(Date.UTC(viewYear, viewMonth - 1 + delta, 1));
    const nextY = dt.getUTCFullYear();
    const nextM = dt.getUTCMonth() + 1;
    if (nextY > maxYear || (nextY === maxYear && nextM > maxMonth)) {
      return;
    }
    setViewYear(nextY);
    setViewMonth(nextM);
  }

  const isNextMonthDisabled =
    viewYear > maxYear || (viewYear === maxYear && viewMonth >= maxMonth);
  const calendarRows =
    period === 'day' ? buildCalendarRows(viewYear, viewMonth) : [];

  const yearOptions = Array.from({ length: 9 }, (_, idx) => yearPageEnd - 8 + idx);

  const modalHeading =
    period === 'day'
      ? 'เลือกวันที่'
      : period === 'month'
        ? 'เลือกเดือน'
        : 'เลือกปี พ.ศ.';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{modalHeading}</Text>

          {period === 'day' && (
            <View style={styles.bodyWrap}>
              <View style={styles.navBar}>
                <TouchableOpacity
                  style={styles.navArrowBtn}
                  onPress={() => stepCalendarMonth(-1)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.navArrowText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.navHeaderLabel}>
                  {THAI_MONTHS_FULL[viewMonth - 1]} {viewYear + 543}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.navArrowBtn,
                    isNextMonthDisabled && styles.navArrowDisabled,
                  ]}
                  onPress={() => stepCalendarMonth(1)}
                  disabled={isNextMonthDisabled}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.navArrowText,
                      isNextMonthDisabled && styles.navArrowTextDisabled,
                    ]}
                  >
                    ›
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.weekdayRow}>
                {WEEKDAYS_THAI.map((dayName) => (
                  <Text key={dayName} style={styles.weekdayText}>
                    {dayName}
                  </Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarRows.map((row, rowIdx) => (
                  <View key={rowIdx} style={styles.calendarRow}>
                    {row.map((dayNum, colIdx) => {
                      if (dayNum === null) {
                        return <View key={colIdx} style={styles.dayCellEmpty} />;
                      }
                      const iso = `${viewYear}-${pad2(viewMonth)}-${pad2(dayNum)}`;
                      const isSelected = iso === selectedDate;
                      const isToday = iso === maxDate;
                      const isDisabled = iso > maxDate;
                      return (
                        <TouchableOpacity
                          key={colIdx}
                          style={[
                            styles.dayCell,
                            isToday && !isSelected && styles.dayCellToday,
                            isSelected && styles.dayCellSelected,
                            isDisabled && styles.dayCellDisabled,
                          ]}
                          onPress={() => {
                            onSelect(iso);
                            onClose();
                          }}
                          disabled={isDisabled}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.dayCellText,
                              isToday && !isSelected && styles.dayCellTodayText,
                              isSelected && styles.dayCellSelectedText,
                              isDisabled && styles.dayCellDisabledText,
                            ]}
                          >
                            {dayNum}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          )}

          {period === 'month' && (
            <View style={styles.bodyWrap}>
              <View style={styles.navBar}>
                <TouchableOpacity
                  style={styles.navArrowBtn}
                  onPress={() => setViewYear((y) => y - 1)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.navArrowText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.navHeaderLabel}>ปี พ.ศ. {viewYear + 543}</Text>
                <TouchableOpacity
                  style={[
                    styles.navArrowBtn,
                    viewYear >= maxYear && styles.navArrowDisabled,
                  ]}
                  onPress={() => setViewYear((y) => Math.min(maxYear, y + 1))}
                  disabled={viewYear >= maxYear}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.navArrowText,
                      viewYear >= maxYear && styles.navArrowTextDisabled,
                    ]}
                  >
                    ›
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.grid3}>
                {THAI_MONTHS_SHORT.map((label, idx) => {
                  const monthKey = `${viewYear}-${pad2(idx + 1)}`;
                  const isSelected = monthKey === selectedDate;
                  const isDisabled = monthKey > maxDate;
                  return (
                    <TouchableOpacity
                      key={monthKey}
                      style={[
                        styles.gridTile,
                        isSelected && styles.gridTileSelected,
                        isDisabled && styles.gridTileDisabled,
                      ]}
                      onPress={() => {
                        onSelect(monthKey);
                        onClose();
                      }}
                      disabled={isDisabled}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.gridTileText,
                          isSelected && styles.gridTileSelectedText,
                          isDisabled && styles.gridTileDisabledText,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {period === 'year' && (
            <View style={styles.bodyWrap}>
              <View style={styles.navBar}>
                <TouchableOpacity
                  style={styles.navArrowBtn}
                  onPress={() => setYearPageEnd((y) => y - 9)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.navArrowText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.navHeaderLabel}>
                  {yearOptions[0] + 543} - {yearOptions[yearOptions.length - 1] + 543}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.navArrowBtn,
                    yearPageEnd >= maxYear && styles.navArrowDisabled,
                  ]}
                  onPress={() =>
                    setYearPageEnd((y) => Math.min(maxYear, y + 9))
                  }
                  disabled={yearPageEnd >= maxYear}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.navArrowText,
                      yearPageEnd >= maxYear && styles.navArrowTextDisabled,
                    ]}
                  >
                    ›
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.grid3}>
                {yearOptions.map((y) => {
                  const key = String(y);
                  const isSelected = key === selectedDate;
                  const isDisabled = y > maxYear;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.gridTile,
                        isSelected && styles.gridTileSelected,
                        isDisabled && styles.gridTileDisabled,
                      ]}
                      onPress={() => {
                        onSelect(key);
                        onClose();
                      }}
                      disabled={isDisabled}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.gridTileText,
                          isSelected && styles.gridTileSelectedText,
                          isDisabled && styles.gridTileDisabledText,
                        ]}
                      >
                        {y + 543}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>ปิด</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  bodyWrap: {
    gap: 10,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF4FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowDisabled: {
    opacity: 0.4,
  },
  navArrowText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1D4ED8',
    lineHeight: 22,
  },
  navArrowTextDisabled: {
    color: '#94A3B8',
  },
  navHeaderLabel: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  calendarGrid: {
    gap: 4,
  },
  calendarRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dayCellEmpty: {
    flex: 1,
    height: 36,
  },
  dayCell: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#60A5FA',
    backgroundColor: '#EFF6FF',
  },
  dayCellSelected: {
    backgroundColor: '#1D63ED',
  },
  dayCellDisabled: {
    opacity: 0.35,
  },
  dayCellText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  dayCellTodayText: {
    color: '#1D4ED8',
  },
  dayCellSelectedText: {
    color: '#FFFFFF',
  },
  dayCellDisabledText: {
    color: '#94A3B8',
  },
  grid3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridTile: {
    width: '31%',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridTileSelected: {
    backgroundColor: '#1D63ED',
    borderColor: '#1D63ED',
  },
  gridTileDisabled: {
    opacity: 0.35,
  },
  gridTileText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  gridTileSelectedText: {
    color: '#FFFFFF',
  },
  gridTileDisabledText: {
    color: '#94A3B8',
  },
  closeBtn: {
    marginTop: 2,
    backgroundColor: '#F1F5F9',
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
});
