import AsyncStorage from '@react-native-async-storage/async-storage';
import { ParentLoginResponse } from '../types';

const STORAGE_KEY = '@school_coupon/parent_remembered_auth_v1';

export interface RememberedParentAuth {
  rememberMe: boolean;
  phone: string;
  session: ParentLoginResponse | null;
  selectedStudentId?: number;
}

export async function loadRememberedParentAuth(): Promise<RememberedParentAuth | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedParentAuth>;
    return {
      rememberMe: Boolean(parsed.rememberMe),
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      session: parsed.session ?? null,
      selectedStudentId:
        typeof parsed.selectedStudentId === 'number' ? parsed.selectedStudentId : undefined,
    };
  } catch {
    return null;
  }
}

export async function saveRememberedParentAuth(data: RememberedParentAuth): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage write errors
  }
}

export async function clearRememberedParentSessionOnly(): Promise<void> {
  try {
    const existing = await loadRememberedParentAuth();
    if (existing?.rememberMe) {
      await saveRememberedParentAuth({
        rememberMe: true,
        phone: existing.phone,
        session: null,
      });
      return;
    }
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export async function clearRememberedParentAuth(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
