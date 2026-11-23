import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { parentApi } from '../api/parent-api';
import { ParentUser, StudentProfile } from '../types';

interface HomeScreenProps {
  parent: ParentUser;
  student: StudentProfile;
  students: StudentProfile[];
  topInset: number;
  onSelectStudent: (studentId: number) => void;
  onBalanceUpdated: (newBalance: string) => void;
  onLogout: () => void;
}

const PRESET_AMOUNTS = ['50', '100', '200', '300', '500'] as const;

function StudentAvatar() {
  return (
    <View style={styles.avatarCircle}>
      <View style={styles.avatarHair} />
      <View style={styles.avatarFace}>
        <View style={styles.avatarEyeRow}>
          <View style={styles.avatarEye} />
          <View style={styles.avatarEye} />
        </View>
        <View style={styles.avatarSmile} />
      </View>
      <View style={styles.avatarShirt} />
    </View>
  );
}

function CouponWalletBadge() {
  return (
    <View style={styles.heroWalletWrap}>
      <View style={styles.heroWalletBody}>
        <View style={styles.heroWalletFlap}>
          <View style={styles.heroWalletDot} />
        </View>
      </View>
      <View style={styles.heroWalletPlusBadge}>
        <Text style={styles.heroWalletPlusText}>+</Text>
      </View>
    </View>
  );
}

