/**
 * Supabase client for React Native.
 *
 * Key difference from web version:
 * - Uses expo-secure-store instead of window.localStorage for session persistence
 * - SecureStoreAdapter wraps SecureStore's sync-style API to match AsyncStorage interface
 * - detectSessionInUrl: false — deep links handled by Expo Router, not Supabase
 */
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// Use EXPO_PUBLIC_ vars directly — Metro inlines these at build time and they
// are reliably available on physical devices (unlike Constants.expoConfig.extra
// which can be undefined when the app bundle is built for production/TestFlight).
const supabaseUrl     = process.env.EXPO_PUBLIC_SUPABASE_URL     ?? ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

/**
 * SecureStore adapter — Supabase auth storage on native.
 * On web we fall back to localStorage (SecureStore not available in browser).
 */
const SecureStoreAdapter = {
  getItem: (key: string): string | null | Promise<string | null> => {
    if (Platform.OS === 'web') return localStorage.getItem(key)
    return SecureStore.getItemAsync(key)
  },
  setItem: (key: string, value: string): void | Promise<void> => {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return }
    return SecureStore.setItemAsync(key, value)
  },
  removeItem: (key: string): void | Promise<void> => {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return }
    return SecureStore.deleteItemAsync(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:              SecureStoreAdapter,
    storageKey:           'readquest-auth',
    persistSession:       true,
    autoRefreshToken:     true,
    detectSessionInUrl:   false, // Expo Router handles deep links
  },
})
