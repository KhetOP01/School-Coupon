import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { parentApi } from '../api/parent-api';
import { StudentProfile } from '../types';

interface CardSecurityScreenProps {
  student: StudentProfile;
  onSuccess: (newStatus: 'lost') => void;
  onBack: () => void;
}

export function CardSecurityScreen({ student, onSuccess, onBack }: CardSecurityScreenProps) {
  const [loading, setLoading] = useState(false);
  const card = student.card;
  const isLost = card?.status === 'lost';
  const isActive = card?.status === 'active';

  async function handleFreezeCard() {
    if (!card) {
      Alert.alert('ข้อผิดพลาด', 'ไม่พบข้อมูลบัตร RFID ของนักเรียน');
      return;
    }

    Alert.alert(
      'ยืนยันการอายัดบัตรหาย',
      'หากยืนยัน บัตรนี้จะถูกเปลี่ยนสถานะเป็น "LOST" ทันที และจะไม่สามารถนำกลับมาแตะจ่ายเงินได้อีกต่อไป โดยต้องติดต่อสตาฟโรงเรียนเพื่อออกบัตรใหม่เท่านั้น',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ยืนยันอายัดบัตร',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await parentApi.reportLostCard(card.id);
              Alert.alert('อายัดบัตรสำเร็จ', 'บัตร RFID นี้ถูกระงับการใช้งานถาวรเรียบร้อยแล้ว', [
                { text: 'ตกลง', onPress: () => onSuccess(res.status) },
              ]);
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'ไม่สามารถอายัดบัตรได้';
              Alert.alert('เกิดข้อผิดพลาด', message);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ ย้อนกลับ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ความปลอดภัยของบัตร (Card Security)</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.cardPreview}>
          <Text style={styles.cardTitle}>บัตร RFID ของนักเรียน</Text>
          <Text style={styles.cardHolder}>
            {student.firstName} {student.lastName}
          </Text>
          <Text style={styles.cardUid}>UID: {card?.rfidUid ?? 'ยังไม่ได้ผูกบัตร'}</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>สถานะบัตร:</Text>
            <Text style={[styles.statusBadge, isLost ? styles.statusLost : styles.statusActive]}>
              {card?.status ? card.status.toUpperCase() : 'NONE'}
            </Text>
          </View>
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>⚠️ กฎการอายัดบัตร (BR-CARD-04):</Text>
          <Text style={styles.warningBody}>
            เมื่อผู้ปกครองกดอายัดบัตร บัตรจะถูกเปลี่ยนสถานะเป็น "LOST" ทันที
            เพื่อความปลอดภัยของเงินในกระเป๋า บัตรที่แจ้งหายจะไม่สามารถปลดอายัดกลับมาใช้ได้
            หากนักเรียนทำบัตรหาย ผู้ปกครองหรือนักเรียนต้องติดต่อเจ้าหน้าที่โรงเรียนเพื่อออกบัตรใหม่ (UC-01)
            โดยยอดเงินคงเหลือทั้งหมดจะถูกโอนย้ายไปยังบัตรใหม่อัตโนมัติ 100%
          </Text>
        </View>

        {isActive && (
          <TouchableOpacity
            style={styles.freezeButton}
            onPress={handleFreezeCard}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.freezeButtonText}>🚨 แจ้งบัตรหายและอายัดทันที (Report Lost)</Text>
            )}
          </TouchableOpacity>
        )}

        {isLost && (
          <View style={styles.alreadyLostBox}>
            <Text style={styles.alreadyLostText}>
              ✓ บัตรนี้ถูกอายัดเรียบร้อยแล้ว กรุณาติดต่อสตาฟโรงเรียนเพื่อออกบัตรใหม่
            </Text>
          </View>
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
  cardPreview: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  cardHolder: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  cardUid: {
    color: '#cbd5e1',
    fontSize: 13,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  statusLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#065f46',
    color: '#a7f3d0',
  },
  statusLost: {
    backgroundColor: '#991b1b',
    color: '#fecaca',
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#b45309',
    marginBottom: 4,
  },
  warningBody: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
  freezeButton: {
    marginTop: 16,
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  freezeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  alreadyLostBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
  },
  alreadyLostText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
