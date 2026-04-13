/**
 * Games Arcade — React Native (Phase 4)
 *
 * Conversions:
 * - motion.div          → Animated + TouchableOpacity
 * - localStorage        → AsyncStorage (via storage lib)
 * - navigate('/games/X')→ router.push
 * - CSS grid 3-col      → FlatList numColumns={isTablet ? 4 : 2}
 * - framer-motion hover → onPressIn spring scale
 * - gameAudio sfx       → expo-haptics (no Audio yet — Phase 5 hooks it up)
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  Animated, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { storage } from '../../src/lib/storage'
import { gameProgressApi } from '../../src/lib/api'
import { useDeviceLayout } from '../../src/hooks/useDeviceLayout'

// ── Game definitions ────────────────────────────────────────────────────────
interface GameDef {
  id: string; emoji: string; title: string; desc: string
  grades: string; minGrade: number; color1: string; color2: string
}

const GAMES: GameDef[] = [
  { id: 'rhyme',    emoji: '🎵', title: 'Rhyme Time',         desc: 'Match the rhyming word — fast and fun!',             grades: 'Grades K–3', minGrade: 0, color1: '#FF6B9D', color2: '#C850C0' },
  { id: 'sentence', emoji: '🏗️', title: 'Sentence Builder',   desc: 'Tap word tiles to build perfect sentences',           grades: 'Grades K–5', minGrade: 0, color1: '#4FACFE', color2: '#00F2FE' },
  { id: 'phonics',  emoji: '🔊', title: 'Phonics Power',       desc: 'Hear a sound — tap the matching letters!',            grades: 'Grades K–2', minGrade: 0, color1: '#FA709A', color2: '#FEE140' },
  { id: 'vocab',    emoji: '🔐', title: 'Vocabulary Vault',    desc: 'Match words to definitions to unlock the vault',      grades: 'Grades 1–8', minGrade: 1, color1: '#43E97B', color2: '#38F9D7' },
  { id: 'synonym',  emoji: '⚔️', title: 'Synonym Showdown',   desc: 'Beat the clock — find synonyms & antonyms!',         grades: 'Grades 2–8', minGrade: 2, color1: '#F093FB', color2: '#F5576C' },
  { id: 'grammar',  emoji: '🪐', title: 'Grammar Galaxy',      desc: 'Fix sentences to save the galaxy!',                  grades: 'Grades K–8', minGrade: 0, color1: '#A18CD1', color2: '#FBC2EB' },
  { id: 'speed',    emoji: '⚡', title: 'Speed Reader',        desc: 'Read fast, answer faster — test your memory!',       grades: 'Grades 3–8', minGrade: 3, color1: '#FF9A9E', color2: '#FECFEF' },
  { id: 'context',  emoji: '🔍', title: 'Context Clues',       desc: 'Crack the mystery word from sentence clues',         grades: 'Grades 3–8', minGrade: 3, color1: '#667EEA', color2: '#764BA2' },
  // ── New K-grade games (from Starfall PDF curriculum) ────────────────────────
  { id: 'longy',    emoji: '🎨', title: 'Long Y Sorter',       desc: 'Does Y sound like eye or ee? Sort them!',            grades: 'Grade K',    minGrade: 0, color1: '#EF4444', color2: '#3B82F6' },
  { id: 'compound', emoji: '🧩', title: 'Compound Builder',    desc: 'Tap two words to build a brand new word!',           grades: 'Grades K–1', minGrade: 0, color1: '#10B981', color2: '#34D399' },
  { id: 'opposite', emoji: '🔄', title: 'Opposite Finder',     desc: 'Find the opposite of every word!',                   grades: 'Grades K–1', minGrade: 0, color1: '#F97316', color2: '#FBBF24' },
  { id: 'ender',    emoji: '❓', title: 'Sentence Ender',       desc: 'Pick the right . ? ! to end each sentence',          grades: 'Grade K',    minGrade: 0, color1: '#06B6D4', color2: '#22D3EE' },
  { id: 'sightfill',emoji: '📝', title: 'Sight Word Fill',     desc: 'Fill the blank — pick the missing word!',            grades: 'Grades K–1', minGrade: 0, color1: '#8B5CF6', color2: '#A78BFA' },
  { id: 'tracer',   emoji: '✏️', title: 'Letter Tracer',      desc: 'Draw letters with crayons on the canvas!',           grades: 'Grade K',    minGrade: 0, color1: '#FF6B9D', color2: '#FEE140' },
  // ── 1st Grade games (from MagneticReading + SpringComprehension PDFs) ────────
  { id: 'spotter',  emoji: '⭐', title: 'Sight Word Spotter', desc: 'Fill in the missing letter of the sight word!',      grades: 'Grade 1',    minGrade: 1, color1: '#F59E0B', color2: '#FCD34D' },
  { id: 'plural',   emoji: '🔢', title: 'Plural Maker',       desc: 'Add –s to make more than one! bag → bags',          grades: 'Grade 1',    minGrade: 1, color1: '#10B981', color2: '#6EE7B7' },
  { id: 'vowelfill',emoji: '🎯', title: 'Short Vowel Fill',   desc: 'Pick the short vowel that fits: c_t → cat!',        grades: 'Grades 1–2', minGrade: 1, color1: '#EF4444', color2: '#FCA5A5' },
  { id: 'storyquiz',emoji: '📖', title: 'Story Quiz',         desc: 'Read the passage then answer 3 questions!',         grades: 'Grades 1–3', minGrade: 1, color1: '#8B5CF6', color2: '#C4B5FD' },
]

const GRADE_LABELS = ['K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']

// ── Helpers ─────────────────────────────────────────────────────────────────
async function loadGameLevel(gameId: string, grade: number): Promise<number> {
  const stored = await storage.getString(`rq_game_level_${gameId}_g${grade}`)
  return Math.max(1, parseInt(stored ?? '1', 10))
}

async function loadStars(gameId: string, grade: number): Promise<number> {
  const stored = await storage.get<Record<string, number>>(`rq_game_${gameId}_g${grade}_stars`)
  if (!stored) return 0
  return Object.values(stored).reduce((a, b) => a + b, 0)
}

// ── GameCard ─────────────────────────────────────────────────────────────────
interface CardState { level: number; stars: number; loaded: boolean }

function GameCard({
  game, isLocked, grade, index,
}: { game: GameDef; isLocked: boolean; grade: number; index: number }) {
  const [card, setCard] = useState<CardState>({ level: 1, stars: 0, loaded: false })
  const scale = useRef(new Animated.Value(1)).current
  const entry = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Staggered entry animation
    setTimeout(() => {
      Animated.spring(entry, { toValue: 1, useNativeDriver: true, damping: 14 }).start()
    }, index * 60)

    Promise.all([loadGameLevel(game.id, grade), loadStars(game.id, grade)]).then(([level, stars]) => {
      setCard({ level, stars, loaded: true })
    })
  }, [game.id, grade])

  const pct = ((card.level - 1) / 100) * 100

  const handlePress = async () => {
    if (isLocked) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push(`/(app)/gameplay/${game.id}` as any)
  }

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()
  const onPressOut = () => Animated.spring(scale, { toValue: 1.0,  useNativeDriver: true }).start()

  return (
    <Animated.View style={{
      flex: 1, margin: 6,
      opacity: entry,
      transform: [{ scale: entry.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
    }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        onPressIn={!isLocked ? onPressIn : undefined}
        onPressOut={!isLocked ? onPressOut : undefined}
      >
        <Animated.View
          style={{
            transform: [{ scale }],
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: '#1a1a35',
            borderWidth: 1,
            borderColor: `${game.color1}33`,
          }}
        >
          {/* Gradient header band */}
          <View style={{ height: 6, backgroundColor: game.color1, opacity: 0.8 }} />

          <View style={{ padding: 16 }}>
            {/* Emoji */}
            <Text style={{ fontSize: 36, marginBottom: 6 }}>{game.emoji}</Text>

            {/* Title */}
            <Text style={{ color: game.color1, fontWeight: '800', fontSize: 15, marginBottom: 2 }}>
              {game.title}
            </Text>

            {/* Grade badge */}
            <View style={{ backgroundColor: `${game.color1}22`, borderRadius: 20, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 }}>
              <Text style={{ color: game.color1, fontSize: 10, fontWeight: '700' }}>{game.grades}</Text>
            </View>

            <Text style={{ color: '#8a7aaa', fontSize: 11, lineHeight: 15, marginBottom: 10 }} numberOfLines={2}>
              {game.desc}
            </Text>

            {/* Stars */}
            {card.stars > 0 && (
              <Text style={{ fontSize: 12, color: '#f59e0b', marginBottom: 6 }}>
                {'⭐'.repeat(Math.min(card.stars, 5))}
              </Text>
            )}

            {/* Level progress */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#6b5d80', fontSize: 10 }}>Lvl {card.level}/100</Text>
              <Text style={{ color: '#6b5d80', fontSize: 10 }}>{Math.round(pct)}%</Text>
            </View>
            <View style={{ height: 4, backgroundColor: '#2a2a4a', borderRadius: 2, marginTop: 4 }}>
              <View style={{ height: 4, borderRadius: 2, width: `${pct}%`, backgroundColor: game.color1 }} />
            </View>
          </View>

          {/* Lock overlay */}
          {isLocked && (
            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'rgba(0,0,0,0.75)',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 16,
            }}>
              <Text style={{ fontSize: 28 }}>🔒</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, marginTop: 4 }}>
                Grade {GRADE_LABELS[game.minGrade]}+
              </Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  )
}

