/**
 * LikesBadge — total ♥ likes display.
 *
 * TWO modes:
 * 1. <LikesBadge />       — legacy floating absolute overlay
 * 2. <LikesChip />        — inline chip for embedding in headers / rows
 */
import { useState, useEffect, useRef } from 'react'
import { View, Text, Animated, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSegments } from 'expo-router'
import { useDeviceLayout } from '../hooks/useDeviceLayout'

const POLL_INTERVAL = 60_000
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

// ── Module-level event emitter ─────────────────────────────────────────────
type LikesListener = (total: number) => void
const likesListeners = new Set<LikesListener>()
export function emitLikesUpdate(total: number) {
  likesListeners.forEach(fn => fn(total))
}

// ── Shared hook ────────────────────────────────────────────────────────────
export function useLikesState() {
  const [studentId, setStudentId] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const popAnim = useRef(new Animated.Value(1)).current
  const prevTotal = useRef(0)

  useEffect(() => {
    AsyncStorage.getItem('readquest_student_id').then(setStudentId)
  }, [])

  const fetchLikes = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/stories/public/likes/total?student_id=${id}`)
      const data = await res.json()
      const newTotal: number = data.total_likes ?? 0
      if (newTotal > prevTotal.current) {
        Animated.sequence([
          Animated.spring(popAnim, { toValue: 1.25, useNativeDriver: true }),
          Animated.spring(popAnim, { toValue: 1,    useNativeDriver: true }),
        ]).start()
      }
      prevTotal.current = newTotal
      setTotal(newTotal)
    } catch {}
  }

  useEffect(() => {
    if (!studentId) return
    fetchLikes(studentId)
    const interval = setInterval(() => fetchLikes(studentId), POLL_INTERVAL)
    const listener: LikesListener = t => setTotal(t)
    likesListeners.add(listener)
    return () => { clearInterval(interval); likesListeners.delete(listener) }
  }, [studentId])

  return { total, popAnim, studentId }
}

// ── Inline chip ────────────────────────────────────────────────────────────
export function LikesChip() {
  const { total, popAnim, studentId } = useLikesState()
  if (!studentId) return null
  return (
    <Animated.View style={[chip.pill, { transform: [{ scale: popAnim }] }]}>
      <Text style={chip.icon}>♥</Text>
      <Text style={chip.value}>{total.toLocaleString()}</Text>
      <Text style={chip.unit}>Likes</Text>
    </Animated.View>
  )
}

const chip = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1035',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#F74B6D',
    gap: 3,
  },
  icon:  { fontSize: 11, color: '#f472b6' },
  value: { fontSize: 12, fontWeight: '800', color: '#fff' },
  unit:  { fontSize: 10, color: '#7a79a0', fontWeight: '600' },
})

// ── Default export: floating overlay ──────────────────────────────────────
export default function LikesBadge() {
  const { isTablet } = useDeviceLayout()
  const insets = useSafeAreaInsets()
  const { total, popAnim, studentId } = useLikesState()

  const segments = useSegments()
  const isReadScreen = segments.some(s => s === 'read' || s.startsWith('[storyId]') || s.includes('storyId'))

  if (!studentId || isReadScreen) return null

  return (
    <View style={{ position: 'absolute', top: insets.top + 44, right: 12, zIndex: 9998 }}>
      <Animated.View style={[chip.pill, {
        paddingHorizontal: 12, paddingVertical: 7,
        transform: [{ scale: popAnim }],
      }]}>
        <Text style={[chip.icon, { fontSize: isTablet ? 14 : 12 }]}>♥</Text>
        <Text style={[chip.value, { fontSize: isTablet ? 14 : 12 }]}>{total.toLocaleString()}</Text>
        <Text style={[chip.unit, { fontSize: isTablet ? 12 : 10 }]}>Likes</Text>
      </Animated.View>
    </View>
  )
}
