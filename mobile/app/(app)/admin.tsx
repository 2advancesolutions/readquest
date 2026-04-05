/**
 * Admin Dashboard — mobile + web
 * Custom delete confirmation modal replaces window.confirm / Alert.alert.
 */
import { useState, useEffect, useMemo, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, Animated, Pressable,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

interface AdminStats { total_users: number; total_books: number; total_exams: number; total_xp: number }
interface AdminUser {
  id: string; name: string; grade_level: number; grade_label: string;
  school: string | null; avatar_url: string | null; created_at: string;
  total_xp: number; level: number; level_name: string;
  story_count: number; exam_count: number;
}
interface AdminBook {
  id: string; title: string; theme: string; grade_level: number; grade_label: string;
  cover_media_url: string | null; student_id: string; student_name: string;
  created_at: string; page_count: number;
}
interface AdminScore {
  id: string; student_id: string; student_name: string;
  grade_level: number; grade_label: string;
  section: string; section_label: string; is_practice: boolean;
  score_pct: number; correct_count: number; total_questions: number;
  passed: boolean; xp_earned: number; time_taken_sec: number | null;
  completed_at: string;
}

type Tab = 'users' | 'books' | 'scores'

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
function getAvatarColor(name: string): string {
  const colors = ['#702ae1', '#f093fb', '#43e97b', '#fa709a', '#4facfe', '#a18cd1']
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return colors[h % colors.length]
}
function scoreColor(pct: number): string {
  if (pct >= 90) return '#4ade80'
  if (pct >= 80) return '#a3e635'
  if (pct >= 60) return '#facc15'
  return '#f87171'
}
function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return iso }
}
function fmtTime(sec: number | null): string {
  if (!sec) return '—'
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}m ${s}s`
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
interface DeleteModalProps {
  visible: boolean
  book: AdminBook | null
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}
function DeleteModal({ visible, book, deleting, onCancel, onConfirm }: DeleteModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start()
    } else {
      scaleAnim.setValue(0.85)
      opacityAnim.setValue(0)
    }
  }, [visible])

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      {/* Backdrop */}
      <Pressable
        onPress={onCancel}
        style={{ flex: 1, backgroundColor: 'rgba(5,3,20,0.82)', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        {/* Card — stop propagation so tapping inside doesn't dismiss */}
        <Animated.View
          style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim, width: '100%', maxWidth: 400 }}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={{
              backgroundColor: '#13102a',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(239,68,68,0.3)',
              overflow: 'hidden',
              shadowColor: '#ef4444',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 32,
              elevation: 20,
            }}>
              {/* Red accent bar */}
              <View style={{ height: 4, backgroundColor: '#ef4444', width: '100%' }} />

              <View style={{ padding: 24 }}>
                {/* Icon */}
                <View style={{
                  width: 56, height: 56, borderRadius: 28,
                  backgroundColor: 'rgba(239,68,68,0.12)',
                  borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16, alignSelf: 'center',
                }}>
                  <Text style={{ fontSize: 26 }}>🗑️</Text>
                </View>

                {/* Title */}
                <Text style={{
                  color: '#fff', fontSize: 18, fontWeight: '800',
                  textAlign: 'center', marginBottom: 8,
                }}>
                  Delete Book?
                </Text>

                {/* Book title */}
                <Text style={{
                  color: '#a89cc8', fontSize: 14, textAlign: 'center',
                  lineHeight: 20, marginBottom: 6,
                }}>
                  You're about to permanently delete
                </Text>
                <View style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
                  marginBottom: 16,
                }}>
                  <Text style={{
                    color: '#fff', fontSize: 14, fontWeight: '700',
                    textAlign: 'center', lineHeight: 20,
                  }} numberOfLines={2}>
                    "{book?.title}"
                  </Text>
                </View>
                <Text style={{
                  color: '#ef4444', fontSize: 12, textAlign: 'center',
                  marginBottom: 24, fontWeight: '600', letterSpacing: 0.3,
                }}>
                  ⚠️  This action cannot be undone.
                </Text>

                {/* Buttons */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {/* Cancel */}
                  <TouchableOpacity
                    onPress={onCancel}
                    disabled={deleting}
                    activeOpacity={0.75}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      borderRadius: 14, paddingVertical: 13,
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#c8bfe8', fontSize: 15, fontWeight: '700' }}>Cancel</Text>
                  </TouchableOpacity>

                  {/* Confirm delete */}
                  <TouchableOpacity
                    onPress={onConfirm}
                    disabled={deleting}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      backgroundColor: deleting ? 'rgba(239,68,68,0.4)' : '#ef4444',
                      borderRadius: 14, paddingVertical: 13,
                      alignItems: 'center', justifyContent: 'center',
                      flexDirection: 'row', gap: 6,
                    }}
                  >
                    {deleting
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Delete</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminScreen() {
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<Tab>('users')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [books, setBooks] = useState<AdminBook[]>([])
  const [scores, setScores] = useState<AdminScore[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<AdminBook | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const [statsRes, usersRes, booksRes, scoresRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`),
        fetch(`${API_URL}/api/admin/users`),
        fetch(`${API_URL}/api/admin/books`),
        fetch(`${API_URL}/api/admin/scores`),
      ])
      if (!statsRes.ok || !usersRes.ok || !booksRes.ok || !scoresRes.ok)
        throw new Error('Failed to load admin data')
      const [s, u, b, sc] = await Promise.all([
        statsRes.json(), usersRes.json(), booksRes.json(), scoresRes.json(),
      ])
      setStats(s); setUsers(u); setBooks(b); setScores(sc)
    } catch {
      setError('Could not load admin data. Make sure the backend is running.')
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/books/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setBooks(prev => prev.filter(b => b.id !== deleteTarget.id))
        setDeleteTarget(null)
      } else {
        const body = await res.json().catch(() => ({}))
        // Keep modal open, show error (simple alert as fallback for error state)
        setError(body?.detail ?? 'Failed to delete book.')
        setDeleteTarget(null)
      }
    } catch {
      setError('Request failed. Please try again.')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const filteredUsers = useMemo(() =>
    users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || (u.school ?? '').toLowerCase().includes(search.toLowerCase())),
    [users, search])

  const filteredBooks = useMemo(() =>
    books.filter(b => b.title.toLowerCase().includes(search.toLowerCase()) || b.student_name.toLowerCase().includes(search.toLowerCase())),
    [books, search])

  const filteredScores = useMemo(() =>
    scores.filter(s => s.student_name.toLowerCase().includes(search.toLowerCase()) || s.section_label.toLowerCase().includes(search.toLowerCase())),
    [scores, search])

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0d1f', alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#702AE1" />
        <Text style={{ color: '#6b5d80', marginTop: 8 }}>Loading admin data…</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d1f', paddingTop: insets.top }}>
      {/* Delete Modal */}
      <DeleteModal
        visible={!!deleteTarget}
        book={deleteTarget}
        deleting={deleting}
        onCancel={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a35' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#8a7aaa', fontSize: 14 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', flex: 1, marginLeft: 12 }}>⚙️ Admin Dashboard</Text>
        <TouchableOpacity onPress={() => fetchAll(true)} disabled={refreshing}>
          <Text style={{ color: '#702AE1', fontSize: 18 }}>{refreshing ? '⟳' : '↻'}</Text>
        </TouchableOpacity>
      </View>

      {!!error && (
        <View style={{ backgroundColor: '#ef444415', margin: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ef444433', padding: 14 }}>
          <Text style={{ color: '#ef4444' }}>⚠️ {error}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Stat cards */}
        {stats && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 14, gap: 10 }}>
            {[
              { icon: '👥', value: stats.total_users.toLocaleString(), label: 'Students', color: '#702AE1' },
              { icon: '📚', value: stats.total_books.toLocaleString(), label: 'Books', color: '#3b82f6' },
              { icon: '📝', value: stats.total_exams.toLocaleString(), label: 'Exams', color: '#4ade80' },
              { icon: '⚡', value: stats.total_xp.toLocaleString(), label: 'Total XP', color: '#f59e0b' },
            ].map((card, i) => (
              <View key={i} style={{ flex: 1, minWidth: '45%', backgroundColor: card.color + '15', borderRadius: 14, borderWidth: 1, borderColor: card.color + '30', padding: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, marginBottom: 4 }}>{card.icon}</Text>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>{card.value}</Text>
                <Text style={{ color: '#6b5d80', fontSize: 11, marginTop: 2 }}>{card.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tabs */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 14 }}>
          {([
            { key: 'users' as Tab, icon: '👥', label: 'Students', count: users.length },
            { key: 'books' as Tab, icon: '📚', label: 'Books', count: books.length },
            { key: 'scores' as Tab, icon: '📝', label: 'Scores', count: scores.length },
          ]).map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => { setTab(t.key); setSearch('') }}
              style={{
                flex: 1, backgroundColor: tab === t.key ? '#702AE1' : '#1a1a35',
                borderRadius: 12, borderWidth: 1, borderColor: tab === t.key ? '#702AE1' : '#2a2a4a',
                padding: 10, alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14 }}>{t.icon}</Text>
              <Text style={{ color: tab === t.key ? '#fff' : '#8a7aaa', fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                {t.label}
              </Text>
              <View style={{ backgroundColor: tab === t.key ? '#ffffff30' : '#2a2a4a', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, marginTop: 2 }}>
                <Text style={{ color: tab === t.key ? '#fff' : '#6b5d80', fontSize: 10, fontWeight: '700' }}>{t.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View style={{ marginHorizontal: 16, marginBottom: 14, backgroundColor: '#1a1a35', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
          <Text style={{ color: '#4a4a6a', marginRight: 8 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={tab === 'users' ? 'Search students…' : tab === 'books' ? 'Search books…' : 'Search scores…'}
            placeholderTextColor="#3a3a5a"
            style={{ flex: 1, color: '#fff', fontSize: 14, paddingVertical: 11 }}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: '#4a4a6a', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Users Tab */}
        {tab === 'users' && (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {filteredUsers.length === 0 && <Text style={{ color: '#4a4a6a', textAlign: 'center', padding: 20 }}>No students found.</Text>}
            {filteredUsers.map(u => (
              <View key={u.id} style={{ backgroundColor: '#1a1a35', borderRadius: 14, borderWidth: 1, borderColor: '#2a2a4a', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {u.avatar_url
                  ? <Image source={{ uri: u.avatar_url }} style={{ width: 44, height: 44, borderRadius: 22 }} contentFit="cover" />
                  : <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: getAvatarColor(u.name), alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{getInitials(u.name)}</Text>
                  </View>
                }
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{u.name}</Text>
                  <Text style={{ color: '#8a7aaa', fontSize: 12 }}>Grade {u.grade_label} · {u.level_name}</Text>
                  <Text style={{ color: '#4a4a6a', fontSize: 11 }}>📚 {u.story_count} · 📝 {u.exam_count} · ⚡ {u.total_xp.toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Books Tab */}
        {tab === 'books' && (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {filteredBooks.length === 0 && <Text style={{ color: '#4a4a6a', textAlign: 'center', padding: 20 }}>No books found.</Text>}
            {filteredBooks.map(b => (
              <View key={b.id} style={{ backgroundColor: '#1a1a35', borderRadius: 14, borderWidth: 1, borderColor: '#2a2a4a', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {b.cover_media_url
                  ? <Image source={{ uri: b.cover_media_url }} style={{ width: 52, height: 52, borderRadius: 10 }} contentFit="cover" />
                  : <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>📖</Text>
                  </View>
                }
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }} numberOfLines={2}>{b.title}</Text>
                  <Text style={{ color: '#8a7aaa', fontSize: 12 }}>{b.student_name} · Grade {b.grade_label}</Text>
                  <Text style={{ color: '#4a4a6a', fontSize: 11 }}>{b.page_count} pages · {fmtDate(b.created_at)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setDeleteTarget(b)}
                  style={{ backgroundColor: '#ef444415', borderRadius: 10, borderWidth: 1, borderColor: '#ef444430', padding: 8 }}
                >
                  <Text style={{ fontSize: 16 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Scores Tab */}
        {tab === 'scores' && (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {filteredScores.length === 0 && <Text style={{ color: '#4a4a6a', textAlign: 'center', padding: 20 }}>No scores found.</Text>}
            {filteredScores.map(s => {
              const color = scoreColor(s.score_pct)
              return (
                <View key={s.id} style={{ backgroundColor: '#1a1a35', borderRadius: 14, borderWidth: 1, borderColor: '#2a2a4a', padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{s.student_name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color, fontWeight: '900', fontSize: 16 }}>{s.score_pct.toFixed(0)}%</Text>
                      <View style={{
                        backgroundColor: s.is_practice ? '#3b82f615' : s.passed ? '#4ade8015' : '#ef444415',
                        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
                      }}>
                        <Text style={{
                          color: s.is_practice ? '#93c5fd' : s.passed ? '#4ade80' : '#f87171',
                          fontSize: 10, fontWeight: '700',
                        }}>
                          {s.is_practice ? 'Practice' : s.passed ? '✓ Pass' : '✗ Fail'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={{ color: '#8a7aaa', fontSize: 12, marginBottom: 6 }}>{s.section_label} · Grade {s.grade_label}</Text>
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: '#2a2a4a', overflow: 'hidden', marginBottom: 4 }}>
                    <View style={{ height: 5, borderRadius: 3, backgroundColor: color, width: `${s.score_pct}%` as any }} />
                  </View>
                  <Text style={{ color: '#4a4a6a', fontSize: 11 }}>⚡ {s.xp_earned} XP · {fmtTime(s.time_taken_sec)} · {fmtDate(s.completed_at)}</Text>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
