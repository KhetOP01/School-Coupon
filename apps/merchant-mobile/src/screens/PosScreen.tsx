import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { merchantApi } from '../api/merchant-api';
import { offlineStorage } from '../offline/offline-storage';
import { PaymentResponse } from '../types';

interface PosScreenProps {
  merchantId: number;
  isOffline?: boolean;
  pauseScanner?: boolean;
  onPaymentSuccess?: (res: PaymentResponse) => void;
}

const TEST_RFID_CARDS = [
  { label: '1. สมชาย ใจดี (STD-1001)', uid: 'E280F3020000000145A58295' },
  { label: '2. สมหญิง รักเรียน (STD-1002)', uid: 'E280F3020000000145A58285' },
  { label: '3. ต้นกล้า มีสุข (STD-1003)', uid: 'E280F3020000000145A5828D' },
  { label: '4. น้ำใส สว่างจิต (STD-1004)', uid: 'E280F3020000000145A58289' },
  { label: '5. ภูผา มั่นคง (STD-1005)', uid: 'E280F3020000000145A58291' },
];

function WalletBadgeIcon() {
  return (
    <View style={styles.walletHalo}>
      <View style={styles.walletCardPeek}>
        <Text style={styles.walletStar}>★</Text>
      </View>
      <View style={styles.walletBody}>
        <View style={styles.walletFlap}>
          <View style={styles.walletClasp} />
        </View>
      </View>
    </View>
  );
}

