import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { PosScreen } from './screens/PosScreen';
import { SyncScreen } from './screens/SyncScreen';
import { VoidScreen } from './screens/VoidScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { PaymentResponse, VoidResponse } from './types';

type Tab = 'pos' | 'sync' | 'void' | 'summary';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('pos');
  const [merchantId] = useState<number>(1);
  const [recentPayments, setRecentPayments] = useState<PaymentResponse[]>([]);

  function handlePaymentSuccess(payment: PaymentResponse) {
    setRecentPayments((prev) => [payment, ...prev]);
  }

  function handleVoidSuccess(res: VoidResponse) {
    // Remove voided payment from recent payments
    setRecentPayments((prev) => prev.filter((p) => p.paymentId !== res.paymentId));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* App Bar Header */}
      <View style={styles.topHeader}>
        <Text style={styles.appTitle}>🏪 School Coupon POS</Text>
        <Text style={styles.appSub}>ร้านค้า #{merchantId} (Merchant Terminal)</Text>
      </View>

      {/* Main Tab Content */}
      <View style={styles.content}>
        {activeTab === 'pos' && (
          <PosScreen
            merchantId={merchantId}
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

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'pos' && styles.navItemActive]}
          onPress={() => setActiveTab('pos')}
        >
          <Text style={styles.navIcon}>💳</Text>
          <Text style={[styles.navText, activeTab === 'pos' && styles.navTextActive]}>
            เครื่องคิดเงิน
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'sync' && styles.navItemActive]}
          onPress={() => setActiveTab('sync')}
        >
          <Text style={styles.navIcon}>🔄</Text>
          <Text style={[styles.navText, activeTab === 'sync' && styles.navTextActive]}>
            ซิงก์ออฟไลน์
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'void' && styles.navItemActive]}
          onPress={() => setActiveTab('void')}
        >
          <Text style={styles.navIcon}>↩️</Text>
          <Text style={[styles.navText, activeTab === 'void' && styles.navTextActive]}>
            ยกเลิกบิล
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'summary' && styles.navItemActive]}
          onPress={() => setActiveTab('summary')}
        >
          <Text style={styles.navIcon}>📊</Text>
          <Text style={[styles.navText, activeTab === 'summary' && styles.navTextActive]}>
            สรุปยอดขาย
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  topHeader: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  appTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  appSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#2563eb',
    marginTop: -2,
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  navText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  navTextActive: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
});
