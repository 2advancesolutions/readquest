/**
 * XpBadge — persistent XP counter overlay (React Native conversion).
 *
 * Replaces web window.CustomEvent / localStorage with:
 * - A global module-level EventEmitter for instant in-session updates
 * - AsyncStorage for persistent XP across sessions
 *
 * On native: positioned absolutely via SafeAreaView top-right.
 * On tablet: slightly larger badge.
 */
import { useState, useEffect, useRef } from 'react'
import { View, Text, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useDeviceLayout } from '../hooks/useDeviceLayout'

const XP_KEY = 'readquest_student_xp'

// ── Module-level event emitter (replaces window.CustomEvent) ───────────────
type XpListener = (total: number, delta?: number) => void
const xpListeners = new Set<XpListener>()

/** Call this anywhere in the app to update the XP badge instantly */
export function emitXpUpdate(newTotal: number, delta?: number) {
  AsyncStorage.setItem(XP_KEY, String(newTotal)).catch(() => {})
  xpListeners.forEach(fn => fn(newTotal, delta))
}

/** Read current XP from AsyncStorage (async) */
export async function getStoredXp(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(XP_KEY)
    return parseInt(val ?? '0', 10) || 0
  } catch {
    return 0
  }
}

export default function XpBadge() {
  const { isTablet } = useDeviceLayout()
  const insets = useSafeAreaInsets()
  const [xp, setXp] = useState(0)
  const [delta, setDelta] = useState<number | null>(null)
  const deltaAnim = useRef(new Animated.Value(0)).current
  const deltaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load initial XP from AsyncStorage
  useEffect(() => {
    getStoredXp().then(setXp)
  }, [])

  // Subscribe to in-session XP updates
  useEffect(() => {
    const listener: XpListener = (total, d) => {
      setXp(total)
      if (d && d > 0) {
        setDelta(d)
        // Animate delta: float up + fade out
        deltaAnim.setValue(0)
        Animated.sequence([
          Animated.timing(deltaAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.delay(600),
          Animated.timing(deltaAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => setDelta(null))
        if (deltaTimer.current) clearTimeout(deltaTimer.current)
        deltaTimer.current = setTimeout(() => setDelta(null), 1400)
      }
    }
    xpListeners.add(listener)
    return () => {
      xpListeners.delete(listener)
      if (deltaTimer.current) clearTimeout(deltaTimer.current)
    }
  }, [])

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + 8,
        right: 12,
        zIndex: 9999,
        alignItems: 'flex-end',
      }}
    >
      {/* XP chip */}
      <View
        className="flex-row items-center bg-nb-card rounded-full px-3 py-1.5"
        style={{ borderColor: '#702AE1', borderWidth: 1 }}
      >
        <Text className="text-yellow-400 mr-1" style={{ fontSize: isTablet ? 14 : 12 }}>⚡</Text>
        <Text
          className="text-white font-bold"
          style={{ fontSize: isTablet ? 14 : 12 }}
        >
          {xp.toLocaleString()}
        </Text>
        <Text
          className="text-rq-text-muted ml-1"
          style={{ fontSize: isTablet ? 12 : 10 }}
        >
          XP
        </Text>
      </View>

      {/* Delta +N float animation */}
      {delta !== null && (
        <Animated.Text
          className="text-rq-gold font-bold text-sm"
          style={{
            opacity: deltaAnim,
            transform: [{
              translateY: deltaAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }),
            }],
          }}
        >
          +{delta}
        </Animated.Text>
      )}
    </View>
  )
}
