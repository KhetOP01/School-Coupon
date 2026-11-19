import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { PaymentResponse } from '../types';

interface SummaryScreenProps {
  merchantId: number;
  recentPayments?: PaymentResponse[];
}

function TrendChartIcon() {
  return (
    <View style={styles.trendBox}>
      <View style={styles.trendBars}>
        <View style={[styles.trendBar, { height: 7 }]} />
        <View style={[styles.trendBar, { height: 11 }]} />
        <View style={[styles.trendBar, { height: 15 }]} />
      </View>
      <Text style={styles.trendArrow}>↗</Text>
    </View>
  );
}

function WhiteWalletIcon() {
  return (
    <View style={styles.whiteWallet}>
      <View style={styles.whiteWalletTop} />
      <View style={styles.whiteWalletClasp}>
        <View style={styles.whiteWalletDot} />
      </View>
    </View>
  );
}

function CoinStackIcon() {
  return (
    <View style={styles.coinWrap}>
      <View style={[styles.coinDisc, { top: 0 }]} />
      <View style={[styles.coinDisc, { top: 4 }]} />
      <View style={[styles.coinDisc, { top: 8 }]} />
    </View>
  );
}

export function SummaryScreen({ merchantId, recentPayments = [] }: SummaryScreenProps) {
  const [infoVisible, setInfoVisible] = useState(false);
  const grossSales = recentPayments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
  const feeRate = 0.03;
  const feeAmount = grossSales * feeRate;
  const netAmount = grossSales - feeAmount;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Page Title Card */}
      <View style={styles.titleCard}>
        <View style={styles.titleLeft}>
          <TrendChartIcon />
          <View style={styles.titleTextWrap}>
            <Text style={styles.title}>สรุปยอดขายประจำวัน (Sales Summary)</Text>
            <Text style={styles.subtitle}>แสดงข้อมูลยอดขายในวันนี้แบบสรุป</Text>
          </View>
        </View>

        <View style={styles.todayPill}>
          <Text style={styles.todayText}>วันนี้</Text>
        </View>
      </View>

      {/* Main Net Revenue Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroGlowCircle} />
        <View style={styles.heroRays}>
          <View style={[styles.heroRay, { transform: [{ rotate: '-35deg' }] }]} />
          <View style={[styles.heroRay, { transform: [{ rotate: '-10deg' }], marginTop: 4 }]} />
          <View style={[styles.heroRay, { transform: [{ rotate: '15deg' }], marginTop: 6 }]} />
        </View>

        <Text style={styles.heroSubtitle}>ยอดเงินสุทธิที่จะได้รับรวมวันนี้ (บาท)</Text>

        <View style={styles.heroAmountRow}>
          <WhiteWalletIcon />
          <Text style={styles.heroAmount}>฿{netAmount.toFixed(2)}</Text>
        </View>

        <View style={styles.heroBadge}>
          <View style={styles.clockCircle}>
            <Text style={styles.clockHand}>◷</Text>
          </View>
          <Text style={styles.heroBadgeText}>ระยะเวลารอบล่าสุด : 00:00:00 น.</Text>
        </View>
      </View>

      {/* Calculation Breakdown Card */}
      <View style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <View style={styles.detailHeaderLeft}>
            <View style={styles.docBadge}>
              <View style={styles.docLine} />
              <View style={[styles.docLine, { width: 7 }]} />
            </View>
            <Text style={styles.detailTitle}>รายละเอียดการคำนวณ (BR SETTLE-01)</Text>
          </View>

          <TouchableOpacity
            style={styles.infoIconBtn}
            onPress={() => setInfoVisible(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.infoIconText}>i</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>ยอดขายทั้งหมด (Gross Sales):</Text>
          <Text style={styles.detailVal}>฿{grossSales.toFixed(2)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>ค่าธรรมเนียมโรงเรียน (3.0%):</Text>
          <Text style={[styles.detailVal, styles.feeText]}>-฿{feeAmount.toFixed(2)}</Text>
        </View>

        <View style={styles.netHighlightRow}>
          <View style={styles.netLabelWrap}>
            <CoinStackIcon />
            <Text style={styles.totalLabel}>ยอดเงินสุทธิ (Net Amount):</Text>
          </View>
          <Text style={styles.totalVal}>฿{netAmount.toFixed(2)}</Text>
        </View>

        <View style={styles.countRow}>
          <View style={styles.countLabelWrap}>
            <View style={styles.infoCircle}>
              <Text style={styles.infoCircleText}>i</Text>
            </View>
            <Text style={styles.detailLabel}>จำนวนรายการทั้งหมด:</Text>
          </View>
          <Text style={styles.detailVal}>{recentPayments.length} รายการ</Text>
        </View>
      </View>

      {/* Merchant Profile Card */}
      <View style={styles.merchantCard}>
        <Text style={styles.merchantLabel}>รหัสร้านค้า: #{merchantId}</Text>
        <Text style={styles.merchantSub}>สถานะบัญชี: เปิดใช้งานปกติ (Active)</Text>
      </View>

      {/* Settlement Info Modal */}
      <Modal
        visible={infoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalInfoBadge}>
                <Text style={styles.modalInfoBadgeText}>i</Text>
              </View>
              <Text style={styles.modalTitle}>รายการสรุปยอดและการโอนเงิน</Text>
            </View>
            <Text style={styles.modalBody}>
              1. ระบบอัตโนมัติ ใช้เวลา 1-2 นาที เพื่อประมวลผลรายการทั้งหมดและสรุปยอดทุกวัน{'\n'}
              2. หากมีรายการที่ยังไม่สมบูรณ์ จะถูกดำเนินการต่อโดยอัตโนมัติ{'\n'}
              3. สามารถตรวจสอบได้ที่เมนู ประวัติการขาย
            </Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setInfoVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCloseText}>รับทราบ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#EEF4FF',
  },
  container: {
    padding: 14,
    paddingBottom: 22,
    gap: 12,
  },
  titleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  trendBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2.5,
    marginTop: 8,
  },
  trendBar: {
    width: 4,
    borderRadius: 1.5,
    backgroundColor: '#2563EB',
  },
  trendArrow: {
    position: 'absolute',
    top: 3,
    right: 6,
    fontSize: 13,
    fontWeight: '900',
    color: '#1D4ED8',
  },
  titleTextWrap: {
    flexShrink: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF5FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  todayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  heroCard: {
    backgroundColor: '#1E5EEA',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  heroGlowCircle: {
    position: 'absolute',
    right: -30,
    bottom: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroRays: {
    position: 'absolute',
    top: 14,
    right: 16,
    flexDirection: 'row',
    gap: 4,
  },
  heroRay: {
    width: 10,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  heroSubtitle: {
    color: '#E0ECFF',
    fontSize: 13.5,
    fontWeight: '600',
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 10,
  },
  whiteWallet: {
    width: 40,
    height: 31,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  whiteWalletTop: {
    position: 'absolute',
    top: -4,
    left: 4,
    width: 24,
    height: 7,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  whiteWalletClasp: {
    width: 15,
    height: 13,
    backgroundColor: '#DBEAFE',
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    justifyContent: 'center',
    paddingLeft: 4,
  },
  whiteWalletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1E5EEA',
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
  },
  clockCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockHand: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  infoIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
  },
  docBadge: {
    width: 18,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    paddingHorizontal: 3.5,
    gap: 3,
  },
  docLine: {
    width: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 10,
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  detailLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  detailVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  feeText: {
    color: '#DC2626',
  },
  netHighlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EAF1FF',
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginVertical: 6,
  },
  netLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinWrap: {
    width: 16,
    height: 16,
  },
  coinDisc: {
    position: 'absolute',
    left: 1,
    width: 14,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16A34A',
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 2,
  },
  countLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCircleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  modalInfoBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInfoBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  modalBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalCloseBtn: {
    backgroundColor: '#1E64EE',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  merchantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  merchantLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  merchantSub: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 3,
  },
});
