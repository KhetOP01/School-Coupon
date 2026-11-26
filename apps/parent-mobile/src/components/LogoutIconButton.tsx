import React from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

interface LogoutIconButtonProps {
  onPress: () => void;
  variant?: 'onDark' | 'onLight';
  confirm?: boolean;
}

/**
 * Pure React Native logout button (door + right-pointing arrow icon)
 * so every screen shares a consistent icon-only logout trigger without external icon deps.
 */
export function LogoutIconButton({
  onPress,
  variant = 'onDark',
  confirm = true,
}: LogoutIconButtonProps) {
  const iconColor = variant === 'onDark' ? '#FFFFFF' : '#334155';

  function handlePress() {
    if (!confirm) {
      onPress();
      return;
    }
    Alert.alert('ออกจากระบบ', 'ต้องการออกจากระบบใช่หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ออกจากระบบ', style: 'destructive', onPress },
    ]);
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'onDark' ? styles.buttonOnDark : styles.buttonOnLight,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="ออกจากระบบ"
    >
      <View style={styles.iconBox}>
        <View style={[styles.doorFrame, { borderColor: iconColor }]} />
        <View style={[styles.arrowShaft, { backgroundColor: iconColor }]} />
        <View style={[styles.arrowHead, { borderColor: iconColor }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonOnDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  buttonOnLight: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  iconBox: {
    width: 18,
    height: 16,
    justifyContent: 'center',
  },
  doorFrame: {
    position: 'absolute',
    left: 0,
    width: 10,
    height: 15,
    borderRadius: 2.5,
    borderWidth: 1.9,
    borderRightWidth: 0,
  },
  arrowShaft: {
    position: 'absolute',
    left: 6,
    width: 10,
    height: 2,
    borderRadius: 1,
  },
  arrowHead: {
    position: 'absolute',
    right: 1,
    width: 6,
    height: 6,
    borderTopWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
});
