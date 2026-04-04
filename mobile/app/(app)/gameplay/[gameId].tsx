/**
 * GamePlay — React Native (Phase 4 — updated to use real game components)
 * Dynamic route: /gameplay/[gameId]
 *
 * Changes from original:
 * - Removed hardcoded QUESTION_BANKS (replaced by wordBanks + game components)
 * - renderQuestion() now delegates to the imported RN game components
 * - Game components receive: grade, level, onCorrect, onWrong, questionIndex,
 *   totalQuestions, streak, colors
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, ScrollView, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { storage } from '../../../src/lib/storage'
import { gameProgressApi } from '../../../src/lib/api'
import { emitXpUpdate } from '../../../src/components/XpBadge'
import { calcXP, calcLevelBonus } from '../../../src/data/wordBanks'

// Game components
import RhymeTime from '../../../src/games/RhymeTime'
import SentenceBuilder from '../../../src/games/SentenceBuilder'
import PhonicsPower from '../../../src/games/PhonicsPower'
import VocabularyVault from '../../../src/games/VocabularyVault'
import SynonymShowdown from '../../../src/games/SynonymShowdown'
import GrammarGalaxy from '../../../src/games/GrammarGalaxy'
import SpeedReader from '../../../src/games/SpeedReader'
import ContextClues from '../../../src/games/ContextClues'

const TOTAL_QUESTIONS = 8
const MAX_LIVES = 3

const COLORS: Record<string, { c1: string; c2: string }> = {
  rhyme:    { c1: '#FF6B9D', c2: '#C850C0' },
  sentence: { c1: '#4FACFE', c2: '#00F2FE' },
  phonics:  { c1: '#FA709A', c2: '#FEE140' },
  vocab:    { c1: '#43E97B', c2: '#38F9D7' },
  synonym:  { c1: '#F093FB', c2: '#F5576C' },
  grammar:  { c1: '#A18CD1', c2: '#FBC2EB' },
  speed:    { c1: '#FF9A9E', c2: '#FECFEF' },
  context:  { c1: '#667EEA', c2: '#764BA2' },
}

const GAME_NAMES: Record<string, string> = {
  rhyme:    '🎵 Rhyme Time',
  sentence: '🏗️ Sentence Builder',
  phonics:  '🔊 Phonics Power',
  vocab:    '🔐 Vocabulary Vault',
  synonym:  '⚔️ Synonym Showdown',
  grammar:  '🪐 Grammar Galaxy',
  speed:    '⚡ Speed Reader',
  context:  '🔍 Context Clues',
}

type Phase = 'playing' | 'complete' | 'failed'

async function loadGameLevel(gameId: string, grade: number) {
  const v = await storage.getString(`rq_game_level_${gameId}_g${grade}`)
  return Math.max(1, parseInt(v ?? '1', 10))
}
async function saveGameLevel(gameId: string, grade: number, level: number) {
  await storage.setString(`rq_game_level_${gameId}_g${grade}`, String(level))
}
async function saveStars(gameId: string, grade: number, level: number, stars: number) {
  const key = `rq_game_${gameId}_g${grade}_stars`
  const ex = await storage.get<Record<string, number>>(key) ?? {}
  ex[String(level)] = Math.max(ex[String(level)] ?? 0, stars)
  await storage.set(key, ex)
}

export default function GamePlayScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>()
  const insets = useSafeAreaInsets()
  const game = gameId ?? 'rhyme'
  const colors = COLORS[game] ?? COLORS.vocab

  const [grade,       setGrade]       = useState(1)
  const [level,       setLevel]       = useState(1)
  const [lives,       setLives]       = useState(MAX_LIVES)
  const [streak,      setStreak]      = useState(0)
  const [qIndex,      setQIndex]      = useState(0)
  const [xpEarned,    setXpEarned]    = useState(0)
  const [phase,       setPhase]       = useState<Phase>('playing')
  const [starsEarned, setStarsEarned] = useState(0)
  const [mistakes,    setMistakes]    = useState(0)
  const [disabled,    setDisabled]    = useState(false)
  const [ready,       setReady]       = useState(false)
  const xpRef = useRef(0)

  const shakeAnim    = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current
  const starAnims    = useRef([0, 1, 2].map(() => new Animated.Value(0))).current

  useEffect(() => {
    storage.getString('readquest_student_grade').then(g => {
      const gr = g ? parseInt(g, 10) : 1
      setGrade(gr)
      loadGameLevel(game, gr).then(lvl => {
        setLevel(lvl)
        setReady(true)
      })
    })
    storage.get<number>('readquest_xp').then(v => { xpRef.current = v ?? 0 })
  }, [game])

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (qIndex / TOTAL_QUESTIONS) * 100,
      duration: 400,
      useNativeDriver: false,
    }).start()
  }, [qIndex])

  const triggerShake = useCallback(() => {
    shakeAnim.setValue(0)
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 50,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 40,  useNativeDriver: true }),
    ]).start()
  }, [])

  const handleCorrect = useCallback(async (_xp: number = 0) => {
    if (disabled) return
    setDisabled(true)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const xp = calcXP(level, streak + 1)
    const newXp = xpEarned + xp
    setXpEarned(newXp)
    setStreak(s => s + 1)

    const next = qIndex + 1
    if (next >= TOTAL_QUESTIONS) {
      const bonus = calcLevelBonus(level)
      const total = newXp + bonus
      const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1
      setStarsEarned(stars)
      setXpEarned(total)
      await saveStars(game, grade, level, stars)
      const nextLevel = Math.min(level + 1, 100)
      await saveGameLevel(game, grade, nextLevel)
      storage.getString('readquest_student_id').then(sid => {
        if (sid) gameProgressApi.upsert(sid, game, grade, nextLevel, stars).catch(() => {})
      })
      emitXpUpdate(xpRef.current + total, total)
      Animated.stagger(180, starAnims.map(a =>
        Animated.spring(a, { toValue: 1, useNativeDriver: true })
      )).start()
      setTimeout(() => { setPhase('complete'); setDisabled(false) }, 500)
    } else {
      setTimeout(() => { setQIndex(next); setDisabled(false) }, 500)
    }
  }, [disabled, level, streak, qIndex, xpEarned, mistakes, game, grade])

  const handleWrong = useCallback(() => {
    if (disabled) return
    setDisabled(true)
    triggerShake()
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    setStreak(0)
    setMistakes(m => m + 1)
    setLives(l => {
      const nl = l - 1
      if (nl <= 0) {
        setTimeout(() => { setPhase('failed'); setDisabled(false) }, 700)
      } else {
        const next = qIndex + 1
        if (next < TOTAL_QUESTIONS) setTimeout(() => { setQIndex(next); setDisabled(false) }, 700)
        else setTimeout(() => { setPhase('failed'); setDisabled(false) }, 700)
      }
      return nl
    })
  }, [disabled, qIndex, triggerShake])

  const handleRetry = () => {
    setLives(MAX_LIVES); setStreak(0); setQIndex(0); setXpEarned(0)
    setMistakes(0); setPhase('playing'); setDisabled(false)
    starAnims.forEach(a => a.setValue(0))
  }

  const sharedProps = {
    grade,
    level,
    onCorrect: handleCorrect,
    onWrong: handleWrong,
    questionIndex: qIndex,
    totalQuestions: TOTAL_QUESTIONS,
    streak,
    colors,
  }

  const renderQuestion = () => {
    switch (game) {
      case 'rhyme':    return <RhymeTime    {...sharedProps} />
      case 'sentence': return <SentenceBuilder {...sharedProps} />
      case 'phonics':  return <PhonicsPower  {...sharedProps} />
      case 'vocab':    return <VocabularyVault {...sharedProps} />
      case 'synonym':  return <SynonymShowdown {...sharedProps} />
      case 'grammar':  return <GrammarGalaxy  {...sharedProps} />
      case 'speed':    return <SpeedReader    {...sharedProps} />
      case 'context':  return <ContextClues   {...sharedProps} />
      default:         return <RhymeTime {...sharedProps} />
    }
  }

  if (!ready) return (
    <View style={{ flex: 1, backgroundColor: '#0d0d1f', alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
      <ActivityIndicator size="large" color={colors.c1} />
    </View>
  )

  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#0d0d1f', paddingTop: insets.top, transform: [{ translateX: shakeAnim }] }}>
      {/* HUD */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: `${colors.c1}22`,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 8 }}>
          <Text style={{ color: '#8a7aaa', fontSize: 13 }}>← Games</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.c1, fontWeight: '800', fontSize: 14, flex: 1 }} numberOfLines={1}>
          {GAME_NAMES[game]}
        </Text>
        <Text style={{ color: '#B28CFF', fontSize: 11, fontWeight: '700', marginRight: 6 }}>Lvl {level}</Text>
        <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '700', marginRight: 8 }}>⚡+{xpEarned}</Text>
        <View style={{ flexDirection: 'row' }}>
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <Text key={i} style={{ fontSize: 13, opacity: i >= lives ? 0.2 : 1, marginLeft: 1 }}>❤️</Text>
          ))}
        </View>
      </View>

      {/* Streak */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6 }}>
        <Text style={{ color: streak >= 5 ? '#ef4444' : '#6b5d80', fontSize: 11, fontWeight: '700', marginRight: 8 }}>
          {streak >= 5 ? '🔥 ON FIRE!' : '⚡ Streak:'}
        </Text>
        {Array.from({ length: 7 }).map((_, i) => (
          <View key={i} style={{
            width: 8, height: 8, borderRadius: 4, marginRight: 3,
            backgroundColor: i < streak ? (streak >= 5 ? '#ef4444' : colors.c1) : '#2a2a4a',
          }} />
        ))}
      </View>

      {/* Progress bar */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={{ color: '#6b5d80', fontSize: 10 }}>Q {qIndex + 1} / {TOTAL_QUESTIONS}</Text>
        </View>
        <View style={{ height: 5, backgroundColor: '#1a1a35', borderRadius: 3 }}>
          <Animated.View style={{
            height: 5, borderRadius: 3, backgroundColor: colors.c1,
            width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
          }} />
        </View>
      </View>

      {/* Game area */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 60, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {phase === 'playing' && renderQuestion()}
      </ScrollView>

      {/* Complete overlay */}
      {phase === 'complete' && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center',
          justifyContent: 'center', padding: 24,
        }}>
          <Text style={{ fontSize: 60 }}>🏆</Text>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 10 }}>
            Level {level} Complete!
          </Text>
          <Text style={{ color: colors.c1, fontSize: 17, fontWeight: '700', marginTop: 4 }}>
            ⚡ +{xpEarned} XP Earned!
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 14, gap: 12 }}>
            {[0, 1, 2].map(i => (
              <Animated.Text key={i} style={{ fontSize: 34, transform: [{ scale: starAnims[i] }] }}>
                {i < starsEarned ? '⭐' : '☆'}
              </Animated.Text>
            ))}
          </View>
          <View style={{ gap: 12, marginTop: 20, width: '100%' }}>
            {level < 100
              ? <TouchableOpacity
                  onPress={() => { setLevel(l => Math.min(l + 1, 100)); handleRetry() }}
                  style={{ backgroundColor: colors.c1, borderRadius: 14, padding: 15, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Level {level + 1} →</Text>
                </TouchableOpacity>
              : <TouchableOpacity
                  onPress={() => router.back()}
                  style={{ backgroundColor: colors.c1, borderRadius: 14, padding: 15, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>🏆 All 100 Levels Done!</Text>
                </TouchableOpacity>
            }
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ backgroundColor: '#1a1a35', borderRadius: 14, padding: 13, alignItems: 'center' }}
            >
              <Text style={{ color: '#8a7aaa', fontSize: 14 }}>Back to Arcade</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Failed overlay */}
      {phase === 'failed' && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center',
          justifyContent: 'center', padding: 24,
        }}>
          <Text style={{ fontSize: 60 }}>💔</Text>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 10 }}>Don't Give Up!</Text>
          <Text style={{ color: '#8a7aaa', fontSize: 14, marginTop: 6 }}>You've got this — try again!</Text>
          <View style={{ gap: 12, marginTop: 20, width: '100%' }}>
            <TouchableOpacity
              onPress={handleRetry}
              style={{ backgroundColor: colors.c1, borderRadius: 14, padding: 15, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Try Again 🔁</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ backgroundColor: '#1a1a35', borderRadius: 14, padding: 13, alignItems: 'center' }}
            >
              <Text style={{ color: '#8a7aaa', fontSize: 14 }}>Back to Arcade</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  )
}
