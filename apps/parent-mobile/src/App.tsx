import { SARABUN_FONTS } from './theme/sarabun';
import React, { useEffect, useState } from 'react';
import { registerRootComponent } from 'expo';
import { useFonts } from 'expo-font';
import { ActivityIndicator, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from './screens/HomeScreen';
import { TopUpScreen } from './screens/TopUpScreen';
import { DailyLimitScreen } from './screens/DailyLimitScreen';
import { CardSecurityScreen } from './screens/CardSecurityScreen';
import { SpendingHistoryScreen } from './screens/SpendingHistoryScreen';
import { LoginScreen } from './screens/LoginScreen';
import { parentApi } from './api/parent-api';
import {
  clearRememberedParentAuth,
  clearRememberedParentSessionOnly,
  loadRememberedParentAuth,
  saveRememberedParentAuth,
} from './auth/parent-auth-storage';
import { ParentLoginResponse, ParentUser, StudentProfile } from './types';

const INITIAL_STUDENTS: StudentProfile[] = [
  {
    id: 1,
    studentCode: 'STD-1001',
    firstName: 'สมชาย',
    lastName: 'ใจดี',
    walletBalance: '150.00',
    currentDailyLimit: '200.00',
    nextDailyLimit: '200.00',
    card: {
      id: 1,
      rfidUid: 'E280F3020000000145A58295',
      status: 'active',
    },
  },
  {
    id: 2,
    studentCode: 'STD-1002',
    firstName: 'สมหญิง',
    lastName: 'รักเรียน',
    walletBalance: '200.00',
    currentDailyLimit: '200.00',
    nextDailyLimit: '200.00',
    card: {
      id: 2,
      rfidUid: 'E280F3020000000145A58285',
      status: 'active',
    },
  },
  {
    id: 3,
    studentCode: 'STD-1003',
    firstName: 'ต้นกล้า',
    lastName: 'มีสุข',
    walletBalance: '100.00',
    currentDailyLimit: '150.00',
    nextDailyLimit: '150.00',
    card: {
      id: 3,
      rfidUid: 'E280F3020000000145A5828D',
      status: 'active',
    },
  },
  {
    id: 4,
    studentCode: 'STD-1004',
    firstName: 'น้ำใส',
    lastName: 'สว่างจิต',
    walletBalance: '50.00',
    currentDailyLimit: '100.00',
    nextDailyLimit: '100.00',
    card: {
      id: 4,
      rfidUid: 'E280F3020000000145A58289',
      status: 'active',
    },
  },
  {
    id: 5,
    studentCode: 'STD-1005',
    firstName: 'ภูผา',
    lastName: 'มั่นคง',
    walletBalance: '300.00',
    currentDailyLimit: '250.00',
    nextDailyLimit: '250.00',
    card: {
      id: 5,
      rfidUid: 'E280F3020000000145A58291',
      status: 'active',
    },
  },
];

type ScreenType = 'home' | 'history' | 'topup' | 'dailylimit' | 'card';
type NavTab = 'home' | 'history' | 'dailylimit' | 'card';

function ParentNavIcon({ tab, active }: { tab: NavTab; active: boolean }) {
  const color = active ? '#1E64EE' : '#6B7A99';

  if (tab === 'home') {
    return (
      <View style={styles.navIconWrap}>
        <View style={[styles.walletNavBody, { backgroundColor: color }]}>
          <View style={styles.walletNavFlap}>
            <View style={styles.walletNavDot} />
          </View>
        </View>
      </View>
    );
  }

  if (tab === 'history') {
    return (
      <View style={styles.navIconWrap}>
        <View style={[styles.historyNavDoc, { borderColor: color }]}>
          <View style={[styles.historyNavLine, { backgroundColor: color }]} />
          <View style={[styles.historyNavLineShort, { backgroundColor: color }]} />
          <View style={[styles.historyNavLine, { backgroundColor: color }]} />
        </View>
      </View>
    );
  }

  if (tab === 'dailylimit') {
    return (
      <View style={styles.navIconWrap}>
        <View style={[styles.limitOuterRing, { borderColor: color }]}>
          <View style={[styles.limitInnerRing, { borderColor: color }]}>
            <View style={[styles.limitCenterDot, { backgroundColor: color }]} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.navIconWrap}>
      <View style={[styles.cardNavRect, { borderColor: color }]}>
        <View style={[styles.cardNavStripe, { backgroundColor: color }]} />
        <View style={[styles.cardNavChip, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

function ParentApp() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0,
  );
  const bottomInset = Math.max(insets.bottom, 10);

  const [parent, setParent] = useState<ParentUser | null>(null);
  const [hydratingSession, setHydratingSession] = useState<boolean>(true);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [students, setStudents] = useState<StudentProfile[]>(INITIAL_STUDENTS);
  const [selectedStudentId, setSelectedStudentId] = useState<number>(1);

  const student = students.find((s) => s.id === selectedStudentId) ?? students[0];

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const saved = await loadRememberedParentAuth();
        if (!saved?.rememberMe || !saved.session?.token) {
          return;
        }

        const cachedSession = saved.session;
        parentApi.setSession(cachedSession.token, cachedSession.parent.id);

        try {
          const fresh = await parentApi.getMe();
          if (cancelled) return;
          const nextStudents =
            fresh.students.length > 0 ? fresh.students : INITIAL_STUDENTS;
          const preferredId =
            saved.selectedStudentId &&
            nextStudents.some((s) => s.id === saved.selectedStudentId)
              ? saved.selectedStudentId
              : nextStudents[0].id;
          const updatedSession: ParentLoginResponse = {
            token: cachedSession.token,
            parent: fresh.parent,
            students: fresh.students,
          };
          setParent(fresh.parent);
          setStudents(nextStudents);
          setSelectedStudentId(preferredId);
          await saveRememberedParentAuth({
            rememberMe: true,
            phone: fresh.parent.phone,
            session: updatedSession,
            selectedStudentId: preferredId,
          });
        } catch (err) {
          if (cancelled) return;
          const status =
            err && typeof err === 'object' && 'status' in err
              ? Number((err as { status?: number }).status)
              : undefined;
          if (status === 401 || status === 403) {
            parentApi.logout();
            await clearRememberedParentSessionOnly();
          } else {
            const nextStudents =
              cachedSession.students.length > 0
                ? cachedSession.students
                : INITIAL_STUDENTS;
            const preferredId =
              saved.selectedStudentId &&
              nextStudents.some((s) => s.id === saved.selectedStudentId)
                ? saved.selectedStudentId
                : nextStudents[0].id;
            setParent(cachedSession.parent);
            setStudents(nextStudents);
            setSelectedStudentId(preferredId);
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

  function handleSelectStudent(id: number) {
    setSelectedStudentId(id);
    void loadRememberedParentAuth().then((saved) => {
      if (saved?.rememberMe && saved.session) {
        return saveRememberedParentAuth({
          ...saved,
          selectedStudentId: id,
        });
      }
      return undefined;
    });
  }

  function handleLoginSuccess(session: ParentLoginResponse, rememberMe = false) {
    setParent(session.parent);
    const nextStudents = session.students.length > 0 ? session.students : INITIAL_STUDENTS;
    setStudents(nextStudents);
    const firstId = nextStudents[0].id;
    setSelectedStudentId(firstId);
    setCurrentScreen('home');
    if (rememberMe) {
      void saveRememberedParentAuth({
        rememberMe: true,
        phone: session.parent.phone,
        session,
        selectedStudentId: firstId,
      });
    } else {
      void clearRememberedParentAuth();
    }
  }

  function handleLogout() {
    parentApi.logout();
    void clearRememberedParentSessionOnly();
    setParent(null);
    setStudents(INITIAL_STUDENTS);
    setSelectedStudentId(1);
    setCurrentScreen('home');
  }

  if (hydratingSession) {
    return (
      <View
        style={[
          styles.root,
          { backgroundColor: '#EEF4FF', alignItems: 'center', justifyContent: 'center' },
        ]}
      >
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#1D63ED" />
      </View>
    );
  }

  if (!parent) {
    return (
      <View style={[styles.root, { backgroundColor: '#EEF4FF' }]}>
        <StatusBar barStyle="light-content" />
        <LoginScreen topInset={topInset} onLoginSuccess={handleLoginSuccess} />
      </View>
    );
  }

  function updateStudent(updater: (prev: StudentProfile) => StudentProfile) {
    setStudents((prevList) =>
      prevList.map((item) => (item.id === student.id ? updater(item) : item)),
    );
  }

  const showBottomNav = currentScreen !== 'topup';
  const usesBlueHeader =
    currentScreen === 'home' ||
    currentScreen === 'history' ||
    currentScreen === 'dailylimit' ||
    currentScreen === 'card';

  return (
    <View
      style={[
        styles.root,
        usesBlueHeader
          ? { backgroundColor: '#EEF4FF' }
          : { backgroundColor: '#FFFFFF', paddingTop: topInset },
      ]}
    >
      <StatusBar barStyle={usesBlueHeader ? 'light-content' : 'dark-content'} />

      <View style={styles.screenBody}>
        {currentScreen === 'home' && (
          <HomeScreen
            parent={parent}
            student={student}
            students={students}
            topInset={topInset}
            onSelectStudent={handleSelectStudent}
            onBalanceUpdated={(newBalance) =>
              updateStudent((prev) => ({ ...prev, walletBalance: newBalance }))
            }
            onLogout={handleLogout}
          />
        )}

        {currentScreen === 'history' && (
          <SpendingHistoryScreen
            student={student}
            students={students}
            topInset={topInset}
            onSelectStudent={handleSelectStudent}
            onLogout={handleLogout}
          />
        )}

        {currentScreen === 'topup' && (
          <TopUpScreen
            student={student}
            students={students}
            onSelectStudent={handleSelectStudent}
            onSuccess={(newBalance) => {
              updateStudent((prev) => ({ ...prev, walletBalance: newBalance }));
              setCurrentScreen('home');
            }}
            onBack={() => setCurrentScreen('home')}
            onLogout={handleLogout}
          />
        )}

        {currentScreen === 'dailylimit' && (
          <DailyLimitScreen
            student={student}
            students={students}
            topInset={topInset}
            onSelectStudent={handleSelectStudent}
            onSuccess={(newNextLimit) => {
              updateStudent((prev) => ({ ...prev, nextDailyLimit: newNextLimit }));
              setCurrentScreen('home');
            }}
            onBack={() => setCurrentScreen('home')}
            onLogout={handleLogout}
          />
        )}

        {currentScreen === 'card' && (
          <CardSecurityScreen
            student={student}
            students={students}
            topInset={topInset}
            onSelectStudent={handleSelectStudent}
            onSuccess={(newStatus) => {
              updateStudent((prev) => ({
                ...prev,
                card: prev.card ? { ...prev.card, status: newStatus } : undefined,
              }));
              setCurrentScreen('home');
            }}
            onBack={() => setCurrentScreen('home')}
            onLogout={handleLogout}
          />
        )}
      </View>

      {showBottomNav && (
        <View style={[styles.bottomNav, { paddingBottom: bottomInset }]}>
          {(
            [
              { id: 'home', label: 'เติมเงินคูปอง' },
              { id: 'history', label: 'ประวัติใช้จ่าย' },
              { id: 'dailylimit', label: 'วงเงินรายวัน' },
              { id: 'card', label: 'บัตร RFID' },
            ] as const
          ).map((item) => {
            const active = currentScreen === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.navItem}
                onPress={() => setCurrentScreen(item.id)}
                activeOpacity={0.75}
              >
                <ParentNavIcon tab={item.id} active={active} />
                <Text style={[styles.navText, active && styles.navTextActive]}>
                  {item.label}
                </Text>
                <View style={[styles.navActiveBar, !active && styles.navInactiveBar]} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
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
      <ParentApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screenBody: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    paddingHorizontal: 8,
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
  walletNavBody: {
    width: 22,
    height: 17,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  walletNavFlap: {
    width: 9,
    height: 8,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  walletNavDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  historyNavDoc: {
    width: 18,
    height: 20,
    borderRadius: 3.5,
    borderWidth: 2,
    justifyContent: 'center',
    paddingHorizontal: 2.5,
    gap: 2.5,
  },
  historyNavLine: {
    width: '100%',
    height: 2,
    borderRadius: 1,
  },
  historyNavLineShort: {
    width: '68%',
    height: 2,
    borderRadius: 1,
  },
  limitOuterRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitInnerRing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitCenterDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  cardNavRect: {
    width: 22,
    height: 16,
    borderRadius: 3.5,
    borderWidth: 2,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  cardNavStripe: {
    height: 3,
    width: '100%',
  },
  cardNavChip: {
    width: 5,
    height: 3,
    borderRadius: 1,
    marginLeft: 2,
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
    width: '56%',
    borderRadius: 2,
    backgroundColor: '#1E64EE',
  },
  navInactiveBar: {
    backgroundColor: 'transparent',
  },
});

registerRootComponent(App);
