import AsyncStorage from '@react-native-async-storage/async-storage';
import { MerchantLoginResponse } from '../types';

const STORAGE_KEY = '@school_coupon/merchant_remembered_auth_v1';

export interface RememberedMerchantAuth {
  rememberMe: boolean;
  merchantCode: string;
  session: MerchantLoginResponse | null;
}

export async function loadRememberedMerchantAuth(): Promise<RememberedMerchantAuth | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedMerchantAuth>;
    return {
      rememberMe: Boolean(parsed.rememberMe),
      merchantCode: typeof parsed.merchantCode === 'string' ? parsed.merchantCode : '',
      session: parsed.session ?? null,
    };
  } catch {
    return null;
  }
}

export async function saveRememberedMerchantAuth(
  data: RememberedMerchantAuth,
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage write errors
  }
}

export async function clearRememberedMerchantSessionOnly(): Promise<void> {
  try {
    const existing = await loadRememberedMerchantAuth();
    if (existing?.rememberMe) {
      await saveRememberedMerchantAuth({
        rememberMe: true,
        merchantCode: existing.merchantCode,
        session: null,
      });
      return;
    }
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export async function clearRememberedMerchantAuth(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
