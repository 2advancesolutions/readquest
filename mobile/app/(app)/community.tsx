/**
 * (app)/community.tsx — Community Book Library
 *
 * Mobile port of the web PublicBookList.tsx.
 * - Browse publicly shared stories created by the community
 * - Like books, add to your library, or read directly
 * - Filter by art style, search by title/theme
 * Night-Bloom aesthetic with infinite scroll.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Image,
  StyleSheet, ActivityIndicator, FlatList, Modal, Pressable,
  Animated, Dimensions,
} from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { storiesApi } from '../../src/lib/api'
import { getSelectedStudentId } from '../../src/lib/storage'

const { width: SW } = Dimensions.get('window')
const API_BASE = `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'}/api`

// ── Types ────────────────────────────────────────────────────────────────────
interface PublicBook {
  id: string
  title: string
  theme: string
  grade_level: number
  cover_media_url: string | null
  art_style: string
  created_at: string
  creator_id: string | null
  creator_name: string
  view_count: number
  like_count: number
}

// ── Filter types ─────────────────────────────────────────────────────────────
const FILTER_TYPES = [
  { label: 'All',         value: 'all'        },
  { label: '🎨 Cartoon',  value: 'cartoon'    },
  { label: '💥 Comic',    value: 'comic'      },
  { label: '🖌️ Watercolor', value: 'watercolor' },
  { label: '✨ Fantasy',  value: 'fantasy'    },
  { label: '🌸 Anime',    value: 'anime'      },
  { label: '📸 Realistic', value: 'realistic' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function themeEmoji(theme: string): string {
  const t = (theme || '').toLowerCase()
  if (t.includes('space') || t.includes('star'))   return '🚀'
  if (t.includes('ocean') || t.includes('sea'))    return '🌊'
  if (t.includes('forest') || t.includes('jungle')) return '🌲'
  if (t.includes('dragon') || t.includes('castle')) return '🏰'
  if (t.includes('dino'))                           return '🦕'
  if (t.includes('robot'))                          return '🤖'
  if (t.includes('pirate'))                         return '🏴‍☠️'
  if (t.includes('superhero'))                      return '🦸'
  if (t.includes('magic'))                          return '✨'
  return '📖'
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return '1d ago'
  if (diff < 7) return `${diff}d ago`
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Session key (replaces localStorage) ──────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage'
async function getSessionKey(): Promise<string> {
  const k = 'rq_session_key'
  let sk = await AsyncStorage.getItem(k)
  if (!sk) {
    sk = `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`
    await AsyncStorage.setItem(k, sk)
  }
  return sk
}

// ── useLike hook ──────────────────────────────────────────────────────────────
function useLike(storyId: string, initialCount: number) {
  const [likeCount, setLikeCount] = useState(initialCount)
  const [alreadyLiked, setAlreadyLiked] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    getSessionKey().then(sk => {
      storiesApi.getLikeStatus(storyId, sk)
        .then((r: any) => { if (!cancelled) setAlreadyLiked(!!r.liked) })
        .catch(() => {})
    })
    return () => { cancelled = true }
  }, [storyId])

  const like = async () => {
    if (alreadyLiked || loading) return
    setLoading(true)
    try {
      const sk = await getSessionKey()
      await storiesApi.publicLike(storyId, sk)
      setLikeCount(c => c + 1)
      setAlreadyLiked(true)
    } catch {}
    setLoading(false)
  }

  return { likeCount, alreadyLiked, like, loading }
}

// ── useSave hook ──────────────────────────────────────────────────────────────
function useSave(storyId: string | null) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [studentId, setStudentId] = useState<string | null>(null)

  useEffect(() => {
    getSelectedStudentId().then(id => {
      setStudentId(id)
      if (!id || !storyId) return
      storiesApi.getSaveStatus(id, storyId)
        .then((r: any) => setSaved(!!r.saved))
        .catch(() => {})
    })
  }, [storyId])

  const toggle = async () => {
    if (!studentId || !storyId || saving) return
    setSaving(true)
    try {
      if (saved) {
        await storiesApi.unsaveStory(studentId, storyId)
        setSaved(false)
      } else {
        await storiesApi.saveStory(studentId, storyId)
        setSaved(true)
      }
    } catch {}
    setSaving(false)
  }

  return { saved, saving, toggle }
}

// ── BookCard ──────────────────────────────────────────────────────────────────
function BookCard({ book, onPress, selected }: { book: PublicBook; onPress: () => void; selected: boolean }) {
  const emoji = themeEmoji(book.theme)
  const { likeCount, alreadyLiked, like } = useLike(book.id, book.like_count)
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start()
    onPress()
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        style={[styles.bookCard, selected && styles.bookCardSelected]}
      >
        {/* Cover */}
        <View style={styles.coverWrap}>
          {book.cover_media_url ? (
            <Image source={{ uri: book.cover_media_url }} style={styles.coverImg} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Text style={styles.coverEmoji}>{emoji}</Text>
            </View>
          )}
          {/* Art style badge */}
          <View style={styles.artBadge}>
            <Text style={styles.artBadgeText}>{book.art_style || 'cartoon'}</Text>
          </View>
          {selected && <View style={styles.selectedOverlay} />}
        </View>

        {/* Info */}
        <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.bookCreator} numberOfLines={1}>by {book.creator_name}</Text>
        {book.created_at ? <Text style={styles.bookDate}>{formatDate(book.created_at)}</Text> : null}

        {/* Likes */}
        <TouchableOpacity
          style={styles.likeRow}
          onPress={e => { e.stopPropagation?.(); like() }}
          activeOpacity={0.75}
        >
          <Text style={[styles.likeHeart, alreadyLiked && styles.likeHeartActive]}>
            {alreadyLiked ? '♥' : '♡'}
          </Text>
          <Text style={styles.likeCount}>{likeCount}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  )
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ book, onClose }: { book: PublicBook | null; onClose: () => void }) {
  const { likeCount, alreadyLiked, like } = useLike(book?.id ?? '', book?.like_count ?? 0)
  const { saved, saving, toggle } = useSave(book?.id ?? null)
  const slideAnim = useRef(new Animated.Value(600)).current

  useEffect(() => {
    if (book) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 9 }).start()
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 260, useNativeDriver: true }).start()
    }
  }, [book])

  if (!book) return null

  const emoji = themeEmoji(book.theme)
  const initial = book.creator_name?.[0]?.toUpperCase() || 'R'

  const handleRead = () => {
    onClose()
    setTimeout(() => router.push(`/(app)/read/${book.id}` as any), 160)
  }

  return (
    <Modal visible={!!book} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.detailPanel, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={['#1a0f3a', '#0d0720']} style={styles.detailGrad}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Close */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 3D Cover */}
            <View style={styles.detailCoverWrap}>
              <View style={styles.detailBook}>
                <View style={styles.detailSpine} />
                {book.cover_media_url ? (
                  <Image source={{ uri: book.cover_media_url }} style={styles.detailCoverImg} resizeMode="cover" />
                ) : (
                  <View style={styles.detailCoverPlaceholder}>
                    <Text style={{ fontSize: 48 }}>{emoji}</Text>
                  </View>
                )}
                <View style={styles.detailPages} />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.detailTitle}>{book.title}</Text>

            {/* Creator */}
            <View style={styles.detailCreator}>
              <View style={styles.detailAvatar}>
                <Text style={styles.detailAvatarText}>{initial}</Text>
              </View>
              <Text style={styles.detailCreatorName}>by {book.creator_name}</Text>
            </View>

            {/* Like button */}
            <TouchableOpacity
              style={[styles.detailLikeBtn, alreadyLiked && styles.detailLikeBtnLiked]}
              onPress={like}
              disabled={alreadyLiked}
              activeOpacity={0.8}
            >
              <Text style={styles.detailLikeBtnText}>
                {alreadyLiked ? `♥ Liked! (${likeCount})` : `♡ Like this book (${likeCount})`}
              </Text>
            </TouchableOpacity>

            {/* Badges */}
            <View style={styles.detailBadges}>
              <View style={styles.detailBadge}><Text style={styles.detailBadgeText}>{emoji} {book.theme || 'Adventure'}</Text></View>
              <View style={styles.detailBadge}><Text style={styles.detailBadgeText}>📚 Grade {book.grade_level}</Text></View>
              <View style={styles.detailBadge}><Text style={styles.detailBadgeText}>🎨 {book.art_style || 'Cartoon'}</Text></View>
            </View>

            {/* CTAs */}
            <View style={styles.detailCTAs}>
              {saved ? (
                <>
                  <TouchableOpacity style={styles.btnRead} onPress={handleRead} activeOpacity={0.85}>
                    <LinearGradient colors={['#702AE1', '#9B59F5']} style={styles.btnGrad}>
                      <Text style={styles.btnText}>📖 Read Now →</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnOutline} onPress={toggle} disabled={saving} activeOpacity={0.8}>
                    <Text style={styles.btnOutlineText}>{saving ? '⏳ Removing…' : '✕ Remove from Library'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.btnRead} onPress={toggle} disabled={saving} activeOpacity={0.85}>
                  <LinearGradient colors={['#702AE1', '#9B59F5']} style={styles.btnGrad}>
                    <Text style={styles.btnText}>{saving ? '⏳ Saving…' : '📚 Add to Library'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.btnOutline} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.btnOutlineText}>Browse More Books</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </LinearGradient>
      </Animated.View>
    </Modal>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────
