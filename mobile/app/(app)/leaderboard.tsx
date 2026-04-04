/**
 * Leaderboard — ported from web Leaderboard.tsx
 * Shows global XP rankings with podium, grade filter, and search.
 */
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { storage } from '../../src/lib/storage'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

interface LeaderEntry {
  rank: number
  student_id: string
  name: string
  grade_level: number
  avatar_url: string | null
  total_xp: number
  level: number
  level_name: string
}

const GRADE_LABELS = ['K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
const LEVEL_COLORS: Record<number, string> = {
  1: '#6b7280', 2: '#22c55e', 3: '#3b82f6', 4: '#a855f7', 5: '#f59e0b',
}
const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(name: string): string {
  const colors = ['#702ae1', '#f093fb', '#43e97b', '#fa709a', '#4facfe', '#a18cd1']
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return colors[h % colors.length]
}

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets()
  const [entries, setEntries] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<number | null>(null)
  const [myStudentId, setMyStudentId] = useState('')

  useEffect(() => {
    storage.getString('readquest_student_id').then(id => setMyStudentId(id ?? ''))
  }, [])

  const fetchLeaderboard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/rewards/leaderboard/global?limit=200`)
      if (!res.ok) throw new Error()
      setEntries(await res.json())
      setError('')
    } catch {
      setError('Could not load leaderboard.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchLeaderboard() }, [])

  const filtered = entries.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase())
    const matchGrade = gradeFilter === null || e.grade_level === gradeFilter
    return matchSearch && matchGrade
  })

  const top3 = entries.slice(0, 3)
  const myEntry = entries.find(e => e.student_id === myStudentId)

  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d1f', paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#8a7aaa', fontSize: 14 }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>🏆 Leaderboard</Text>
          <Text style={{ color: '#6b5d80', fontSize: 12 }}>Top readers ranked by XP</Text>
        </View>
        <TouchableOpacity onPress={() => fetchLeaderboard(true)} disabled={refreshing}>
          <Text style={{ color: '#702AE1', fontSize: 20 }}>{refreshing ? '⟳' : '↻'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchLeaderboard(true)} tintColor="#702AE1" />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* My rank banner */}
        {myEntry && (
          <View style={{
            marginHorizontal: 16, marginBottom: 12, backgroundColor: '#702AE115',
            borderRadius: 14, borderWidth: 1, borderColor: '#702AE144',
            padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
          }}>
            <Text style={{ color: '#8a7aaa', fontSize: 12, fontWeight: '600' }}>Your Rank</Text>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>#{myEntry.rank}</Text>
            <Text style={{ color: '#B28CFF', fontSize: 13, fontWeight: '700' }}>⚡ {myEntry.total_xp.toLocaleString()} XP</Text>
            <Text style={{ color: LEVEL_COLORS[myEntry.level] ?? '#a855f7', fontSize: 12, fontWeight: '700', marginLeft: 'auto' as any }}>
              {myEntry.level_name}
            </Text>
          </View>
        )}

        {/* Podium */}
        {!loading && top3.length >= 2 && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginHorizontal: 16, marginBottom: 20, gap: 8 }}>
            {/* 2nd */}
            <View style={{ alignItems: 'center', flex: 1 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: getAvatarColor(top3[1]?.name ?? ''), alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{getInitials(top3[1]?.name ?? '?')}</Text>
              </View>
              <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>{top3[1]?.name}</Text>
              <Text style={{ color: '#9ca3af', fontSize: 11 }}>⚡ {top3[1]?.total_xp.toLocaleString()}</Text>
              <View style={{ backgroundColor: '#9ca3af', borderRadius: 6, padding: 6, marginTop: 4, width: '100%', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>🥈</Text>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>2</Text>
              </View>
            </View>
            {/* 1st */}
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 18 }}>👑</Text>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: getAvatarColor(top3[0]?.name ?? ''), alignItems: 'center', justifyContent: 'center', marginBottom: 4, borderWidth: 2, borderColor: '#f59e0b' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 22 }}>{getInitials(top3[0]?.name ?? '?')}</Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>{top3[0]?.name}</Text>
              <Text style={{ color: '#f59e0b', fontSize: 11 }}>⚡ {top3[0]?.total_xp.toLocaleString()}</Text>
              <View style={{ backgroundColor: '#f59e0b', borderRadius: 6, padding: 8, marginTop: 4, width: '100%', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>🥇</Text>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>1</Text>
              </View>
            </View>
            {/* 3rd */}
            {top3[2] && (
              <View style={{ alignItems: 'center', flex: 1 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: getAvatarColor(top3[2].name), alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{getInitials(top3[2].name)}</Text>
                </View>
                <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>{top3[2].name}</Text>
                <Text style={{ color: '#9ca3af', fontSize: 11 }}>⚡ {top3[2].total_xp.toLocaleString()}</Text>
                <View style={{ backgroundColor: '#92400e', borderRadius: 6, padding: 5, marginTop: 4, width: '100%', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>🥉</Text>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>3</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Search */}
        <View style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: '#1a1a35', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
          <Text style={{ color: '#4a4a6a', marginRight: 8 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name…"
            placeholderTextColor="#3a3a5a"
            style={{ flex: 1, color: '#fff', fontSize: 14, paddingVertical: 11 }}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: '#4a4a6a', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Grade Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
          {[null, ...GRADE_LABELS.map((_, i) => i)].map((g, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setGradeFilter(g as number | null)}
              style={{
                backgroundColor: gradeFilter === g ? '#702AE1' : '#1a1a35',
                borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
                borderWidth: 1, borderColor: gradeFilter === g ? '#702AE1' : '#2a2a4a',
              }}
            >
              <Text style={{ color: gradeFilter === g ? '#fff' : '#8a7aaa', fontWeight: '700', fontSize: 12 }}>
                {g === null ? 'All' : GRADE_LABELS[g as number]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* List */}
        {loading && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color="#702AE1" />
            <Text style={{ color: '#6b5d80', marginTop: 8 }}>Loading rankings…</Text>
          </View>
        )}

        {!!error && (
          <View style={{ alignItems: 'center', padding: 24 }}>
            <Text style={{ color: '#ef4444', marginBottom: 12 }}>⚠️ {error}</Text>
            <TouchableOpacity onPress={() => fetchLeaderboard()} style={{ backgroundColor: '#702AE1', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && filtered.map((entry, i) => {
          const isMe = entry.student_id === myStudentId
          const levelColor = LEVEL_COLORS[entry.level] ?? '#a855f7'
          return (
            <View
              key={entry.student_id}
              style={{
                marginHorizontal: 16, marginBottom: 8,
                backgroundColor: isMe ? '#702AE115' : '#1a1a35',
                borderRadius: 14, borderWidth: 1,
                borderColor: isMe ? '#702AE1' : '#2a2a4a',
                padding: 12, flexDirection: 'row', alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, width: 32, textAlign: 'center' }}>
                {RANK_MEDAL[entry.rank] ?? `#${entry.rank}`}
              </Text>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: getAvatarColor(entry.name), alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{getInitials(entry.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{entry.name}</Text>
                  {isMe && <View style={{ backgroundColor: '#702AE1', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>YOU</Text></View>}
                </View>
                <Text style={{ color: '#6b5d80', fontSize: 11 }}>
                  Grade {GRADE_LABELS[entry.grade_level] ?? entry.grade_level} · <Text style={{ color: levelColor }}>{entry.level_name}</Text>
                </Text>
                {/* XP bar */}
                <View style={{ height: 3, backgroundColor: '#2a2a4a', borderRadius: 2, marginTop: 4 }}>
                  <View style={{ height: 3, borderRadius: 2, backgroundColor: levelColor, width: `${Math.min((entry.total_xp % 200) / 200 * 100, 100)}%` }} />
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{entry.total_xp.toLocaleString()}</Text>
                <Text style={{ color: '#6b5d80', fontSize: 10 }}>XP</Text>
              </View>
            </View>
          )
        })}

        {!loading && !error && filtered.length === 0 && (
          <Text style={{ color: '#4a4a6a', textAlign: 'center', marginTop: 40 }}>
            {search ? `No results for "${search}"` : 'No students yet!'}
          </Text>
        )}

        {!loading && filtered.length > 0 && (
          <Text style={{ color: '#4a4a6a', textAlign: 'center', fontSize: 12, marginTop: 8 }}>
            Showing {filtered.length} of {entries.length} students
          </Text>
        )}
      </ScrollView>
    </View>
  )
}
