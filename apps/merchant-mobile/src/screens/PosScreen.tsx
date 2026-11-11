import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { merchantApi } from '../api/merchant-api';
import { offlineStorage } from '../offline/offline-storage';
import { PaymentResponse } from '../types';

interface PosScreenProps {
  merchantId: number;
  onPaymentSuccess?: (res: PaymentResponse) => void;
}

const TEST_RFID_CARDS = [
  { label: 'บัตรนักเรียน 1 (สมชาย)', uid: 'E200001906070123456789AB' },
  { label: 'บัตรนักเรียน 2 (สมศรี)', uid: 'E20000190607000000000001' },
];

export function PosScreen({ merchantId, onPaymentSuccess }: PosScreenProps) {
  const [amount, setAmount] = useState('');
  const [rfidUid, setRfidUid] = useState('E200001906070123456789AB');
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{
    amount: string;
    walletBalance: string;
    mode: 'ONLINE' | 'OFFLINE';
  } | null>(null);

  function handleKeyPress(key: string) {
    if (key === 'C') {
      setAmount('');
      setSuccessData(null);
    } else if (key === '⌫') {
      setAmount((prev) => prev.slice(0, -1));
    } else if (key === '.') {
      if (!amount.includes('.')) {
        setAmount((prev) => (prev ? prev + '.' : '0.'));
      }
    } else {
      if (amount.includes('.') && amount.split('.')[1].length >= 2) return;
      setAmount((prev) => prev + key);
    }
  }

  async function handleCharge() {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาระบุจำนวนเงินค่าสินค้าให้ถูกต้อง');
      return;
    }
    if (!rfidUid.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาสแกนหรือระบุ RFID UID ของนักเรียน');
      return;
    }

    setLoading(true);
    setSuccessData(null);

    if (isOffline) {
      // Offline Payment Flow (BR-PAY-01, BR-PAY-03)
      try {
        const { record, remainingBalance } = offlineStorage.processOfflinePayment({
          merchantId,
          rfidUid: rfidUid.trim(),
          amount: amountNum,
        });

        setSuccessData({
          amount: record.amount,
          walletBalance: remainingBalance.toFixed(2),
          mode: 'OFFLINE',
        });
        setAmount('');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดโหมด Offline';
        Alert.alert('ชำระเงินแบบ Offline ไม่สำเร็จ', message);
      } finally {
        setLoading(false);
      }
    } else {
      // Online Payment Flow (UC-05 AC5.1)
      try {
        const res = await merchantApi.processOnlinePayment({
          rfidUid: rfidUid.trim(),
          amount: amountNum.toFixed(2),
        });

        setSuccessData({
          amount: res.amount,
          walletBalance: res.walletBalance,
          mode: 'ONLINE',
        });
        setAmount('');
        if (onPaymentSuccess) onPaymentSuccess(res);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'ชำระเงินไม่สำเร็จ';
        Alert.alert('การชำระเงินถูกปฏิเสธ', message);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <View style={styles.container}>
      {/* Top Status & Mode Toggle */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>จุดชำระเงิน (POS Cashier)</Text>
          <Text style={styles.merchantSubtitle}>ร้านค้า ID: {merchantId}</Text>
        </View>

        <TouchableOpacity
          style={[styles.modeBadge, isOffline ? styles.modeOffline : styles.modeOnline]}
          onPress={() => {
            setIsOffline(!isOffline);
            setSuccessData(null);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeText, isOffline ? styles.modeTextOffline : styles.modeTextOnline]}>
            {isOffline ? '⚡ OFFLINE MODE' : '🌐 ONLINE MODE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Success Green Screen Banner */}
      {successData && (
        <View style={styles.successBanner}>
          <Text style={styles.successCheck}>✓ ชำระเงินสำเร็จ</Text>
          <Text style={styles.successAmount}>฿{parseFloat(successData.amount).toFixed(2)}</Text>
          <Text style={styles.successBalance}>
            ยอดเงินคงเหลือในบัตร: ฿{parseFloat(successData.walletBalance).toFixed(2)}
          </Text>
          <Text style={styles.successModeNote}>
            [{successData.mode === 'OFFLINE' ? 'บันทึกลงเครื่องรอ Sync' : 'ตัดเงินจาก Server แล้ว'}]
          </Text>
        </View>
      )}

      {/* RFID Input / Quick Scan Section */}
      <View style={styles.scanSection}>
        <Text style={styles.scanLabel}>บัตร RFID ที่สแกน:</Text>
        <TextInput
          style={styles.uidInput}
          value={rfidUid}
          onChangeText={setRfidUid}
          placeholder="RFID UID"
        />
        <View style={styles.quickCardsRow}>
          {TEST_RFID_CARDS.map((c) => (
            <TouchableOpacity
              key={c.uid}
              style={[styles.quickCardBtn, rfidUid === c.uid && styles.quickCardBtnActive]}
              onPress={() => setRfidUid(c.uid)}
            >
              <Text style={styles.quickCardText}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Amount Display */}
      <View style={styles.displaySection}>
        <Text style={styles.currencyLabel}>THB</Text>
        <Text style={styles.amountDisplay}>{amount || '0.00'}</Text>
      </View>

      {/* Numpad */}
      <View style={styles.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.key, key === 'C' && styles.clearKey]}
            onPress={() => handleKeyPress(key)}
            activeOpacity={0.6}
          >
            <Text style={[styles.keyText, key === 'C' && styles.clearKeyText]}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Charge Button */}
      <TouchableOpacity
        style={[styles.chargeButton, loading && styles.chargeButtonDisabled]}
        onPress={handleCharge}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.chargeButtonText}>
            แตะบัตรคิดเงิน {amount ? `฿${parseFloat(amount || '0').toFixed(2)}` : ''}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  merchantSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  modeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  modeOnline: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  modeOffline: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  modeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  modeTextOnline: {
    color: '#047857',
  },
  modeTextOffline: {
    color: '#b45309',
  },
  successBanner: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  successCheck: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successAmount: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  successBalance: {
    color: '#ecfdf5',
    fontSize: 13,
  },
  successModeNote: {
    color: '#d1fae5',
    fontSize: 10,
    marginTop: 4,
  },
  scanSection: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  scanLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  uidInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    padding: 8,
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#0f172a',
  },
  quickCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickCardBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickCardBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  quickCardText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },
  displaySection: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  currencyLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  amountDisplay: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  key: {
    width: '31%',
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0f172a',
  },
  clearKey: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  clearKeyText: {
    color: '#dc2626',
  },
  chargeButton: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  chargeButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  chargeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