export function PosScreen({
  merchantId,
  isOffline = false,
  pauseScanner = false,
  onPaymentSuccess,
}: PosScreenProps) {
  const [amount, setAmount] = useState('');
  const [rfidUid, setRfidUid] = useState('');
  const [scanBuffer, setScanBuffer] = useState('');
  const [knownBalances, setKnownBalances] = useState<Record<string, string>>({});
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualUidDraft, setManualUidDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{
    amount: string;
    walletBalance: string;
    mode: 'ONLINE' | 'OFFLINE';
  } | null>(null);

  const scannerInputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestBufferRef = useRef('');

  const isModalOpen = pauseScanner || scanModalVisible || manualModalVisible || successData !== null;

  useEffect(() => {
    if (!isModalOpen) {
      const timer = setTimeout(() => {
        scannerInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, []);

  function commitScannedUid(raw: string) {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    const cleaned = raw.replace(/[^0-9A-Za-z_-]/g, '').toUpperCase();
    latestBufferRef.current = '';
    setScanBuffer('');
    if (cleaned.length >= 4) {
      setRfidUid(cleaned);
      setSuccessData(null);
    }
  }

  function handleScannerChange(text: string) {
    latestBufferRef.current = text;
    setScanBuffer(text);

    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    if (text.includes('\n') || text.includes('\r')) {
      commitScannedUid(text);
      return;
    }

    // Fallback for RFID readers configured without trailing Enter key
    scanTimerRef.current = setTimeout(() => {
      if (latestBufferRef.current) {
        commitScannedUid(latestBufferRef.current);
      }
    }, 180);
  }

  const normalizedUid = rfidUid.trim();
  const cachedBal = normalizedUid ? offlineStorage.getCachedBalance(normalizedUid) : null;
  const activeBalanceText = normalizedUid
    ? (knownBalances[normalizedUid] ?? (cachedBal !== null ? cachedBal.toFixed(2) : null))
    : null;

  function handleKeyPress(key: string) {
    if (key === 'C') {
      setAmount('');
      setSuccessData(null);
    } else if (key === '⌫') {
      setAmount((prev) => prev.slice(0, -1));
    } else {
      if (amount.includes('.') && amount.split('.')[1].length >= 2) return;
      if (amount.length >= 7) return;
      if (amount === '0') {
        setAmount(key);
      } else {
        setAmount((prev) => prev + key);
      }
    }
    if (!isModalOpen) {
      scannerInputRef.current?.focus();
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

    const uid = rfidUid.trim();
    setLoading(true);
    setSuccessData(null);

    if (isOffline) {
      try {
        const { record, remainingBalance } = offlineStorage.processOfflinePayment({
          merchantId,
          rfidUid: uid,
          amount: amountNum,
        });

        const formattedBal = remainingBalance.toFixed(2);
        setKnownBalances((prev) => ({ ...prev, [uid]: formattedBal }));
        setSuccessData({
          amount: record.amount,
          walletBalance: formattedBal,
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
      try {
        const res = await merchantApi.processOnlinePayment({
          rfidUid: uid,
          amount: amountNum.toFixed(2),
        });

        const balNum = parseFloat(res.walletBalance);
        if (!isNaN(balNum)) {
          offlineStorage.updateCachedBalance(uid, balNum);
        }
        setKnownBalances((prev) => ({ ...prev, [uid]: res.walletBalance }));
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

  function handleSelectScannedCard(uid: string) {
    setRfidUid(uid);
    setScanModalVisible(false);
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      bounces={false}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
    >
      {/* Hidden-width always-focused HID RFID reader input (no soft keyboard popup) */}
      <TextInput
        ref={scannerInputRef}
        style={styles.hiddenScannerInput}
        value={scanBuffer}
        onChangeText={handleScannerChange}
        onSubmitEditing={() => commitScannedUid(latestBufferRef.current)}
        onBlur={() => {
          if (!isModalOpen) {
            setTimeout(() => scannerInputRef.current?.focus(), 60);
          }
        }}
        autoFocus={!isModalOpen}
        showSoftInputOnFocus={false}
        blurOnSubmit={false}
        autoCapitalize="characters"
        autoCorrect={false}
        caretHidden
      />

      {/* Card 1: Wallet Balance & Direct RFID Scan Box */}
      <View style={styles.balanceCard}>
        <TouchableOpacity
          style={styles.balanceLeft}
          onPress={() => setScanModalVisible(true)}
          activeOpacity={0.75}
        >
          <WalletBadgeIcon />
          <View style={styles.balanceTextWrap}>
            <Text style={styles.balanceLabel}>ยอดคงเหลือในบัตร</Text>
            <Text style={styles.balanceValue} numberOfLines={1} adjustsFontSizeToFit>
              {activeBalanceText !== null
                ? `฿${parseFloat(activeBalanceText).toFixed(2)}`
                : '฿--.--'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cardNumberBox}
          onPress={() => scannerInputRef.current?.focus()}
          onLongPress={() => {
            setManualUidDraft(rfidUid);
            setManualModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.cardNumberHeader}>
            <View style={styles.personIcon}>
              <View style={styles.personHead} />
              <View style={styles.personBody} />
            </View>
            <Text style={styles.cardNumberTitle}>บัตรเลขที่</Text>
            {normalizedUid !== '' && (
              <TouchableOpacity
                style={styles.clearUidBtn}
                onPress={() => {
                  setRfidUid('');
                  scannerInputRef.current?.focus();
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.clearUidText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text
            style={normalizedUid ? styles.cardNumberUidText : styles.cardNumberPlaceholder}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {normalizedUid || 'รอสแกนบัตร...'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Amount Input Card */}
      <View style={styles.amountCard}>
        <View style={styles.amountHeaderRow}>
          <Text style={styles.amountCardTitle}>กรอกจำนวนเงิน</Text>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyBadgeText}>บาท</Text>
          </View>
        </View>

        <View style={styles.amountWell}>
          <Text style={styles.amountDisplay} numberOfLines={1} adjustsFontSizeToFit>
            {amount ? amount : '0.00'}
          </Text>
        </View>
      </View>

      {/* 3x4 Numpad */}
      <View style={styles.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => {
          const isClear = key === 'C';
          const isBackspace = key === '⌫';
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.key,
                isClear && styles.clearKey,
                isBackspace && styles.backspaceKey,
              ]}
              onPress={() => handleKeyPress(key)}
              activeOpacity={0.65}
            >
              {isClear ? (
                <Text style={styles.clearKeyText}>ล้าง</Text>
              ) : isBackspace ? (
                <Text style={styles.backspaceText}>⌫</Text>
              ) : (
                <Text style={styles.keyText}>{key}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Primary Confirm Payment Button */}
      <TouchableOpacity
        style={[styles.chargeButton, loading && styles.chargeButtonDisabled]}
        onPress={handleCharge}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <View style={styles.chargeBtnInner}>
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
            <Text style={styles.chargeButtonText}>ยืนยันการชำระเงิน</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Scan Card Selector Modal */}
      <Modal
        visible={scanModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setScanModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>สแกนบัตร RFID นักเรียน</Text>
            <Text style={styles.modalSubtitle}>เลือกบัตรจำลองที่ต้องการแตะชำระเงิน</Text>

            {TEST_RFID_CARDS.map((c) => {
              const selected = rfidUid === c.uid;
              const bal =
                knownBalances[c.uid] ??
                (offlineStorage.getCachedBalance(c.uid)?.toFixed(2) ?? '0.00');
              return (
                <TouchableOpacity
                  key={c.uid}
                  style={[styles.cardOptionRow, selected && styles.cardOptionRowActive]}
                  onPress={() => handleSelectScannedCard(c.uid)}
                >
                  <View style={styles.cardOptionLeft}>
                    <Text style={styles.cardOptionName}>{c.label}</Text>
                    <Text style={styles.cardOptionUid}>{c.uid}</Text>
                  </View>
                  <Text style={styles.cardOptionBal}>฿{bal}</Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setScanModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>ปิด</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual Fallback Modal (long press card box) */}
      <Modal
        visible={manualModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManualModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>กรอกเลขบัตร RFID</Text>
            <Text style={styles.modalSubtitle}>พิมพ์หรือวางรหัสบัตรด้วยตนเอง</Text>

            <TextInput
              style={styles.manualInput}
              value={manualUidDraft}
              onChangeText={setManualUidDraft}
              placeholder="เช่น E280F3020000000145A58291"
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setManualModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => {
                  const trimmed = manualUidDraft.trim().toUpperCase();
                  if (trimmed) setRfidUid(trimmed);
                  setManualModalVisible(false);
                }}
              >
                <Text style={styles.modalConfirmText}>ตกลง</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Success Receipt Modal */}
      <Modal
        visible={successData !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessData(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            <Text style={styles.successTitle}>ชำระเงินสำเร็จ</Text>
            <Text style={styles.successAmount}>
              ฿{successData ? parseFloat(successData.amount).toFixed(2) : '0.00'}
            </Text>
            <Text style={styles.successBalance}>
              ยอดคงเหลือในบัตร: ฿
              {successData ? parseFloat(successData.walletBalance).toFixed(2) : '0.00'}
            </Text>
            <Text style={styles.successModeNote}>
              {successData?.mode === 'OFFLINE'
                ? 'บันทึกรายการแบบออฟไลน์รอซิงก์แล้ว'
                : 'ตัดเงินจากระบบเรียบร้อยแล้ว'}
            </Text>

            <TouchableOpacity
              style={styles.successOkBtn}
              onPress={() => setSuccessData(null)}
            >
              <Text style={styles.successOkText}>ทำรายการต่อ</Text>
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
  hiddenScannerInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 2,
    height: 2,
    opacity: 0.01,
  },
  container: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  walletHalo: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletCardPeek: {
    position: 'absolute',
    top: 7,
    width: 28,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#FCD34D',
    alignItems: 'center',
    justifyContent: 'flex-start',
    transform: [{ rotate: '-8deg' }],
  },
  walletStar: {
    fontSize: 9,
    color: '#FFFFFF',
    lineHeight: 11,
  },
  walletBody: {
    marginTop: 8,
    width: 38,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'flex-end',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  walletFlap: {
    width: 15,
    height: 12,
    backgroundColor: '#1D4ED8',
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    justifyContent: 'center',
    paddingLeft: 4,
  },
  walletClasp: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  balanceTextWrap: {
    flexShrink: 1,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 27,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  cardNumberBox: {
    backgroundColor: '#EFF5FF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    width: '45%',
    borderWidth: 1,
    borderColor: '#E0EBFF',
  },
  cardNumberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  personIcon: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personHead: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
    marginBottom: 1,
  },
  personBody: {
    width: 10,
    height: 5,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: '#2563EB',
  },
  cardNumberTitle: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  clearUidBtn: {
    paddingHorizontal: 4,
  },
  clearUidText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  cardNumberUidText: {
    fontSize: 10.5,
    color: '#0F172A',
    fontWeight: '700',
  },
  cardNumberPlaceholder: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  amountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  amountCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  currencyBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
  },
  currencyBadgeText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  amountWell: {
    backgroundColor: '#F3F6FB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountDisplay: {
    fontSize: 38,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  key: {
    width: '31.5%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  keyText: {
    fontSize: 23,
    fontWeight: '700',
    color: '#0F172A',
  },
  clearKey: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  clearKeyText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#DC2626',
  },
  backspaceKey: {
    backgroundColor: '#E8EFFA',
    borderColor: '#CBD5E1',
  },
  backspaceText: {
    fontSize: 25,
    fontWeight: '600',
    color: '#0F2B6B',
  },
  chargeButton: {
    marginTop: 2,
    backgroundColor: '#1E64EE',
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  chargeButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  chargeBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E64EE',
  },
  chargeButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
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
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  cardOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  cardOptionRowActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  cardOptionLeft: {
    flexShrink: 1,
  },
  cardOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardOptionUid: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  cardOptionBal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  modalCloseBtn: {
    marginTop: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#334155',
    fontWeight: '700',
  },
  manualInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    color: '#475569',
    fontWeight: '600',
  },
  modalConfirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#1E64EE',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  successModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  successIconText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  successAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#10B981',
    marginVertical: 4,
  },
  successBalance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  successModeNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
  },
  successOkBtn: {
    width: '100%',
    backgroundColor: '#1E64EE',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  successOkText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
