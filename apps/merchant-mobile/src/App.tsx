import { SARABUN_FONTS } from './theme/sarabun';
import React, { useEffect, useState } from 'react';
import { registerRootComponent } from 'expo';
import { useFonts } from 'expo-font';
import {
  ActivityIndicator,
  Alert,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PosScreen } from './screens/PosScreen';
import { SyncScreen } from './screens/SyncScreen';
import { VoidScreen } from './screens/VoidScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { LoginScreen } from './screens/LoginScreen';
import { merchantApi } from './api/merchant-api';
import {
  clearRememberedMerchantAuth,
  clearRememberedMerchantSessionOnly,
  loadRememberedMerchantAuth,
  saveRememberedMerchantAuth,
} from './auth/merchant-auth-storage';
import { offlineStorage } from './offline/offline-storage';
import {
  MerchantLoginResponse,
  MerchantProfile,
  PaymentResponse,
  VoidResponse,
} from './types';

type Tab = 'pos' | 'sync' | 'void' | 'summary';

function SignalBars({ isOffline }: { isOffline: boolean }) {
  const activeColor = isOffline ? 'rgba(255,255,255,0.45)' : '#FFFFFF';
  return (
    <View style={styles.signalBars}>
      <View style={[styles.signalBar, { height: 5, backgroundColor: activeColor }]} />
      <View style={[styles.signalBar, { height: 8, backgroundColor: activeColor }]} />
      <View style={[styles.signalBar, { height: 11, backgroundColor: activeColor }]} />
      <View style={[styles.signalBar, { height: 14, backgroundColor: isOffline ? 'rgba(255,255,255,0.25)' : '#FFFFFF' }]} />
    </View>
  );
}

