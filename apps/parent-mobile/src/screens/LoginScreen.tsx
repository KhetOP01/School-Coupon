import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import { loadRememberedParentAuth } from '../auth/parent-auth-storage';
import { resolveSarabunFont } from '../theme/sarabun';
import { ParentLoginResponse } from '../types';

interface LoginScreenProps {
  topInset: number;
  onLoginSuccess: (session: ParentLoginResponse, rememberMe: boolean) => void;
}

function SchoolCrestBadge() {
  return (
    <View style={styles.crestOuter}>
      <View style={styles.crestInner}>
        <View style={styles.crestSkyGlow} />
        <View style={styles.crestBuildingWrap}>
          {/* Roof */}
          <View style={styles.crestRoof} />
          {/* Main Building */}
          <View style={styles.crestBodyRow}>
            <View style={styles.crestWing}>
              <View style={styles.crestMiniWin} />
              <View style={styles.crestMiniWin} />
            </View>
            <View style={styles.crestCenterTower}>
              <View style={styles.crestClock}>
                <View style={styles.crestClockHandV} />
                <View style={styles.crestClockHandH} />
              </View>
              <View style={styles.crestDoor} />
            </View>
            <View style={styles.crestWing}>
              <View style={styles.crestMiniWin} />
              <View style={styles.crestMiniWin} />
            </View>
          </View>
          {/* Lawn strip */}
          <View style={styles.crestLawn} />
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

function SchoolWatermark() {
  return (
    <View style={styles.schoolWatermark} pointerEvents="none">
      <View style={styles.wmFlagPole}>
        <View style={styles.wmFlag} />
      </View>
      <View style={styles.wmRoof} />
      <View style={styles.wmBodyRow}>
        <View style={styles.wmWing}>
          <View style={styles.wmWindow} />
        </View>
        <View style={styles.wmCenter}>
          <View style={styles.wmClock} />
          <View style={styles.wmDoor} />
        </View>
        <View style={styles.wmWing}>
          <View style={styles.wmWindow} />
        </View>
      </View>
    </View>
  );
}

function IdCardShieldBadge() {
  return (
    <View style={styles.idBadgeWrap}>
      {/* Yellow accent rays */}
      <View style={styles.idRaysRow}>
        <View style={[styles.idRay, { transform: [{ rotate: '-20deg' }] }]} />
        <View style={[styles.idRay, { height: 9, transform: [{ rotate: '15deg' }] }]} />
        <View style={[styles.idRay, { transform: [{ rotate: '45deg' }] }]} />
      </View>
      {/* Blue ID Card */}
      <View style={styles.idCard}>
        <View style={styles.idAvatarBox}>
          <View style={styles.idAvatarHead} />
          <View style={styles.idAvatarBody} />
        </View>
        <View style={styles.idLinesCol}>
          <View style={[styles.idLine, { width: 22 }]} />
          <View style={[styles.idLine, { width: 16, opacity: 0.75 }]} />
        </View>
      </View>
      {/* Green Verified Shield */}
      <View style={styles.shieldOuter}>
        <View style={styles.shieldCheckWrap}>
          <View style={styles.shieldCheckShort} />
          <View style={styles.shieldCheckLong} />
        </View>
      </View>
    </View>
  );
}

function FieldLabelIcon({ kind }: { kind: 'phone' | 'pin' }) {
  return (
    <View style={styles.labelIconBox}>
      {kind === 'phone' ? (
        <View style={styles.phoneIconOuter}>
          <View style={styles.phoneIconScreen} />
          <View style={styles.phoneIconNotch} />
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

export function LoginScreen({ topInset, onLoginSuccess }: LoginScreenProps) {
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<'identifier' | 'pin' | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [heroHeight, setHeroHeight] = useState(topInset + 210);

  const [registerVisible, setRegisterVisible] = useState(false);
  const [regPhone, setRegPhone] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regStudentCodes, setRegStudentCodes] = useState<string[]>(['']);
  const [regPin, setRegPin] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadRememberedParentAuth().then((saved) => {
      if (!active || !saved?.rememberMe) return;
      setRememberMe(true);
      if (saved.phone) {
        setPhone((prev) => prev || saved.phone);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  function scrollToField(offsetY: number) {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: offsetY, animated: true });
    }, 120);
  }

  async function submitLogin(targetPhone: string, targetPin: string) {
    if (!targetPhone.trim()) {
      setErrorField('identifier');
      setError('กรุณากรอกเบอร์โทรศัพท์');
      return;
    }
    if (!targetPin.trim()) {
      setErrorField('pin');
      setError('กรุณากรอกรหัส PIN 6 หลัก');
      return;
    }

    setError(null);
    setErrorField(null);
    setLoading(true);
    try {
      const response = await parentApi.login(targetPhone, targetPin);
      onLoginSuccess(response, rememberMe);
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
      const message = err instanceof Error ? err.message : 'ไม่สามารถเข้าสู่ระบบได้';
      setError(message);
      if (
        code === 'INVALID_PHONE' ||
        (!message.includes('หรือ') && message.includes('เบอร์โทรศัพท์'))
      ) {
        setErrorField('identifier');
      } else if (
        code === 'INVALID_PIN' ||
        (!message.includes('หรือ') && (message.includes('PIN') || message.includes('รหัส')))
      ) {
        setErrorField('pin');
      } else {
        setErrorField(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister() {
    const cleanedCodes = regStudentCodes.map((c) => c.trim()).filter(Boolean);
    if (
      !regPhone.trim() ||
      !regFullName.trim() ||
      cleanedCodes.length === 0 ||
      !/^\d{6}$/.test(regPin.trim())
    ) {
      setRegError('กรุณากรอกข้อมูลให้ครบ (อย่างน้อย 1 รหัสนักเรียน) และตั้งรหัส PIN เป็นตัวเลข 6 หลัก');
      return;
    }

    setRegError(null);
    setRegLoading(true);
    try {
      const response = await parentApi.register({
        phone: regPhone,
        fullName: regFullName,
        studentCodes: cleanedCodes,
        pin: regPin,
      });
      setRegisterVisible(false);
      onLoginSuccess(response, rememberMe);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'ไม่สามารถลงทะเบียนได้');
    } finally {
      setRegLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      {/* Fixed Top Royal Blue Hero Banner (stays put while card scrolls) */}
      <View
        onLayout={(e) => setHeroHeight(e.nativeEvent.layout.height)}
        style={[styles.heroHeader, styles.heroHeaderFixed, { paddingTop: topInset + 22 }]}
      >
        <View style={styles.heroBlobLeft} pointerEvents="none" />
        <View style={styles.heroBlobRight} pointerEvents="none" />
        <CouponWatermark />
        <SchoolWatermark />

        <SchoolCrestBadge />
        <Text style={styles.heroTitle}>School Coupon</Text>
        <Text style={styles.heroSubtitle}>แอปพลิเคชันสำหรับผู้ปกครอง</Text>

        {/* Decorative pill indicator */}
        <View style={styles.heroIndicatorRow}>
          <View style={styles.heroIndicatorActive} />
          <View style={styles.heroIndicatorMuted} />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.cardScrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(heroHeight - 24, topInset + 165) },
          keyboardHeight > 0 && { paddingBottom: keyboardHeight + 36 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

          {/* Main Login Card */}
          <View style={styles.cardWrap}>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleCol}>
                  <Text style={styles.cardTitle}>เข้าสู่ระบบผู้ปกครอง</Text>
                  <Text style={styles.cardSubtitle}>
                    กรอกเบอร์โทรศัพท์และรหัส PIN 6 หลัก{'\n'}เพื่อเข้าสู่ระบบใช้งาน
                  </Text>
                </View>
                <IdCardShieldBadge />
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.labelRow}>
                <FieldLabelIcon kind="phone" />
                <Text style={styles.label}>เบอร์โทรศัพท์</Text>
              </View>
              <TextInput
                style={[styles.input, errorField === 'identifier' && styles.inputError]}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (errorField === 'identifier') {
                    setErrorField(null);
                    setError(null);
                  }
                }}
                onFocus={() => scrollToField(75)}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="กรอกเบอร์โทรศัพท์ของท่าน"
                placeholderTextColor="#94A3B8"
                maxLength={20}
              />

              <View style={[styles.labelRow, { marginTop: 14 }]}>
                <FieldLabelIcon kind="pin" />
                <Text style={styles.label}>รหัส PIN (6 หลัก)</Text>
              </View>
              <View style={[styles.pinInputWrap, errorField === 'pin' && styles.inputError]}>
                <TextInput
                  style={styles.pinInput}
                  value={pin}
                  onChangeText={(text) => {
                    setPin(text);
                    if (errorField === 'pin') {
                      setErrorField(null);
                      setError(null);
                    }
                  }}
                  onFocus={() => scrollToField(160)}
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
                style={styles.rememberRow}
                onPress={() => setRememberMe((prev) => !prev)}
                activeOpacity={0.75}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
              >
                <View style={[styles.rememberBox, rememberMe && styles.rememberBoxChecked]}>
                  {rememberMe && <Text style={styles.rememberCheck}>✓</Text>}
                </View>
                <Text style={styles.rememberText}>จดจำการเข้าสู่ระบบ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                onPress={() => void submitLogin(phone, pin)}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.loginBtnContent}>
                    <Text style={styles.loginBtnText}>เข้าสู่ระบบ</Text>
                    <Text style={styles.loginBtnArrow}>›</Text>
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
                  setRegError(null);
                  setRegStudentCodes(['']);
                  setRegisterVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#1E40AF', fontFamily: resolveSarabunFont('700'), fontSize: 14 }}>
                  ลงทะเบียนผู้ปกครองใหม่
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

      {/* Register Modal */}
      <Modal
        visible={registerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRegisterVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ลงทะเบียนผู้ปกครองใหม่</Text>
            <Text style={{ fontSize: 13, color: '#64748B', fontFamily: resolveSarabunFont('400'), marginBottom: 12 }}>
              กรอกเบอร์โทรศัพท์ ชื่อผู้ปกครอง รหัสนักเรียน และตั้งรหัส PIN 6 หลัก
            </Text>

            {regError && (
              <View style={[styles.errorBox, { marginBottom: 12 }]}>
                <Text style={styles.errorText}>{regError}</Text>
              </View>
            )}

            <Text style={styles.modalLabel}>เบอร์โทรศัพท์</Text>
            <TextInput
              style={[styles.modalInput, { marginBottom: 10 }]}
              value={regPhone}
              onChangeText={setRegPhone}
              keyboardType="phone-pad"
              placeholder="เช่น 0855555555"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.modalLabel}>ชื่อ-นามสกุลผู้ปกครอง</Text>
            <TextInput
              style={[styles.modalInput, { marginBottom: 10 }]}
              value={regFullName}
              onChangeText={setRegFullName}
              placeholder="เช่น คุณมานะ รักดี"
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.regStudentHeaderRow}>
              <Text style={[styles.modalLabel, { marginBottom: 0 }]}>
                รหัสนักเรียน (เพิ่มได้หลายคน)
              </Text>
              <TouchableOpacity
                style={styles.addChildBtn}
                onPress={() => setRegStudentCodes((prev) => [...prev, ''])}
                disabled={regLoading}
                activeOpacity={0.75}
              >
                <Text style={styles.addChildBtnText}>+ เพิ่มลูก</Text>
              </TouchableOpacity>
            </View>

            {regStudentCodes.map((codeValue, index) => (
              <View key={index} style={styles.regStudentRow}>
                <TextInput
                  style={[styles.modalInput, styles.regStudentInput]}
                  value={codeValue}
                  onChangeText={(text) =>
                    setRegStudentCodes((prev) =>
                      prev.map((item, idx) => (idx === index ? text : item)),
                    )
                  }
                  autoCapitalize="characters"
                  placeholder={
                    index === 0
                      ? 'รหัสคนที่ 1 (เช่น STD-1001)'
                      : `รหัสคนที่ ${index + 1} (เช่น STD-1002)`
                  }
                  placeholderTextColor="#94A3B8"
                />
                {regStudentCodes.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeChildBtn}
                    onPress={() =>
                      setRegStudentCodes((prev) =>
                        prev.filter((_, idx) => idx !== index),
                      )
                    }
                    disabled={regLoading}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.removeChildBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <Text style={[styles.modalLabel, { marginTop: 4 }]}>ตั้งรหัส PIN (6 หลัก)</Text>
            <TextInput
              style={[styles.modalInput, { marginBottom: 14 }]}
              value={regPin}
              onChangeText={setRegPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              placeholder="••••••"
              placeholderTextColor="#94A3B8"
            />

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRegisterVisible(false)}
                disabled={regLoading}
              >
                <Text style={styles.modalCancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => void submitRegister()}
                disabled={regLoading}
              >
                {regLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>ยืนยันลงทะเบียน</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  heroHeaderFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  cardScrollView: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
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
    left: 20,
    top: 86,
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
  schoolWatermark: {
    position: 'absolute',
    right: 16,
    top: 86,
    opacity: 0.18,
    alignItems: 'center',
  },
  wmFlagPole: {
    width: 2,
    height: 11,
    backgroundColor: '#BFDBFE',
    alignItems: 'flex-start',
  },
  wmFlag: {
    width: 8,
    height: 5,
    backgroundColor: '#BFDBFE',
    marginLeft: 2,
  },
  wmRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderRightWidth: 20,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#BFDBFE',
  },
  wmBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  wmWing: {
    width: 14,
    height: 22,
    backgroundColor: '#93C5FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wmCenter: {
    width: 26,
    height: 28,
    backgroundColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  wmClock: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#123E99',
  },
  wmDoor: {
    width: 8,
    height: 11,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: '#123E99',
  },
  wmWindow: {
    width: 5,
    height: 6,
    backgroundColor: '#123E99',
  },
  crestOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#103582',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#071B47',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  crestInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#153F96',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  crestSkyGlow: {
    position: 'absolute',
    top: 4,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(96, 165, 250, 0.22)',
  },
  crestBuildingWrap: {
    alignItems: 'center',
  },
  crestRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#EA580C',
  },
  crestBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  crestWing: {
    width: 10,
    height: 19,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 2,
  },
  crestCenterTower: {
    width: 22,
    height: 25,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 3,
  },
  crestClock: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestClockHandV: {
    position: 'absolute',
    width: 1,
    height: 3,
    backgroundColor: '#1E3A8A',
    top: 1.5,
  },
  crestClockHandH: {
    position: 'absolute',
    width: 2.5,
    height: 1,
    backgroundColor: '#1E3A8A',
    right: 1.5,
  },
  crestDoor: {
    width: 8,
    height: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: '#1D4ED8',
  },
  crestMiniWin: {
    width: 4,
    height: 5,
    borderRadius: 1,
    backgroundColor: '#3B82F6',
  },
  crestLawn: {
    width: 64,
    height: 7,
    backgroundColor: '#22C55E',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 18,
  },
  cardTitleCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 5,
    lineHeight: 19,
  },
  idBadgeWrap: {
    width: 82,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idRaysRow: {
    position: 'absolute',
    top: 0,
    right: 2,
    flexDirection: 'row',
    gap: 4,
    zIndex: 3,
  },
  idRay: {
    width: 2.5,
    height: 7,
    borderRadius: 1.5,
    backgroundColor: '#FACC15',
  },
  idCard: {
    width: 68,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#60A5FA',
    borderWidth: 2,
    borderColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
    transform: [{ rotate: '-6deg' }],
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  idAvatarBox: {
    width: 20,
    height: 22,
    borderRadius: 5,
    backgroundColor: '#93C5FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idAvatarHead: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginBottom: 2,
  },
  idAvatarBody: {
    width: 11,
    height: 6,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  idLinesCol: {
    gap: 4,
  },
  idLine: {
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  shieldOuter: {
    position: 'absolute',
    right: 4,
    bottom: 2,
    width: 26,
    height: 28,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  shieldCheckWrap: {
    width: 12,
    height: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldCheckShort: {
    position: 'absolute',
    left: 2,
    bottom: 2,
    width: 5,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '42deg' }],
  },
  shieldCheckLong: {
    position: 'absolute',
    right: 1,
    bottom: 3,
    width: 9,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-45deg' }],
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
  phoneIconOuter: {
    width: 10,
    height: 14,
    borderRadius: 2.5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 1.5,
  },
  phoneIconScreen: {
    width: 5,
    height: 7,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  phoneIconNotch: {
    width: 3,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
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
  inputError: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
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
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  rememberBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberBoxChecked: {
    borderColor: '#1D63ED',
    backgroundColor: '#1D63ED',
  },
  rememberCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  rememberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  loginBtn: {
    backgroundColor: '#1D63ED',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
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
    gap: 8,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
  },
  loginBtnArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: -1,
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
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1D63ED',
    borderWidth: 1.5,
    borderColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  regStudentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  addChildBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addChildBtnText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  regStudentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  regStudentInput: {
    flex: 1,
  },
  removeChildBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeChildBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
  },
});
