import React, { useState } from 'react';
import { registerRootComponent } from 'expo';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { HomeScreen } from './screens/HomeScreen';
import { TopUpScreen } from './screens/TopUpScreen';
import { DailyLimitScreen } from './screens/DailyLimitScreen';
import { CardSecurityScreen } from './screens/CardSecurityScreen';
import { StudentProfile } from './types';

// Mock initial student data (matches seed/test student)
const INITIAL_STUDENT: StudentProfile = {
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
};

type ScreenType = 'home' | 'topup' | 'dailylimit' | 'card';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [student, setStudent] = useState<StudentProfile>(INITIAL_STUDENT);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {currentScreen === 'home' && (
          <HomeScreen
            student={student}
            onNavigate={(screen) => setCurrentScreen(screen)}
          />
        )}

        {currentScreen === 'topup' && (
          <TopUpScreen
            student={student}
            onSuccess={(newBalance) => {
              setStudent((prev) => ({ ...prev, walletBalance: newBalance }));
              setCurrentScreen('home');
            }}
            onBack={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'dailylimit' && (
          <DailyLimitScreen
            student={student}
            onSuccess={(newNextLimit) => {
              setStudent((prev) => ({ ...prev, nextDailyLimit: newNextLimit }));
              setCurrentScreen('home');
            }}
            onBack={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'card' && (
          <CardSecurityScreen
            student={student}
            onSuccess={(newStatus) => {
              setStudent((prev) => ({
                ...prev,
                card: prev.card ? { ...prev.card, status: newStatus } : undefined,
              }));
              setCurrentScreen('home');
            }}
            onBack={() => setCurrentScreen('home')}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
  },
});

registerRootComponent(App);