const LIMIT = 24

export default function CommunityScreen() {
  const [books, setBooks]           = useState<PublicBook[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter]         = useState('all')
  const [search, setSearch]         = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage]             = useState(0)
  const [selected, setSelected]     = useState<PublicBook | null>(null)

  const fetchBooks = useCallback(async (reset = false) => {
    reset ? setLoading(true) : setLoadingMore(true)
    try {
      const offset = reset ? 0 : page * LIMIT
      const res = await storiesApi.publicList({ limit: LIMIT, offset, search: search || undefined, type: filter !== 'all' ? filter : undefined })
      const data = res.data
      const sorted = Array.isArray(data.books)
        ? [...data.books].sort((a: PublicBook, b: PublicBook) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        : []

      if (reset) {
        setBooks(sorted)
        setPage(0)
        if (sorted.length > 0) setSelected(sorted[0])
      } else {
        setBooks(prev => [...prev, ...sorted])
      }
      setTotal(data.total ?? 0)
    } catch {}
    reset ? setLoading(false) : setLoadingMore(false)
  }, [filter, search, page])

  useEffect(() => { fetchBooks(true) }, [filter, search])

  const handleLoadMore = async () => {
    if (loadingMore || books.length >= total) return
    const nextPage = page + 1
    setPage(nextPage)
    setLoadingMore(true)
    try {
      const res = await storiesApi.publicList({
        limit: LIMIT, offset: nextPage * LIMIT,
        search: search || undefined,
        type: filter !== 'all' ? filter : undefined,
      })
      setBooks(prev => [...prev, ...(res.data.books ?? [])])
      setTotal(res.data.total ?? total)
    } catch {}
    setLoadingMore(false)
  }

  const numCols = 2
  const cardW = (SW - 48 - 12) / numCols

  return (
    <View style={styles.root}>
      {/* Ambient orb */}
      <View style={styles.orb1} pointerEvents="none" />
      <View style={styles.orb2} pointerEvents="none" />

      {/* Detail modal */}
      <DetailModal book={selected} onClose={() => setSelected(null)} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📚 Community Books</Text>
        <Text style={styles.headerSub}>Stories made by kids, for kids</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title or theme…"
          placeholderTextColor="#69537B"
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={() => setSearch(searchInput)}
          returnKeyType="search"
          autoCorrect={false}
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchInput(''); setSearch('') }}>
            <Text style={{ color: '#9B8AB4', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {FILTER_TYPES.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterPill, filter === f.value && styles.filterPillActive]}
            onPress={() => setFilter(f.value)}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterPillText, filter === f.value && styles.filterPillTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Total count */}
      <Text style={styles.totalCount}>{total} book{total !== 1 ? 's' : ''}</Text>

      {/* Book grid */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#702AE1" />
          <Text style={styles.loaderText}>Loading books…</Text>
        </View>
      ) : books.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyMsg}>No books found</Text>
          <Text style={styles.emptySub}>Try a different search or filter</Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={b => b.id}
          numColumns={numCols}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#702AE1" />
              </View>
            ) : books.length < total ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
                <Text style={styles.loadMoreText}>Show More Books</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={{ width: cardW, margin: 6 }}>
              <BookCard
                book={item}
                selected={selected?.id === item.id}
                onPress={() => setSelected(item)}
              />
            </View>
          )}
        />
      )}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0720' },
  orb1: { position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: '#702AE118' },
  orb2: { position: 'absolute', top: 300, left: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: '#EC489912' },

  // Header
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { color: '#F8F0FF', fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  headerSub:   { color: '#9B8AB4', fontSize: 13, marginTop: 2 },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1C1033', borderRadius: 14, marginHorizontal: 20,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#2E1B5A',
  },
  searchIcon:  { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: '#F8F0FF', fontSize: 14 },

  // Filters
  filterScroll:     { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  filterPill:       { backgroundColor: '#1C1033', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#2E1B5A' },
  filterPillActive: { backgroundColor: '#702AE1', borderColor: '#702AE1' },
  filterPillText:       { color: '#9B8AB4', fontSize: 13, fontWeight: '600' },
  filterPillTextActive: { color: '#fff' },

  totalCount: { color: '#69537B', fontSize: 12, paddingHorizontal: 20, marginBottom: 4 },

  // Grid
  grid: { paddingHorizontal: 14, paddingBottom: 120 },
  row: { justifyContent: 'space-between' },

  // Book card
  bookCard: {
    backgroundColor: '#1C1033', borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: '#2E1B5A',
  },
  bookCardSelected: { borderColor: '#702AE1' },
  coverWrap: { position: 'relative', aspectRatio: 0.75, backgroundColor: '#2E1B5A' },
  coverImg: { width: '100%', height: '100%' },
  coverPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  coverEmoji: { fontSize: 40 },
  artBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(13,7,32,0.75)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  artBadgeText: { color: '#C4A8F5', fontSize: 9, fontWeight: '700' },
  selectedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(112,42,225,0.15)', borderWidth: 2, borderColor: '#702AE1' },
  bookTitle:   { color: '#F8F0FF', fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingTop: 8, lineHeight: 17 },
  bookCreator: { color: '#9B8AB4', fontSize: 10, paddingHorizontal: 10, marginTop: 2 },
  bookDate:    { color: '#69537B', fontSize: 9,  paddingHorizontal: 10, marginTop: 1 },
  likeRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, gap: 4 },
  likeHeart:      { fontSize: 14, color: '#9B8AB4' },
  likeHeartActive: { color: '#EC4899' },
  likeCount:   { color: '#9B8AB4', fontSize: 11 },

  // States
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { color: '#9B8AB4', fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyMsg:  { color: '#F8F0FF', fontSize: 18, fontWeight: '700' },
  emptySub:  { color: '#9B8AB4', fontSize: 14 },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  loadMoreBtn:  { margin: 16, backgroundColor: '#1C1033', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#702AE1' },
  loadMoreText: { color: '#C4A8F5', fontWeight: '700', fontSize: 14 },

  // Detail modal
  backdrop:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,3,18,0.72)' },
  detailPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '90%', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
  detailGrad:  { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: 1, borderColor: 'rgba(203,151,255,0.18)', paddingHorizontal: 20, paddingTop: 12 },
  handle:      { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(203,151,255,0.3)', marginBottom: 10 },
  closeBtn:    { position: 'absolute', top: 16, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(130,80,255,0.18)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  closeBtnText: { color: '#c9b8ff', fontSize: 16, fontWeight: '700' },

  // 3D book
  detailCoverWrap: { alignItems: 'center', marginVertical: 20 },
  detailBook:  { width: 150, height: 200, position: 'relative', borderRadius: 8, overflow: 'hidden', shadowColor: '#702AE1', shadowOffset: { width: 4, height: 8 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 12 },
  detailSpine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 12, backgroundColor: '#3a1a6e', zIndex: 2 },
  detailCoverImg: { width: '100%', height: '100%' },
  detailCoverPlaceholder: { width: '100%', height: '100%', backgroundColor: '#1C1033', alignItems: 'center', justifyContent: 'center' },
  detailPages: { position: 'absolute', right: -3, top: 3, bottom: 3, width: 6, backgroundColor: '#e8dfc0', borderRadius: 2 },

  // Detail info
  detailTitle: { color: '#F8F0FF', fontSize: 22, fontWeight: '800', textAlign: 'center', lineHeight: 28, marginBottom: 10 },
  detailCreator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 },
  detailAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#702AE1', alignItems: 'center', justifyContent: 'center' },
  detailAvatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  detailCreatorName: { color: '#9B8AB4', fontSize: 14 },

  detailLikeBtn: { backgroundColor: '#1C1033', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#2E1B5A' },
  detailLikeBtnLiked: { borderColor: '#EC4899' },
  detailLikeBtnText: { color: '#C4A8F5', fontWeight: '700', fontSize: 14 },

  detailBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, justifyContent: 'center' },
  detailBadge: { backgroundColor: '#1C1033', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#2E1B5A' },
  detailBadgeText: { color: '#C4A8F5', fontSize: 12, fontWeight: '600' },

  detailCTAs: { gap: 10, marginBottom: 8 },
  btnRead: { borderRadius: 14, overflow: 'hidden' },
  btnGrad: { paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnOutline: { backgroundColor: '#1C1033', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2E1B5A' },
  btnOutlineText: { color: '#9B8AB4', fontWeight: '700', fontSize: 14 },
})