export function HomeScreen({
  parent,
  student,
  students,
  topInset,
  onSelectStudent,
  onBalanceUpdated,
  onLogout,
}: HomeScreenProps) {
  const [selectedAmount, setSelectedAmount] = useState<string>('100');
  const [isCustomSelected, setIsCustomSelected] = useState(false);
  const [loading, setLoading] = useState(false);

  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customAmountDraft, setCustomAmountDraft] = useState('');
  const customInputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [baseUrlInput, setBaseUrlInput] = useState('http://192.168.1.78');

  const [qrGenerated, setQrGenerated] = useState(false);
  const [pendingTopUp, setPendingTopUp] = useState<{
    topUpId: number;
    amount: string;
    gatewayReference: string | null;
    qrImageUrl: string | null;
  } | null>(null);

  const balanceNum = parseFloat(student.walletBalance);
  const isNegative = balanceNum < 0;
  const parsedAmount = parseFloat(selectedAmount);
  const safeAmount = isNaN(parsedAmount) || parsedAmount < 0 ? 0 : parsedAmount;
  const [intPart, decPart] = safeAmount.toFixed(2).split('.');

  useEffect(() => {
    if (!customModalVisible) return;
    const timer = setTimeout(() => {
      customInputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, [customModalVisible]);

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
            [{ text: 'ตกลง', onPress: () => onBalanceUpdated(statusRes.walletBalance!) }],
          );
        }
      } catch {
        // Ignore transient poll errors
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [qrGenerated, pendingTopUp, onBalanceUpdated]);

  async function handlePay() {
    const amountVal = parseFloat(selectedAmount);
    if (isNaN(amountVal) || amountVal < 50 || amountVal > 2000) {
      Alert.alert(
        'ข้อผิดพลาด',
        'ยอดเติมเงินต้องอยู่ระหว่าง 50.00 ถึง 2,000.00 บาท (ตามนโยบายโรงเรียน)',
      );
      return;
    }

    setLoading(true);
    try {
      const result = await parentApi.topUp({
        studentId: student.id,
        amount: amountVal.toFixed(2),
      });

      if (result.status === 'succeeded' && result.walletBalance) {
        onBalanceUpdated(result.walletBalance);
        Alert.alert(
          'เติมเงินสำเร็จ',
          `ยอดเงิน ฿${amountVal.toFixed(2)} เข้าสู่กระเป๋าเงินนักเรียนเรียบร้อยแล้ว`,
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
        onBalanceUpdated(newBal);
        Alert.alert('ชำระเงินสำเร็จ', 'ยอดเงินเข้าสู่ระบบเรียบร้อยแล้ว');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'จำลองการชำระเงินไม่สำเร็จ';
      Alert.alert('ข้อผิดพลาด', message);
    } finally {
      setLoading(false);
    }
  }

  function handleApplyCustomAmount() {
    const num = parseFloat(customAmountDraft);
    if (isNaN(num) || num < 50 || num > 2000) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาระบุจำนวนเงินระหว่าง 50.00 ถึง 2,000.00 บาท');
      return;
    }
    setSelectedAmount(num.toString());
    setIsCustomSelected(true);
    setCustomModalVisible(false);
  }

  return (
    <View style={styles.screen}>
      {/* Top Royal Blue Rounded Header */}
      <TouchableOpacity
        style={[styles.topHeader, { paddingTop: topInset + 10 }]}
        onLongPress={() => setMenuModalVisible(true)}
        activeOpacity={1}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>เติมเงินคูปองลูกน้อย</Text>
            <Text style={styles.headerSubtitle}>ผู้ปกครอง: {parent.fullName}</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutPill}
            onPress={() =>
              Alert.alert('ออกจากระบบ', 'ต้องการออกจากระบบใช่หรือไม่?', [
                { text: 'ยกเลิก', style: 'cancel' },
                { text: 'ออกจากระบบ', style: 'destructive', onPress: onLogout },
              ])
            }
            activeOpacity={0.8}
          >
            <Text style={styles.logoutPillText}>ออก</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Student Selector Card */}
        <View style={styles.profileCard}>
          <StudentAvatar />
          <View style={styles.profileInfo}>
            <Text style={styles.studentName}>
              {student.firstName} {student.lastName}
            </Text>
            <Text style={styles.studentCode}>รหัสนักเรียน : {student.studentCode}</Text>
          </View>
          <TouchableOpacity
            style={styles.switchChildBtn}
            onPress={() => setStudentModalVisible(true)}
            activeOpacity={0.75}
          >
            <Text style={styles.switchChildIcon}>⇄</Text>
            <Text style={styles.switchChildText}>เปลี่ยนเด็ก</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Coupon Balance Card */}
        <View style={[styles.balanceCard, isNegative && styles.negativeBalanceCard]}>
          <View style={styles.cartDecor}>
            <View style={styles.cartRaysRow}>
              <View style={styles.cartRay} />
              <View style={styles.cartRay} />
            </View>
            <View style={styles.cartBasket} />
            <View style={styles.cartWheelsRow}>
              <View style={styles.cartWheel} />
              <View style={styles.cartWheel} />
            </View>
          </View>

          <View style={styles.balanceTopRow}>
            <CouponWalletBadge />
            <View style={styles.balanceTextCol}>
              <Text style={styles.balanceLabel}>ยอดคงเหลือในคูปอง</Text>
              <Text style={styles.balanceAmount}>
                ฿{balanceNum.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {isNegative && (
            <View style={styles.negativeNotice}>
              <Text style={styles.negativeNoticeText}>
                ⚠️ ยอดเงินติดลบจากรายการ Offline (จะหักลบอัตโนมัติเมื่อเติมเงินครั้งถัดไป)
              </Text>
            </View>
          )}
        </View>

        {/* Amount Preset Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.boltIcon}>⚡</Text>
            <Text style={styles.sectionTitle}>เลือกจำนวนเงินที่ต้องการเติม</Text>
          </View>
          <TouchableOpacity
            style={styles.infoIconBtn}
            onPress={() => setNoteModalVisible(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.infoIconText}>i</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.presetGrid}>
          {PRESET_AMOUNTS.map((val) => {
            const active = !isCustomSelected && selectedAmount === val;
            return (
              <TouchableOpacity
                key={val}
                style={[styles.presetBtn, active && styles.presetBtnActive]}
                onPress={() => {
                  setSelectedAmount(val);
                  setIsCustomSelected(false);
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.presetText, active && styles.presetTextActive]}>
                  ฿{val}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.presetBtn, isCustomSelected && styles.presetBtnActive]}
            onPress={() => {
              setCustomAmountDraft(selectedAmount);
              setCustomModalVisible(true);
            }}
            activeOpacity={0.75}
          >
            <View style={styles.customBtnInner}>
              <Text style={styles.pencilIcon}>✎</Text>
              <Text
                style={[
                  styles.customBtnText,
                  isCustomSelected && styles.presetTextActive,
                ]}
              >
                ระบุจำนวนเอง
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Selected Amount Bar */}
        <View style={styles.selectedBar}>
          <View style={styles.selectedLeft}>
            <View style={styles.receiptMiniIcon}>
              <View style={styles.receiptMiniLine} />
              <View style={[styles.receiptMiniLine, { width: 7 }]} />
            </View>
            <Text style={styles.selectedLabel}>ยอดที่เติม</Text>
          </View>

          <Text style={styles.selectedValue}>
            ฿{Number(intPart).toLocaleString('en-US')}
            <Text style={styles.selectedDecimals}>.{decPart}</Text>
          </Text>
        </View>

        {/* Primary Pay Button */}
        <TouchableOpacity
          style={[styles.payButton, loading && styles.payButtonDisabled]}
          onPress={handlePay}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.payBtnInner}>
              <View style={styles.payCardIcon}>
                <View style={styles.payCardStripe} />
                <View style={styles.payCardChip} />
              </View>
              <Text style={styles.payButtonText}>ชำระเงิน</Text>
            </View>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Top-up Info Note Modal */}
      <Modal
        visible={noteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.noteModalHeader}>
              <View style={styles.noteModalBadge}>
                <Text style={styles.noteModalBadgeText}>i</Text>
              </View>
              <Text style={styles.modalTitle}>หมายเหตุ</Text>
            </View>
            <Text style={styles.noteModalBody}>
              ยอดเงินจะถูกเพิ่มเข้าคูปองทันที หลังจากชำระเงินสำเร็จ{'\n'}
              (ขั้นต่ำ 50.00 บาท และสูงสุดไม่เกิน 2,000.00 บาท ต่อรายการ)
            </Text>
            <TouchableOpacity
              style={styles.noteModalCloseBtn}
              onPress={() => setNoteModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.noteModalCloseText}>รับทราบ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Switch Student Modal */}
      <Modal
        visible={studentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStudentModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>เลือกบุตรหลาน</Text>
            <Text style={styles.modalSubtitle}>เลือกรายชื่อนักเรียนที่ต้องการเติมเงินหรือตั้งค่า</Text>

            {students.map((item) => {
              const selected = item.id === student.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.studentOptionRow, selected && styles.studentOptionActive]}
                  onPress={() => {
                    onSelectStudent(item.id);
                    setStudentModalVisible(false);
                  }}
                >
                  <View>
                    <Text style={styles.studentOptionName}>
                      {item.firstName} {item.lastName}
                    </Text>
                    <Text style={styles.studentOptionCode}>{item.studentCode}</Text>
                  </View>
                  <Text style={styles.studentOptionBal}>
                    ฿{parseFloat(item.walletBalance).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setStudentModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>ปิด</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Amount Modal */}
      <Modal
        visible={customModalVisible}
        transparent
        animationType="fade"
        onShow={() => {
          setTimeout(() => customInputRef.current?.focus(), 80);
        }}
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ระบุจำนวนเงินที่ต้องการเติม</Text>
            <Text style={styles.modalSubtitle}>ขั้นต่ำ 50.00 บาท และสูงสุดไม่เกิน 2,000.00 บาท</Text>

            <TextInput
              ref={customInputRef}
              style={styles.customAmountInput}
              keyboardType="numeric"
              value={customAmountDraft}
              onChangeText={setCustomAmountDraft}
              placeholder="150"
              placeholderTextColor="#94A3B8"
              textAlign="center"
              selectTextOnFocus
              autoFocus
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCustomModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleApplyCustomAmount}
              >
                <Text style={styles.modalConfirmText}>ตกลง</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PromptPay QR Modal */}
      <Modal
        visible={qrGenerated}
        transparent
        animationType="fade"
        onRequestClose={() => setQrGenerated(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.qrModalCard}>
            <Text style={styles.modalTitle}>สแกน QR เพื่อชำระเงิน (PromptPay)</Text>
            <View style={styles.qrImageBox}>
              {pendingTopUp?.qrImageUrl ? (
                <Image
                  source={{ uri: pendingTopUp.qrImageUrl }}
                  style={{ width: 180, height: 180 }}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.qrPlaceholderText}>[QR CODE]</Text>
              )}
            </View>
            <Text style={styles.qrAmountLabel}>
              ฿{parseFloat(pendingTopUp?.amount ?? selectedAmount).toFixed(2)}
            </Text>

            <TouchableOpacity
              style={styles.paySimBtn}
              onPress={handleSimulatePay}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.paySimBtnText}>จำลองการชำระเงินสำเร็จ (Sandbox Webhook)</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.qrCancelBtn}
              onPress={() => setQrGenerated(false)}
            >
              <Text style={styles.modalCancelText}>ปิด</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Server Connection Settings Modal */}
      <Modal
        visible={menuModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ตั้งค่าการเชื่อมต่อระบบ</Text>
            <Text style={styles.modalSubtitle}>
              {student.firstName} {student.lastName} ({student.studentCode})
            </Text>

            <Text style={styles.settingsLabel}>Server Base URL (Backend)</Text>
            <TextInput
              style={styles.modalInput}
              value={baseUrlInput}
              onChangeText={setBaseUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.1.53"
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalLogoutBtn}
                onPress={() => {
                  setMenuModalVisible(false);
                  onLogout();
                }}
              >
                <Text style={styles.modalLogoutText}>ออกจากระบบ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setMenuModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>ปิด</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => {
                  if (baseUrlInput.trim()) parentApi.setBaseUrl(baseUrlInput.trim());
                  setMenuModalVisible(false);
                }}
              >
                <Text style={styles.modalConfirmText}>บันทึก URL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerCenter: {
    flex: 1,
    alignItems: 'flex-start',
  },
  logoutPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  logoutPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
    paddingBottom: 22,
    gap: 12,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DBEAFE',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  avatarHair: {
    position: 'absolute',
    top: 7,
    width: 24,
    height: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#451A03',
  },
  avatarFace: {
    width: 22,
    height: 20,
    borderRadius: 11,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  avatarEyeRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 2,
  },
  avatarEye: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#1E293B',
  },
  avatarSmile: {
    width: 7,
    height: 3.5,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderBottomWidth: 1.5,
    borderColor: '#B45309',
    marginTop: 2,
  },
  avatarShirt: {
    width: 30,
    height: 12,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  studentCode: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  switchChildBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF5FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  switchChildIcon: {
    color: '#1E64EE',
    fontSize: 13,
    fontWeight: '800',
  },
  switchChildText: {
    color: '#1E3A8A',
    fontSize: 12.5,
    fontWeight: '700',
  },
  balanceCard: {
    backgroundColor: '#1E5EEA',
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  negativeBalanceCard: {
    backgroundColor: '#991B1B',
  },
  cartDecor: {
    position: 'absolute',
    right: 18,
    top: 28,
    opacity: 0.28,
    alignItems: 'center',
  },
  cartRaysRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  cartRay: {
    width: 2.5,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  cartBasket: {
    width: 38,
    height: 22,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderRadius: 5,
  },
  cartWheelsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 4,
  },
  cartWheel: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  balanceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroWalletWrap: {
    width: 50,
    height: 44,
    justifyContent: 'flex-end',
  },
  heroWalletBody: {
    width: 44,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#FBBF24',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  heroWalletFlap: {
    width: 16,
    height: 14,
    backgroundColor: '#2563EB',
    borderTopLeftRadius: 7,
    borderBottomLeftRadius: 7,
    justifyContent: 'center',
    paddingLeft: 4,
  },
  heroWalletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  heroWalletPlusBadge: {
    position: 'absolute',
    top: 0,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#14B8A6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  heroWalletPlusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 14,
  },
  balanceTextCol: {
    flex: 1,
  },
  balanceLabel: {
    color: '#DBEAFE',
    fontSize: 13,
    fontWeight: '600',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    marginTop: 2,
  },
  negativeNotice: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
  },
  negativeNoticeText: {
    color: '#FECACA',
    fontSize: 11,
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    color: '#1E64EE',
    fontSize: 13,
    fontWeight: '800',
  },
  boltIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  presetBtn: {
    width: '31.5%',
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  presetBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E64EE',
    borderWidth: 1.5,
  },
  presetText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  presetTextActive: {
    color: '#1E64EE',
  },
  customBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  pencilIcon: {
    color: '#1E64EE',
    fontSize: 14,
    fontWeight: '800',
  },
  customBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  selectedBar: {
    backgroundColor: '#F3F7FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  receiptMiniIcon: {
    width: 24,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    paddingHorizontal: 5,
    gap: 3,
  },
  receiptMiniLine: {
    width: 12,
    height: 2.5,
    borderRadius: 1,
    backgroundColor: '#1E64EE',
  },
  selectedLabel: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#334155',
  },
  selectedValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectedDecimals: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
  },
  payButton: {
    backgroundColor: '#1E64EE',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  payBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  payCardIcon: {
    width: 24,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'space-between',
    padding: 2,
  },
  payCardStripe: {
    height: 3,
    backgroundColor: '#FFFFFF',
  },
  payCardChip: {
    width: 6,
    height: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  noteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  noteModalBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E64EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteModalBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  noteModalBody: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 21,
    marginBottom: 16,
  },
  noteModalCloseBtn: {
    backgroundColor: '#1E64EE',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  noteModalCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  studentOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  studentOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E64EE',
  },
  studentOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  studentOptionCode: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  studentOptionBal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E64EE',
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
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  customAmountInput: {
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderRadius: 14,
    backgroundColor: '#F8FAFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  modalLogoutBtn: {
    marginRight: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
  },
  modalLogoutText: {
    color: '#B91C1C',
    fontWeight: '700',
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
  qrModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  qrImageBox: {
    width: 196,
    height: 196,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  qrPlaceholderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  qrAmountLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E64EE',
    marginBottom: 12,
  },
  paySimBtn: {
    width: '100%',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  paySimBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  qrCancelBtn: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  settingsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 6,
    marginBottom: 4,
  },
});
