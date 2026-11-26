import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { parentApi } from '../api/parent-api';
import { HeaderRightActions } from '../components/HeaderRightActions';
import { StudentProfile } from '../types';

interface TopUpScreenProps {
  student: StudentProfile;
  students?: StudentProfile[];
  onSelectStudent?: (studentId: number) => void;
  onSuccess: (newBalance: string) => void;
  onBack: () => void;
  onLogout?: () => void;
}

const PRESET_AMOUNTS = ['50', '100', '200', '500', '1000', '2000'];

export function TopUpScreen({
  student,
  students,
  onSelectStudent,
  onSuccess,
  onBack,
  onLogout,
}: TopUpScreenProps) {
  const [amount, setAmount] = useState('100');
  const [loading, setLoading] = useState(false);
  const [qrGenerated, setQrGenerated] = useState(false);
  const [pendingTopUp, setPendingTopUp] = useState<{
    topUpId: number;
    amount: string;
    gatewayReference: string | null;
    qrImageUrl: string | null;
  } | null>(null);

  useEffect(() => {
    if (!qrGenerated || !pendingTopUp) return;

    const timer = setInterval(async () => {
      try {
        const statusRes = await parentApi.getTopUpStatus(pendingTopUp.topUpId);
        if (statusRes.status === 'succeeded' && statusRes.walletBalance) {
          clearInterval(timer);
          setQrGenerated(false);
          setPendingTopUp(null);
          Alert.alert(
            'เติมเงินสำเร็จ',
            `ยอดเงิน ฿${parseFloat(pendingTopUp.amount).toFixed(2)} เข้าสู่กระเป๋าเงินนักเรียนเรียบร้อยแล้ว`,
            [{ text: 'ตกลง', onPress: () => onSuccess(statusRes.walletBalance!) }],
          );
        }
      } catch {
        // Ignore transient poll errors
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [qrGenerated, pendingTopUp, onSuccess]);

  async function handleConfirmTopUp() {
    const amountVal = parseFloat(amount);
    if (isNaN(amountVal) || amountVal < 50 || amountVal > 2000) {
      Alert.alert('ข้อผิดพลาด', 'ยอดเติมเงินต้องอยู่ระหว่าง 50.00 ถึง 2,000.00 บาท (ตามนโยบายโรงเรียน)');
      return;
    }

    setLoading(true);
    try {
      const result = await parentApi.topUp({
        studentId: student.id,
        amount: amountVal.toFixed(2),
      });

      if (result.status === 'succeeded' && result.walletBalance) {
        Alert.alert(
          'เติมเงินสำเร็จ',
          `ยอดเงิน ฿${amountVal.toFixed(2)} เข้าสู่กระเป๋าเงินนักเรียนเรียบร้อยแล้ว`,
          [{ text: 'ตกลง', onPress: () => onSuccess(result.walletBalance!) }],
        );
      } else {
        setPendingTopUp({
          topUpId: result.topUpId,
          amount: result.amount,
          gatewayReference: result.gatewayReference ?? null,
          qrImageUrl: result.qrImageUrl ?? null,
        });
        setQrGenerated(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ไม่สามารถดำเนินการได้';
      Alert.alert('การเติมเงินไม่สำเร็จ', message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulatePay() {
    if (!pendingTopUp?.gatewayReference) {
      Alert.alert('ข้อผิดพลาด', 'ไม่พบข้อมูลอ้างอิงสำหรับจำลองการจ่ายเงิน');
      return;
    }
    setLoading(true);
    try {
      const res = await parentApi.simulateGatewayPayment(
        pendingTopUp.gatewayReference,
        pendingTopUp.amount,
      );
      const latest = await parentApi.getTopUpStatus(pendingTopUp.topUpId);
      const newBal = latest.walletBalance ?? res.walletBalance;
      setQrGenerated(false);
      setPendingTopUp(null);
      if (newBal) {
        Alert.alert('ชำระเงินสำเร็จ', 'ยอดเงินเข้าสู่ระบบ PostgreSQL เรียบร้อยแล้ว', [
          { text: 'ตกลง', onPress: () => onSuccess(newBal) },
        ]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'จำลองการชำระเงินไม่สำเร็จ';
      Alert.alert('ข้อผิดพลาด', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ ย้อนกลับ</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>เติมเงินเข้าบัตร (Parent Top-Up)</Text>
        </View>
        <HeaderRightActions
          student={student}
          students={students}
          onSelectStudent={onSelectStudent}
          onLogout={onLogout}
          variant="onLight"
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>เลือกจำนวนเงิน (บาท)</Text>
        <View style={styles.presetGrid}>
          {PRESET_AMOUNTS.map((val) => (
            <TouchableOpacity
              key={val}
              style={[styles.presetButton, amount === val && styles.presetButtonActive]}
              onPress={() => {
                setAmount(val);
                setQrGenerated(false);
              }}
            >
              <Text style={[styles.presetText, amount === val && styles.presetTextActive]}>
                ฿{val}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>หรือระบุจำนวนเงินเอง</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={amount}
          onChangeText={(text) => {
            setAmount(text);
            setQrGenerated(false);
          }}
          placeholder="50.00 - 2,000.00"
        />

        <Text style={styles.ruleNotice}>
          * ขั้นต่ำ 50.00 บาท และสูงสุดไม่เกิน 2,000.00 บาท ต่อรายการ (BR-TOPUP-01)
        </Text>

        {qrGenerated ? (
          <View style={styles.qrContainer}>
            <Text style={styles.qrTitle}>สแกน QR เพื่อชำระเงิน (PromptPay)</Text>
            <View style={styles.mockQrBox}>
              {pendingTopUp?.qrImageUrl ? (
                <Image
                  source={{ uri: pendingTopUp.qrImageUrl }}
                  style={{ width: 180, height: 180, marginBottom: 8 }}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.qrCodeIcon}>[QR CODE]</Text>
              )}
              <Text style={styles.qrAmountText}>฿{parseFloat(amount).toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={styles.paySimButton}
              onPress={handleSimulatePay}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.paySimButtonText}>จำลองการชำระเงินสำเร็จ (Sandbox Webhook)</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleConfirmTopUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>ดำเนินการชำระเงิน</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    paddingRight: 12,
  },
  backButtonText: {
    fontSize: 18,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetButton: {
    width: '31%',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  presetText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  presetTextActive: {
    color: '#2563eb',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  ruleNotice: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qrContainer: {
    marginTop: 20,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  mockQrBox: {
    width: 140,
    height: 140,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#0f172a',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCodeIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
  },
  qrAmountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
    marginTop: 8,
  },
  paySimButton: {
    marginTop: 16,
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  paySimButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
