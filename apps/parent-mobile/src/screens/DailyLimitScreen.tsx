import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { parentApi } from '../api/parent-api';
import { HeaderRightActions } from '../components/HeaderRightActions';
import { StudentProfile } from '../types';

interface DailyLimitScreenProps {
  student: StudentProfile;
  students?: StudentProfile[];
  topInset?: number;
  onSelectStudent?: (studentId: number) => void;
  onSuccess: (newNextLimit: string) => void;
  onBack?: () => void;
  onLogout?: () => void;
}

const PRESET_LIMITS = ['50', '100', '150', '200', '300', '500'] as const;

function TargetShieldBadge() {
  return (
    <View style={styles.targetHalo}>
      <View style={styles.targetOuterRing}>
        <View style={styles.targetInnerRing}>
          <View style={styles.targetDot} />
        </View>
      </View>
    </View>
  );
}

export function DailyLimitScreen({
  student,
  students,
  topInset = 0,
  onSelectStudent,
  onSuccess,
  onLogout,
}: DailyLimitScreenProps) {
  const [newLimit, setNewLimit] = useState(
    student.nextDailyLimit || student.currentDailyLimit,
  );
  const [loading, setLoading] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);

  async function handleSaveLimit() {
    const limitNum = parseFloat(newLimit);
    if (isNaN(limitNum) || limitNum < 0 || limitNum > 10000) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาระบุวงเงินให้ถูกต้อง (0.00 ถึง 10,000.00 บาท)');
      return;
    }

    setLoading(true);
    try {
      const result = await parentApi.setDailyLimit(student.id, limitNum.toFixed(2));
      Alert.alert(
        'ตั้งค่าวงเงินสำเร็จ',
        `วงเงินใหม่ ฿${parseFloat(result.nextDailyLimit).toFixed(2)} จะเริ่มมีผลในวันถัดไปเวลา 00:00 น. ตามกฎของระบบ (BR-LIMIT-01)`,
        [{ text: 'ตกลง', onPress: () => onSuccess(result.nextDailyLimit) }],
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ไม่สามารถตั้งค่าวงเงินได้';
      Alert.alert('เกิดข้อผิดพลาด', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      {/* Top Royal Blue Rounded Header (matching HomeScreen) */}
      <View style={[styles.topHeader, { paddingTop: topInset + 10 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerTitle}>จำกัดวงเงินรายวัน</Text>
            <Text style={styles.headerSubtitle}>
              ควบคุมค่าใช้จ่ายของ {student.firstName} {student.lastName} ({student.studentCode})
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Active Limit Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <TargetShieldBadge />
            <View style={styles.heroTextCol}>
              <Text style={styles.heroLabel}>วงเงินใช้จ่ายวันนี้ (Active Today)</Text>
              <Text style={styles.heroAmount}>
                ฿{parseFloat(student.currentDailyLimit).toFixed(2)}
                <Text style={styles.heroUnit}> / วัน</Text>
              </Text>
            </View>
          </View>

          {student.nextDailyLimit !== student.currentDailyLimit && (
            <View style={styles.pendingPill}>
              <Text style={styles.pendingPillText}>
                รอบวันถัดไป (00:00 น.): ฿{parseFloat(student.nextDailyLimit).toFixed(2)} / วัน
              </Text>
            </View>
          )}
        </View>

        {/* Preset Quick Selection */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>เลือกวงเงินต่อวันแนะนำ</Text>
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
          {PRESET_LIMITS.map((val) => {
            const active = parseFloat(newLimit || '0') === parseFloat(val);
            return (
              <TouchableOpacity
                key={val}
                style={[styles.presetBtn, active && styles.presetBtnActive]}
                onPress={() => setNewLimit(val)}
                activeOpacity={0.75}
              >
                <Text style={[styles.presetText, active && styles.presetTextActive]}>
                  ฿{val}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom Limit Input Card */}
        <View style={styles.formCard}>
          <View style={styles.formHeaderRow}>
            <Text style={styles.formLabel}>กำหนดวงเงินต่อวันใหม่</Text>
            <View style={styles.unitBadge}>
              <Text style={styles.unitBadgeText}>บาท / วัน</Text>
            </View>
          </View>

          <View style={styles.inputWell}>
            <Text style={styles.currencySymbol}>฿</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={newLimit}
              onChangeText={setNewLimit}
              placeholder="เช่น 150.00"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Primary Save CTA Pill */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSaveLimit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.saveBtnInner}>
              <View style={styles.checkCircle}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
              <Text style={styles.saveButtonText}>บันทึกวงเงินใหม่</Text>
            </View>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Daily Limit Info Modal */}
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
              <Text style={styles.modalTitle}>หมายเหตุ (BR-LIMIT-01)</Text>
            </View>
            <Text style={styles.noteModalBody}>
              วงเงินใหม่จะเริ่มมีผลในวันถัดไปเวลา 00:00 น. เพื่อป้องกันการปรับวงเงินระหว่างวัน และครอบคลุมทั้งรายการ Online และ Offline
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
    paddingBottom: 22,
    gap: 12,
  },
  heroCard: {
    backgroundColor: '#1E5EEA',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  targetHalo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetOuterRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetInnerRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FDE68A',
  },
  heroTextCol: {
    flex: 1,
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
    marginTop: 2,
  },
  heroUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DBEAFE',
  },
  pendingPill: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pendingPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
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
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  presetBtn: {
    width: '31.5%',
    height: 46,
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
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  presetTextActive: {
    color: '#1E64EE',
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
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  formLabel: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  unitBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  unitBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  inputWell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F6FB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E64EE',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    paddingVertical: 6,
  },
  saveButton: {
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
  saveButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  saveBtnInner: {
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
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16.5,
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
  modalTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
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
});
