/**
 * XpBadge — XP counter chip.
 *
 * TWO modes:
 * 1. <XpBadge />            — legacy floating absolute overlay (kept for non-dashboard screens)
 * 2. <XpBadge inline />     — inline chip for embedding in headers / rows
 *
 * Module-level emitter preserved so any screen can call emitXpUpdate().
 */
import { useState, useEffect, useRef } from 'react'
import { View, Text, Animated, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useDeviceLayout } from '../hooks/useDeviceLayout'

const XP_KEY = 'readquest_student_xp'

// ── Module-level event emitter ─────────────────────────────────────────────
type XpListener = (total: number, delta?: number) => void
const xpListeners = new Set<XpListener>()

export function emitXpUpdate(newTotal: number, delta?: number) {
  AsyncStorage.setItem(XP_KEY, String(newTotal)).catch(() => {})
  xpListeners.forEach(fn => fn(newTotal, delta))
}

export async function getStoredXp(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(XP_KEY)
    return parseInt(val ?? '0', 10) || 0
  } catch {
    return 0
  }
}

// ── Shared hook ────────────────────────────────────────────────────────────
export function useXpState() {
  const [xp, setXp] = useState(0)
  const [delta, setDelta] = useState<number | null>(null)
  const deltaAnim = useRef(new Animated.Value(0)).current
  const deltaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { getStoredXp().then(setXp) }, [])

  useEffect(() => {
    const listener: XpListener = (total, d) => {
      setXp(total)
      if (d && d > 0) {
        setDelta(d)
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

  return { xp, delta, deltaAnim }
}

// ── Inline chip (for embedding in headers) ────────────────────────────────
export function XpChip() {
  const { xp, delta, deltaAnim } = useXpState()
  return (
    <View style={chip.wrap}>
      <View style={chip.pill}>
        <Text style={chip.icon}>⚡</Text>
        <Text style={chip.value}>{xp.toLocaleString()}</Text>
        <Text style={chip.unit}>XP</Text>
      </View>
      {delta !== null && (
        <Animated.Text
          style={[chip.delta, {
            opacity: deltaAnim,
            transform: [{ translateY: deltaAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) }],
          }]}
        >
          +{delta}
        </Animated.Text>
      )}
    </View>
  )
}

const chip = StyleSheet.create({
  wrap:  { alignItems: 'center', position: 'relative' },
  pill:  {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1035',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#702AE1',
    gap: 3,
  },
  icon:  { fontSize: 12, color: '#facc15' },
  value: { fontSize: 12, fontWeight: '800', color: '#fff' },
  unit:  { fontSize: 10, color: '#7a79a0', fontWeight: '600' },
  delta: { position: 'absolute', top: -4, right: -4, fontSize: 11, fontWeight: '800', color: '#facc15' },
})

// \u2500\u2500 Default export: floating overlay \u2014 always top-right on every screen \u2500\u2500\u2500\u2500
export default function XpBadge() {
  const { isTablet } = useDeviceLayout()
  const insets = useSafeAreaInsets()
  const { xp, delta, deltaAnim } = useXpState()

  return (
    <View
      style={{
        alignItems: 'flex-end',
        // @ts-ignore web
        pointerEvents: 'none',
      }}
    >
      <View style={[
        chip.pill,
        {
          paddingHorizontal: isTablet ? 14 : 11,
          paddingVertical:   isTablet ? 7  : 6,
          shadowColor:   '#702AE1',
          shadowOpacity: 0.6,
          shadowRadius:  12,
          shadowOffset:  { width: 0, height: 0 },
        },
      ]}>
        <Text style={[chip.icon,  { fontSize: isTablet ? 14 : 12 }]}>⚡</Text>
        <Text style={[chip.value, { fontSize: isTablet ? 15 : 13 }]}>{xp.toLocaleString()}</Text>
        <Text style={[chip.unit,  { fontSize: isTablet ? 11 : 9  }]}> XP</Text>
      </View>

      {delta !== null && (
        <Animated.Text
          style={[chip.delta, {
            opacity: deltaAnim,
            transform: [{ translateY: deltaAnim.interpolate({ inputRange: [0, 1], outputRange: [4, -24] }) }],
          }]}
        >
          +{delta} XP
        </Animated.Text>
      )}
    </View>
  )
}

