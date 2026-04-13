/**
 * Dashboard — Redesigned to match Dribbble kids reading app aesthetic.
 *
 * Changes from previous version:
 * - Hero banner with avatar, greeting & XP badge
 * - Horizontal featured-book carousel (large covers, 2:3 ratio)
 * - Category chip row for quick filtering
 * - Cleaner section headers with "See all →" links
 * - Larger, more spacious cards with glow accents
 * - Quick-launch cards redesigned as tall portrait cards
 * - Roadmap rings moved to a horizontal scrollable strip
 * - Keeps Night-Bloom dark palette (nb-bg, nb-card, rq-purple)
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  Animated, ActivityIndicator, Alert, StyleSheet,
  Platform, useWindowDimensions,
} from 'react-native'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Constants from 'expo-constants'
import { supabase } from '../../src/lib/supabase'
import { storage } from '../../src/lib/storage'
import { storiesApi, rewardsApi, roadmapApi } from '../../src/lib/api'
import type { RoadmapOut, RoadmapGameItem } from '../../src/lib/api'
import { emitXpUpdate } from '../../src/components/XpBadge'
import { LikesChip } from '../../src/components/LikesBadge'
import StudentDropdown from '../../src/components/StudentDropdown'
import type { Child } from '../../src/components/StudentDropdown'
import { useDeviceLayout } from '../../src/hooks/useDeviceLayout'
import { useAuth } from '../_layout'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

// ── Constants ─────────────────────────────────────────────────────────────
const THEME_EMOJIS: Record<string, string> = {
  animals: '🦁', space: '🚀', adventure: '🗺️', fantasy: '🧙',
  sports: '⚽', science: '🔬', ocean: '🐠', dinosaurs: '🦕',
}

// Bright accent colors for story cover placeholders
const COVER_GRADIENTS = [
  '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#F97316',
  '#8B5CF6', '#06B6D4', '#EF4444', '#84CC16',
]

interface StudentRewards {
  total_xp: number; level: number; level_name: string
  xp_to_next_level: number; xp_progress_pct: number
  current_streak: number; badges: unknown[]
  xp_history: { date: string; amount: number }[]
  weekly_activity: { date: string; active: boolean }[]
  stories_read: number
}

const MOCK_REWARDS: StudentRewards = {
  total_xp: 0, level: 1, level_name: 'Bookworm',
  xp_to_next_level: 200, xp_progress_pct: 0,
  current_streak: 0, badges: [],
  xp_history: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({ date: d, amount: 0 })),
  weekly_activity: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({ date: d, active: false })),
  stories_read: 0,
}

interface StoryItem {
  id: string; title: string
  cover_media_url?: string; theme?: string
  progress_pct?: number; completed_at?: string
}

// ── Section Header ─────────────────────────────────────────────────────────
function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={styles.seeAllText}>See all →</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ── Featured Book Card (large portrait) ───────────────────────────────────
function FeaturedBookCard({ story, index }: { story: StoryItem; index: number }) {
  const scale = useRef(new Animated.Value(1)).current
  const coverUri = story.cover_media_url?.startsWith('/static')
    ? `${API_URL}${story.cover_media_url}`
    : story.cover_media_url
  const accent = COVER_GRADIENTS[index % COVER_GRADIENTS.length]
  const pct = story.progress_pct ?? 0

  return (
    <Animated.View style={{ transform: [{ scale }], marginRight: 16 }}>
      <TouchableOpacity
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        onPress={() => router.push(`/(app)/read/${story.id}` as any)}
        activeOpacity={1}
        style={[styles.featuredCard, { shadowColor: accent }]}
      >
        {/* Cover */}
        <View style={[styles.featuredCover, { backgroundColor: accent + '33' }]}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 52 }}>{THEME_EMOJIS[story.theme ?? 'adventure'] ?? '📖'}</Text>
            </View>
          )}
          {/* Progress overlay */}
          {pct > 0 && (
            <View style={styles.featuredProgressBadge}>
              <Text style={styles.featuredProgressText}>{pct}%</Text>
            </View>
          )}
        </View>
        {/* Info */}
        <View style={styles.featuredInfo}>
          <Text style={styles.featuredTitle} numberOfLines={2}>{story.title}</Text>
          <View style={styles.featuredProgressBar}>
            <View style={[styles.featuredProgressFill, { width: `${pct}%`, backgroundColor: accent }]} />
          </View>
          <Text style={[styles.featuredAction, { color: accent }]}>
            {pct >= 100 ? '✅ Completed' : pct > 0 ? '📖 Keep Reading' : '🚀 Start Reading'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

// ── Quick-Action Tall Card ─────────────────────────────────────────────────
function QuickCard({
  emoji, title, desc, accent, onPress,
}: {
  emoji: string; title: string; desc: string; accent: string; onPress: () => void
}) {
  const scale = useRef(new Animated.Value(1)).current

  return (
    <Animated.View style={{ transform: [{ scale }], flex: 1, marginHorizontal: 5 }}>
      <TouchableOpacity
        onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        onPress={onPress}
        activeOpacity={1}
        style={[styles.quickCard, { borderColor: accent + '40' }]}
      >
        {/* Accent dot */}
        <View style={[styles.quickAccentDot, { backgroundColor: accent }]} />
        <View style={[styles.quickEmojiWrap, { backgroundColor: accent + '22' }]}>
          <Text style={{ fontSize: 30 }}>{emoji}</Text>
        </View>
        <Text style={styles.quickTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.quickDesc} numberOfLines={2}>{desc}</Text>
        <View style={[styles.quickChip, { backgroundColor: accent + '22' }]}>
          <Text style={[styles.quickChipText, { color: accent }]}>Open →</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

// ── Roadmap Progress Pill ──────────────────────────────────────────────────
function ProgressPill({
  emoji, label, pct, onPress,
}: { emoji: string; label: string; pct: number; onPress?: () => void }) {
  const barAnim = useRef(new Animated.Value(0)).current
  const scoreColor = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : pct > 0 ? '#ef4444' : '#B28CFF'

  useEffect(() => {
    Animated.timing(barAnim, { toValue: pct, duration: 900, useNativeDriver: false }).start()
  }, [pct])

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={styles.progressPill}
    >
      <Text style={{ fontSize: 24, marginBottom: 6 }}>{emoji}</Text>
      <Text style={styles.progressPillLabel} numberOfLines={1}>{label}</Text>
      {/* Arc progress — simplified as a thick pill bar */}
      <View style={styles.progressPillTrack}>
        <Animated.View style={[
          styles.progressPillFill,
          {
            width: barAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            backgroundColor: scoreColor,
          }
        ]} />
      </View>
      <Text style={[styles.progressPillPct, { color: scoreColor }]}>
        {pct > 0 ? `${pct}%` : '—'}
      </Text>
    </TouchableOpacity>
  )
}

// ── Streak + Level Hero Row ────────────────────────────────────────────────
function HeroStats({ rewards }: { rewards: StudentRewards }) {
  return (
    <View style={styles.heroStatsRow}>
      {/* Streak */}
      <View style={[styles.heroStatCard, { borderColor: '#F59E0B40' }]}>
        <Text style={{ fontSize: 24 }}>🔥</Text>
        <Text style={styles.heroStatValue}>{rewards.current_streak}</Text>
        <Text style={styles.heroStatLabel}>Day Streak</Text>
      </View>
      {/* XP */}
      <View style={[styles.heroStatCard, { borderColor: '#702AE140', flex: 2 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontSize: 20, marginRight: 6 }}>⚡</Text>
          <Text style={styles.heroStatValue}>{rewards.total_xp} XP</Text>
        </View>
        <Text style={styles.heroStatLabel}>Level {rewards.level} · {rewards.level_name}</Text>
        {/* XP bar */}
        <View style={styles.xpBarTrack}>
          <View style={[styles.xpBarFill, { width: `${Math.min(rewards.xp_progress_pct, 100)}%` }]} />
        </View>
      </View>
      {/* Stories */}
      <View style={[styles.heroStatCard, { borderColor: '#10B98140' }]}>
        <Text style={{ fontSize: 24 }}>📚</Text>
        <Text style={styles.heroStatValue}>{rewards.stories_read}</Text>
        <Text style={styles.heroStatLabel}>Books Read</Text>
      </View>
    </View>
  )
}

// ── Game Chip ─────────────────────────────────────────────────────────────
function GameChip({ game, delay }: { game: RoadmapGameItem; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    setTimeout(() =>
      Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }).start()
    , delay)
  }, [])

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      <TouchableOpacity
        style={styles.gameChip}
        onPress={() => router.push(`/(app)/games/${game.id}` as any)}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 28, marginBottom: 4 }}>{game.emoji}</Text>
        <Text style={styles.gameChipTitle} numberOfLines={2}>{game.title}</Text>
        <Text style={styles.gameChipSub}>Lv {game.level}/100</Text>
        <View style={styles.gameChipTrack}>
          <View style={[styles.gameChipFill, { width: `${game.pct}%` }]} />
        </View>
        {game.stars > 0 && <Text style={{ fontSize: 10, marginTop: 3 }}>{'⭐'.repeat(Math.min(game.stars, 3))}</Text>}
      </TouchableOpacity>
    </Animated.View>
  )
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function DashboardScreen() {
  const { isTablet } = useDeviceLayout()
  const { width } = useWindowDimensions()
  const isDesktopWeb = Platform.OS === 'web' && width >= 1024
  const { session } = useAuth()
  const insets = useSafeAreaInsets()

  const [rewards, setRewards] = useState<StudentRewards>(MOCK_REWARDS)
  const [stories, setStories] = useState<StoryItem[]>([])
  const [parentName, setParentName] = useState('Reader')
  const [children, setChildren] = useState<Child[]>([])
  const [childrenLoading, setChildrenLoading] = useState(true)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [roadmap, setRoadmap] = useState<RoadmapOut | null>(null)
  const [roadmapLoading, setRoadmapLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  })()

  const loadStudentData = useCallback(async (child: Child | null) => {
    setContentLoading(true)
    try {
      if (child) {
        const headers = { 'X-Student-ID': child.id }
        const [rRes, sRes] = await Promise.all([
          fetch(`${API_URL}/api/rewards/xp`, { headers }).then(r => r.ok ? r.json() : null),
          fetch(`${API_URL}/api/stories`, { headers }).then(r => r.ok ? r.json() : []),
        ])
        if (rRes) { setRewards(prev => ({ ...prev, ...rRes })); emitXpUpdate(rRes.total_xp ?? 0) }
        const list = Array.isArray(sRes) ? sRes : sRes?.stories ?? []
        setStories(await enrichWithLocalProgress(list, child.id))
        setRoadmapLoading(true)
        roadmapApi.get(child.id).then(r => setRoadmap(r.data)).catch(() => {}).finally(() => setRoadmapLoading(false))
      }
    } catch { /* non-fatal */ }
    finally { setContentLoading(false) }
  }, [])

  async function enrichWithLocalProgress(list: StoryItem[], studentId: string): Promise<StoryItem[]> {
    return Promise.all(list.map(async s => {
      // Backend already returns progress_pct and completed_at from reading_progress table.
      // Completed books from backend should always be 100%.
      const backendPct = s.progress_pct ?? 0
      const isCompleted = !!s.completed_at

      // Check local storage for potentially newer progress (offline-first)
      const stored = await storage.get<{ lastPage: number; totalPages: number }>(
        `rq_progress_${studentId}_${s.id}`
      )
      let localPct = 0
      if (stored && stored.totalPages > 0) {
        localPct = Math.min(Math.round((stored.lastPage / stored.totalPages) * 100), 100)
      }

      // Use whichever is higher — backend or local
      const finalPct = isCompleted ? 100 : Math.max(backendPct, localPct)
      return {
        ...s,
        progress_pct: finalPct,
        completed_at: isCompleted ? s.completed_at : (finalPct >= 100 ? 'completed' : s.completed_at),
      }
    }))
  }

  useEffect(() => {
    const user = session?.user
    if (!user) { setChildrenLoading(false); return }
    const meta = user.user_metadata
    setParentName([meta?.first_name, meta?.last_name].filter(Boolean).join(' ') || user.email || 'Reader')

    fetch(`${API_URL}/api/students/parent/${user.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(async (data: Child[]) => {
        const list = Array.isArray(data) ? data : []
        setChildren(list)
        const savedId = await storage.getString('readquest_student_id')
        const match = list.find(c => c.id === savedId) ?? list[0] ?? null
        if (match) {
          await storage.setString('readquest_student_id', match.id)
          await storage.setString('readquest_student_name', match.name)
          await storage.setString('readquest_student_grade', String(match.grade_level ?? 1))
          setSelectedChild(match)
          loadStudentData(match)
        }
      })
      .catch(() => { setChildren([]); setStories([]) })
      .finally(() => setChildrenLoading(false))
  }, [session])

  const selectChild = useCallback(async (child: Child | null) => {
    setSelectedChild(child)
    if (child) {
      await storage.setString('readquest_student_id', child.id)
      await storage.setString('readquest_student_name', child.name)
      await storage.setString('readquest_student_grade', String(child.grade_level ?? 1))
    } else {
      await storage.multiRemove(['readquest_student_id', 'readquest_student_name', 'readquest_student_grade'])
    }
    loadStudentData(child)
  }, [loadStudentData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadStudentData(selectedChild)
    setRefreshing(false)
  }, [selectedChild, loadStudentData])

  const childName = selectedChild?.name ?? parentName.split(' ')[0] ?? 'Explorer'
  const inProgressStories = stories.filter(s => !s.completed_at && (s.progress_pct ?? 0) > 0)
  const allActiveStories = stories.filter(s => !s.completed_at)
  const featuredStories = inProgressStories.length > 0 ? inProgressStories : allActiveStories.slice(0, 5)

  // ── Avatar initials from selected child ──────────────────────────────────
  const childInitial = childName.charAt(0).toUpperCase()
  const childAvatar = selectedChild?.avatar_url

  return (
    <View style={[styles.root, { paddingTop: isDesktopWeb ? 0 : insets.top }]}>

      {/* ── Hero Header ── */}
      <View style={[styles.header, isDesktopWeb && styles.headerDesktop, { zIndex: 50, elevation: 50 }]}>

        {/* Row 1: Greeting + Avatar */}
        <View style={styles.headerRow1}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greetingText, isDesktopWeb && styles.greetingTextDesktop]}>{greeting} 👋</Text>
            <Text style={[styles.heroName, isDesktopWeb && styles.heroNameDesktop]} numberOfLines={1}>
              {childName}
              {selectedChild && (
                <Text style={styles.heroParent}> · {parentName.split(' ')[0]}</Text>
              )}
            </Text>
          </View>
          {childAvatar ? (
            <Image source={{ uri: childAvatar }} style={styles.heroAvatar} contentFit="cover" />
          ) : (
            <View style={styles.heroAvatarFallback}>
              <Text style={styles.heroAvatarText}>{childInitial}</Text>
            </View>
          )}
        </View>

        {/* Row 2: Likes chip + Student switcher */}
        <View style={[styles.headerRow2, { zIndex: 60, elevation: 60 }]}>
          <LikesChip />
          <View style={{ flex: 1 }} />
          {!childrenLoading && children.length > 0 && (
            <StudentDropdown
              students={children}
              selected={selectedChild}
              onChange={selectChild}
              allowAll={children.length > 1}
            />
          )}
        </View>

      </View>

      {/* ── Content ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          { paddingBottom: isDesktopWeb ? 48 : 110 },
          isDesktopWeb && styles.desktopScrollContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#702AE1" />}
      >
        {/* ─ Hero Stats Row ─ */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <HeroStats rewards={rewards} />
        </View>

        {/* ─ Generate Story CTA ─ */}
        <TouchableOpacity
          style={styles.generateCta}
          activeOpacity={0.88}
          onPress={() => router.push('/(app)/generate' as any)}
        >
          <View style={styles.generateCtaIcon}>
            <Text style={{ fontSize: 26 }}>✨</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.generateCtaTitle}>Generate New Story</Text>
            <Text style={styles.generateCtaSub}>AI creates a personalized adventure for your child</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 18, opacity: 0.6 }}>→</Text>
        </TouchableOpacity>

        {/* Small secondary actions */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 24, gap: 10 }}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(app)/community' as any)}
          >
            <Text style={{ fontSize: 16 }}>🌍</Text>
            <Text style={styles.secondaryBtnText}>Community Books</Text>
          </TouchableOpacity>
        </View>

        {/* ─ Continue Reading / Featured Books ─ */}
        <View style={{ marginBottom: 28 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader
              title={inProgressStories.length > 0 ? '📖 Continue Reading' : '📚 Your Stories'}
              onSeeAll={() => router.push('/(app)/library' as any)}
            />
          </View>
          {contentLoading ? (
            <View style={{ paddingHorizontal: 16 }}>
              <ActivityIndicator size="large" color="#702AE1" />
            </View>
          ) : featuredStories.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {featuredStories.slice(0, 6).map((story, i) => (
                <FeaturedBookCard key={story.id} story={story} index={i} />
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity
              style={styles.emptyStoryBanner}
              onPress={() => router.push('/(app)/generate' as any)}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 40, marginBottom: 10 }}>✨</Text>
              <Text style={styles.emptyStoryTitle}>Create Your First Story!</Text>
              <Text style={styles.emptyStoryDesc}>Pick a character & theme — AI writes your adventure</Text>
              <View style={styles.emptyStoryBtn}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Let's Go → </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ─ Smart Suggestion ─ */}
        {roadmap?.smart_suggestion && (
          <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
            <TouchableOpacity
              style={styles.suggestionCard}
              onPress={() => router.push(roadmap.smart_suggestion.action_url as any)}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 32, marginRight: 14 }}>{roadmap.smart_suggestion.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionText}>{roadmap.smart_suggestion.message}</Text>
                <Text style={styles.suggestionAction}>Practice now →</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ─ Learning Roadmap ─ */}
        <View style={{ marginBottom: 28 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader
              title="🗺️ Learning Progress"
              onSeeAll={() => router.push('/(app)/library' as any)}
            />
          </View>
          {roadmapLoading ? (
            <ActivityIndicator size="small" color="#702AE1" style={{ marginTop: 8 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              <ProgressPill emoji="📖" label="Reading"       pct={roadmap?.reading.pct ?? 0}       onPress={() => router.push('/(app)/library' as any)} />
              <ProgressPill emoji="📝" label="Quizzes"       pct={roadmap?.quizzes.pct ?? 0}       onPress={() => router.push('/(app)/library' as any)} />
              <ProgressPill emoji="🧠" label="Comprehension" pct={roadmap?.comprehension.pct ?? 0} onPress={() => router.push('/(app)/library' as any)} />
              <ProgressPill emoji="✏️" label="Spelling"      pct={roadmap?.spelling.pct ?? 0}      onPress={() => router.push('/(app)/spell' as any)} />
              <ProgressPill emoji="🎓" label="Exams"         pct={roadmap?.exams.pct ?? 0}         onPress={() => router.push('/(app)/exams' as any)} />
            </ScrollView>
          )}
        </View>

        {/* ─ Games Arcade ─ */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader
              title="🎮 Games Arcade"
              onSeeAll={() => router.push('/(app)/games' as any)}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {(roadmap?.games.breakdown ?? []).map((game: RoadmapGameItem, i: number) => (
              <GameChip key={game.id} game={game} delay={i * 50} />
            ))}
            {(!roadmap || roadmap.games.breakdown.length === 0) && (
              <TouchableOpacity
                style={styles.gameEmptyCard}
                onPress={() => router.push('/(app)/games' as any)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 36, marginBottom: 8 }}>🎮</Text>
                <Text style={styles.gameEmptyText}>Start Playing!</Text>
                <Text style={styles.gameEmptySub}>Earn XP with mini-games</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
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

  // ── Header ──
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  // Desktop overrides
  headerDesktop: {
    paddingHorizontal: 36,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,110,255,0.1)',
    backgroundColor: 'rgba(12,5,32,0.82)',
  },
  greetingText: {
    color: '#69537B',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  greetingTextDesktop: {
    fontSize: 14,
  },
  heroName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroNameDesktop: {
    fontSize: 28,
  },
  desktopScrollContent: {
    paddingHorizontal: 12,
  },
  heroParent: {
    color: '#69537B',
    fontSize: 18,
    fontWeight: '500',
  },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#702AE1',
  },
  heroAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#702AE1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#B28CFF',
  },
  heroAvatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 20,
  },

  // ── Section header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  seeAllText: {
    color: '#B28CFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Hero Stats ──
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: '#1a1a35',
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a50',
  },
  heroStatValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 2,
  },
  heroStatLabel: {
    color: '#69537B',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  xpBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#2a2a50',
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#702AE1',
  },

  // ── Featured Book Card ──
  featuredCard: {
    width: 148,
    backgroundColor: '#1a1a35',
    borderRadius: 20,
    overflow: 'hidden',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  featuredCover: {
    width: 148,
    height: 196,
    borderRadius: 0,
    overflow: 'hidden',
  },
  featuredProgressBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  featuredProgressText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  featuredInfo: {
    padding: 12,
  },
  featuredTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 18,
  },
  featuredProgressBar: {
    height: 4,
    backgroundColor: '#2a2a50',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  featuredProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  featuredAction: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── New story card ──
  newStoryCard: {
    width: 120,
    height: 244,
    backgroundColor: '#1a1a35',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#702AE130',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  newStoryText: {
    color: '#B28CFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  // ── Empty story banner ──
  emptyStoryBanner: {
    marginHorizontal: 16,
    backgroundColor: '#1a1a35',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#702AE130',
  },
  emptyStoryTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyStoryDesc: {
    color: '#69537B',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  emptyStoryBtn: {
    backgroundColor: '#702AE1',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 100,
  },

  // ── Smart Suggestion ──
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a35',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#702AE130',
  },
  suggestionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  suggestionAction: {
    color: '#B28CFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Quick Card ──
  quickCard: {
    backgroundColor: '#1a1a35',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    minHeight: 160,
    alignItems: 'flex-start',
  },
  quickAccentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  quickEmojiWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  quickDesc: {
    color: '#69537B',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
    flex: 1,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Progress Pill ──
  progressPill: {
    backgroundColor: '#1a1a35',
    borderRadius: 20,
    padding: 14,
    marginRight: 10,
    alignItems: 'center',
    width: 100,
    borderWidth: 1,
    borderColor: '#2a2a50',
  },
  progressPillLabel: {
    color: '#ADA3B8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressPillTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#2a2a50',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressPillFill: {
    height: 6,
    borderRadius: 3,
  },
  progressPillPct: {
    fontSize: 13,
    fontWeight: '800',
  },

  // ── Game Chip ──
  gameChip: {
    backgroundColor: '#1a1a35',
    borderRadius: 20,
    padding: 14,
    marginRight: 10,
    width: 116,
    borderWidth: 1,
    borderColor: '#2a2a50',
  },
  gameChipTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
    lineHeight: 17,
  },
  gameChipSub: {
    color: '#69537B',
    fontSize: 11,
    marginBottom: 6,
  },
  gameChipTrack: {
    height: 4,
    backgroundColor: '#2a2a50',
    borderRadius: 2,
    overflow: 'hidden',
  },
  gameChipFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#702AE1',
  },
  gameEmptyCard: {
    width: 160,
    backgroundColor: '#1a1a35',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a50',
  },
  gameEmptyText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 4,
  },
  gameEmptySub: {
    color: '#69537B',
    fontSize: 11,
    textAlign: 'center',
  },

  // ── Generate Story CTA ──
  generateCta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#702AE1',
    shadowColor: '#702AE1',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    gap: 14,
  },
  generateCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateCtaTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  generateCtaSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '500',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#1a1a35',
    borderWidth: 1,
    borderColor: '#2a2a50',
  },
  secondaryBtnText: {
    color: '#ADA3B8',
    fontSize: 12,
    fontWeight: '700',
  },
})
