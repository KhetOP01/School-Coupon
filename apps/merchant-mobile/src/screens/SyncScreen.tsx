import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { merchantApi } from '../api/merchant-api';
import { offlineStorage } from '../offline/offline-storage';
import { OfflinePaymentRecord } from '../types';

export function SyncScreen() {
  const [queue, setQueue] = useState<OfflinePaymentRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);

  function loadQueue() {
    setQueue(offlineStorage.getAllQueue());
  }

  useEffect(() => {
    loadQueue();
  }, []);

  const pendingCount = queue.filter((q) => !q.synced).length;
  const isLocked = offlineStorage.isOfflineLocked();

  async function handleSyncAll() {
    const pending = offlineStorage.getPendingQueue();
    if (pending.length === 0) {
      Alert.alert('ข้อมูลเป็นปัจจุบัน', 'ไม่มีรายการ Offline ที่รอซิงก์');
      return;
    }

    setSyncing(true);
    const logs: string[] = [];
    const successfullySyncedIds: string[] = [];

    for (const record of pending) {
      try {
        const res = await merchantApi.syncOfflinePayment(record);
        successfullySyncedIds.push(record.offlineTrxId);
        const balNum = parseFloat(res.walletBalance);
        let logMsg = `✓ สำเร็จ: บัตร ${record.rfidUid.slice(-6)} ยอด ฿${record.amount} (คงเหลือ ฿${balNum.toFixed(2)})`;
        if (balNum < 0) {
          logMsg += ` ⚠️ ติดลบตาม BR-PAY-02`;
        }
        logs.push(logMsg);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว';
        logs.push(`✗ ล้มเหลว: บัตร ${record.rfidUid.slice(-6)} ยอด ฿${record.amount} (${msg})`);
      }
    }

    if (successfullySyncedIds.length > 0) {
      offlineStorage.markAsSynced(successfullySyncedIds);
    }

    setSyncLog(logs);
    loadQueue();
    setSyncing(false);

    Alert.alert(
      'การซิงก์เสร็จสิ้น',
      `ซิงก์สำเร็จ ${successfullySyncedIds.length} จาก ${pending.length} รายการ`,
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ซิงก์ข้อมูลออฟไลน์ (Offline Sync)</Text>
      <Text style={styles.subtitle}>UC-05: ส่งรายการค้างชำระขึ้นคลาวด์</Text>

      {/* 12-Hour Lock Warning Banner */}
      {isLocked && (
        <View style={styles.lockWarning}>
          <Text style={styles.lockTitle}>🚨 ระบบถูกระงับการชำระเงินออฟไลน์ (BR-PAY-03)</Text>
          <Text style={styles.lockBody}>
            มีรายการ Offline ค้างเกิน 12 ชั่วโมงแล้ว จำเป็นต้องซิงก์ข้อมูลทันทีก่อนรับชำระต่อไป
          </Text>
        </View>
      )}

      {/* Status Summary Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusCol}>
          <Text style={styles.statusNumber}>{pendingCount}</Text>
          <Text style={styles.statusLabel}>รอซิงก์ (Pending)</Text>
        </View>
        <View style={styles.statusDivider} />
        <View style={styles.statusCol}>
          <Text style={styles.statusNumber}>{queue.length - pendingCount}</Text>
          <Text style={styles.statusLabel}>ซิงก์แล้ว (Synced)</Text>
        </View>
      </View>

      {/* Sync Action Button */}
      <TouchableOpacity
        style={[
          styles.syncButton,
          (syncing || pendingCount === 0) && styles.syncButtonDisabled,
        ]}
        onPress={handleSyncAll}
        disabled={syncing || pendingCount === 0}
        activeOpacity={0.8}
      >
        {syncing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.syncButtonText}>
            🔄 ซิงก์ข้อมูลทั้งหมดทันที ({pendingCount} รายการ)
          </Text>
        )}
      </TouchableOpacity>

      {/* Sync Logs */}
      {syncLog.length > 0 && (
        <View style={styles.logCard}>
          <Text style={styles.logTitle}>ผลการซิงก์ล่าสุด:</Text>
          {syncLog.map((log, idx) => (
            <Text key={idx} style={styles.logText}>
              {log}
            </Text>
          ))}
        </View>
      )}

      {/* Offline Queue Items */}
      <Text style={styles.sectionHeader}>ประวัติรายการคิวในเครื่อง:</Text>
      {queue.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>ไม่มีรายการออฟไลน์ในเครื่อง</Text>
        </View>
      ) : (
        <FlatList
          data={queue}
          keyExtractor={(item) => item.offlineTrxId}
          renderItem={({ item }) => (
            <View style={styles.queueItem}>
              <View>
                <Text style={styles.queueUid}>บัตร: {item.rfidUid}</Text>
                <Text style={styles.queueTime}>
                  เวลา: {new Date(item.createdAt).toLocaleString('th-TH')}
                </Text>
              </View>
              <View style={styles.queueRight}>
                <Text style={styles.queueAmount}>฿{item.amount}</Text>
                <Text
                  style={[
                    styles.queueStatusBadge,
                    item.synced ? styles.badgeSynced : styles.badgePending,
                  ]}
                >
                  {item.synced ? '✓ ซิงก์แล้ว' : '⏳ รอซิงก์'}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  lockWarning: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  lockTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#b91c1c',
    marginBottom: 4,
  },
  lockBody: {
    fontSize: 11,
    color: '#991b1b',
    lineHeight: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusCol: {
    flex: 1,
    alignItems: 'center',
  },
  statusDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#e2e8f0',
  },
  statusNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  statusLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  syncButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  logCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  logTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 6,
  },
  logText: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 2,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  queueItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queueUid: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: '#0f172a',
  },
  queueTime: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  queueRight: {
    alignItems: 'flex-end',
  },
  queueAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  queueStatusBadge: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeSynced: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  badgePending: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
  },
});
