/**
 * LikesBadge — total ♥ likes overlay (React Native conversion).
 *
 * Sits below XpBadge in the top-right corner.
 * Polls every 60 seconds and listens to module-level events for instant updates.
 * Uses SafeAreaInsets for proper positioning.
 */
import { useState, useEffect, useRef } from 'react'
import { View, Text, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { useSegments } from 'expo-router'
import { useDeviceLayout } from '../hooks/useDeviceLayout'

const POLL_INTERVAL = 60_000
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

// Module-level event emitter (replaces window.CustomEvent 'rq:likes-update')
type LikesListener = (total: number) => void
const likesListeners = new Set<LikesListener>()
export function emitLikesUpdate(total: number) {
  likesListeners.forEach(fn => fn(total))
}

export default function LikesBadge() {
  const { isTablet } = useDeviceLayout()
  const insets = useSafeAreaInsets()
  const [studentId, setStudentId] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const popAnim = useRef(new Animated.Value(1)).current
  const prevTotal = useRef(0)

  // Load student ID from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem('readquest_student_id').then(setStudentId)
  }, [])

  const fetchLikes = async () => {
    if (!studentId) return
    try {
      const res = await fetch(`${API_URL}/api/stories/public/likes/total?student_id=${studentId}`)
      const data = await res.json()
      const newTotal: number = data.total_likes ?? 0
      if (newTotal > prevTotal.current) {
        // Pop animation on new likes
        Animated.sequence([
          Animated.spring(popAnim, { toValue: 1.3, useNativeDriver: true }),
          Animated.spring(popAnim, { toValue: 1, useNativeDriver: true }),
        ]).start()
      }
      prevTotal.current = newTotal
      setTotal(newTotal)
    } catch {}
  }

  useEffect(() => {
    if (!studentId) return
    fetchLikes()
    const interval = setInterval(fetchLikes, POLL_INTERVAL)

    // Subscribe to instant updates
    const listener: LikesListener = (t) => setTotal(t)
    likesListeners.add(listener)

    return () => {
      clearInterval(interval)
      likesListeners.delete(listener)
    }
  }, [studentId])

  const segments = useSegments()
  // Hide on the read screen — overlaps story/quiz content
  const isReadScreen = segments.some(s => s === 'read' || s.startsWith('[storyId]') || s.includes('storyId'))

  if (!studentId || isReadScreen) return null

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + 44, // below XpBadge (~36px) + gap
        right: 12,
        zIndex: 9998,
      }}
    >
      <Animated.View
        className="flex-row items-center bg-nb-card rounded-full px-3 py-1.5"
        style={{ borderColor: '#F74B6D', borderWidth: 1, transform: [{ scale: popAnim }] }}
      >
        <Text className="text-rq-coral mr-1" style={{ fontSize: isTablet ? 14 : 12 }}>♥</Text>
        <Text
          className="text-white font-bold"
          style={{ fontSize: isTablet ? 14 : 12 }}
        >
          {total.toLocaleString()}
        </Text>
        <Text
          className="text-rq-text-muted ml-1"
          style={{ fontSize: isTablet ? 12 : 10 }}
        >
          Likes
        </Text>
      </Animated.View>
    </View>
  )
}
