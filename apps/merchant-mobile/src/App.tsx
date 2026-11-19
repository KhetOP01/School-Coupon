import React, { useState } from 'react';
import { registerRootComponent } from 'expo';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PosScreen } from './screens/PosScreen';
import { SyncScreen } from './screens/SyncScreen';
import { VoidScreen } from './screens/VoidScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { merchantApi } from './api/merchant-api';
import { PaymentResponse, VoidResponse } from './types';

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

  const [activeTab, setActiveTab] = useState<Tab>('pos');
  const [merchantId, setMerchantId] = useState<number>(1);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [recentPayments, setRecentPayments] = useState<PaymentResponse[]>([]);

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [baseUrlInput, setBaseUrlInput] = useState('http://192.168.1.89');
  const [merchantIdInput, setMerchantIdInput] = useState('1');

  function handlePaymentSuccess(payment: PaymentResponse) {
    setRecentPayments((prev) => [payment, ...prev]);
  }

  function handleVoidSuccess(res: VoidResponse) {
    setRecentPayments((prev) => prev.filter((p) => p.paymentId !== res.paymentId));
  }

  function handleSaveSettings() {
    if (baseUrlInput.trim()) {
      merchantApi.setBaseUrl(baseUrlInput.trim());
    }
    const parsedId = parseInt(merchantIdInput, 10);
    if (!isNaN(parsedId) && parsedId > 0) {
      setMerchantId(parsedId);
      merchantApi.setMerchantId(String(parsedId));
    }
    setSettingsVisible(false);
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
              <Text style={styles.appTitle}>School Coupon POS</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <SignalBars isOffline={isOffline} />

            <TouchableOpacity
              style={styles.statusPill}
              onPress={() => setIsOffline((prev) => !prev)}
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
              style={styles.gearBtn}
              onPress={() => setSettingsVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.gearIcon}>⚙</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Tab Content */}
        <View style={styles.content}>
          {activeTab === 'pos' && (
            <PosScreen
              merchantId={merchantId}
              isOffline={isOffline}
              pauseScanner={settingsVisible}
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

      {/* POS Connection Settings Modal */}
      <Modal
        visible={settingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ตั้งค่าร้านค้าและการเชื่อมต่อ</Text>

            <Text style={styles.modalLabel}>Server Base URL (Backend)</Text>
            <TextInput
              style={styles.modalInput}
              value={baseUrlInput}
              onChangeText={setBaseUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.1.53"
            />

            <Text style={styles.modalLabel}>รหัสร้านค้า (Merchant ID)</Text>
            <TextInput
              style={styles.modalInput}
              value={merchantIdInput}
              onChangeText={setMerchantIdInput}
              keyboardType="numeric"
              placeholder="1"
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSettingsVisible(false)}
              >
                <Text style={styles.modalCancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveSettings}
              >
                <Text style={styles.modalSaveText}>บันทึก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function App() {
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
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
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
  gearBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearIcon: {
    color: '#FFFFFF',
    fontSize: 20,
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
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0F172A',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
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
  modalSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#1D54C8',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

registerRootComponent(App);
