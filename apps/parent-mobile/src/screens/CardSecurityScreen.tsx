import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { parentApi } from '../api/parent-api';
import { StudentProfile } from '../types';

interface CardSecurityScreenProps {
  student: StudentProfile;
  topInset?: number;
  onSuccess: (newStatus: 'lost') => void;
  onBack?: () => void;
}

function CardChipIcon() {
  return (
    <View style={styles.chipBox}>
      <View style={styles.chipLineH} />
      <View style={styles.chipLineV} />
    </View>
  );
}

export function CardSecurityScreen({
  student,
  topInset = 0,
  onSuccess,
}: CardSecurityScreenProps) {
  const [loading, setLoading] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
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
    <View style={styles.screen}>
      {/* Top Royal Blue Rounded Header (matching HomeScreen) */}
      <View style={[styles.topHeader, { paddingTop: topInset + 10 }]}>
        <Text style={styles.headerTitle}>จัดการบัตร RFID</Text>
        <Text style={styles.headerSubtitle}>
          ความปลอดภัยของบัตร {student.firstName} {student.lastName} ({student.studentCode})
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Virtual RFID Card Preview */}
        <View style={[styles.cardPreview, isLost && styles.cardPreviewLost]}>
          <View style={styles.cardDecorCircle} />

          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>บัตร RFID ประจำตัวนักเรียน</Text>
            <CardChipIcon />
          </View>

          <Text style={styles.cardHolder}>
            {student.firstName} {student.lastName}
          </Text>

          <View style={styles.uidPill}>
            <Text style={styles.uidLabel}>UID: </Text>
            <Text style={styles.cardUid} numberOfLines={1} adjustsFontSizeToFit>
              {card?.rfidUid ?? 'ยังไม่ได้ผูกบัตร'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadgePill,
                isLost ? styles.statusLostBg : styles.statusActiveBg,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  isLost ? styles.statusDotLost : styles.statusDotActive,
                ]}
              />
              <Text style={styles.statusBadgeText}>
                สถานะบัตร: {card?.status ? card.status.toUpperCase() : 'NONE'}
                {isActive ? ' (พร้อมใช้งาน)' : isLost ? ' (อายัดถาวร)' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Card Summary Details Card */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeaderRow}>
            <Text style={styles.detailTitle}>ข้อมูลบัตรและการคุ้มครองยอดเงิน</Text>
            <TouchableOpacity
              style={styles.infoIconBtn}
              onPress={() => setNoteModalVisible(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.infoIconText}>i</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>รหัสนักเรียน:</Text>
            <Text style={styles.detailValue}>{student.studentCode}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ยอดเงินคงเหลือปัจจุบัน:</Text>
            <Text style={styles.detailValueBlue}>
              ฿{parseFloat(student.walletBalance).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Freeze Button or Lost Banner */}
        {isActive && (
          <TouchableOpacity
            style={[styles.freezeButton, loading && styles.freezeButtonDisabled]}
            onPress={handleFreezeCard}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.freezeBtnInner}>
                <View style={styles.alertCircle}>
                  <Text style={styles.alertMark}>!</Text>
                </View>
                <Text style={styles.freezeButtonText}>แจ้งบัตรหายและอายัดทันที</Text>
              </View>
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

      </ScrollView>

      {/* Card Freeze Rule Info Modal */}
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
              <Text style={styles.modalTitle}>กฎการอายัดบัตร (BR-CARD-04)</Text>
            </View>
            <Text style={styles.noteModalBody}>
              เมื่อกดอายัด บัตรจะเปลี่ยนสถานะเป็น LOST ทันทีและไม่สามารถปลดอายัดกลับมาใช้ได้ ต้องติดต่อเจ้าหน้าที่โรงเรียนออกบัตรใหม่ (UC-01) โดยยอดเงินทั้งหมดจะถูกโอนไปยังบัตรใหม่อัตโนมัติ 100%
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
  cardPreview: {
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
  cardPreviewLost: {
    backgroundColor: '#991B1B',
    shadowColor: '#7F1D1D',
  },
  cardDecorCircle: {
    position: 'absolute',
    right: -28,
    bottom: -36,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: '#DBEAFE',
    fontSize: 13,
    fontWeight: '600',
  },
  chipBox: {
    width: 32,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FCD34D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(146, 64, 14, 0.35)',
  },
  chipLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: 'rgba(146, 64, 14, 0.35)',
  },
  cardHolder: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 10,
  },
  uidPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
  },
  uidLabel: {
    color: '#DBEAFE',
    fontSize: 12,
    fontWeight: '700',
  },
  cardUid: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusActiveBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusLostBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotActive: {
    backgroundColor: '#4ADE80',
  },
  statusDotLost: {
    backgroundColor: '#FCA5A5',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
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
  detailDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  detailLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  detailValueBlue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E64EE',
  },
  freezeButton: {
    backgroundColor: '#DC2626',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B91C1C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  freezeButtonDisabled: {
    backgroundColor: '#F87171',
  },
  freezeBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alertCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertMark: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '900',
  },
  freezeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  alreadyLostBox: {
    padding: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  alreadyLostText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
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
