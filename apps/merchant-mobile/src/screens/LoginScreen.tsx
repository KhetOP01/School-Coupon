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
import { merchantApi } from '../api/merchant-api';
import { MerchantLoginResponse } from '../types';

interface LoginScreenProps {
  topInset: number;
  onLoginSuccess: (session: MerchantLoginResponse) => void;
}

function StoreCrestBadge() {
  return (
    <View style={styles.crestOuter}>
      <View style={styles.crestGoldRing}>
        <View style={styles.crestInner}>
          <View style={styles.crestSkyGlow} />
          <View style={styles.storeWrap}>
            {/* Red 24 sign */}
            <View style={styles.storeSign}>
              <Text style={styles.storeSignText}>24</Text>
            </View>
            {/* Awning */}
            <View style={styles.storeAwning}>
              <View style={styles.storeAwningStripe} />
              <View style={[styles.storeAwningStripe, { backgroundColor: '#FFFFFF' }]} />
              <View style={styles.storeAwningStripe} />
              <View style={[styles.storeAwningStripe, { backgroundColor: '#FFFFFF' }]} />
              <View style={styles.storeAwningStripe} />
            </View>
            {/* Shop body */}
            <View style={styles.storeBody}>
              <View style={styles.storeWindow} />
              <View style={styles.storeDoor} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function CouponWatermark() {
  return (
    <View style={styles.couponWatermark} pointerEvents="none">
      <View style={styles.couponRays}>
        <View style={[styles.couponRay, { transform: [{ rotate: '-25deg' }] }]} />
        <View style={[styles.couponRay, { height: 10, transform: [{ rotate: '10deg' }] }]} />
        <View style={[styles.couponRay, { transform: [{ rotate: '45deg' }] }]} />
      </View>
      <View style={styles.couponTicket}>
        <Text style={styles.couponPercentText}>%</Text>
      </View>
    </View>
  );
}

function StoreWatermark() {
  return (
    <View style={styles.storeWatermark} pointerEvents="none">
      <View style={styles.wmAwningRow}>
        {[0, 1, 2, 3].map((idx) => (
          <View key={idx} style={styles.wmAwningScallop} />
        ))}
      </View>
      <View style={styles.wmShopBox}>
        <View style={styles.wmShopWindow} />
        <View style={styles.wmShopDoor} />
      </View>
    </View>
  );
}

function BottomSchoolSilhouette() {
  return (
    <View style={styles.bottomDecorWrap} pointerEvents="none">
      <View style={styles.bottomHillLeft} />
      <View style={styles.bottomHillRight} />
      <View style={styles.bottomSchoolGroup}>
        <View style={styles.wmFlagPole}>
          <View style={styles.wmFlag} />
        </View>
        <View style={styles.bottomSchoolRoof} />
        <View style={styles.bottomSchoolRow}>
          <View style={styles.bottomSchoolWing}>
            <View style={styles.bottomWinRow}>
              <View style={styles.bottomWin} />
              <View style={styles.bottomWin} />
            </View>
            <View style={styles.bottomWinRow}>
              <View style={styles.bottomWin} />
              <View style={styles.bottomWin} />
            </View>
          </View>
          <View style={styles.bottomSchoolCenter}>
            <View style={styles.bottomClock} />
            <View style={styles.bottomDoor} />
          </View>
          <View style={styles.bottomSchoolWing}>
            <View style={styles.bottomWinRow}>
              <View style={styles.bottomWin} />
              <View style={styles.bottomWin} />
            </View>
            <View style={styles.bottomWinRow}>
              <View style={styles.bottomWin} />
              <View style={styles.bottomWin} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function FieldLabelIcon({ kind }: { kind: 'store' | 'pin' }) {
  return (
    <View style={styles.labelIconBox}>
      {kind === 'store' ? (
        <View style={styles.storeIconWrap}>
          <View style={styles.storeIconRoof} />
          <View style={styles.storeIconBase}>
            <View style={styles.storeIconDoor} />
          </View>
        </View>
      ) : (
        <View style={styles.lockIconWrap}>
          <View style={styles.lockShackle} />
          <View style={styles.lockBody}>
            <View style={styles.lockKeyhole} />
          </View>
        </View>
      )}
    </View>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <View style={styles.eyeIconWrap}>
      <View style={styles.eyeAlmondScale}>
        <View style={styles.eyeAlmond} />
      </View>
      <View style={styles.eyeIrisCutout}>
        <View style={styles.eyePupil} />
      </View>
      {visible && <View style={styles.eyeSlash} />}
    </View>
  );
}

function LoginArrowIcon() {
  return (
    <View style={styles.loginIconBox}>
      <View style={styles.loginIconFrame} />
      <View style={styles.loginIconShaft} />
      <View style={styles.loginIconHead} />
    </View>
  );
}

export function LoginScreen({ topInset, onLoginSuccess }: LoginScreenProps) {
  const [merchantCode, setMerchantCode] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [baseUrlInput, setBaseUrlInput] = useState(merchantApi.getBaseUrl());

  const [registerVisible, setRegisterVisible] = useState(false);
  const [stallCodeInput, setStallCodeInput] = useState('');
  const [winnerPhoneInput, setWinnerPhoneInput] = useState('');
  const [merchantNameInput, setMerchantNameInput] = useState('');
  const [registerPinInput, setRegisterPinInput] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registeredSession, setRegisteredSession] = useState<MerchantLoginResponse | null>(null);

  async function submitLogin(targetCode: string, targetPin: string) {
    if (!targetCode.trim() || !targetPin.trim()) {
      setError('กรุณากรอกรหัสร้านค้าและรหัส PIN ให้ครบถ้วน');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const response = await merchantApi.login(targetCode, targetPin);
      onLoginSuccess(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถเข้าสู่ระบบได้');
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister() {
    if (
      !stallCodeInput.trim() ||
      !winnerPhoneInput.trim() ||
      !merchantNameInput.trim() ||
      !/^\d{6}$/.test(registerPinInput.trim())
    ) {
      setRegisterError('กรุณากรอกข้อมูลให้ครบ และตั้งรหัส PIN เป็นตัวเลข 6 หลัก');
      return;
    }

    setRegisterError(null);
    setRegisterLoading(true);
    try {
      const response = await merchantApi.register({
        stallCode: stallCodeInput,
        winnerPhone: winnerPhoneInput,
        merchantName: merchantNameInput,
        pin: registerPinInput,
      });
      setRegisterVisible(false);
      setRegisteredSession(response);
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'ไม่สามารถลงทะเบียนร้านค้าได้');
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      {/* Top Overscroll Navy Fill */}
      <View style={[styles.topOverscrollBg, { height: topInset + 140 }]} />

      {/* Subtle Bottom Decorative Landscape */}
      <BottomSchoolSilhouette />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Royal Blue Hero Banner */}
          <View style={[styles.heroHeader, { paddingTop: topInset + 22 }]}>
            <View style={styles.heroBlobLeft} pointerEvents="none" />
            <View style={styles.heroBlobRight} pointerEvents="none" />
            <CouponWatermark />
            <StoreWatermark />

            <StoreCrestBadge />
            <Text style={styles.heroTitle}>School Coupon POS</Text>
            <Text style={styles.heroSubtitle}>ระบบรับชำระเงินสำหรับร้านค้าในโรงเรียน</Text>

            <View style={styles.heroIndicatorRow}>
              <View style={styles.heroIndicatorActive} />
              <View style={styles.heroIndicatorMuted} />
            </View>
          </View>

          {/* Main Login Card */}
          <View style={styles.cardWrap}>
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <View style={styles.cardAccentBar} />
                <Text style={styles.cardTitle}>เข้าสู่ระบบร้านค้า</Text>
              </View>
              <Text style={styles.cardSubtitle}>
                กรอกรหัสร้านค้าและรหัส PIN 6 หลักเพื่อเริ่มรับชำระเงินผ่านบัตร RFID
              </Text>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              )}

              <View style={styles.labelRow}>
                <FieldLabelIcon kind="store" />
                <Text style={styles.label}>รหัสร้านค้า (Merchant Code)</Text>
              </View>
              <TextInput
                style={styles.input}
                value={merchantCode}
                onChangeText={setMerchantCode}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="เช่น M-001"
                placeholderTextColor="#94A3B8"
                maxLength={20}
              />

              <View style={[styles.labelRow, { marginTop: 14 }]}>
                <FieldLabelIcon kind="pin" />
                <Text style={styles.label}>รหัส PIN (6 หลัก)</Text>
              </View>
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
                  accessibilityLabel={showPin ? 'ซ่อนรหัส PIN' : 'แสดงรหัส PIN'}
                  activeOpacity={0.7}
                >
                  <EyeIcon visible={showPin} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                onPress={() => void submitLogin(merchantCode, pin)}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.loginBtnContent}>
                    <LoginArrowIcon />
                    <Text style={styles.loginBtnText}>เข้าสู่ระบบร้านค้า</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  marginTop: 12,
                  paddingVertical: 11,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: '#1E64EE',
                  backgroundColor: '#EFF6FF',
                  alignItems: 'center',
                }}
                onPress={() => {
                  setRegisterError(null);
                  setRegisterVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#1E40AF', fontWeight: '700', fontSize: 14 }}>
                  ลงทะเบียนร้านค้าใหม่ (ผู้ชนะประมูลล็อค)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Server URL Settings Trigger */}
          <TouchableOpacity
            style={styles.serverLinkBtn}
            onPress={() => {
              setBaseUrlInput(merchantApi.getBaseUrl());
              setSettingsVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.serverLinkText}>
              ⚙ ตั้งค่า Server URL ({merchantApi.getBaseUrl()})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Register Modal */}
      <Modal
        visible={registerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRegisterVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 20,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
              ลงทะเบียนร้านค้าใหม่
            </Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>
              ยืนยันตัวตนด้วยเลขที่ล็อคและเบอร์โทรของผู้ชนะประมูลที่แจ้งไว้กับโรงเรียน
            </Text>

            {registerError && (
              <View style={[styles.errorBox, { marginBottom: 12 }]}>
                <Text style={styles.errorText}>⚠️ {registerError}</Text>
              </View>
            )}

            <Text style={styles.label}>เลขที่ล็อคประมูล (Stall Code)</Text>
            <TextInput
              style={[styles.input, { marginTop: 6, marginBottom: 10 }]}
              value={stallCodeInput}
              onChangeText={setStallCodeInput}
              autoCapitalize="characters"
              placeholder="เช่น A-02"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>เบอร์โทรผู้ชนะประมูล</Text>
            <TextInput
              style={[styles.input, { marginTop: 6, marginBottom: 10 }]}
              value={winnerPhoneInput}
              onChangeText={setWinnerPhoneInput}
              keyboardType="phone-pad"
              placeholder="เช่น 0822222222"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>ชื่อร้านค้าที่จะแสดงในระบบ</Text>
            <TextInput
              style={[styles.input, { marginTop: 6, marginBottom: 10 }]}
              value={merchantNameInput}
              onChangeText={setMerchantNameInput}
              placeholder="เช่น ร้านก๋วยเตี๋ยวลุงชัย"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>ตั้งรหัส PIN (6 หลัก)</Text>
            <TextInput
              style={[styles.input, { marginTop: 6, marginBottom: 16 }]}
              value={registerPinInput}
              onChangeText={setRegisterPinInput}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              placeholder="••••••"
              placeholderTextColor="#94A3B8"
            />

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <TouchableOpacity
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                }}
                onPress={() => setRegisterVisible(false)}
                disabled={registerLoading}
              >
                <Text style={{ color: '#475569', fontWeight: '700' }}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  borderRadius: 10,
                  backgroundColor: '#1E64EE',
                }}
                onPress={() => void submitRegister()}
                disabled={registerLoading}
              >
                {registerLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>ยืนยันลงทะเบียน</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Register Success Modal */}
      <Modal
        visible={registeredSession !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          const session = registeredSession;
          setRegisteredSession(null);
          if (session) {
            onLoginSuccess(session);
          }
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 22,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
              ลงทะเบียนร้านค้าสำเร็จ
            </Text>
            <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 14 }}>
              กรุณาจดรหัสร้านค้าด้านล่างไว้ใช้คู่กับ PIN 6 หลัก สำหรับเข้าสู่ระบบครั้งถัดไป
            </Text>
            <View
              style={{
                backgroundColor: '#EFF6FF',
                borderWidth: 1.5,
                borderColor: '#BFDBFE',
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 24,
                alignItems: 'center',
                marginBottom: 18,
                width: '100%',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E40AF', marginBottom: 2 }}>
                รหัสร้านค้าของคุณ
              </Text>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#1E3A8A', letterSpacing: 1 }}>
                {registeredSession?.merchant.merchantCode ?? ''}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginTop: 2 }}>
                {registeredSession?.merchant.name ?? ''}
              </Text>
            </View>
            <TouchableOpacity
              style={{
                width: '100%',
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: '#1E64EE',
                alignItems: 'center',
              }}
              onPress={() => {
                const session = registeredSession;
                setRegisteredSession(null);
                if (session) {
                  onLoginSuccess(session);
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                เข้าสู่หน้าขาย (POS)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              placeholder="http://192.168.1.53"
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
                    merchantApi.setBaseUrl(baseUrlInput.trim());
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
    backgroundColor: '#EAF2FF',
  },
  topOverscrollBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#123E99',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 36,
  },
  heroHeader: {
    backgroundColor: '#123E99',
    paddingBottom: 46,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroBlobLeft: {
    position: 'absolute',
    top: -40,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(37, 99, 235, 0.35)',
  },
  heroBlobRight: {
    position: 'absolute',
    bottom: -60,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
  },
  couponWatermark: {
    position: 'absolute',
    left: 18,
    top: 84,
    opacity: 0.26,
    transform: [{ rotate: '-18deg' }],
  },
  couponRays: {
    flexDirection: 'row',
    gap: 5,
    marginLeft: 56,
    marginBottom: 2,
  },
  couponRay: {
    width: 2,
    height: 7,
    borderRadius: 1,
    backgroundColor: '#93C5FD',
  },
  couponTicket: {
    width: 62,
    height: 36,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#93C5FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponPercentText: {
    color: '#93C5FD',
    fontSize: 18,
    fontWeight: '800',
  },
  storeWatermark: {
    position: 'absolute',
    right: 16,
    top: 80,
    opacity: 0.2,
    alignItems: 'center',
  },
  wmAwningRow: {
    flexDirection: 'row',
  },
  wmAwningScallop: {
    width: 14,
    height: 12,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    backgroundColor: '#BFDBFE',
    marginHorizontal: 0.5,
  },
  wmShopBox: {
    width: 54,
    height: 36,
    backgroundColor: '#93C5FD',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-evenly',
    paddingBottom: 0,
  },
  wmShopWindow: {
    width: 18,
    height: 14,
    marginBottom: 10,
    borderRadius: 2,
    backgroundColor: '#123E99',
  },
  wmShopDoor: {
    width: 14,
    height: 20,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: '#123E99',
  },
  crestOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#071B47',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  crestGoldRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#133C92',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  crestSkyGlow: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
  },
  storeWrap: {
    alignItems: 'center',
    marginTop: 2,
  },
  storeSign: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
    marginBottom: 2,
  },
  storeSignText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
  },
  storeAwning: {
    flexDirection: 'row',
    width: 38,
    height: 6,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    overflow: 'hidden',
  },
  storeAwningStripe: {
    flex: 1,
    backgroundColor: '#10B981',
  },
  storeBody: {
    width: 34,
    height: 17,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-evenly',
    paddingHorizontal: 3,
  },
  storeWindow: {
    width: 11,
    height: 8,
    backgroundColor: '#38BDF8',
    borderRadius: 1.5,
    marginBottom: 4,
  },
  storeDoor: {
    width: 9,
    height: 11,
    backgroundColor: '#2563EB',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    color: '#DCEBFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 3,
  },
  heroIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
  },
  heroIndicatorActive: {
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  heroIndicatorMuted: {
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(147, 197, 253, 0.55)',
  },
  cardWrap: {
    paddingHorizontal: 18,
    marginTop: -24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2ECFF',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardAccentBar: {
    width: 4,
    height: 22,
    borderRadius: 2,
    backgroundColor: '#1D63ED',
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 19,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  labelIconBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#1D63ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeIconWrap: {
    alignItems: 'center',
  },
  storeIconRoof: {
    width: 14,
    height: 4,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    backgroundColor: '#FFFFFF',
    marginBottom: 1.5,
  },
  storeIconBase: {
    width: 12,
    height: 7,
    borderBottomLeftRadius: 1.5,
    borderBottomRightRadius: 1.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  storeIconDoor: {
    width: 4,
    height: 4.5,
    borderTopLeftRadius: 1.5,
    borderTopRightRadius: 1.5,
    backgroundColor: '#1D63ED',
  },
  lockIconWrap: {
    alignItems: 'center',
  },
  lockShackle: {
    width: 8,
    height: 5,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 1.6,
    borderBottomWidth: 0,
    borderColor: '#FFFFFF',
  },
  lockBody: {
    width: 11,
    height: 8,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockKeyhole: {
    width: 2.5,
    height: 3.5,
    borderRadius: 1,
    backgroundColor: '#1D63ED',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 13,
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
    borderRadius: 14,
    paddingRight: 10,
  },
  pinInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  eyeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  eyeIconWrap: {
    width: 24,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeAlmondScale: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scaleX: 1.24 }, { scaleY: 0.84 }],
  },
  eyeAlmond: {
    width: 15,
    height: 15,
    borderTopLeftRadius: 15,
    borderBottomRightRadius: 15,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 2,
    backgroundColor: '#5F75A6',
    transform: [{ rotate: '45deg' }],
  },
  eyeIrisCutout: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyePupil: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: '#5F75A6',
  },
  eyeSlash: {
    position: 'absolute',
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#5F75A6',
    transform: [{ rotate: '-35deg' }],
  },
  loginBtn: {
    backgroundColor: '#1D63ED',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    shadowColor: '#1D63ED',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  loginIconBox: {
    width: 18,
    height: 16,
    justifyContent: 'center',
  },
  loginIconFrame: {
    position: 'absolute',
    right: 0,
    width: 11,
    height: 15,
    borderRadius: 2.5,
    borderWidth: 1.8,
    borderLeftWidth: 0,
    borderColor: '#FFFFFF',
  },
  loginIconShaft: {
    width: 11,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  loginIconHead: {
    position: 'absolute',
    left: 7,
    width: 6,
    height: 6,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
  },
  serverLinkBtn: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 8,
  },
  serverLinkText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
  },
  bottomDecorWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 95,
    overflow: 'hidden',
  },
  bottomHillLeft: {
    position: 'absolute',
    left: -40,
    bottom: -45,
    width: 240,
    height: 90,
    borderRadius: 120,
    backgroundColor: 'rgba(147, 197, 253, 0.25)',
  },
  bottomHillRight: {
    position: 'absolute',
    right: -30,
    bottom: -40,
    width: 260,
    height: 95,
    borderRadius: 130,
    backgroundColor: 'rgba(191, 219, 254, 0.4)',
  },
  bottomSchoolGroup: {
    position: 'absolute',
    right: 20,
    bottom: 0,
    alignItems: 'center',
    opacity: 0.25,
  },
  wmFlagPole: {
    width: 2,
    height: 10,
    backgroundColor: '#60A5FA',
  },
  wmFlag: {
    width: 7,
    height: 4,
    backgroundColor: '#60A5FA',
    marginLeft: 2,
  },
  bottomSchoolRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#60A5FA',
  },
  bottomSchoolRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bottomSchoolWing: {
    width: 18,
    height: 20,
    backgroundColor: '#93C5FD',
    justifyContent: 'space-evenly',
    padding: 3,
  },
  bottomSchoolCenter: {
    width: 22,
    height: 26,
    backgroundColor: '#60A5FA',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  bottomClock: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EAF2FF',
  },
  bottomDoor: {
    width: 7,
    height: 10,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: '#EAF2FF',
  },
  bottomWinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomWin: {
    width: 4,
    height: 5,
    backgroundColor: '#EAF2FF',
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
    backgroundColor: '#1D63ED',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
