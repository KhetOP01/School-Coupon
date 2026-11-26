import { StyleSheet, TextStyle } from 'react-native';
import {
  Sarabun_300Light,
  Sarabun_400Regular,
  Sarabun_500Medium,
  Sarabun_600SemiBold,
  Sarabun_700Bold,
  Sarabun_800ExtraBold,
} from '@expo-google-fonts/sarabun';

export const SARABUN_FONTS = {
  Sarabun_300Light,
  Sarabun_400Regular,
  Sarabun_500Medium,
  Sarabun_600SemiBold,
  Sarabun_700Bold,
  Sarabun_800ExtraBold,
};

export function resolveSarabunFont(fontWeight?: TextStyle['fontWeight']): string {
  switch (fontWeight) {
    case '300':
    case 300:
      return 'Sarabun_300Light';
    case '500':
    case 500:
      return 'Sarabun_500Medium';
    case '600':
    case 600:
      return 'Sarabun_600SemiBold';
    case '700':
    case 700:
    case 'bold':
      return 'Sarabun_700Bold';
    case '800':
    case 800:
    case '900':
    case 900:
      return 'Sarabun_800ExtraBold';
    default:
      return 'Sarabun_400Regular';
  }
}

let patched = false;

function isTextRule(rule: unknown): rule is Record<string, unknown> {
  if (!rule || typeof rule !== 'object') {
    return false;
  }
  return (
    'fontSize' in rule ||
    'fontWeight' in rule ||
    'lineHeight' in rule ||
    'letterSpacing' in rule ||
    'textAlign' in rule ||
    'color' in rule
  );
}

/**
 * Wraps StyleSheet.create once at startup so every text rule across all screens
 * resolves to the loaded Sarabun font weight without duplicating fontFamily everywhere.
 */
export function installSarabunTypography(): void {
  if (patched) {
    return;
  }
  patched = true;

  const originalCreate = StyleSheet.create.bind(StyleSheet);
  const mutableStyleSheet = StyleSheet as unknown as {
    create: typeof StyleSheet.create;
  };
  mutableStyleSheet.create = ((styles: Record<string, unknown>) => {
    const transformed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(styles)) {
      if (isTextRule(value) && !('fontFamily' in value)) {
        const clone: Record<string, unknown> = {
          ...value,
          fontFamily: resolveSarabunFont(value.fontWeight as TextStyle['fontWeight']),
        };
        delete clone.fontWeight;
        transformed[key] = clone;
      } else {
        transformed[key] = value;
      }
    }
    return originalCreate(transformed as Parameters<typeof StyleSheet.create>[0]);
  }) as typeof StyleSheet.create;
}

installSarabunTypography();
