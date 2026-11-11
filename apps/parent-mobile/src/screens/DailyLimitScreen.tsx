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
import { parentApi } from '../api/parent-api';
import { StudentProfile } from '../types';

interface DailyLimitScreenProps {
  student: StudentProfile;
  onSuccess: (newNextLimit: string) => void;
  onBack: () => void;
}

export function DailyLimitScreen({ student, onSuccess, onBack }: DailyLimitScreenProps) {
  const [newLimit, setNewLimit] = useState(student.nextDailyLimit || student.currentDailyLimit);
  const [loading, setLoading] = useState(false);

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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ ย้อนกลับ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>จำกัดวงเงินรายวัน (Daily Limit)</Text>
      </View>

      <View style={styles.content}>
        {/* Current status display */}
        <View style={styles.card}>
          <Text style={styles.label}>วงเงินใช้จ่ายของวันนี้ (Active Today)</Text>
          <Text style={styles.activeAmount}>
            ฿{parseFloat(student.currentDailyLimit).toFixed(2)} / วัน
          </Text>
        </View>

        {student.nextDailyLimit !== student.currentDailyLimit && (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingLabel}>วงเงินที่ตั้งไว้สำหรับวันพรุ่งนี้:</Text>
            <Text style={styles.pendingAmount}>
              ฿{parseFloat(student.nextDailyLimit).toFixed(2)}
            </Text>
          </View>
        )}

        <View style={styles.formSection}>
          <Text style={styles.label}>ปรับเปลี่ยนวงเงินต่อวันใหม่ (บาท):</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={newLimit}
            onChangeText={setNewLimit}
            placeholder="เช่น 150.00"
          />

          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>📌 กฎทางธุรกิจ (BR-LIMIT-01):</Text>
            <Text style={styles.noticeBody}>
              การแก้ไขวงเงินใช้จ่ายรายวันโดยผู้ปกครอง จะมีผลในวันถัดไป (เริ่ม 00:00 น.) เสมอ
              เพื่อป้องกันไม่ให้นักเรียนขอปรับวงเงินระหว่างวัน
              และวงเงินนี้จะครอบคลุมทั้งรายการชำระเงินแบบ Online และ Offline
            </Text>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveLimit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>บันทึกวงเงินใหม่</Text>
            )}
          </TouchableOpacity>
        </View>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
    gap: 16,
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  activeAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 4,
  },
  pendingCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  pendingLabel: {
    fontSize: 12,
    color: '#065f46',
  },
  pendingAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#047857',
    marginTop: 2,
  },
  formSection: {
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#0f172a',
    marginTop: 6,
  },
  noticeBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1d4ed8',
    marginBottom: 4,
  },
  noticeBody: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
  },
  saveButton: {
    marginTop: 24,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
