/**
 * SynonymShowdown — React Native port
 * Countdown timer rendered as animated progress bar.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { getSynonymItems, shuffle, type SynonymItem } from '../data/wordBanks'
import {
  sfx, playTileSelect, playCorrectChime, playWrongBuzz,
  playTimerTick, playTimerUrgent, playStreakFire,
} from '../lib/gameAudio'

interface Props {
  grade: number
  level: number
  onCorrect: (xp: number) => void
  onWrong: () => void
  questionIndex: number
  totalQuestions: number
  streak: number
  colors: { c1: string; c2: string }
}

const TIME_FOR_LEVEL = (level: number) =>
  level <= 25 ? 12 : level <= 50 ? 9 : level <= 75 ? 7 : 5

export default function SynonymShowdown({ grade, level, onCorrect, onWrong, questionIndex, streak, colors }: Props) {
  const [item, setItem] = useState<SynonymItem | null>(null)
  const [choices, setChoices] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TIME_FOR_LEVEL(level))
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const maxTime = TIME_FOR_LEVEL(level)

  const timerAnim = useRef(new Animated.Value(1)).current
  const scaleAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(1))).current

  const loadQuestion = useCallback(() => {
    const items = getSynonymItems(grade)
    const q = items[questionIndex % items.length]
    setItem(q)
    setChoices(shuffle(q.choices))
    setSelected(null)
    setRevealed(false)
    const t = TIME_FOR_LEVEL(level)
    setTimeLeft(t)
    timerAnim.setValue(1)
  }, [grade, level, questionIndex])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  // Timer
  useEffect(() => {
    if (revealed) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    const t = TIME_FOR_LEVEL(level)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          setRevealed(true)
          sfx(playWrongBuzz)
          onWrong()
          return 0
        }
        if (prev <= 4) sfx(playTimerUrgent)
        else if (prev <= 6) sfx(playTimerTick)
        const next = prev - 1
        Animated.timing(timerAnim, { toValue: next / t, duration: 1100, useNativeDriver: false }).start()
        return next
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [revealed, onWrong])

  useEffect(() => {
    if (streak > 0 && streak % 3 === 0) sfx(playStreakFire)
  }, [streak])

  const handleChoice = (word: string, idx: number) => {
    if (revealed || !item) return
    if (timerRef.current) clearInterval(timerRef.current)
    sfx(playTileSelect)

    Animated.sequence([
      Animated.timing(scaleAnims[idx], { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnims[idx], { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start()

    setSelected(word)
    setRevealed(true)
    if (word === item.correct) {
      setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 180)
    } else {
      setTimeout(() => { sfx(playWrongBuzz); onWrong() }, 180)
    }
  }

  if (!item) return null

  const urgent = timeLeft <= 3
  const timerColor = urgent ? '#ef4444' : colors.c1

  return (
    <View style={styles.root}>
      {/* Mode pill */}
      <View style={[styles.modePill, { backgroundColor: `${colors.c1}22`, borderColor: `${colors.c1}55` }]}>
        <Text style={[styles.modePillText, { color: colors.c1 }]}>
          {item.type === 'synonym' ? '⚔️ Find the Synonym' : '🛡️ Find the Antonym'}
        </Text>
      </View>

      {/* Timer bar */}
      <View style={styles.timerTrack}>
        <Animated.View
          style={[styles.timerFill, {
            width: timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: timerColor,
            opacity: urgent ? 1 : 0.85,
          }]}
        />
        <Text style={[styles.timerNum, { color: timerColor }]}>{timeLeft}s</Text>
      </View>

      {/* Battle word */}
      <View style={[styles.arena, { borderColor: `${colors.c1}44`, backgroundColor: `${colors.c1}0a` }]}>
        <Text style={[styles.battleWord, { color: colors.c1 }]}>{item.word}</Text>
      </View>

      {/* Choices */}
      <View style={styles.choices}>
        {choices.map((c, idx) => {
          let bgColor = '#1e1b36'
          let borderColor = '#2a2a4a'
          let textColor = '#e0d8f0'
          if (revealed) {
            if (c === item.correct) { bgColor = 'rgba(67,233,123,0.15)'; borderColor = '#43E97B'; textColor = '#43E97B' }
            else if (c === selected) { bgColor = 'rgba(239,68,68,0.15)'; borderColor = '#ef4444'; textColor = '#ef4444' }
          }
          return (
            <Animated.View key={c} style={{ transform: [{ scale: scaleAnims[idx] }] }}>
              <TouchableOpacity
                onPress={() => handleChoice(c, idx)}
                disabled={revealed}
                style={[styles.choiceBtn, { backgroundColor: bgColor, borderColor }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.choiceText, { color: textColor }]}>{c}</Text>
              </TouchableOpacity>
            </Animated.View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 16, gap: 14, alignItems: 'center' },
  modePill: {
    borderWidth: 1, borderRadius: 99, paddingHorizontal: 16, paddingVertical: 6,
  },
  modePillText: { fontSize: 13, fontWeight: '700' },
  timerTrack: {
    width: '100%', height: 10, backgroundColor: '#1e1b36', borderRadius: 5,
    overflow: 'hidden', position: 'relative',
  },
  timerFill: { height: 10, borderRadius: 5 },
  timerNum: {
    position: 'absolute', right: 6, top: -2, fontSize: 10, fontWeight: '700',
  },
  arena: {
    width: '100%', borderWidth: 2, borderRadius: 20, paddingVertical: 24,
    alignItems: 'center',
  },
  battleWord: { fontSize: 44, fontWeight: '900', letterSpacing: 1 },
  choices: { width: '100%', gap: 10 },
  choiceBtn: {
    borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center',
  },
  choiceText: { fontSize: 16, fontWeight: '600' },
})
