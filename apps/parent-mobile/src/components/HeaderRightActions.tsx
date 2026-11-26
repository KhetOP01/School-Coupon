import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StudentProfile } from '../types';
import { LogoutIconButton } from './LogoutIconButton';

interface HeaderRightActionsProps {
  student: StudentProfile;
  students?: StudentProfile[];
  onSelectStudent?: (studentId: number) => void;
  onLogout?: () => void;
  variant?: 'onDark' | 'onLight';
}

/**
 * Shared top-right action bar across every Parent Mobile screen:
 * "เปลี่ยนเด็ก" student-switcher pill + modal paired directly beside the logout icon button.
 */
export function HeaderRightActions({
  student,
  students = [],
  onSelectStudent,
  onLogout,
  variant = 'onDark',
}: HeaderRightActionsProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const selectableStudents = students.length > 0 ? students : [student];

  return (
    <>
      <View style={styles.row}>
        {onSelectStudent && (
          <TouchableOpacity
            style={[
              styles.switchBtn,
              variant === 'onDark' ? styles.switchBtnOnDark : styles.switchBtnOnLight,
            ]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="เปลี่ยนเด็ก"
          >
            <Text
              style={[
                styles.switchIcon,
                variant === 'onDark'
                  ? styles.switchTextOnDark
                  : styles.switchIconOnLight,
              ]}
            >
              ⇄
            </Text>
            <Text
              style={[
                styles.switchText,
                variant === 'onDark'
                  ? styles.switchTextOnDark
                  : styles.switchTextOnLight,
              ]}
            >
              เปลี่ยนเด็ก
            </Text>
          </TouchableOpacity>
        )}
        {onLogout && <LogoutIconButton onPress={onLogout} variant={variant} />}
      </View>

      {onSelectStudent && (
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>เลือกบุตรหลาน</Text>
              <Text style={styles.modalSubtitle}>
                เลือกรายชื่อนักเรียนที่ต้องการดูข้อมูลหรือจัดการ
              </Text>

              {selectableStudents.map((item) => {
                const selected = item.id === student.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.studentOptionRow,
                      selected && styles.studentOptionActive,
                    ]}
                    onPress={() => {
                      onSelectStudent(item.id);
                      setModalVisible(false);
                    }}
                  >
                    <View>
                      <Text style={styles.studentOptionName}>
                        {item.firstName} {item.lastName}
                      </Text>
                      <Text style={styles.studentOptionCode}>
                        {item.studentCode}
                      </Text>
                    </View>
                    <Text style={styles.studentOptionBal}>
                      ฿{parseFloat(item.walletBalance).toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>ปิด</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
  },
  switchBtnOnDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  switchBtnOnLight: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  switchIcon: {
    fontSize: 13,
    fontWeight: '800',
  },
  switchText: {
    fontSize: 12,
    fontWeight: '700',
  },
  switchTextOnDark: {
    color: '#FFFFFF',
  },
  switchIconOnLight: {
    color: '#1E64EE',
  },
  switchTextOnLight: {
    color: '#1E3A8A',
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
});
