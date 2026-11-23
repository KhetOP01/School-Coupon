import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { parentApi } from '../api/parent-api';
import { ParentLoginResponse } from '../types';

interface LoginScreenProps {
  topInset: number;
  onLoginSuccess: (session: ParentLoginResponse) => void;
}

export function LoginScreen({ topInset, onLoginSuccess }: LoginScreenProps) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [baseUrlInput, setBaseUrlInput] = useState(parentApi.getBaseUrl());

  async function submitLogin(targetPhone: string, targetPin: string) {
    if (!targetPhone.trim() || !targetPin.trim()) {
      setError('กรุณากรอกเบอร์โทรศัพท์และรหัส PIN ให้ครบถ้วน');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const response = await parentApi.login(targetPhone, targetPin);
      onLoginSuccess(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถเข้าสู่ระบบได้');
    } finally {
      setLoading(false);
    }
  }

  function handleDemoLogin() {
    setPhone('0812345678');
    setPin('123456');
    void submitLogin('0812345678', '123456');
  }

  return (
    <View style={styles.screen}>
      {/* Top Royal Blue Rounded Hero */}
      <View style={[styles.heroHeader, { paddingTop: topInset + 22 }]}>
        <View style={styles.crestOuter}>
          <View style={styles.crestInner}>
            <Text style={styles.crestEmoji}>🏫</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>School Coupon</Text>
        <Text style={styles.heroSubtitle}>แอปพลิเคชันสำหรับผู้ปกครอง</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Main Login Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>เข้าสู่ระบบผู้ปกครอง</Text>
            <Text style={styles.cardSubtitle}>
              กรอกเบอร์โทรศัพท์และรหัส PIN 6 หลักที่ลงทะเบียนไว้กับโรงเรียน
            </Text>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}

            <Text style={styles.label}>เบอร์โทรศัพท์</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="เช่น 0812345678"
              placeholderTextColor="#94A3B8"
              maxLength={20}
            />

            <Text style={styles.label}>รหัส PIN (6 หลัก)</Text>
            <View style={styles.pinInputWrap}>
              <TextInput
                style={styles.pinInput}
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                secureTextEntry={!showPin}
                placeholder="••••••"
                placeholderTextColor="#94A3B8"
                maxLength={6}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPin((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeBtnText}>{showPin ? 'ซ่อน' : 'แสดง'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={() => void submitLogin(phone, pin)}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginBtnText}>เข้าสู่ระบบ</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Demo Login Card */}
          <View style={styles.demoCard}>
            <View style={styles.demoHeaderRow}>
              <Text style={styles.demoBadge}>DEMO</Text>
              <Text style={styles.demoTitle}>บัญชีทดสอบสำหรับผู้ปกครอง</Text>
            </View>
            <Text style={styles.demoCredentials}>
              เบอร์โทร: 0812345678 • PIN: 123456 (คุณสมศรี ใจดี)
            </Text>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={handleDemoLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.demoBtnText}>⚡ เข้าสู่ระบบทดสอบ (Quick Demo)</Text>
            </TouchableOpacity>
          </View>

          {/* Server URL Settings Trigger */}
          <TouchableOpacity
            style={styles.serverLinkBtn}
            onPress={() => {
              setBaseUrlInput(parentApi.getBaseUrl());
              setSettingsVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.serverLinkText}>
              ⚙ ตั้งค่า Server URL ({parentApi.getBaseUrl()})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Server URL Modal */}
      <Modal
        visible={settingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ตั้งค่าการเชื่อมต่อ Server</Text>
            <Text style={styles.modalLabel}>Server Base URL (Backend)</Text>
            <TextInput
              style={styles.modalInput}
              value={baseUrlInput}
              onChangeText={setBaseUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.1.89"
            />
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSettingsVisible(false)}
              >
                <Text style={styles.modalCancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => {
                  if (baseUrlInput.trim()) {
                    parentApi.setBaseUrl(baseUrlInput.trim());
                  }
                  setSettingsVisible(false);
                }}
              >
                <Text style={styles.modalConfirmText}>บันทึก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: '#EEF4FF',
  },
  heroHeader: {
    backgroundColor: '#13429D',
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: 'center',
    shadowColor: '#0B2559',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  crestOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginBottom: 10,
  },
  crestInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestEmoji: {
    fontSize: 28,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    color: '#DBEAFE',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 19,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
  },
  pinInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingRight: 8,
  },
  pinInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: 4,
  },
  eyeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  eyeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  loginBtn: {
    backgroundColor: '#1E64EE',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#1E64EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  demoCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  demoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demoBadge: {
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  demoCredentials: {
    fontSize: 12,
    color: '#475569',
    marginTop: 6,
    marginBottom: 10,
  },
  demoBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  demoBtnText: {
    color: '#1D4ED8',
    fontSize: 14,
    fontWeight: '700',
  },
  serverLinkBtn: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 8,
  },
  serverLinkText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
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
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
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
});
