import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { merchantApi } from '../api/merchant-api';
import { PaymentResponse, VoidResponse } from '../types';

interface VoidScreenProps {
  recentPayments?: PaymentResponse[];
  onVoidSuccess?: (res: VoidResponse) => void;
}

export function VoidScreen({ recentPayments = [], onVoidSuccess }: VoidScreenProps) {
  const [paymentId, setPaymentId] = useState('');
  const [reason, setReason] = useState('ลูกค้าขอยกเลิกรายการ');
  const [loading, setLoading] = useState(false);
  const [voidResult, setVoidResult] = useState<VoidResponse | null>(null);

  async function handleVoid(targetId: string) {
    if (!targetId.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาระบุ Payment ID หรือเลือกรายการที่ต้องการยกเลิก');
      return;
    }

    setLoading(true);
    setVoidResult(null);

    try {
      const res = await merchantApi.voidPayment(targetId.trim(), reason);
      setVoidResult(res);
      Alert.alert(
        'ยกเลิกรายการสำเร็จ',
        `คืนเงิน ฿${parseFloat(res.refundedAmount).toFixed(2)} เข้ากระเป๋านักเรียนเรียบร้อย (BR-VOID-01: ไม่ต้องแตะบัตรซ้ำ)`,
      );
      if (onVoidSuccess) onVoidSuccess(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถยกเลิกรายการได้';
      Alert.alert('เกิดข้อผิดพลาดในการยกเลิก', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ยกเลิกรายการชำระเงิน (Void Payment)</Text>
      <Text style={styles.subtitle}>UC-06: ยกเลิกและคืนเงินเข้าบัตรนักเรียน</Text>

      {/* Business Rule Notice */}
      <View style={styles.ruleNotice}>
        <Text style={styles.ruleNoticeTitle}>📌 กฎธุรกิจ BR-VOID-01 & BR-VOID-02</Text>
        <Text style={styles.ruleNoticeBody}>
          • ยกเลิกได้เฉพาะรายการภายในวันเดียวกัน (ก่อน 23:59:59 น.){'\n'}
          • คืนเงินเข้ากระเป๋านักเรียนทันทีโดยไม่ต้องแตะบัตร RFID ซ้ำ{'\n'}
          • หากข้ามวันแล้ว ต้องดำเนินการผ่านระบบ Web Admin เท่านั้น
        </Text>
      </View>

      {/* Manual Input Form */}
      <View style={styles.formCard}>
        <Text style={styles.label}>รหัสรายการชำระเงิน (Payment ID):</Text>
        <TextInput
          style={styles.input}
          value={paymentId}
          onChangeText={setPaymentId}
          placeholder="เช่น 1024"
          keyboardType="numeric"
        />

        <Text style={styles.label}>เหตุผลในการยกเลิก:</Text>
        <TextInput
          style={styles.input}
          value={reason}
          onChangeText={setReason}
          placeholder="ระบุเหตุผล"
        />

        <TouchableOpacity
          style={[styles.voidButton, loading && styles.buttonDisabled]}
          onPress={() => handleVoid(paymentId)}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.voidButtonText}>ยืนยันยกเลิกและคืนเงิน (Void)</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Void Result Banner */}
      {voidResult && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>✓ ดำเนินการ Void เรียบร้อย</Text>
          <Text style={styles.resultRow}>
            รหัสการยกเลิก: <Text style={styles.resultVal}>#{voidResult.voidId}</Text>
          </Text>
          <Text style={styles.resultRow}>
            ยอดเงินที่คืน: <Text style={styles.resultValHighlight}>฿{parseFloat(voidResult.refundedAmount).toFixed(2)}</Text>
          </Text>
          <Text style={styles.resultRow}>
            ยอดเงินคงเหลือใหม่ของนักเรียน: <Text style={styles.resultVal}>฿{parseFloat(voidResult.studentWalletBalance).toFixed(2)}</Text>
          </Text>
          <Text style={styles.resultTime}>เวลา: {new Date(voidResult.voidedAt).toLocaleTimeString('th-TH')}</Text>
        </View>
      )}

      {/* Recent Payments Section */}
      <Text style={styles.sectionHeader}>รายการที่ทำในกะนี้ (แตะเพื่อเลือก Void):</Text>
      {recentPayments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>ยังไม่มีรายการชำระเงินในรอบปัจจุบัน</Text>
        </View>
      ) : (
        <FlatList
          data={recentPayments}
          keyExtractor={(item) => String(item.paymentId)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.paymentItem}
              onPress={() => setPaymentId(String(item.paymentId))}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.paymentItemTitle}>
                  รายการ #{item.paymentId} (ใบเสร็จ: {item.receiptNumber})
                </Text>
                <Text style={styles.paymentItemSub}>
                  เวลา: {new Date(item.createdAt).toLocaleTimeString('th-TH')}
                </Text>
              </View>
              <View style={styles.paymentItemRight}>
                <Text style={styles.paymentAmount}>฿{parseFloat(item.amount).toFixed(2)}</Text>
                <Text style={styles.selectText}>แตะเพื่อเลือก</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
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
    marginBottom: 12,
  },
  ruleNotice: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  ruleNoticeTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1d4ed8',
    marginBottom: 4,
  },
  ruleNoticeBody: {
    fontSize: 11,
    color: '#1e40af',
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
  },
  voidButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: '#f87171',
  },
  voidButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#15803d',
    marginBottom: 6,
  },
  resultRow: {
    fontSize: 12,
    color: '#166534',
    marginBottom: 2,
  },
  resultVal: {
    fontWeight: '600',
  },
  resultValHighlight: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#16a34a',
  },
  resultTime: {
    fontSize: 10,
    color: '#4ade80',
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  paymentItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  paymentItemSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  paymentItemRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  selectText: {
    fontSize: 10,
    color: '#2563eb',
    marginTop: 2,
  },
});
