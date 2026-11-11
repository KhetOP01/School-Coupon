import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { PaymentResponse } from '../types';

interface SummaryScreenProps {
  merchantId: number;
  recentPayments?: PaymentResponse[];
}

export function SummaryScreen({ merchantId, recentPayments = [] }: SummaryScreenProps) {
  // Calculate daily totals from recent payments
  const grossSales = recentPayments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
  const feeRate = 0.03; // 3% fee (default in PRD)
  const feeAmount = grossSales * feeRate;
  const netAmount = grossSales - feeAmount;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>สรุปยอดขายประจำวัน (Sales Summary)</Text>
      <Text style={styles.subtitle}>UC-07: การชำระเงินและโอนเงินรอบ T+1</Text>

      {/* Main Net Revenue Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroSubtitle}>ยอดเงินสุทธิที่จะได้รับรอบถัดไป (T+1)</Text>
        <Text style={styles.heroAmount}>฿{netAmount.toFixed(2)}</Text>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>รอประมวลผลรอบเที่ยงคืน 00:00:00 น.</Text>
        </View>
      </View>

      {/* Breakdown Breakdown */}
      <View style={styles.detailCard}>
        <Text style={styles.detailTitle}>รายละเอียดการคำนวณ (BR-SETTLE-01)</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>ยอดขายรวม (Gross Sales):</Text>
          <Text style={styles.detailVal}>฿{grossSales.toFixed(2)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>ค่าธรรมเนียมโรงเรียน (3.0%):</Text>
          <Text style={[styles.detailVal, styles.feeText]}>-฿{feeAmount.toFixed(2)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.totalLabel}>ยอดโอนสุทธิ (Net Amount):</Text>
          <Text style={styles.totalVal}>฿{netAmount.toFixed(2)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>จำนวนรายการทั้งหมด:</Text>
          <Text style={styles.detailVal}>{recentPayments.length} รายการ</Text>
        </View>
      </View>

      {/* Settlement Info Notice */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ รอบการสรุปยอดและการโอนเงิน</Text>
        <Text style={styles.infoBody}>
          1. ระบบอัตโนมัติ (Cron Job) จะรวบรวมรายการชำระเงินและสรุปยอดทุกวันเวลา 00:00:00 น.{'\n'}
          2. เจ้าหน้าที่การเงิน (Staff Admin) จะตรวจสอบและอนุมัติ Settlement ผ่าน Web Admin{'\n'}
          3. เงินจะเข้าบัญชีร้านค้าตามรอบ T+1 (ภายในเวลา 10:00 น. ของวันทำการถัดไป)
        </Text>
      </View>

      {/* Merchant Profile Box */}
      <View style={styles.merchantCard}>
        <Text style={styles.merchantLabel}>รหัสร้านค้า: #{merchantId}</Text>
        <Text style={styles.merchantSub}>สถานะบัญชี: เปิดใช้งานปกติ (Active)</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
  },
  heroCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  heroSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  heroAmount: {
    color: '#38bdf8',
    fontSize: 34,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  heroBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    marginTop: 4,
  },
  heroBadgeText: {
    color: '#7dd3fc',
    fontSize: 10,
    fontWeight: '600',
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 14,
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  feeText: {
    color: '#ef4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 6,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  totalVal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#059669',
  },
  infoCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#15803d',
    marginBottom: 4,
  },
  infoBody: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
  },
  merchantCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  merchantLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  merchantSub: {
    fontSize: 11,
    color: '#10b981',
    marginTop: 2,
  },
});
