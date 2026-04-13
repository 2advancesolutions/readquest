/**
 * StoriesBadge — Compact global overlay pill (top-left).
 * Matches the XpBadge size/style. Mini donut + "6/6" text.
 * Goes red + taps to open subscription when limit is hit.
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { router, usePathname } from 'expo-router'
import { subscriptionApi, type ParentUsage } from '../lib/api'

// Global hook so any screen can trigger an immediate badge refresh
let _globalRefresh: (() => void) | null = null
export function refreshStoriesBadge() { _globalRefresh?.() }

// ── Tiny inline donut ─────────────────────────────────────────────────────────
function TinyDonut({ used, limit }: { used: number; limit: number }) {
  const isUnlimited   = limit >= 9999
  const pct           = isUnlimited ? 0.2 : Math.min(1, used / Math.max(1, limit))
  const isFull        = !isUnlimited && used >= limit
  const color         = isFull ? '#ef4444' : '#a78bfa'
  const size          = 20
  const strokeWidth   = 3
  const radius        = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDash    = circumference * (1 - pct)

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#1a1a35" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDash}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
    </View>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
const HIDDEN = ['/subscription']

export default function StoriesBadge() {
  const path   = usePathname()
  const [usage, setUsage] = useState<ParentUsage | null>(null)

  const isUnlimited = (usage?.stories_limit ?? 0) >= 9999
  const isFull      = !isUnlimited && !!usage && usage.stories_used_this_period >= usage.stories_limit
  const hidden      = HIDDEN.some(s => path.startsWith(s))

  const load = useCallback(async () => {
    try { setUsage(await subscriptionApi.getUsage()) } catch {}
  }, [])

  // Register global refresh handle
  useEffect(() => {
    _globalRefresh = () => { void load() }
    return () => { _globalRefresh = null }
  }, [load])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const t = setInterval(() => { void load() }, 30_000) // poll every 30s
    return () => clearInterval(t)
  }, [load])

  if (hidden || !usage) return null

  const label = isUnlimited
    ? '∞'
    : `${usage.stories_used_this_period}/${usage.stories_limit}`

  const textColor = isFull ? '#ef4444' : '#fff'
  const borderColor = isFull ? '#ef444466' : '#702AE133'
  const glowColor   = isFull ? '#ef4444'   : '#702AE1'

  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => router.push('/(app)/subscription')}
        style={[styles.pill, {
          borderColor,
          shadowColor: glowColor,
        }]}
      >
        <TinyDonut used={usage.stories_used_this_period} limit={usage.stories_limit} />
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        <Text style={styles.unit}>stories</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#0d0d1f',
    borderRadius:    20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth:     1,
    gap:             5,
    shadowOpacity:   0.45,
    shadowRadius:    10,
    shadowOffset:    { width: 0, height: 0 },
  },
  label: {
    fontSize:   12,
    fontWeight: '800',
  },
  unit: {
    fontSize:   9,
    fontWeight: '600',
    color:      '#7a79a0',
  },
})
