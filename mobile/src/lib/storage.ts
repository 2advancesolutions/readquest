/**
 * storage.ts — AsyncStorage wrapper replacing window.localStorage.
 *
 * All APIs are async (await required) unlike the synchronous localStorage.
 * Use this module everywhere instead of direct AsyncStorage calls
 * so we have a single place to swap storage backends if needed.
 *
 * On web: values stored in localStorage (AsyncStorage uses localStorage on web).
 * On native: values stored in AsyncStorage (file-backed, ~6MB limit).
 * For sensitive data (auth tokens) use supabase.ts (SecureStore-backed).
 */
import AsyncStorage from '@react-native-async-storage/async-storage'

export const storage = {
  /** Get a JSON-parsed value, or null if missing / parse fails */
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key)
      if (raw === null) return null
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  },

  /** Store any JSON-serialisable value */
  async set(key: string, value: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage quota hit — fail silently
    }
  },

  /** Get a raw string value (no JSON parsing) */
  async getString(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key)
    } catch {
      return null
    }
  },

  /** Store a raw string value */
  async setString(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value)
    } catch {}
  },

  /** Remove a key */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key)
    } catch {}
  },

  /** Remove multiple keys at once */
  async multiRemove(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys)
    } catch {}
  },

  /** Get all keys matching a prefix */
  async getKeysWithPrefix(prefix: string): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys()
      return (allKeys as string[]).filter(k => k.startsWith(prefix))
    } catch {
      return []
    }
  },
}

// ── Convenience helpers matching the most common localStorage patterns ──────

/** Get the currently selected student ID (replaces localStorage.getItem('readquest_student_id')) */
export async function getSelectedStudentId(): Promise<string | null> {
  return storage.getString('readquest_student_id')
}

/** Set the currently selected student ID */
export async function setSelectedStudentId(id: string): Promise<void> {
  return storage.setString('readquest_student_id', id)
}

/** Clear the selected student (on logout or student switch) */
export async function clearSelectedStudentId(): Promise<void> {
  return storage.remove('readquest_student_id')
}
