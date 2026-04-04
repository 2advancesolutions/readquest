/**
 * app/(auth)/landing.tsx — Mobile Landing Page (Night-Bloom)
 * Clean, mobile-first redesign with proper constraints and visual hierarchy.
 */
import { useRef, useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Animated,
  Dimensions, StyleSheet, Image, ActivityIndicator,
  NativeScrollEvent, NativeSyntheticEvent, Platform, StatusBar,
} from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { CHAR_ICONS, QUICK_CARDS } from '../../src/data/characterAssets'

const API_BASE  = process.env.EXPO_PUBLIC_API_URL ?? ''
const { width: SW } = Dimensions.get('window')
const MAX_W = Math.min(SW, 480) // cap content width for tablets / wide phones

// ── Data ─────────────────────────────────────────────────────────────────────

const PREVIEW_CHARS = [
  { name: 'Sparkle',       key: 'princess_pearl'  },
  { name: 'Leo the Lion',  key: 'lion'             },
  { name: 'Nova Pulse',    key: 'nova_pulse'       },
  { name: 'Princess Kira', key: 'knight_girl'      },
  { name: 'Marina',        key: 'princess_coral'   },
  { name: 'Jade Dragon',   key: 'princess_jade'    },
  { name: 'Merlin',        key: 'merlin'           },
  { name: 'Shadow Fox',    key: 'fox'              },
] as const

const PREVIEW_THEMES = [
  { emoji: '🚀', label: 'Space'    },
  { emoji: '🌲', label: 'Forest'   },
  { emoji: '🌊', label: 'Ocean'    },
  { emoji: '🏰', label: 'Castle'   },
  { emoji: '🦕', label: 'Dino'     },
  { emoji: '🦸', label: 'Hero'     },
  { emoji: '🏴‍☠️', label: 'Pirates' },
  { emoji: '🤖', label: 'Robots'   },
  { emoji: '🍭', label: 'Candy'    },
]

const FEATURES = [
  { icon: '📖', title: 'Story Creator',      desc: 'AI personalized stories where your child is the hero.',   color: '#A855F7', bg: '#702AE115' },
  { icon: '🎬', title: 'Movie Studio',       desc: 'Transform stories into animated films with AI art.',      color: '#EC4899', bg: '#EC489915' },
  { icon: '🎮', title: 'Edu Games',          desc: 'Fun mini-games that build core literacy skills.',        color: '#FBBF24', bg: '#FBBF2415' },
  { icon: '🔤', title: 'Spelling Arena',     desc: 'Adaptive vocab that grows with your child.',             color: '#38BDF8', bg: '#38BDF815' },
  { icon: '🧠', title: 'Smart Exams',        desc: 'Comprehension quizzes woven into every story.',          color: '#10B981', bg: '#10B98115' },
  { icon: '🏆', title: 'Leaderboard',        desc: 'Safe, family rankings celebrate reading wins.',          color: '#A78BFA', bg: '#A78BFA15' },
]

const STATS = [
  { value: '50K+', label: 'Stories',    icon: '📚' },
  { value: '97%',  label: 'Satisfied',  icon: '⭐' },
  { value: '10',   label: 'Languages',  icon: '🌍' },
  { value: '1M+',  label: 'Words Read', icon: '🎯' },
]

// ── Live Book Showcase ────────────────────────────────────────────────────────
interface ShowcaseBook {
  id: string; title: string; grade_level: number
  cover_media_url: string | null; art_style: string
  creator_name: string; view_count: number; like_count: number
}

