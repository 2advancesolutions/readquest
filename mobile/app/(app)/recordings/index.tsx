/**
 * Recordings Library — mobile screen
 * Shows all reading recordings grouped by book.
 * Recordings are fetched from the backend API.
 */
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { storage } from '../../../src/lib/storage'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

interface BookGroup {
  book_id: string
  book_title: string
  cover_url: string | null
  grade_level: number
  recording_count: number
  avg_accuracy: number
  last_recorded_at: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getAccuracyColor(pct: number) {
  return pct >= 80 ? '#4ade80' : pct >= 60 ? '#fbbf24' : '#f87171'
}

export default function RecordingsScreen() {
  const insets = useSafeAreaInsets()
  const [groups, setGroups] = useState<BookGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const sid = await storage.getString('readquest_student_id')
      if (!sid) { setLoading(false); return }
      try {
        const res = await fetch(`${API_URL}/api/fluency/recordings/by-book/${sid}`)
        if (res.ok) setGroups(await res.json())
      } catch { /* */ }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d1f', paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a35' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#8a7aaa', fontSize: 14 }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ marginLeft: 12 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>🎤 My Recordings</Text>
          <Text style={{ color: '#6b5d80', fontSize: 12 }}>All reading sessions by book</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#702AE1" />
          <Text style={{ color: '#6b5d80', marginTop: 8 }}>Loading recordings…</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 56, marginBottom: 14 }}>🎧</Text>
          <Text style={{ color: '#8a7aaa', fontSize: 18, fontWeight: '700', marginBottom: 6 }}>No recordings yet</Text>
          <Text style={{ color: '#4a4a6a', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
            Start reading a book and your recordings will appear here.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(app)/library')}
            style={{ backgroundColor: '#702AE1', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>📚 Go to Library</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <Text style={{ color: '#4a4a6a', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            {groups.length} Book{groups.length !== 1 ? 's' : ''} Recorded
          </Text>
          <View style={{ gap: 12 }}>
            {groups.map(group => {
              const accColor = getAccuracyColor(group.avg_accuracy)
              return (
                <TouchableOpacity
                  key={group.book_id}
                  onPress={() => router.push(`/(app)/recordings/${group.book_id}/index` as any)}
                  style={{ backgroundColor: '#1a1a35', borderRadius: 16, borderWidth: 1, borderColor: '#2a2a4a', overflow: 'hidden' }}
                >
                  <View style={{ flexDirection: 'row', padding: 16, alignItems: 'center', gap: 14 }}>
                    {/* Cover */}
                    <View style={{ width: 60, height: 60, borderRadius: 10, overflow: 'hidden', backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center' }}>
                      {group.cover_url ? (
                        <Image source={{ uri: group.cover_url }} style={{ width: 60, height: 60 }} contentFit="cover" />
                      ) : (
                        <Text style={{ fontSize: 28 }}>📚</Text>
                      )}
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 4 }} numberOfLines={2}>
                        {group.book_title}
                      </Text>
                      <Text style={{ color: '#6b5d80', fontSize: 12 }}>
                        {group.recording_count} session{group.recording_count !== 1 ? 's' : ''} · Grade {group.grade_level}
                      </Text>
                      <Text style={{ color: '#4a4a6a', fontSize: 11, marginTop: 2 }}>
                        Last: {formatDate(group.last_recorded_at)}
                      </Text>
                    </View>

                    {/* Accuracy badge */}
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: accColor + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: accColor + '50' }}>
                        <Text style={{ color: accColor, fontWeight: '900', fontSize: 13 }}>
                          {Math.round(group.avg_accuracy)}%
                        </Text>
                      </View>
                      <Text style={{ color: '#4a4a6a', fontSize: 9, marginTop: 3 }}>accuracy</Text>
                    </View>

                    <Text style={{ color: '#4a4a6a', fontSize: 18 }}>›</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </ScrollView>
      )}
    </View>
  )
}
