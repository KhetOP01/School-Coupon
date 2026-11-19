import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { merchantApi } from '../api/merchant-api';
import { PaymentResponse, VoidResponse } from '../types';

interface VoidScreenProps {
  recentPayments?: PaymentResponse[];
  onVoidSuccess?: (res: VoidResponse) => void;
}

function VoidWalletIcon() {
  return (
    <View style={styles.walletCircle}>
      <View style={styles.walletBox}>
        <View style={styles.walletStripe} />
        <View style={styles.walletDot} />
      </View>
      <View style={styles.walletCancelBadge}>
        <Text style={styles.walletCancelX}>✕</Text>
      </View>
    </View>
  );
}

function CardIconBlue() {
  return (
    <View style={styles.smallCardIcon}>
      <View style={styles.smallCardStripe} />
      <View style={styles.smallCardChip} />
    </View>
  );
}

function PersonIconBlue() {
  return (
    <View style={styles.personWrap}>
      <View style={styles.personHead} />
      <View style={styles.personBody} />
    </View>
  );
}

export function VoidScreen({ recentPayments = [], onVoidSuccess }: VoidScreenProps) {
  const [paymentId, setPaymentId] = useState('');
  const [reason, setReason] = useState('ลูกค้าขอยกเลิกรายการ');
  const [loading, setLoading] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [voidResult, setVoidResult] = useState<VoidResponse | null>(null);

  function getRefundedAmount(res: VoidResponse): string {
    return res.refundedAmount ?? res.amount ?? '0';
  }

  function getUpdatedBalance(res: VoidResponse): string {
    return res.studentWalletBalance ?? res.walletBalance ?? '0';
  }

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
      const refunded = parseFloat(getRefundedAmount(res));
      Alert.alert(
        'ยกเลิกรายการสำเร็จ',
        `คืนเงิน ฿${isNaN(refunded) ? '0.00' : refunded.toFixed(2)} เข้ากระเป๋านักเรียนเรียบร้อย (BR-VOID-01: ไม่ต้องแตะบัตรซ้ำ)`,
      );
      setPaymentId('');
      if (onVoidSuccess) onVoidSuccess(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถยกเลิกรายการได้';
      Alert.alert('เกิดข้อผิดพลาดในการยกเลิก', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Top Title Card */}
      <View style={styles.titleCard}>
        <VoidWalletIcon />
        <View style={styles.titleTextWrap}>
          <Text style={styles.title}>ยกเลิกรายการชำระเงิน</Text>
          <Text style={styles.subtitle}>UC-06: ยกเลิกและคืนเงินเข้าบัตรนักเรียน</Text>
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

      {/* Void Form Card */}
      <View style={styles.formCard}>
        <View style={styles.fieldHeader}>
          <CardIconBlue />
          <Text style={styles.label}>รหัสรายการชำระเงิน (Payment ID)</Text>
        </View>
        <View style={styles.inputBox}>
          <Text style={styles.inputPrefix}>#</Text>
          <TextInput
            style={styles.input}
            value={paymentId}
            onChangeText={setPaymentId}
            placeholder="เช่น 1024"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.fieldHeader}>
          <PersonIconBlue />
          <Text style={styles.label}>เหตุผลในการยกเลิก</Text>
        </View>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder="ลูกค้าขอยกเลิกรายการ"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <TouchableOpacity
          style={[styles.voidButton, loading && styles.buttonDisabled]}
          onPress={() => handleVoid(paymentId)}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.voidButtonText}>ยืนยันยกเลิกและคืนเงิน</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Void Result Banner */}
      {voidResult && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>✓ ดำเนินการยกเลิกและคืนเงินเรียบร้อย</Text>
          <Text style={styles.resultRow}>
            รหัสรายการ: <Text style={styles.resultVal}>#{voidResult.voidId ?? voidResult.paymentId}</Text>
          </Text>
          <Text style={styles.resultRow}>
            ยอดเงินที่คืน:{' '}
            <Text style={styles.resultValHighlight}>
              ฿{parseFloat(getRefundedAmount(voidResult)).toFixed(2)}
            </Text>
          </Text>
          <Text style={styles.resultRow}>
            ยอดเงินคงเหลือใหม่ของนักเรียน:{' '}
            <Text style={styles.resultVal}>
              ฿{parseFloat(getUpdatedBalance(voidResult)).toFixed(2)}
            </Text>
          </Text>
          <Text style={styles.resultTime}>
            เวลา: {new Date(voidResult.voidedAt).toLocaleTimeString('th-TH')}
          </Text>
        </View>
      )}

      {/* Recent Payments Section Card */}
      <View style={styles.recentCard}>
        <Text style={styles.sectionHeader}>รายการที่ทำในวันนี้</Text>

        {recentPayments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>ยังไม่มีรายการชำระเงินในรอบปัจจุบัน</Text>
          </View>
        ) : (
          <View style={styles.paymentList}>
            {recentPayments.map((item) => (
              <TouchableOpacity
                key={String(item.paymentId)}
                style={styles.paymentItem}
                onPress={() => setPaymentId(String(item.paymentId))}
                activeOpacity={0.75}
              >
                <View style={styles.paymentItemLeft}>
                  <Text style={styles.paymentItemTitle} numberOfLines={1} ellipsizeMode="middle">
                    รายการ #{item.paymentId}
                    {item.receiptNumber ? ` (ใบเสร็จ: ${item.receiptNumber})` : ''}
                  </Text>
                  <View style={styles.paymentSubRow}>
                    <Text style={styles.paymentItemSub}>
                      เวลา: {new Date(item.createdAt).toLocaleTimeString('th-TH')}
                    </Text>
                    <Text style={styles.paymentAmount}>
                      ฿{parseFloat(item.amount).toFixed(2)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.chevronRight}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Business Rule Info Modal */}
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
              <Text style={styles.modalTitle}>กฎธุรกิจ BR-VOID-01 &amp; BR-VOID-02</Text>
            </View>
            <Text style={styles.modalBody}>
              • ยกเลิกได้เฉพาะรายการภายในวันเดียวกัน (ก่อน 23:59 น.){'\n'}
              • คืนเงินเฉพาะระบบที่มีการชำระผ่านบัตร RFID เท่านั้น{'\n'}
              • หากจำนวนเงินผิด ต้องดำเนินการผ่านระบบ Web Admin เท่านั้น
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
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  walletCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBox: {
    width: 28,
    height: 22,
    borderRadius: 5,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 3,
  },
  walletStripe: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#93C5FD',
  },
  walletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
  },
  walletCancelBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  walletCancelX: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  titleTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  infoIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: {
    color: '#2563EB',
    fontSize: 14,
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
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  smallCardIcon: {
    width: 20,
    height: 15,
    borderRadius: 3,
    backgroundColor: '#2563EB',
    justifyContent: 'space-between',
    padding: 2.5,
  },
  smallCardStripe: {
    height: 2.5,
    backgroundColor: '#DBEAFE',
    borderRadius: 1,
  },
  smallCardChip: {
    width: 5,
    height: 3.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  personWrap: {
    width: 18,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personHead: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2563EB',
    marginBottom: 1.5,
  },
  personBody: {
    width: 13,
    height: 6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: '#2563EB',
  },
  label: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    marginBottom: 12,
    minHeight: 44,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 8,
  },
  voidButton: {
    backgroundColor: '#DC2626',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    shadowColor: '#B91C1C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#F87171',
  },
  voidButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  resultCard: {
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 13,
  },
  resultTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#15803D',
    marginBottom: 6,
  },
  resultRow: {
    fontSize: 12.5,
    color: '#166534',
    marginBottom: 2,
  },
  resultVal: {
    fontWeight: '700',
  },
  resultValHighlight: {
    fontWeight: '800',
    fontSize: 15,
    color: '#16A34A',
  },
  resultTime: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 4,
  },
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  emptyContainer: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12.5,
    color: '#94A3B8',
  },
  paymentList: {
    gap: 8,
  },
  paymentItem: {
    backgroundColor: '#F5F8FF',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  paymentItemLeft: {
    flex: 1,
  },
  paymentItemTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  paymentSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  paymentItemSub: {
    fontSize: 11,
    color: '#64748B',
  },
  paymentAmount: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  chevronRight: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2563EB',
  },
});
