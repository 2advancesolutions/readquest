/**
 * MuteButton — floating global mute toggle (React Native conversion).
 *
 * Replaces:
 * - localStorage → AsyncStorage
 * - framer-motion → React Native Animated + Pressable
 * - CSS fixed positioning → absolute positioning with SafeAreaInsets
 * - stopGlobalVoice → module-level audio stop function
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { Pressable, Animated, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { googleStop } from '../lib/tts'
import { useDeviceLayout } from '../hooks/useDeviceLayout'

const MUTE_KEY = 'readquest_muted'

// Module-level audio singleton (replaces globalVoice in WelcomeVoice.tsx)
// Any audio player in the app can register here to be stopped on mute
let globalStopFn: (() => void) | null = null
export function registerGlobalStop(fn: () => void) { globalStopFn = fn }
export function stopGlobalVoice() { globalStopFn?.(); globalStopFn = null }

// Module-level mute listeners (so useSpeechSynthesis hook can react)
type MuteListener = (muted: boolean) => void
const muteListeners = new Set<MuteListener>()
export function onMuteChange(fn: MuteListener) {
  muteListeners.add(fn)
  return () => muteListeners.delete(fn)
}
export function emitMuteChange(muted: boolean) {
  muteListeners.forEach(fn => fn(muted))
}

export default function MuteButton() {
  const { isTablet } = useDeviceLayout()
  const insets = useSafeAreaInsets()
  const [muted, setMuted] = useState(false)
  const scaleAnim = useRef(new Animated.Value(1)).current

  // Load persisted mute state
  useEffect(() => {
    AsyncStorage.getItem(MUTE_KEY).then(val => setMuted(val === 'true'))
  }, [])

  const toggle = useCallback(async () => {
    const next = !muted
    setMuted(next)
    // Bounce animation (replaces framer-motion whileTap)
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.85, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true }),
    ]).start()
    await AsyncStorage.setItem(MUTE_KEY, String(next))
    emitMuteChange(next)
    if (next) {
      // Stop any active expo-speech TTS immediately
      void googleStop()
      stopGlobalVoice()
    }
  }, [muted])

  const size = isTablet ? 44 : 36

  return (
    <Pressable
      onPress={toggle}
      style={{
        position: 'absolute',
        bottom: insets.bottom + 80, // above tab bar
        right: 14,
        zIndex: 9997,
      }}
    >
      <Animated.View
        style={{
          width: size, height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: muted ? '#1a0a22' : '#13102a',
          borderColor: muted ? '#F74B6D' : '#702AE1',
          borderWidth: 1.5,
          transform: [{ scale: scaleAnim }],
          shadowColor: muted ? '#F74B6D' : '#702AE1',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.45,
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <Text style={{ fontSize: size * 0.45 }}>
          {muted ? '🔇' : '🔊'}
        </Text>
      </Animated.View>
    </Pressable>
  )
}