function LiveBookShowcase() {
  const [books, setBooks]   = useState<ShowcaseBook[]>([])
  const [current, setCurrent] = useState<ShowcaseBook | null>(null)
  const [loading, setLoading] = useState(true)
  const fadeAnim  = useRef(new Animated.Value(1)).current
  const scaleAnim = useRef(new Animated.Value(1)).current
  const booksRef  = useRef<ShowcaseBook[]>([])
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/stories/showcase?limit=50`)
      .then(r => r.json())
      .then((data: { books: ShowcaseBook[] }) => {
        if (!data.books?.length) return
        const shuffled = [...data.books].sort(() => Math.random() - 0.5)
        booksRef.current = shuffled
        setBooks(shuffled)
        setCurrent(shuffled[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const next = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0,    duration: 250, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.9,  duration: 250, useNativeDriver: true }),
    ]).start(() => {
      booksRef.current = [...booksRef.current.slice(1), booksRef.current[0]]
      setBooks([...booksRef.current])
      setCurrent(booksRef.current[0])
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start()
    })
  }, [fadeAnim, scaleAnim])

  useEffect(() => {
    if (books.length === 0) return
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(next, 5000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [books.length, next])

  if (loading) return (
    <View style={bs.loadBox}>
      <ActivityIndicator color="#702AE1" />
      <Text style={bs.loadTxt}>Loading books…</Text>
    </View>
  )
  if (!current) return null

  return (
    <View style={bs.wrap}>
      <View style={bs.pill}>
        <Text style={bs.pillTxt}>📚 Live Book Showcase</Text>
      </View>
      <Text style={bs.heading}>Real Books by <Text style={bs.accent}>Real Kids</Text></Text>
      <Text style={bs.sub}>AI stories created by ReadQuest families</Text>

      <Animated.View style={[bs.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {/* ambient glow */}
        <View style={bs.cardGlow} />
        {/* Book mockup */}
        <View style={bs.bookWrap}>
          <View style={bs.book}>
            <LinearGradient colors={['#4C1D95', '#1C1033']} style={bs.spine} />
            {current.cover_media_url ? (
              <Image source={{ uri: current.cover_media_url }} style={bs.cover} resizeMode="cover" />
            ) : (
              <LinearGradient colors={['#702AE1', '#EC4899']} style={bs.coverFallback}>
                <Text style={{ fontSize: 36 }}>📖</Text>
              </LinearGradient>
            )}
            <View style={bs.pages} />
          </View>
          <View style={bs.shadow} />
        </View>
        {/* Info */}
        <View style={bs.info}>
          <Text style={bs.bookTitle} numberOfLines={2}>{current.title}</Text>
          <Text style={bs.bookMeta}>by {current.creator_name} · Grade {current.grade_level}</Text>
          <View style={bs.badge}>
            <Text style={bs.badgeTxt}>🎨 {current.art_style}</Text>
          </View>
          <View style={bs.row}>
            <Text style={bs.chip}>👁 {current.view_count}</Text>
            <Text style={bs.chip}>❤️ {current.like_count}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Dot indicators */}
      {books.length > 1 && (
        <View style={bs.dots}>
          {books.slice(0, 7).map((_, i) => (
            <View key={i} style={[bs.dot, i === 0 && bs.dotOn]} />
          ))}
        </View>
      )}

      <TouchableOpacity onPress={() => router.push('/(auth)/signup')} activeOpacity={0.85}>
        <LinearGradient colors={['#702AE115', '#EC489915']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={bs.browseBtn}>
          <Text style={bs.browseTxt}>📚 Browse All Kid Books →</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )
}

const bs = StyleSheet.create({
  loadBox:     { alignItems: 'center', padding: 32, gap: 8 },
  loadTxt:     { color: '#9B8AB4', fontSize: 13 },
  wrap:        { paddingHorizontal: 20, paddingBottom: 24 },
  pill:        { alignSelf: 'flex-start', backgroundColor: '#702AE118', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#702AE135', marginBottom: 10 },
  pillTxt:     { color: '#C4A8F5', fontSize: 12, fontWeight: '600' },
  heading:     { color: '#F8F0FF', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  accent:      { color: '#A855F7' },
  sub:         { color: '#9B8AB4', fontSize: 13, marginBottom: 16 },
  card:        { backgroundColor: '#1A0D38', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#702AE125', flexDirection: 'row', gap: 14, overflow: 'hidden', position: 'relative', minHeight: 148 },
  cardGlow:    { position: 'absolute', top: -30, left: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: '#702AE118' },
  bookWrap:    { alignItems: 'center', flexShrink: 0 },
  book:        { width: 84, height: 116, borderRadius: 3, overflow: 'hidden', flexDirection: 'row', elevation: 10, shadowColor: '#000', shadowOffset: { width: 3, height: 6 }, shadowOpacity: 0.5, shadowRadius: 10 },
  spine:       { width: 9, height: '100%' },
  cover:       { flex: 1, height: '100%' },
  coverFallback: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
  pages:       { width: 5, backgroundColor: '#E8DCC8', opacity: 0.35 },
  shadow:      { width: 60, height: 10, backgroundColor: '#000', borderRadius: 5, opacity: 0.25, marginTop: 5, alignSelf: 'center' },
  info:        { flex: 1, justifyContent: 'center', gap: 6 },
  bookTitle:   { color: '#F8F0FF', fontSize: 16, fontWeight: '800', lineHeight: 22 },
  bookMeta:    { color: '#9B8AB4', fontSize: 12 },
  badge:       { alignSelf: 'flex-start', backgroundColor: '#702AE118', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#702AE130' },
  badgeTxt:    { color: '#C4A8F5', fontSize: 11, fontWeight: '600' },
  row:         { flexDirection: 'row', gap: 10 },
  chip:        { color: '#6B5A8A', fontSize: 12 },
  dots:        { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 12, marginBottom: 14 },
  dot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2E1B5A' },
  dotOn:       { width: 16, backgroundColor: '#702AE1' },
  browseBtn:   { borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: '#702AE130' },
  browseTxt:   { color: '#C4A8F5', fontWeight: '700', fontSize: 13 },
})

// ── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ item, index }: { item: typeof FEATURES[0]; index: number }) {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 400, delay: index * 60, useNativeDriver: true }).start()
  }, [])
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
      <View style={[fc.card, { borderLeftColor: item.color }]}>
        <View style={[fc.iconBox, { backgroundColor: item.bg }]}>
          <Text style={fc.icon}>{item.icon}</Text>
        </View>
        <View style={fc.text}>
          <Text style={[fc.title, { color: item.color }]}>{item.title}</Text>
          <Text style={fc.desc}>{item.desc}</Text>
        </View>
      </View>
    </Animated.View>
  )
}

const fc = StyleSheet.create({
  card:    { flexDirection: 'row', backgroundColor: '#160C30', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2E1B5A', borderLeftWidth: 3, alignItems: 'center', gap: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon:    { fontSize: 22 },
  text:    { flex: 1 },
  title:   { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  desc:    { color: '#9B8AB4', fontSize: 12, lineHeight: 18 },
})

// ── Character Cell ────────────────────────────────────────────────────────────
function CharCell({ name, imgKey, selected }: { name: string; imgKey: keyof typeof CHAR_ICONS; selected?: boolean }) {
  return (
    <View style={[cc.wrap, selected && cc.wrapSel]}>
      <View style={[cc.circle, selected && cc.circleSel]}>
        <Image source={CHAR_ICONS[imgKey]} style={cc.img} resizeMode="cover" />
      </View>
      <Text style={[cc.name, selected && cc.nameSel]} numberOfLines={1}>{name}</Text>
      {selected && <View style={cc.dot} />}
    </View>
  )
}

const CELL_W = (MAX_W - 40 - 24) / 4   // 4 columns with padding + gaps

const cc = StyleSheet.create({
  wrap:      { width: CELL_W, alignItems: 'center', paddingVertical: 6, borderRadius: 12 },
  wrapSel:   { backgroundColor: '#702AE115' },
  circle:    { width: 52, height: 52, borderRadius: 26, overflow: 'hidden', backgroundColor: '#2E1B5A', borderWidth: 2, borderColor: '#2E1B5A', marginBottom: 4 },
  circleSel: { borderColor: '#702AE1' },
  img:       { width: '100%', height: '100%' },
  name:      { color: '#6B5A8A', fontSize: 9, textAlign: 'center', maxWidth: 52 },
  nameSel:   { color: '#C4A8F5', fontWeight: '600' },
  dot:       { width: 5, height: 5, borderRadius: 3, backgroundColor: '#702AE1', marginTop: 2 },
})

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function LandingScreen() {
  const heroAnim   = useRef(new Animated.Value(0)).current
  const badgeAnim  = useRef(new Animated.Value(0)).current
  const pulseAnim  = useRef(new Animated.Value(1)).current
  const navBgAnim  = useRef(new Animated.Value(0)).current
  const [menuOpen, setMenuOpen]     = useState(false)
  const [menuAnim]                  = useState(new Animated.Value(0))
  const [selectedChar, setSelectedChar] = useState(3)

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(badgeAnim, { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }),
    ]).start()
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.00, duration: 900, useNativeDriver: true }),
    ])).start()
  }, [])

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    Animated.timing(navBgAnim, {
      toValue: e.nativeEvent.contentOffset.y > 20 ? 1 : 0,
      duration: 200, useNativeDriver: false,
    }).start()
  }, [navBgAnim])

  const toggleMenu = useCallback(() => {
    const open = !menuOpen
    setMenuOpen(open)
    Animated.timing(menuAnim, { toValue: open ? 1 : 0, duration: 220, useNativeDriver: false }).start()
  }, [menuOpen, menuAnim])

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    Animated.timing(menuAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start()
  }, [menuAnim])

  const navBg      = navBgAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(13,7,32,0)', 'rgba(13,7,32,0.95)'] })
  const menuHeight = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 260] })
  const charData   = PREVIEW_CHARS[selectedChar]

  const PAD_TOP = Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 12

  return (
    <View style={s.root}>
      {/* ── Ambient orbs ── */}
      <View style={[s.orb, { width: 280, height: 280, top: -100, left: -100, backgroundColor: '#702AE130' }]} />
      <View style={[s.orb, { width: 200, height: 200, top: 300,  right: -80, backgroundColor: '#EC489922' }]} />
      <View style={[s.orb, { width: 160, height: 160, top: 600,  left: -50, backgroundColor: '#38BDF818' }]} />

      {/* ════════════════ NAV ════════════════ */}
      <Animated.View style={[s.nav, { backgroundColor: navBg, paddingTop: PAD_TOP }]}>
        <View style={s.navRow}>
          <View style={s.navLogo}>
            <Text style={s.logoIcon}>✨</Text>
            <Text style={s.logoText}>ReadQuest</Text>
          </View>
          <View style={s.navRight}>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={s.navGhost} activeOpacity={0.8}>
              <Text style={s.navGhostTxt}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')} activeOpacity={0.88}>
              <LinearGradient colors={['#702AE1', '#9B59F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.navPrimary}>
                <Text style={s.navPrimaryTxt}>Start Free →</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleMenu} style={s.burger} activeOpacity={0.7}>
              <View style={s.burgerLine} />
              <View style={[s.burgerLine, menuOpen && { opacity: 0 }]} />
              <View style={s.burgerLine} />
            </TouchableOpacity>
          </View>
        </View>
        {/* Mobile dropdown */}
        <Animated.View style={{ maxHeight: menuHeight, overflow: 'hidden' }}>
          <View style={s.dropdown}>
            {[
              { emoji: '✨', label: 'Features'     },
              { emoji: '🪄', label: 'How It Works'  },
              { emoji: '💰', label: 'Pricing'       },
              { emoji: '📚', label: 'Book Library'  },
            ].map(item => (
              <TouchableOpacity key={item.label} style={s.dropItem} onPress={closeMenu}>
                <Text style={s.dropItemTxt}>{item.emoji}  {item.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={s.dropDivider} />
            <TouchableOpacity onPress={() => { closeMenu(); router.push('/(auth)/signup') }} activeOpacity={0.88}>
              <LinearGradient colors={['#702AE1', '#9B59F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.dropSignup}>
                <Text style={s.dropSignupTxt}>Start Free →</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { closeMenu(); router.push('/(auth)/login') }} style={s.dropSignin}>
              <Text style={s.dropSigninTxt}>Sign In →</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>

      {/* ════════════════ SCROLL CONTENT ════════════════ */}
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: PAD_TOP + 64 }]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View style={s.inner}>

          {/* ── HERO ─────────────────────────────────────── */}
          <View style={s.hero}>
            <Animated.View style={[s.heroBadge, { opacity: badgeAnim, transform: [{ translateY: badgeAnim.interpolate({ inputRange: [0,1], outputRange:[-8,0] }) }] }]}>
              <LinearGradient colors={['#702AE135','#EC489935']} start={{ x:0, y:0 }} end={{ x:1, y:0 }} style={s.heroBadgeGrad}>
                <Text style={s.heroBadgeTxt}>🚀 AI-Powered Reading</Text>
              </LinearGradient>
            </Animated.View>

            <Animated.View style={{ opacity: heroAnim, transform: [{ translateY: heroAnim.interpolate({ inputRange:[0,1], outputRange:[24,0] }) }] }}>
              <Text style={s.headline}>Where Stories{'\n'}<Text style={s.gradTxt}>Come Alive</Text></Text>
              <Text style={s.heroSub}>Personalized AI adventures for every child — pick a character, choose a theme, and watch the magic begin.</Text>
            </Animated.View>

            <Animated.View style={[s.ctaRow, { opacity: heroAnim }]}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }], flex: 1 }}>
                <TouchableOpacity onPress={() => router.push('/(auth)/signup')} activeOpacity={0.88}>
                  <LinearGradient colors={['#F59E0B','#EF4444']} start={{ x:0, y:0 }} end={{ x:1, y:0 }} style={s.btnGold}>
                    <Text style={s.btnGoldTxt}>Create a Story →</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={s.btnGhost} activeOpacity={0.8}>
                <Text style={s.btnGhostTxt}>Sign In</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* ── LIVE BOOK SHOWCASE ───────────────────────── */}
          <LiveBookShowcase />

          {/* ── QUICK LAUNCH ─────────────────────────────── */}
          <View style={s.section}>
            <View style={s.sectionPill}><Text style={s.sectionPillTxt}>✨ Start Creating</Text></View>
            <Text style={s.sectionTitle}>What Will You <Text style={s.gradTxt}>Create?</Text></Text>
            <View style={s.cards3}>
              {/* Big card */}
              <TouchableOpacity style={[s.card3, s.card3Big]} onPress={() => router.push('/(auth)/signup')} activeOpacity={0.85}>
                <Image source={QUICK_CARDS.story} style={s.card3Img} resizeMode="cover" />
                <LinearGradient colors={['transparent','#0D0720EE']} style={s.card3Over}>
                  <Text style={s.card3Label}>📖 Story Creator</Text>
                </LinearGradient>
              </TouchableOpacity>
              {/* 2 small cards */}
              <View style={s.card3Col}>
                <TouchableOpacity style={[s.card3, s.card3Sm]} onPress={() => router.push('/(auth)/signup')} activeOpacity={0.85}>
                  <Image source={QUICK_CARDS.character} style={s.card3Img} resizeMode="cover" />
                  <LinearGradient colors={['transparent','#0D0720EE']} style={s.card3Over}>
                    <Text style={s.card3LabelSm}>🎭 Characters</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={[s.card3, s.card3Sm]} onPress={() => router.push('/(auth)/signup')} activeOpacity={0.85}>
                  <Image source={QUICK_CARDS.movie} style={s.card3Img} resizeMode="cover" />
                  <LinearGradient colors={['transparent','#0D0720EE']} style={s.card3Over}>
                    <Text style={s.card3LabelSm}>🎬 Movie Studio</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── HOW IT WORKS ─────────────────────────────── */}
          <View style={s.section}>
            <View style={s.sectionPill}><Text style={s.sectionPillTxt}>🪄 How It Works</Text></View>
            <Text style={s.sectionTitle}>3 Simple Steps to <Text style={s.gradTxt}>Magic</Text></Text>

            {/* Step 1 — character picker */}
            <View style={s.stepCard}>
              <View style={s.stepHead}>
                <LinearGradient colors={['#702AE1','#EC4899']} style={s.stepNum}>
                  <Text style={s.stepNumTxt}>01</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={s.stepTitle}>Pick Your Hero</Text>
                  <Text style={s.stepSub}>Choose from 80+ beloved characters.</Text>
                </View>
              </View>
              <View style={s.charGrid}>
                {PREVIEW_CHARS.map((c, i) => (
                  <TouchableOpacity key={c.key} onPress={() => setSelectedChar(i)} activeOpacity={0.8}>
                    <CharCell name={c.name} imgKey={c.key} selected={selectedChar === i} />
                  </TouchableOpacity>
                ))}
              </View>
              {charData && (
                <LinearGradient colors={['#1C1033','#2A1550']} style={s.charShowcase}>
                  <Image source={CHAR_ICONS[charData.key]} style={s.showcaseImg} resizeMode="contain" />
                  <View style={{ flex: 1, paddingVertical: 12, paddingRight: 14 }}>
                    <Text style={s.showcaseTag}>✓ Selected Hero</Text>
                    <Text style={s.showcaseName}>{charData.name}</Text>
                    <LinearGradient colors={['#702AE1','#9B59F5']} style={s.showcaseBtn}>
                      <Text style={s.showcaseBtnTxt}>Use This Hero →</Text>
                    </LinearGradient>
                  </View>
                </LinearGradient>
              )}
            </View>

            {/* Step 2 — themes */}
            <View style={[s.stepCard, { marginTop: 12 }]}>
              <View style={s.stepHead}>
                <LinearGradient colors={['#702AE1','#EC4899']} style={s.stepNum}>
                  <Text style={s.stepNumTxt}>02</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={s.stepTitle}>Choose a Theme</Text>
                  <Text style={s.stepSub}>20+ adventure worlds to explore.</Text>
                </View>
              </View>
              <View style={s.themeGrid}>
                {PREVIEW_THEMES.map((t, i) => (
                  <View key={t.label} style={[s.themeCard, i === 1 && s.themeCardSel]}>
                    {i === 1 && <View style={s.themeCheck}><Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>✓</Text></View>}
                    <Text style={s.themeEmoji}>{t.emoji}</Text>
                    <Text style={[s.themeLabel, i === 1 && s.themeLabelSel]} numberOfLines={1}>{t.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Step 3 — reader preview */}
            <View style={[s.stepCard, { marginTop: 12 }]}>
              <View style={s.stepHead}>
                <LinearGradient colors={['#702AE1','#EC4899']} style={s.stepNum}>
                  <Text style={s.stepNumTxt}>03</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={s.stepTitle}>Start Reading</Text>
                  <Text style={s.stepSub}>AI voices, art & quizzes all built in.</Text>
                </View>
              </View>
              <View style={s.reader}>
                <View style={s.readerImgCol}>
                  <Image source={CHAR_ICONS.nova_pulse} style={s.readerImg} resizeMode="contain" />
                  <LinearGradient colors={['transparent','#0D0720']} style={s.readerFade} />
                  <View style={s.readerScene}><Text style={s.readerSceneTxt}>🚀 Outer Space</Text></View>
                </View>
                <View style={s.readerTxt}>
                  <Text style={s.readerPage}>Page 1 of 5</Text>
                  <Text style={[s.rLine, s.rLineHi]}>Nova zoomed through the stars,</Text>
                  <Text style={s.rLine}>blazing trails across the galaxy.</Text>
                  <Text style={[s.rLine, s.rLineNext]}>"To the edge of discovery!"</Text>
                  <View style={s.readerMic}>
                    <Text style={{ fontSize: 13 }}>🎤</Text>
                    <Text style={s.readerMicTxt}>Listening…</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* ── FEATURES ─────────────────────────────────── */}
          <View style={s.section}>
            <View style={s.sectionPill}><Text style={s.sectionPillTxt}>✨ Everything Kids Need</Text></View>
            <Text style={s.sectionTitle}>One Platform.{'\n'}<Text style={s.gradTxt}>Endless Adventures.</Text></Text>
            <Text style={s.sectionSub}>Six powerful features that make reading the best part of every day.</Text>
            {FEATURES.map((f, i) => <FeatureCard key={f.title} item={f} index={i} />)}
          </View>

          {/* ── STATS ────────────────────────────────────── */}
          <View style={s.section}>
            <View style={s.sectionPill}><Text style={s.sectionPillTxt}>📊 By the Numbers</Text></View>
            <View style={s.statsGrid}>
              {STATS.map(st => (
                <View key={st.label} style={s.statCard}>
                  <Text style={s.statIcon}>{st.icon}</Text>
                  <Text style={s.statVal}>{st.value}</Text>
                  <Text style={s.statLbl}>{st.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── FINAL CTA ────────────────────────────────── */}
          <View style={s.cta}>
            <LinearGradient colors={['#702AE118','#EC489918']} style={s.ctaGrad}>
              <Text style={s.ctaTitle}>Ready to Begin?</Text>
              <Text style={s.ctaSub}>Join thousands of families — free to start.</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')} activeOpacity={0.88}>
                <LinearGradient colors={['#702AE1','#9B59F5']} style={s.ctaBtn}>
                  <Text style={s.ctaBtnTxt}>Get Started Free →</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={{ marginTop: 14 }}>
                <Text style={s.ctaSignin}>Already have an account? <Text style={{ color: '#A855F7', fontWeight: '700' }}>Sign In</Text></Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  )
}

// ── Global Styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0720' },
  orb:  { position: 'absolute', borderRadius: 9999, opacity: 0.5 },

  // Nav
  nav:       { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  navRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 10 },
  navLogo:   { flexDirection: 'row', alignItems: 'center', gap: 7 },
  logoIcon:  { fontSize: 19 },
  logoText:  { color: '#F8F0FF', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  navRight:  { flexDirection: 'row', alignItems: 'center', gap: 7 },
  navGhost:  { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#702AE155' },
  navGhostTxt: { color: '#C4A8F5', fontWeight: '600', fontSize: 12 },
  navPrimary:  { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  navPrimaryTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
  burger:    { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', gap: 5, marginLeft: 2 },
  burgerLine: { width: 18, height: 2, backgroundColor: '#C4A8F5', borderRadius: 2 },
  dropdown:  { backgroundColor: '#130B2E', borderTopWidth: 1, borderTopColor: '#2E1B5A', paddingHorizontal: 18, paddingVertical: 10, gap: 2 },
  dropItem:  { paddingVertical: 11, paddingHorizontal: 6, borderRadius: 10 },
  dropItemTxt: { color: '#C4A8F5', fontSize: 15, fontWeight: '600' },
  dropDivider: { height: 1, backgroundColor: '#2E1B5A', marginVertical: 6 },
  dropSignup:  { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  dropSignupTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  dropSignin:  { alignItems: 'center', paddingVertical: 10 },
  dropSigninTxt: { color: '#9B8AB4', fontSize: 13, fontWeight: '600' },

  // Scroll
  scroll: { alignItems: 'center' },
  inner:  { width: '100%', maxWidth: MAX_W, paddingHorizontal: 20 },

  // Hero
  hero:         { alignItems: 'center', paddingBottom: 32, paddingTop: 8 },
  heroBadge:    { marginBottom: 18, borderRadius: 50, overflow: 'hidden' },
  heroBadgeGrad:{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, borderWidth: 1, borderColor: '#702AE135' },
  heroBadgeTxt: { color: '#D2BBFF', fontSize: 13, fontWeight: '600' },
  headline:     { color: '#F8F0FF', fontSize: 36, fontWeight: '800', textAlign: 'center', lineHeight: 44, letterSpacing: -0.5, marginBottom: 14 },
  gradTxt:      { color: '#A855F7' },
  heroSub:      { color: '#9B8AB4', fontSize: 15, textAlign: 'center', lineHeight: 23, marginBottom: 26, paddingHorizontal: 4 },
  ctaRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  btnGold:      { borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 7 },
  btnGoldTxt:   { color: '#1A0A2E', fontWeight: '800', fontSize: 16 },
  btnGhost:     { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, borderWidth: 1.5, borderColor: '#702AE1' },
  btnGhostTxt:  { color: '#C4A8F5', fontWeight: '700', fontSize: 15 },

  // Sections
  section:      { paddingBottom: 32 },
  sectionPill:  { alignSelf: 'flex-start', backgroundColor: '#702AE112', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12, borderWidth: 1, borderColor: '#702AE130' },
  sectionPillTxt: { color: '#C4A8F5', fontSize: 12, fontWeight: '600' },
  sectionTitle: { color: '#F8F0FF', fontSize: 26, fontWeight: '800', lineHeight: 34, marginBottom: 8 },
  sectionSub:   { color: '#9B8AB4', fontSize: 13, lineHeight: 20, marginBottom: 20 },

  // Quick launch cards
  cards3:     { flexDirection: 'row', gap: 10, height: 210 },
  card3:      { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#2E1B5A' },
  card3Big:   { flex: 1.15 },
  card3Col:   { flex: 0.85, gap: 10 },
  card3Sm:    { flex: 1 },
  card3Img:   { width: '100%', height: '100%' },
  card3Over:  { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 10, paddingHorizontal: 10 },
  card3Label: { color: '#F8F0FF', fontWeight: '700', fontSize: 13 },
  card3LabelSm: { color: '#F8F0FF', fontWeight: '700', fontSize: 11 },

  // Steps
  stepCard:   { backgroundColor: '#160C30', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2E1B5A' },
  stepHead:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  stepNum:    { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  stepTitle:  { color: '#F8F0FF', fontWeight: '700', fontSize: 15, marginBottom: 3 },
  stepSub:    { color: '#9B8AB4', fontSize: 13, lineHeight: 19 },

  // Character grid
  charGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  charShowcase:   { flexDirection: 'row', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#702AE125', alignItems: 'center' },
  showcaseImg:    { width: 80, height: 100 },
  showcaseTag:    { color: '#702AE1', fontSize: 10, fontWeight: '600', marginBottom: 3 },
  showcaseName:   { color: '#F8F0FF', fontWeight: '800', fontSize: 16, marginBottom: 10 },
  showcaseBtn:    { borderRadius: 9, paddingVertical: 7, paddingHorizontal: 10, alignItems: 'center' },
  showcaseBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // Theme grid
  themeGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  themeCard:      { backgroundColor: '#130B2E', borderRadius: 10, padding: 9, alignItems: 'center', width: (MAX_W - 40 - 14) / 3, borderWidth: 1, borderColor: '#2E1B5A', position: 'relative' },
  themeCardSel:   { borderColor: '#702AE1', backgroundColor: '#702AE115' },
  themeCheck:     { position: 'absolute', top: 5, right: 5, width: 14, height: 14, borderRadius: 7, backgroundColor: '#702AE1', alignItems: 'center', justifyContent: 'center' },
  themeEmoji:     { fontSize: 20, marginBottom: 4 },
  themeLabel:     { color: '#9B8AB4', fontSize: 9, textAlign: 'center' },
  themeLabelSel:  { color: '#C4A8F5', fontWeight: '600' },

  // Reader
  reader:         { flexDirection: 'row', gap: 10, backgroundColor: '#130B2E', borderRadius: 12, overflow: 'hidden' },
  readerImgCol:   { width: 90, position: 'relative' },
  readerImg:      { width: 90, height: 128 },
  readerFade:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 36 },
  readerScene:    { position: 'absolute', bottom: 6, left: 0, right: 0, alignItems: 'center' },
  readerSceneTxt: { color: '#C4A8F5', fontSize: 9, fontWeight: '600' },
  readerTxt:      { flex: 1, paddingVertical: 12, paddingRight: 12 },
  readerPage:     { color: '#702AE1', fontSize: 10, fontWeight: '600', marginBottom: 8 },
  rLine:          { color: '#D2BBFF', fontSize: 12, lineHeight: 18 },
  rLineHi:        { color: '#F8F0FF', fontWeight: '600' },
  rLineNext:      { color: '#6B5A8A' },
  readerMic:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#2E1B5A' },
  readerMicTxt:   { color: '#702AE1', fontSize: 11, fontWeight: '600' },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard:  { backgroundColor: '#160C30', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2E1B5A', width: (MAX_W - 40 - 10) / 2, flex: 1 },
  statIcon:  { fontSize: 22, marginBottom: 6 },
  statVal:   { color: '#F8F0FF', fontWeight: '800', fontSize: 20, marginBottom: 2 },
  statLbl:   { color: '#9B8AB4', fontSize: 12 },

  // Final CTA
  cta:       { borderRadius: 24, overflow: 'hidden', marginBottom: 8 },
  ctaGrad:   { padding: 28, alignItems: 'center', borderRadius: 24, borderWidth: 1, borderColor: '#702AE140' },
  ctaTitle:  { color: '#F8F0FF', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  ctaSub:    { color: '#9B8AB4', fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 22 },
  ctaBtn:    { borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center', shadowColor: '#702AE1', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 7 },
  ctaBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  ctaSignin: { color: '#9B8AB4', fontSize: 14 },
})
