import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { merchantApi } from '../api/merchant-api';
import { offlineStorage } from '../offline/offline-storage';
import { OfflinePaymentRecord } from '../types';

function CloudSyncIcon() {
  return (
    <View style={styles.cloudCircle}>
      <View style={styles.cloudShape}>
        <View style={styles.cloudBumpLeft} />
        <View style={styles.cloudBumpTop} />
        <View style={styles.cloudBase} />
        <Text style={styles.cloudArrows}>↻</Text>
      </View>
    </View>
  );
}

function ListHeaderIcon() {
  return (
    <View style={styles.listIconBox}>
      <View style={styles.listRow}>
        <View style={styles.listDot} />
        <View style={styles.listBar} />
      </View>
      <View style={styles.listRow}>
        <View style={styles.listDot} />
        <View style={styles.listBar} />
      </View>
      <View style={styles.listRow}>
        <View style={styles.listDot} />
        <View style={styles.listBar} />
      </View>
    </View>
  );
}

export function SyncScreen() {
  const [queue, setQueue] = useState<OfflinePaymentRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<Array<{ ok: boolean; text: string }>>([]);

  function loadQueue() {
    setQueue(offlineStorage.getAllQueue());
  }

  useEffect(() => {
    loadQueue();
  }, []);

  const pendingCount = queue.filter((q) => !q.synced).length;
  const syncedCount = queue.length - pendingCount;
  const isLocked = offlineStorage.isOfflineLocked();

  async function handleSyncAll() {
    const pending = offlineStorage.getPendingQueue();
    if (pending.length === 0) {
      Alert.alert('ข้อมูลเป็นปัจจุบัน', 'ไม่มีรายการ Offline ที่รอซิงก์');
      return;
    }

    setSyncing(true);
    const logs: Array<{ ok: boolean; text: string }> = [];
    const successfullySyncedIds: string[] = [];

    for (const record of pending) {
      try {
        const res = await merchantApi.syncOfflinePayment(record);
        successfullySyncedIds.push(record.offlineTrxId);
        const balNum = parseFloat(res.walletBalance);
        let logMsg = `สำเร็จ: บัตร ${record.rfidUid.slice(-6)} ยอด ฿${record.amount} (คงเหลือ ฿${balNum.toFixed(2)})`;
        if (balNum < 0) {
          logMsg += ` ⚠️ ติดลบตาม BR-PAY-02`;
        }
        logs.push({ ok: true, text: logMsg });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว';
        logs.push({
          ok: false,
          text: `ล้มเหลว: บัตร ${record.rfidUid.slice(-6)} ยอด ฿${record.amount} (${msg})`,
        });
      }
    }

    if (successfullySyncedIds.length > 0) {
      offlineStorage.markAsSynced(successfullySyncedIds);
    }

    try {
      const cache = await merchantApi.fetchOfflineCardCache();
      offlineStorage.syncCardCache(cache.cards, cache.syncedAt);
    } catch {
      // Ignore cache refresh failure after sync
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
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Title Card */}
      <View style={styles.titleCard}>
        <CloudSyncIcon />
        <View style={styles.titleTextWrap}>
          <Text style={styles.title}>ซิงก์ข้อมูลออฟไลน์ (Offline Sync)</Text>
          <Text style={styles.subtitle}>UC-05: ส่งรายการค้างชำระขึ้นคลาวด์</Text>
        </View>
      </View>

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
          <Text style={styles.statusLabel}>รอซิงก์</Text>
          <Text style={styles.statusSubLabel}>(Pending)</Text>
        </View>

        <View style={styles.statusDivider} />

        <View style={styles.statusCol}>
          <Text style={styles.statusNumber}>{syncedCount}</Text>
          <Text style={styles.statusLabel}>ซิงก์แล้ว</Text>
          <Text style={styles.statusSubLabel}>(Synced)</Text>
        </View>
      </View>

      {/* Primary Sync Pill Button */}
      <TouchableOpacity
        style={[
          styles.syncButton,
          (syncing || pendingCount === 0) && styles.syncButtonDisabled,
        ]}
        onPress={handleSyncAll}
        disabled={syncing || pendingCount === 0}
        activeOpacity={0.85}
      >
        {syncing ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <View style={styles.syncBtnInner}>
            <Text style={styles.syncBtnIcon}>↻</Text>
            <Text style={styles.syncButtonText}>
              ซิงก์ข้อมูลทั้งหมดทันที ({pendingCount} รายการ)
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Latest Sync Result Card */}
      {syncLog.length > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={styles.infoCircle}>
              <Text style={styles.infoCircleText}>i</Text>
            </View>
            <Text style={styles.cardHeaderTitle}>ผลการซิงก์ล่าสุด</Text>
          </View>
          <View style={styles.cardDivider} />

          <View style={styles.logList}>
            {syncLog.map((log, idx) => (
              <View key={idx} style={styles.logRow}>
                <Text style={log.ok ? styles.logMarkOk : styles.logMarkFail}>
                  {log.ok ? '✓' : '✕'}
                </Text>
                <Text style={styles.logText}>{log.text}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Offline Queue History Card */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <ListHeaderIcon />
          <Text style={styles.cardHeaderTitle}>ประวัติรายการคิวในเครื่อง</Text>
        </View>

        {queue.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>ไม่มีรายการออฟไลน์ในเครื่อง</Text>
          </View>
        ) : (
          <View style={styles.queueList}>
            {queue.map((item) => (
              <View key={item.offlineTrxId} style={styles.queueItem}>
                <View style={styles.queueMiddle}>
                  <Text style={styles.queueUid} numberOfLines={1} adjustsFontSizeToFit>
                    บัตร : {item.rfidUid}
                  </Text>
                  <Text style={styles.queueTime}>
                    ◷ เวลา : {new Date(item.createdAt).toLocaleString('th-TH')}
                  </Text>
                </View>

                <View style={styles.queueRight}>
                  <Text style={styles.queueAmount}>฿{parseFloat(item.amount).toFixed(2)}</Text>
                  <View
                    style={[
                      styles.queueBadgePill,
                      item.synced ? styles.badgeSyncedBg : styles.badgePendingBg,
                    ]}
                  >
                    <Text
                      style={[
                        styles.queueBadgeText,
                        item.synced ? styles.badgeSyncedText : styles.badgePendingText,
                      ]}
                    >
                      {item.synced ? '✓ ซิงก์แล้ว' : 'รอซิงก์'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Bottom Note Banner */}
      <View style={styles.noteCard}>
        <View style={styles.bulbCircle}>
          <Text style={styles.bulbIcon}>💡</Text>
        </View>
        <View style={styles.noteTextWrap}>
          <Text style={styles.noteTitle}>หมายเหตุ</Text>
          <Text style={styles.noteBody}>
            ระบบจะซิงก์ข้อมูลโดยอัตโนมัติ หรือกดซิงก์ด้วยตนเองได้
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#EEF4FF',
  },
  container: {
    padding: 14,
    paddingBottom: 22,
    gap: 12,
  },
  titleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cloudCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudShape: {
    width: 34,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudBumpLeft: {
    position: 'absolute',
    left: 2,
    bottom: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  cloudBumpTop: {
    position: 'absolute',
    top: 0,
    left: 9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563EB',
  },
  cloudBase: {
    position: 'absolute',
    bottom: 2,
    left: 6,
    right: 2,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2563EB',
  },
  cloudArrows: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  titleTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  lockWarning: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  lockTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#B91C1C',
    marginBottom: 4,
  },
  lockBody: {
    fontSize: 11.5,
    color: '#991B1B',
    lineHeight: 16,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statusCol: {
    flex: 1,
    alignItems: 'center',
  },
  statusNumber: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusSubLabel: {
    fontSize: 11.5,
    color: '#64748B',
  },
  statusDivider: {
    width: 1,
    height: 56,
    backgroundColor: '#E2E8F0',
  },
  syncButton: {
    backgroundColor: '#1E64EE',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  syncButtonDisabled: {
    backgroundColor: '#93C5FD',
    shadowOpacity: 0.08,
  },
  syncBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  syncBtnIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCircleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  listIconBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 2.5,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  listDot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  listBar: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 10,
    marginBottom: 8,
  },
  logList: {
    gap: 6,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  logMarkOk: {
    color: '#16A34A',
    fontSize: 14,
    fontWeight: '900',
  },
  logMarkFail: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '900',
  },
  logText: {
    flex: 1,
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
  },
  emptyContainer: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  queueList: {
    marginTop: 10,
    gap: 8,
  },
  queueItem: {
    backgroundColor: '#F8FAFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  queueMiddle: {
    flex: 1,
  },
  queueUid: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  queueTime: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  queueRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  queueAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  queueBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeSyncedBg: {
    backgroundColor: '#DCFCE7',
  },
  badgePendingBg: {
    backgroundColor: '#FEF3C7',
  },
  queueBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  badgeSyncedText: {
    color: '#15803D',
  },
  badgePendingText: {
    color: '#B45309',
  },
  noteCard: {
    backgroundColor: '#E8F1FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulbCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulbIcon: {
    fontSize: 16,
  },
  noteTextWrap: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  noteBody: {
    fontSize: 11.5,
    color: '#334155',
    marginTop: 1,
  },
});
