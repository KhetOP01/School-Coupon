import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { StudentProfile } from '../types';

interface HomeScreenProps {
  student: StudentProfile;
  onNavigate: (screen: 'topup' | 'dailylimit' | 'card') => void;
}

export function HomeScreen({ student, onNavigate }: HomeScreenProps) {
  const isCardActive = student.card?.status === 'active';
  const balanceNum = parseFloat(student.walletBalance);
  const isNegative = balanceNum < 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Student Profile Header */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{student.firstName.charAt(0)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.studentName}>
            {student.firstName} {student.lastName}
          </Text>
          <Text style={styles.studentCode}>รหัสนักเรียน: {student.studentCode}</Text>
        </View>
      </View>

      {/* Wallet Balance Card */}
      <View style={[styles.balanceCard, isNegative && styles.negativeBalanceCard]}>
        <Text style={styles.balanceLabel}>ยอดเงินในบัตรคงเหลือ (Wallet Balance)</Text>
        <Text style={[styles.balanceAmount, isNegative && styles.negativeAmount]}>
          ฿{parseFloat(student.walletBalance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
        </Text>
        {isNegative && (
          <View style={styles.negativeNotice}>
            <Text style={styles.negativeNoticeText}>
              ⚠️ ยอดเงินติดลบจากรายการ Offline (จะหักลบอัตโนมัติเมื่อเติมเงินครั้งถัดไป)
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.topUpButton}
          onPress={() => onNavigate('topup')}
          activeOpacity={0.8}
        >
          <Text style={styles.topUpButtonText}>+ เติมเงินเข้ากระเป๋า</Text>
        </TouchableOpacity>
      </View>

      {/* Daily Limit Info Card */}
      <TouchableOpacity
        style={styles.infoRowCard}
        onPress={() => onNavigate('dailylimit')}
        activeOpacity={0.7}
      >
        <View>
          <Text style={styles.infoTitle}>🎯 วงเงินใช้จ่ายต่อวัน (Daily Limit)</Text>
          <Text style={styles.infoSubtitle}>
            วันนี้ใช้ได้สูงสุด: ฿{parseFloat(student.currentDailyLimit).toFixed(2)}
          </Text>
          {student.nextDailyLimit !== student.currentDailyLimit && (
            <Text style={styles.pendingLimitText}>
              (รอบวันถัดไปจะปรับเป็น ฿{parseFloat(student.nextDailyLimit).toFixed(2)})
            </Text>
          )}
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Card Status Card */}
      <TouchableOpacity
        style={styles.infoRowCard}
        onPress={() => onNavigate('card')}
        activeOpacity={0.7}
      >
        <View>
          <Text style={styles.infoTitle}>💳 บัตร RFID นักเรียน</Text>
          <Text style={styles.infoSubtitle}>
            UID: {student.card?.rfidUid ?? 'ไม่มีข้อมูลบัตร'}
          </Text>
          <Text
            style={[
              styles.cardStatusBadge,
              isCardActive ? styles.statusActive : styles.statusInactive,
            ]}
          >
            สถานะ: {student.card?.status?.toUpperCase() ?? 'NONE'}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  studentCode: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  balanceCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  negativeBalanceCard: {
    backgroundColor: '#7f1d1d',
  },
  balanceLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  negativeAmount: {
    color: '#fecaca',
  },
  negativeNotice: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 6,
  },
  negativeNoticeText: {
    color: '#fca5a5',
    fontSize: 11,
    textAlign: 'center',
  },
  topUpButton: {
    marginTop: 16,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 9999,
  },
  topUpButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  infoRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  infoSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  pendingLimitText: {
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
  },
  cardStatusBadge: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  statusActive: {
    color: '#059669',
  },
  statusInactive: {
    color: '#dc2626',
  },
  chevron: {
    fontSize: 24,
    color: '#94a3b8',
    fontWeight: '300',
  },
});
