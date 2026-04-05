/**
 * Library (Reading Shelf) — Redesigned to match Dribbble kids reading app.
 *
 * Changes from previous version:
 * - 2-column grid for book cards (larger covers, portrait layout)
 * - Student tab switcher redesigned as horizontal pill row
 * - Stats banner redesigned as a gradient summary row
 * - Book cards: large cover image dominates, metadata below
 * - No more expandable detail accordion — cleaner card tap
 * - Community books in a separate horizontal scroll row
 * - Keeps Night-Bloom dark palette
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  Animated, RefreshControl, ActivityIndicator, Alert, StyleSheet, Dimensions,
} from 'react-native'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Constants from 'expo-constants'
import { supabase } from '../../src/lib/supabase'
import { storage } from '../../src/lib/storage'
import { storiesApi, readingLogsApi, rewardsApi, progressApi } from '../../src/lib/api'
import { useAuth } from '../_layout'
import { useDeviceLayout } from '../../src/hooks/useDeviceLayout'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'
const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = (SCREEN_W - 48) / 2  // 2 columns with padding

// ── Types ──────────────────────────────────────────────────────────────────
interface Child { id: string; name: string; grade_level: number; avatar_url?: string }

interface ReadingLog {
  story_id: string; story_title: string; grade_level: number; cover_url?: string
  reading_accuracy: number; quiz_score: number; quiz_total: number
  comprehension_score: number; total_xp: number; stars: number
  feedback: string; completed_at: string
}

interface ShelfEntry {
  storyId: string; title: string; gradeLevel: number
  coverUrl?: string; theme?: string
  lastPage: number; totalPages: number; completionPct: number
  log: ReadingLog | null; completed: boolean
}

interface SavedBook {
  id: string; title: string; cover_media_url?: string
  grade_level: number; theme?: string; creator_name: string
}

// ── Constants ──────────────────────────────────────────────────────────────
const COVER_ACCENTS = [
  '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#F97316',
  '#8B5CF6', '#06B6D4', '#EF4444', '#84CC16',
]
const COVER_EMOJIS = ['📖', '📚', '⭐', '🌟', '🦋', '🌈', '🔮', '🦄']
const GRADE_COLORS: Record<number, string> = {
  1: '#F59E0B', 2: '#10B981', 3: '#3B82F6', 4: '#8B5CF6',
  5: '#EC4899', 6: '#F97316', 7: '#06B6D4', 8: '#6366F1',
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  catch { return '' }
}

// ── Book Cover ─────────────────────────────────────────────────────────────
function BookCover({ coverUrl, fallbackIdx, width, height }: {
  coverUrl?: string; fallbackIdx: number; width: number; height: number
}) {
  const accent = COVER_ACCENTS[fallbackIdx % COVER_ACCENTS.length]
  const emoji = COVER_EMOJIS[fallbackIdx % COVER_EMOJIS.length]

  if (coverUrl) {
    return (
      <Image
        source={{ uri: coverUrl }}
        style={{ width, height, borderRadius: 0 }}
        contentFit="cover"
        onError={() => {}}
      />
    )
  }
  return (
    <View style={{ width, height, backgroundColor: accent + '33', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: width * 0.32 }}>{emoji}</Text>
    </View>
  )
}

// ── Star Row ───────────────────────────────────────────────────────────────
function Stars({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Text key={i} style={{ color: i <= count ? '#F59E0B' : '#2a2a4a', fontSize: 12 }}>★</Text>
      ))}
    </View>
  )
}

// ── Student Pill Tab ───────────────────────────────────────────────────────
function StudentPill({ child, isActive, onPress, index }: {
  child: Child; isActive: boolean; onPress: () => void; index: number
}) {
  const accent = COVER_ACCENTS[index % COVER_ACCENTS.length]
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.studentPill,
        isActive && { backgroundColor: accent, borderColor: accent },
      ]}
    >
      <View style={[styles.studentPillAvatar, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : accent + '33' }]}>
        {child.avatar_url ? (
          <Image source={{ uri: child.avatar_url }} style={{ width: 26, height: 26, borderRadius: 13 }} contentFit="cover" />
        ) : (
          <Text style={{ color: isActive ? '#fff' : accent, fontWeight: '800', fontSize: 12 }}>
            {child.name.charAt(0)}
          </Text>
        )}
      </View>
      <View>
        <Text style={[styles.studentPillName, { color: isActive ? '#fff' : '#ADA3B8' }]}>
          {child.name}
        </Text>
        <Text style={[styles.studentPillGrade, { color: isActive ? 'rgba(255,255,255,0.7)' : '#4a4a6a' }]}>
          Grade {child.grade_level}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

// ── Book Grid Card ─────────────────────────────────────────────────────────
function BookGridCard({ entry, index, onDelete }: { entry: ShelfEntry; index: number; onDelete: (id: string) => void }) {
  const scale = useRef(new Animated.Value(1)).current
  const resolvedCover = entry.coverUrl?.startsWith('/static') ? `${API_URL}${entry.coverUrl}` : entry.coverUrl
  const accent = COVER_ACCENTS[index % COVER_ACCENTS.length]
  const gradeColor = GRADE_COLORS[entry.gradeLevel] ?? accent
  const coverH = Math.round(CARD_W * 1.4)

  const confirmDelete = () => Alert.alert('Remove Book', 'Remove from your library?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => onDelete(entry.storyId) },
  ])

  return (
    // Outer view is NOT a TouchableOpacity — the card and delete button are siblings
    <Animated.View style={{ transform: [{ scale }], margin: 6, width: CARD_W }}>
      {/* Tappable card body */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        onPress={() => router.push(`/(app)/read/${entry.storyId}` as any)}
        style={[styles.bookCard, { width: CARD_W, shadowColor: accent }]}
      >
        {/* Cover */}
        <View style={{ width: CARD_W, height: coverH, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
          <BookCover coverUrl={resolvedCover} fallbackIdx={index} width={CARD_W} height={coverH} />
          <View style={[
            styles.bookBadge,
            { backgroundColor: entry.completed ? '#22c55e22' : '#702AE122', borderColor: entry.completed ? '#22c55e40' : '#702AE140' }
          ]}>
            <Text style={{ fontSize: 9, color: entry.completed ? '#22c55e' : '#B28CFF', fontWeight: '800' }}>
              {entry.completed ? '✅ Done' : entry.completionPct > 0 ? `📖 ${entry.completionPct}%` : '🆕 New'}
            </Text>
          </View>
        </View>
        <View style={styles.bookProgressTrack}>
          <View style={[styles.bookProgressFill, {
            width: `${entry.completed ? 100 : entry.completionPct}%`,
            backgroundColor: entry.completed ? '#22c55e' : accent,
          }]} />
        </View>
        <View style={[styles.bookInfo, { paddingBottom: 8 }]}>
          <Text style={styles.bookTitle} numberOfLines={2}>{entry.title}</Text>
          <Text style={[styles.bookGrade, { color: gradeColor }]}>Grade {entry.gradeLevel}</Text>
          {entry.log && <Stars count={entry.log.stars} />}
        </View>
      </TouchableOpacity>

      {/* Action buttons OUTSIDE the card TouchableOpacity — fixes nested-touch issue */}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, paddingHorizontal: 4 }}>
        {!entry.completed && (
          <TouchableOpacity
            onPress={() => router.push(`/(app)/read/${entry.storyId}` as any)}
            style={[styles.bookBtn, { backgroundColor: accent + '22', borderColor: accent + '40', flex: 1 }]}
          >
            <Text style={[styles.bookBtnText, { color: accent }]}>
              {entry.completionPct > 0 ? '📖 Read' : '🚀 Start'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={confirmDelete}
          style={[styles.bookBtn, { backgroundColor: '#ef444415', borderColor: '#ef444435', paddingHorizontal: 14 }]}
        >
          <Text style={[styles.bookBtnText, { color: '#ef4444' }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

// ── Stats Strip ────────────────────────────────────────────────────────────
function StatsStrip({ entries }: { entries: ShelfEntry[] }) {
  const completed = entries.filter(e => e.completed)
  const totalXp = completed.reduce((s, e) => s + (e.log?.total_xp ?? 0), 0)
  const avgAcc = completed.length
    ? Math.round(completed.reduce((s, e) => s + (e.log?.reading_accuracy ?? 0), 0) / completed.length) : 0
  const avgStars = completed.length
    ? (completed.reduce((s, e) => s + (e.log?.stars ?? 0), 0) / completed.length).toFixed(1) : '—'

  const stats = [
    { icon: '📚', val: String(completed.length), lbl: 'Completed' },
    { icon: '⚡', val: String(totalXp), lbl: 'XP Earned' },
    { icon: '🎯', val: avgAcc > 0 ? `${avgAcc}%` : '—', lbl: 'Accuracy' },
    { icon: '⭐', val: String(avgStars), lbl: 'Avg Stars' },
  ]

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
      {stats.map(s => (
        <View key={s.lbl} style={styles.statPill}>
          <Text style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</Text>
          <Text style={styles.statPillVal}>{s.val}</Text>
          <Text style={styles.statPillLbl}>{s.lbl}</Text>
        </View>
      ))}
    </ScrollView>
  )
}

// ── Per-student shelf ──────────────────────────────────────────────────────
function StudentShelf({ child, onDeleteFromShelf }: { child: Child; onDeleteFromShelf?: (id: string) => void }) {
  const [entries, setEntries] = useState<ShelfEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setEntries([])

    Promise.all([
      readingLogsApi.getLogsForStudent(child.id, child.name, child.grade_level).catch(() => [] as ReadingLog[]),
      storiesApi.list().then(r => (r.data ?? []) as any[]).catch(() => []),
    ]).then(async ([logs, stories]) => {
      const typedLogs = logs as ReadingLog[]
      const logMap = new Map<string, ReadingLog>()
      for (const log of typedLogs) {
        const existing = logMap.get(log.story_id)
        if (!existing || log.stars > existing.stars) logMap.set(log.story_id, log)
      }

      const progressMap = await progressApi.getProgressBatch(stories.map((s: any) => s.id)).catch(() => ({} as Record<string, any>))

      const built: ShelfEntry[] = []
      stories.forEach((story: any) => {
        const prog = progressMap[story.id] ?? null
        const log = logMap.get(story.id) ?? null
        const lastPage = prog?.lastPage ?? 0
        const totalPages = prog?.totalPages ?? (story.pages?.length ?? 0)
        const completionPct = totalPages > 0 ? Math.round((lastPage / totalPages) * 100) : 0
        const completed = !!prog?.completedAt || !!log
        const hasInteraction = lastPage > 0 || !!log

        if (!hasInteraction && !completed) return

        const rawCover = story.cover_media_url
        const coverUrl = rawCover
          ? (rawCover.startsWith('/static') ? `${API_URL}${rawCover}` : rawCover)
          : log?.cover_url

        built.push({ storyId: story.id, title: story.title, gradeLevel: story.grade_level,
          coverUrl, theme: story.theme, lastPage, totalPages, completionPct, log, completed })
      })

      built.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        return b.completionPct - a.completionPct
      })
      setEntries(built)

      if (typedLogs.length > 0) {
        rewardsApi.syncXP(typedLogs.map(l => ({ story_id: l.story_id, total_xp: l.total_xp }))).catch(() => {})
      }
    }).finally(() => setLoading(false))
  }, [child.id])

  const handleDelete = (storyId: string) => {
    storiesApi.delete(storyId)
      .then(() => setEntries(prev => prev.filter(e => e.storyId !== storyId)))
      .catch(() => Alert.alert('Error', 'Failed to remove book.'))
  }

  if (loading) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#702AE1" />
        <Text style={{ color: '#69537B', fontSize: 14, marginTop: 12 }}>Loading {child.name}'s shelf…</Text>
      </View>
    )
  }

  if (entries.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 48 }}>
        <Text style={{ fontSize: 56, marginBottom: 12 }}>📭</Text>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18, marginBottom: 6 }}>No books yet!</Text>
        <Text style={{ color: '#69537B', fontSize: 13, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 }}>
          {child.name} hasn't started a story yet. Let's begin!
        </Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => router.push('/(app)/generate' as any)}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>✨ Start Reading</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <>
      {entries.filter(e => e.completed).length > 0 && <StatsStrip entries={entries} />}

      {/* 2-column grid via pairs */}
      {(() => {
        const rows: ShelfEntry[][] = []
        for (let i = 0; i < entries.length; i += 2) {
          rows.push(entries.slice(i, i + 2))
        }
        return rows.map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', justifyContent: 'flex-start' }}>
            {row.map((entry, colIdx) => (
              <BookGridCard
                key={entry.storyId}
                entry={entry}
                index={rowIdx * 2 + colIdx}
                onDelete={handleDelete}
              />
            ))}
          </View>
        ))
      })()}
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════
export default function LibraryScreen() {
  const { session } = useAuth()
  const insets = useSafeAreaInsets()

  const [children, setChildren] = useState<Child[]>([])
  const [childLoading, setChildLoading] = useState(true)
  const [activeChild, setActiveChild] = useState<Child | null>(null)
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>([])
  const [savedLoading, setSavedLoading] = useState(true)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'shelf' | 'community'>('shelf')

  const loadData = useCallback(async () => {
    const user = session?.user
    if (!user) { setChildLoading(false); return }

    // Load children first so we can validate the stored student ID
    let resolvedSid: string | null = null
    try {
      const data = await fetch(`${API_URL}/api/students/parent/${user.id}`).then(r => r.ok ? r.json() : [])
      const list: Child[] = Array.isArray(data) ? data : []
      setChildren(list)

      const savedId = await storage.getString('readquest_student_id')
      // Validate stored ID against real children — if stale/ghost, use first real child
      const match = list.find(c => c.id === savedId) ?? list[0] ?? null
      if (match) {
        if (match.id !== savedId) {
          // Stale stored ID — update storage to the real child
          await storage.setString('readquest_student_id', match.id)
        }
        resolvedSid = match.id
      }
      setActiveChild(match)
    } catch {
      setChildren([])
    } finally {
      setChildLoading(false)
    }

    setStudentId(resolvedSid)
    if (resolvedSid) {
      storiesApi.listSaved(resolvedSid)
        .then((r: any) => setSavedBooks(r.books ?? []))
        .catch(() => {})
        .finally(() => setSavedLoading(false))
    } else { setSavedLoading(false) }
  }, [session])

  useEffect(() => { loadData() }, [loadData])

  const removeSaved = async (storyId: string) => {
    if (!studentId) return
    await storiesApi.unsaveStory(studentId, storyId).catch(() => {})
    setSavedBooks(prev => prev.filter(b => b.id !== storyId))
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.libHeader}>
        <View>
          <Text style={styles.libTitle}>📚 Library</Text>
          <Text style={styles.libSub}>
            {activeChild ? `${activeChild.name}'s reading shelf` : 'Your collection'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(app)/generate' as any)}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tab switcher: Shelf / Community ── */}
      <View style={styles.tabRow}>
        {(['shelf', 'community'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab === 'shelf' ? '📖 My Shelf' : '🌍 Community'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Student pill tabs ── */}
      {activeTab === 'shelf' && !childLoading && children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.studentPillRow}>
          {children.map((child, i) => (
            <StudentPill
              key={child.id}
              child={child}
              isActive={activeChild?.id === child.id}
              onPress={() => setActiveChild(child)}
              index={i}
            />
          ))}
        </ScrollView>
      )}

      {/* ── Content ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 10, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#702AE1" />}
      >
        {activeTab === 'shelf' && (
          <>
            {childLoading && (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#702AE1" />
              </View>
            )}
            {!childLoading && children.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 56 }}>
                <Text style={{ fontSize: 56 }}>📭</Text>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18, marginTop: 12, marginBottom: 6 }}>No students yet</Text>
                <TouchableOpacity onPress={() => router.push('/(app)/add-kid' as any)}>
                  <Text style={{ color: '#B28CFF', fontWeight: '600' }}>Add a child →</Text>
                </TouchableOpacity>
              </View>
            )}
            {!childLoading && activeChild && (
              <StudentShelf child={activeChild} />
            )}
          </>
        )}

        {activeTab === 'community' && (
          <>
            {savedLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#702AE1" />
              </View>
            ) : savedBooks.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 56 }}>
                <Text style={{ fontSize: 56 }}>🌍</Text>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18, marginTop: 12, marginBottom: 6 }}>No saved books</Text>
                <Text style={{ color: '#69537B', fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>
                  Browse the community and save books to read anytime
                </Text>
              </View>
            ) : (
              (() => {
                const rows: SavedBook[][] = []
                for (let i = 0; i < savedBooks.length; i += 2) rows.push(savedBooks.slice(i, i + 2))
                return rows.map((row, rowIdx) => (
                  <View key={rowIdx} style={{ flexDirection: 'row' }}>
                    {row.map((book, colIdx) => {
                      const coverUrl = book.cover_media_url?.startsWith('/static')
                        ? `${API_URL}${book.cover_media_url}`
                        : book.cover_media_url
                      const idx = rowIdx * 2 + colIdx
                      const accent = COVER_ACCENTS[idx % COVER_ACCENTS.length]
                      const coverH = Math.round(CARD_W * 1.4)
                      return (
                        <Animated.View key={book.id} style={{ margin: 6 }}>
                          <TouchableOpacity
                            style={[styles.bookCard, { width: CARD_W, shadowColor: accent }]}
                            onPress={() => router.push(`/(app)/read/${book.id}` as any)}
                            activeOpacity={0.9}
                          >
                            <View style={{ width: CARD_W, height: coverH, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
                              <BookCover coverUrl={coverUrl} fallbackIdx={idx} width={CARD_W} height={coverH} />
                              <View style={[styles.bookBadge, { backgroundColor: '#2dd4bf22', borderColor: '#2dd4bf40' }]}>
                                <Text style={{ fontSize: 9, color: '#2dd4bf', fontWeight: '800' }}>🌍 Community</Text>
                              </View>
                            </View>
                            <View style={styles.bookInfo}>
                              <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
                              <Text style={styles.bookGrade}>by {book.creator_name}</Text>
                              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                                <TouchableOpacity
                                  style={[styles.bookBtn, { backgroundColor: accent + '22', borderColor: accent + '40' }]}
                                  onPress={() => router.push(`/(app)/read/${book.id}` as any)}
                                >
                                  <Text style={[styles.bookBtnText, { color: accent }]}>📖 Read</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.bookBtn, { backgroundColor: '#ef444410', borderColor: '#ef444430' }]}
                                  onPress={() => removeSaved(book.id)}
                                >
                                  <Text style={[styles.bookBtnText, { color: '#ef4444' }]}>✕</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </TouchableOpacity>
                        </Animated.View>
                      )
                    })}
                  </View>
                ))
              })()
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}

// ══════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },

  // ── Library Header ──
  libHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  libTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  libSub: {
    color: '#69537B',
    fontSize: 13,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: '#702AE1',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 100,
  },

  // ── Tab Row ──
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 100,
    backgroundColor: '#1a1a35',
    borderWidth: 1,
    borderColor: '#2a2a50',
  },
  tabBtnActive: {
    backgroundColor: '#702AE1',
    borderColor: '#702AE1',
  },
  tabBtnText: {
    color: '#69537B',
    fontSize: 13,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },

  // ── Student Pills ──
  studentPillRow: {
    paddingHorizontal: 14,
    marginBottom: 4,
    maxHeight: 72,
  },
  studentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a35',
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2a2a50',
  },
  studentPillAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentPillName: {
    fontSize: 12,
    fontWeight: '700',
  },
  studentPillGrade: {
    fontSize: 10,
    fontWeight: '500',
  },

  // ── Book Card ──
  bookCard: {
    backgroundColor: '#1a1a35',
    borderRadius: 20,
    overflow: 'hidden',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: '#2a2a50',
  },
  bookBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
  },
  bookProgressTrack: {
    height: 4,
    backgroundColor: '#2a2a50',
    overflow: 'hidden',
  },
  bookProgressFill: {
    height: 4,
  },
  bookInfo: {
    padding: 12,
  },
  bookTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
    lineHeight: 18,
  },
  bookGrade: {
    color: '#69537B',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  bookBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  bookBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Stats Strip ──
  statPill: {
    backgroundColor: '#1a1a35',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 1,
    borderColor: '#2a2a50',
  },
  statPillVal: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 2,
  },
  statPillLbl: {
    color: '#69537B',
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Empty State ──
  emptyBtn: {
    backgroundColor: '#702AE1',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 100,
    marginTop: 20,
  },
})