function NavTabIcon({ tab, active }: { tab: Tab; active: boolean }) {
  const color = active ? '#1E64EE' : '#6B7A99';

  if (tab === 'pos') {
    return (
      <View style={styles.navIconWrap}>
        <View style={[styles.calcBody, { backgroundColor: color }]}>
          <View style={styles.calcScreen} />
          <View style={styles.calcGridRow}>
            <View style={styles.calcBtnDot} />
            <View style={styles.calcBtnDot} />
            <View style={styles.calcBtnDot} />
          </View>
          <View style={styles.calcGridRow}>
            <View style={styles.calcBtnDot} />
            <View style={styles.calcBtnDot} />
            <View style={styles.calcBtnDot} />
          </View>
        </View>
      </View>
    );
  }

  if (tab === 'sync') {
    return (
      <View style={styles.navIconWrap}>
        <View style={styles.syncIconBox}>
          <View style={styles.syncTopClip}>
            <View style={[styles.syncArcRing, { borderColor: color }]} />
          </View>
          <View style={[styles.syncArrowTopRight, { borderTopColor: color }]} />

          <View style={styles.syncBottomClip}>
            <View style={[styles.syncArcRingBottom, { borderColor: color }]} />
          </View>
          <View style={[styles.syncArrowBottomLeft, { borderBottomColor: color }]} />
        </View>
      </View>
    );
  }

  if (tab === 'void') {
    return (
      <View style={styles.navIconWrap}>
        <View style={styles.voidBillWrap}>
          <View style={[styles.voidBillSheet, { borderColor: color }]}>
            <View style={[styles.voidBillLine, { backgroundColor: color }]} />
            <View style={[styles.voidBillLineShort, { backgroundColor: color }]} />
          </View>
          <View style={[styles.voidXCircle, { backgroundColor: color }]}>
            <Text style={styles.voidXMark}>✕</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.navIconWrap}>
      <View style={styles.chartBarsWrap}>
        <View style={[styles.chartBar, { height: 10, backgroundColor: color }]} />
        <View style={[styles.chartBar, { height: 18, backgroundColor: color }]} />
        <View style={[styles.chartBar, { height: 14, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function MerchantApp() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0,
  );
  const bottomInset = Math.max(insets.bottom, 10);

  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [hydratingSession, setHydratingSession] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<Tab>('pos');
  const [merchantId, setMerchantId] = useState<number>(1);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [recentPayments, setRecentPayments] = useState<PaymentResponse[]>([]);

  async function refreshOfflineCardCache() {
    try {
      const cache = await merchantApi.fetchOfflineCardCache();
      offlineStorage.syncCardCache(cache.cards, cache.syncedAt);
    } catch {
      // Ignore when offline or unreachable; keep existing local cache
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const saved = await loadRememberedMerchantAuth();
        if (!saved?.rememberMe || !saved.session?.token) {
          return;
        }

        const cachedSession = saved.session;
        merchantApi.setSession(cachedSession.token, cachedSession.merchant.id);

        try {
          const fresh = await merchantApi.getMe();
          if (cancelled) return;
          const updatedSession: MerchantLoginResponse = {
            token: cachedSession.token,
            merchant: fresh.merchant,
          };
          setMerchant(fresh.merchant);
          setMerchantId(fresh.merchant.id);
          await saveRememberedMerchantAuth({
            rememberMe: true,
            merchantCode: fresh.merchant.merchantCode,
            session: updatedSession,
          });
          void refreshOfflineCardCache();
        } catch (err) {
          if (cancelled) return;
          const status =
            err && typeof err === 'object' && 'status' in err
              ? Number((err as { status?: number }).status)
              : undefined;
          if (status === 401 || status === 403) {
            merchantApi.logout();
            await clearRememberedMerchantSessionOnly();
          } else {
            // Allow cached session offline for POS continuity
            setMerchant(cachedSession.merchant);
            setMerchantId(cachedSession.merchant.id);
            setIsOffline(true);
          }
        }
      } finally {
        if (!cancelled) {
          setHydratingSession(false);
        }
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleLoginSuccess(session: MerchantLoginResponse, rememberMe = false) {
    setMerchant(session.merchant);
    setMerchantId(session.merchant.id);
    setActiveTab('pos');
    void refreshOfflineCardCache();
    if (rememberMe) {
      void saveRememberedMerchantAuth({
        rememberMe: true,
        merchantCode: session.merchant.merchantCode,
        session,
      });
    } else {
      void clearRememberedMerchantAuth();
    }
  }

  function handleLogout() {
    merchantApi.logout();
    void clearRememberedMerchantSessionOnly();
    setMerchant(null);
    setRecentPayments([]);
    setActiveTab('pos');
  }

  if (hydratingSession) {
    return (
      <View
        style={[
          styles.screenWrapper,
          { backgroundColor: '#EEF4FF', alignItems: 'center', justifyContent: 'center' },
        ]}
      >
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#1D63ED" />
      </View>
    );
  }

  if (!merchant) {
    return (
      <View style={[styles.screenWrapper, { backgroundColor: '#EEF4FF' }]}>
        <StatusBar barStyle="light-content" />
        <LoginScreen topInset={topInset} onLoginSuccess={handleLoginSuccess} />
      </View>
    );
  }

  function handlePaymentSuccess(payment: PaymentResponse) {
    setRecentPayments((prev) => [payment, ...prev]);
  }

  function handleVoidSuccess(res: VoidResponse) {
    setRecentPayments((prev) => prev.filter((p) => p.paymentId !== res.paymentId));
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.screenWrapper}>
        {/* Top Royal Blue Header */}
        <View style={[styles.topHeader, { paddingTop: topInset + 10 }]}>
          <View style={styles.brandRow}>
            <View style={styles.crestOuter}>
              <View style={styles.crestInner}>
                <Text style={styles.crestText}>🏫</Text>
              </View>
            </View>
            <View style={styles.brandTextWrap}>
              <Text style={styles.appTitle} numberOfLines={1}>
                {merchant.name}
              </Text>
              <Text style={styles.appSubtitle} numberOfLines={1}>
                รหัสร้าน: {merchant.merchantCode}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <SignalBars isOffline={isOffline} />

            <TouchableOpacity
              style={styles.statusPill}
              onPress={() =>
                setIsOffline((prev) => {
                  const next = !prev;
                  if (!next) {
                    void refreshOfflineCardCache();
                  }
                  return next;
                })
              }
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.statusDot,
                  isOffline ? styles.statusDotOffline : styles.statusDotOnline,
                ]}
              />
              <Text style={styles.statusPillText}>
                {isOffline ? 'ออฟไลน์' : 'ออนไลน์'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() =>
                Alert.alert('ออกจากระบบ', 'ต้องการออกจากระบบใช่หรือไม่?', [
                  { text: 'ยกเลิก', style: 'cancel' },
                  { text: 'ออกจากระบบ', style: 'destructive', onPress: handleLogout },
                ])
              }
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="ออกจากระบบ"
            >
              <View style={styles.logoutIconBox}>
                <View style={styles.logoutIconFrame} />
                <View style={styles.logoutIconShaft} />
                <View style={styles.logoutIconHead} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Tab Content */}
        <View style={styles.content}>
          {activeTab === 'pos' && (
            <PosScreen
              merchantId={merchantId}
              isOffline={isOffline}
              pauseScanner={false}
              onPaymentSuccess={handlePaymentSuccess}
            />
          )}
          {activeTab === 'sync' && <SyncScreen />}
          {activeTab === 'void' && (
            <VoidScreen
              recentPayments={recentPayments}
              onVoidSuccess={handleVoidSuccess}
            />
          )}
          {activeTab === 'summary' && (
            <SummaryScreen
              merchantId={merchantId}
              recentPayments={recentPayments}
            />
          )}
        </View>

        {/* Full-Width Bottom Navigation Bar */}
        <View style={[styles.bottomNav, { paddingBottom: bottomInset }]}>
          {(
            [
              { id: 'pos', label: 'เครื่องคิดเงิน' },
              { id: 'sync', label: 'ซิงก์ข้อมูล' },
              { id: 'void', label: 'ยกเลิกบิล' },
              { id: 'summary', label: 'สรุปยอดขาย' },
            ] as const
          ).map((item) => {
            const active = activeTab === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.navItem}
                onPress={() => setActiveTab(item.id)}
                activeOpacity={0.75}
              >
                <NavTabIcon tab={item.id} active={active} />
                <Text style={[styles.navText, active && styles.navTextActive]}>
                  {item.label}
                </Text>
                <View
                  style={[
                    styles.navActiveBar,
                    !active && styles.navInactiveBar,
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(SARABUN_FONTS);

  if (!fontsLoaded && !fontError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#EEF4FF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#1D63ED" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <MerchantApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#13429D',
  },
  screenWrapper: {
    flex: 1,
    backgroundColor: '#EEF4FF',
  },
  topHeader: {
    backgroundColor: '#13429D',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0B2559',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 10,
  },
  crestOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  crestInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestText: {
    fontSize: 16,
  },
  brandTextWrap: {
    flexShrink: 1,
  },
  appTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  appSubtitle: {
    color: '#DBEAFE',
    fontSize: 11,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 14,
  },
  signalBar: {
    width: 3,
    borderRadius: 1.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotOnline: {
    backgroundColor: '#4ADE80',
  },
  statusDotOffline: {
    backgroundColor: '#FBBF24',
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    width: 36,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIconBox: {
    width: 17,
    height: 15,
    justifyContent: 'center',
  },
  logoutIconFrame: {
    position: 'absolute',
    left: 0,
    width: 10,
    height: 14,
    borderRadius: 2.5,
    borderWidth: 1.8,
    borderRightWidth: 0,
    borderColor: '#FFFFFF',
  },
  logoutIconShaft: {
    position: 'absolute',
    left: 6,
    width: 9,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  logoutIconHead: {
    position: 'absolute',
    right: 1,
    width: 6,
    height: 6,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  content: {
    flex: 1,
    backgroundColor: '#EEF4FF',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    paddingHorizontal: 6,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconWrap: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  calcBody: {
    width: 17,
    height: 21,
    borderRadius: 3.5,
    padding: 2.5,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcScreen: {
    width: '100%',
    height: 4.5,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  calcGridRow: {
    flexDirection: 'row',
    gap: 2,
  },
  calcBtnDot: {
    width: 2.8,
    height: 2.8,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  syncIconBox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncTopClip: {
    position: 'absolute',
    top: 1,
    left: 2,
    width: 18,
    height: 8.5,
    overflow: 'hidden',
  },
  syncArcRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2.6,
  },
  syncArrowTopRight: {
    position: 'absolute',
    top: 6,
    right: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  syncBottomClip: {
    position: 'absolute',
    bottom: 1,
    left: 2,
    width: 18,
    height: 8.5,
    overflow: 'hidden',
  },
  syncArcRingBottom: {
    position: 'absolute',
    bottom: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2.6,
  },
  syncArrowBottomLeft: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  voidBillWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voidBillSheet: {
    width: 16,
    height: 19,
    borderRadius: 3,
    borderWidth: 2,
    paddingHorizontal: 2.5,
    paddingTop: 4,
    gap: 2.5,
    marginRight: 3,
    marginBottom: 2,
  },
  voidBillLine: {
    height: 2,
    borderRadius: 1,
    width: '100%',
  },
  voidBillLineShort: {
    height: 2,
    borderRadius: 1,
    width: '65%',
  },
  voidXCircle: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  voidXMark: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
    lineHeight: 8,
  },
  chartBarsWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  chartBar: {
    width: 4.5,
    borderRadius: 2,
  },
  navText: {
    fontSize: 11,
    color: '#6B7A99',
    fontWeight: '600',
  },
  navTextActive: {
    color: '#1E64EE',
    fontWeight: '800',
  },
  navActiveBar: {
    marginTop: 4,
    height: 3,
    width: '68%',
    borderRadius: 2,
    backgroundColor: '#1E64EE',
  },
  navInactiveBar: {
    backgroundColor: 'transparent',
  },
});

registerRootComponent(App);
