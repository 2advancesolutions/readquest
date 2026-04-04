/**
 * Root Layout (_layout.tsx)
 *
 * - Sets up the auth session listener (Supabase onAuthStateChange)
 * - Provides session state to all child routes via context
 * - Configures the navigation stack and global providers
 * - Handles the app-wide loading state before session is known
 */
import '../src/styles/global.css'
import { useEffect, useState, createContext, useContext } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import { View, ActivityIndicator } from 'react-native'
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../src/lib/supabase'
import { loadSfxMuteState } from '../src/lib/gameAudio'

// Keep splash screen visible while auth state resolves
SplashScreen.preventAutoHideAsync()

// ── Auth Context ───────────────────────────────────────────────────────────
interface AuthContextValue {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ session: null, loading: true })
export const useAuth = () => useContext(AuthContext)

// ── Root Layout ────────────────────────────────────────────────────────────
export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // ── Configure audio session so expo-speech works on BOTH iOS & Android ──
  // iOS:     overrides the hardware silent/ring switch
  // Android: uses DUCK mode so TTS speaks over other audio
  useEffect(() => {
    Audio.setAudioModeAsync({
      // iOS — speak even when the silent/ring switch is ON
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      // Android — lower other audio while TTS speaks
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      playThroughEarpieceAndroid: false,
    }).catch(() => {})
    // Load the persisted mute state so game audio respects the user's preference
    loadSfxMuteState().catch(() => {})
  }, [])

  useEffect(() => {
    // Identical pattern to web App.tsx — INITIAL_SESSION fires first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'INITIAL_SESSION') {
        setLoading(false)
        SplashScreen.hideAsync()
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-nb-bg">
        <ActivityIndicator size="large" color="#702AE1" />
      </View>
    )
  }

  return (
    <AuthContext.Provider value={{ session, loading }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            {/* Public routes */}
            <Stack.Screen name="index"            options={{ animation: 'none' }} />
            <Stack.Screen name="(auth)/landing"   options={{ animation: 'none' }} />
            <Stack.Screen name="(auth)/login"     options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="(auth)/signup"    options={{ animation: 'slide_from_right' }} />

            {/* Protected app routes — rendered inside (app) group */}
            <Stack.Screen name="(app)"         options={{ animation: 'none' }} />
          </Stack>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AuthContext.Provider>
  )
}
