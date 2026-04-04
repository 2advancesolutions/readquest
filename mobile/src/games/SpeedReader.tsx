/**
 * SpeedReader — React Native port
 * Circular SVG timer → simple animated arc using View + borderRadius trick
 * (or just a progress bar, which is simpler and reliable in RN)
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet, ScrollView } from 'react-native'
import { getSpeedItems, type SpeedItem } from '../data/wordBanks'
import {
  sfx, playTimerTick, playTimerUrgent, playCorrectChime, playWrongBuzz,
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

type Phase = 'ready' | 'reading' | 'answering' | 'revealed'

function getReadTime(item: SpeedItem, level: number): number {
  const base = item.readTime
  const reduction = Math.floor(level / 20) * 2
  return Math.max(base - reduction, 5)
}

export default function SpeedReader({ grade, level, onCorrect, onWrong, questionIndex, colors }: Props) {
  const [item, setItem] = useState<SpeedItem | null>(null)
  const [choiceList, setChoiceList] = useState<string[]>([])
  const [phase, setPhase] = useState<Phase>('ready')
  const [timeLeft, setTimeLeft] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerBarAnim = useRef(new Animated.Value(1)).current

  const loadQuestion = useCallback(() => {
    const items = getSpeedItems(grade)
    const q = items[questionIndex % items.length]
    setItem(q)
    setChoiceList(q.choices)
    setPhase('ready')
    setSelected(null)
    if (timerRef.current) clearInterval(timerRef.current)
    timerBarAnim.setValue(1)
  }, [grade, level, questionIndex])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  const startReading = () => {
    if (!item) return
    const readTime = getReadTime(item, level)
    setTimeLeft(readTime)
    timerBarAnim.setValue(1)
    setPhase('reading')
  }

  useEffect(() => {
    if (phase !== 'reading' || !item) return
    const readTime = getReadTime(item, level)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          setPhase('answering')
          return 0
        }
        if (t <= 3) sfx(playTimerUrgent)
        else if (t <= 5) sfx(playTimerTick)
        const next = t - 1
        Animated.timing(timerBarAnim, {
          toValue: next / readTime,
          duration: 1100,
          useNativeDriver: false,
        }).start()
        return next
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  const handleChoice = (choice: string) => {
    if (phase !== 'answering' || !item) return
    setSelected(choice)
    setPhase('revealed')
    if (choice === item.correct) {
      sfx(playCorrectChime)
      setTimeout(() => onCorrect(0), 400)
    } else {
      sfx(playWrongBuzz)
      setTimeout(() => onWrong(), 400)
    }
  }

  if (!item) return null
  const readTime = getReadTime(item, level)
  const urgent = timeLeft <= 3 && phase === 'reading'
  const timerColor = urgent ? '#ef4444' : colors.c1

  return (
    <View style={styles.root}>
      {/* Timer (reading phase) */}
      {phase === 'reading' && (
        <View style={styles.timerRow}>
          <View style={styles.timerTrack}>
            <Animated.View style={[styles.timerFill, {
              width: timerBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: timerColor,
            }]} />
          </View>
          <Text style={[styles.timerNum, { color: timerColor }]}>{timeLeft}s</Text>
        </View>
      )}

      {/* READY phase */}
      {phase === 'ready' && (
        <View style={styles.centered}>
          <Text style={styles.readyHint}>⚡ Read the passage quickly, then answer the question!</Text>
          <View style={[styles.passageBox, { borderColor: `${colors.c1}33` }]}>
            <Text style={styles.passageText} numberOfLines={3}>{item.passage.slice(0, 80)}…</Text>
          </View>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.c1 }]}
            onPress={startReading}
            activeOpacity={0.8}
          >
            <Text style={styles.startBtnText}>🚀 Start Reading!</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* READING phase */}
      {phase === 'reading' && (
        <View style={[styles.passageBox, { borderColor: `${colors.c1}44` }]}>
          <Text style={styles.passageText}>{item.passage}</Text>
        </View>
      )}

      {/* ANSWERING / REVEALED */}
      {(phase === 'answering' || phase === 'revealed') && (
        <View style={styles.answerSection}>
          <View style={[styles.hiddenBox, { borderColor: `${colors.c1}22` }]}>
            <Text style={styles.hiddenText}>🕵️ Passage hidden — answer from memory!</Text>
          </View>

          <View style={[styles.questionBox, { borderColor: `${colors.c1}55` }]}>
            <Text style={[styles.questionText, { color: colors.c1 }]}>{item.question}</Text>
          </View>

          <View style={styles.choices}>
            {choiceList.map(c => {
              let bgColor = '#1e1b36'
              let borderColor = '#2a2a4a'
              let textColor = '#e0d8f0'
              if (phase === 'revealed') {
                if (c === item.correct) { bgColor = 'rgba(67,233,123,0.15)'; borderColor = '#43E97B'; textColor = '#43E97B' }
                else if (c === selected) { bgColor = 'rgba(239,68,68,0.15)'; borderColor = '#ef4444'; textColor = '#ef4444' }
              }
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => handleChoice(c)}
                  disabled={phase === 'revealed'}
                  style={[styles.choiceBtn, { backgroundColor: bgColor, borderColor }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.choiceText, { color: textColor }]}>{c}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 16, gap: 16 },
  centered: { alignItems: 'center', gap: 16 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timerTrack: { flex: 1, height: 10, backgroundColor: '#1e1b36', borderRadius: 5, overflow: 'hidden' },
  timerFill: { height: 10, borderRadius: 5 },
  timerNum: { fontSize: 14, fontWeight: '800', minWidth: 32, textAlign: 'right' },
  readyHint: { color: 'rgba(204,195,216,0.7)', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  passageBox: {
    borderWidth: 1, borderRadius: 16, padding: 16, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  passageText: { color: '#c8c0e0', fontSize: 14, lineHeight: 22 },
  startBtn: { borderRadius: 14, paddingVertical: 15, paddingHorizontal: 40 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  answerSection: { gap: 12 },
  hiddenBox: {
    borderWidth: 1, borderRadius: 10, padding: 14, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  hiddenText: { color: 'rgba(204,195,216,0.4)', fontSize: 13, fontStyle: 'italic' },
  questionBox: {
    borderWidth: 1.5, borderRadius: 14, padding: 14, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  questionText: { fontSize: 15, fontWeight: '700', lineHeight: 22 },
  choices: { gap: 10 },
  choiceBtn: {
    borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
  },
  choiceText: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
})