// ══════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════
import { StyleSheet } from 'react-native'

export default function GamesScreen() {
  const insets = useSafeAreaInsets()
  const { isTablet } = useDeviceLayout()
  const [grade, setGrade] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    storage.getString('readquest_student_grade').then(g => {
      if (g) setGrade(Math.max(0, Math.min(8, parseInt(g, 10) - 1)))
      setLoading(false)

      // Sync progress to backend
      storage.getString('readquest_student_id').then(sid => {
        if (!sid) return
        GAMES.forEach(async game => {
          const [level, stars] = await Promise.all([loadGameLevel(game.id, grade), loadStars(game.id, grade)])
          if (level > 1 || stars > 0) {
            gameProgressApi.upsert(sid, game.id, grade, level, stars).catch(() => {})
          }
        })
      })
    })
  }, [])

  const numCols = isTablet ? 4 : 2

  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d1f', paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>🎮 Games Arcade</Text>
        <Text style={{ color: '#6b5d80', fontSize: 13, marginTop: 2 }}>Play, learn, and earn XP — Levels 1 to 100!</Text>
      </View>

      {/* Grade filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 52 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}
      >
        <Text style={{ color: '#6b5d80', fontSize: 12, fontWeight: '700', marginRight: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Grade:</Text>
        {GRADE_LABELS.map((label, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => { setGrade(i); Haptics.selectionAsync() }}
            style={{
              backgroundColor: grade === i ? '#702AE1' : '#1a1a35',
              borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
              marginRight: 6,
              borderWidth: 1,
              borderColor: grade === i ? '#702AE1' : '#2a2a4a',
            }}
          >
            <Text style={{ color: grade === i ? '#fff' : '#6b5d80', fontWeight: '700', fontSize: 13 }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Game grid */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#702AE1" />
        </View>
      ) : (
        <FlatList
          data={GAMES}
          keyExtractor={g => g.id}
          numColumns={numCols}
          key={numCols} // re-render on tablet rotation
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 100, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <GameCard
              game={item}
              isLocked={item.minGrade > grade}
              grade={grade}
              index={index}
            />
          )}
        />
      )}
    </View>
  )
}
