/**
 * Book Recordings — lists all sessions for a specific book.
 * Route: /recordings/[bookId]/index
 */
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { storage } from '../../../../src/lib/storage'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Recording {
  id: string
  page_number: number
  accuracy_pct: number
  words_per_minute: number | null
  duration_sec: number
  feedback: string
  recorded_at: string
  audio_url?: string
}

interface BookInfo {
  id: string
  title: string
  cover_media_url: string | null
  grade_level: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function AccuracyBadge({ accuracy }: { accuracy: number }) {
  const color = accuracy >= 80 ? '#4ade80' : accuracy >= 60 ? '#fbbf24' : '#f87171'
  const emoji = accuracy >= 80 ? '⭐' : accuracy >= 60 ? '📈' : '💪'
  return (
    <View style={{ backgroundColor: color + '20', borderRadius: 10, borderWidth: 1, borderColor: color + '50', paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{emoji} {Math.round(accuracy)}%</Text>
    </View>
  )
}

export default function BookRecordingsScreen() {
  const insets = useSafeAreaInsets()
  const { bookId } = useLocalSearchParams<{ bookId: string }>()
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const sid = await storage.getString('readquest_student_id')
      if (!sid || !bookId) { setLoading(false); return }
      try {
        const [recRes, bookRes] = await Promise.all([
          fetch(`${API_URL}/api/fluency/recordings/${sid}/${bookId}`),
          fetch(`${API_URL}/api/stories/${bookId}`),
        ])
        if (recRes.ok) setRecordings(await recRes.json())
        if (bookRes.ok) setBookInfo(await bookRes.json())
      } catch { /* */ }
      setLoading(false)
    }
    load()
  }, [bookId])

  const handleDelete = (recId: string) => {
    Alert.alert('Delete Recording?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/api/fluency/recordings/${recId}`, { method: 'DELETE' })
            setRecordings(prev => prev.filter(r => r.id !== recId))
          } catch { /* */ }
        }
      }
    ])
  }

  const avgAccuracy = recordings.length
    ? Math.round(recordings.reduce((a, r) => a + r.accuracy_pct, 0) / recordings.length)
    : 0

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0d1f', alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#702AE1" />
        <Text style={{ color: '#6b5d80', marginTop: 8 }}>Loading recordings…</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d1f', paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a35' }}>
        <TouchableOpacity onPress={() => router.push('/(app)/recordings/index' as any)}>
          <Text style={{ color: '#8a7aaa', fontSize: 14 }}>← Recordings</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', flex: 1, marginLeft: 12 }}>🎤 Sessions</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Book header */}
        {bookInfo && (
          <View style={{ backgroundColor: '#1a1a35', borderRadius: 16, borderWidth: 1, borderColor: '#2a2a4a', padding: 14, marginBottom: 20, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <View style={{ width: 60, height: 60, borderRadius: 10, overflow: 'hidden', backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center' }}>
              {bookInfo.cover_media_url
                ? <Image source={{ uri: bookInfo.cover_media_url }} style={{ width: 60, height: 60 }} contentFit="cover" />
                : <Text style={{ fontSize: 28 }}>📚</Text>
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 }}>{bookInfo.title}</Text>
              <Text style={{ color: '#8a7aaa', fontSize: 12 }}>Grade {bookInfo.grade_level} · {recordings.length} session{recordings.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#B28CFF', fontSize: 20, fontWeight: '900' }}>{avgAccuracy}%</Text>
              <Text style={{ color: '#4a4a6a', fontSize: 10 }}>avg accuracy</Text>
            </View>
          </View>
        )}

        {recordings.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🎤</Text>
            <Text style={{ color: '#8a7aaa', fontSize: 16, fontWeight: '700' }}>No recordings yet</Text>
            <Text style={{ color: '#4a4a6a', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
              Open this book and start reading to create your first recording.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {recordings.map((rec, i) => (
              <TouchableOpacity
                key={rec.id}
                onPress={() => router.push(`/(app)/recordings/${bookId}/${rec.id}` as any)}
                style={{ backgroundColor: '#1a1a35', borderRadius: 14, borderWidth: 1, borderColor: '#2a2a4a', padding: 14 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#702AE120', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ fontSize: 22 }}>🎧</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Page {rec.page_number}</Text>
                    <Text style={{ color: '#6b5d80', fontSize: 11 }}>
                      {formatDate(rec.recorded_at)} · {formatTime(rec.recorded_at)} · {formatDuration(rec.duration_sec)}
                      {rec.words_per_minute ? ` · ${rec.words_per_minute} WPM` : ''}
                    </Text>
                  </View>
                  <AccuracyBadge accuracy={rec.accuracy_pct} />
                </View>

                {/* Feedback preview */}
                {rec.feedback && (
                  <Text style={{ color: '#8a7aaa', fontSize: 11, fontStyle: 'italic', marginTop: 8, paddingLeft: 56 }} numberOfLines={2}>
                    {rec.feedback}
                  </Text>
                )}

                {/* Delete button */}
                <TouchableOpacity
                  onPress={() => handleDelete(rec.id)}
                  style={{ position: 'absolute', top: 10, right: 10 }}
                >
                  <Text style={{ color: '#4a4a6a', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
