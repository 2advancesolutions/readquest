/**
 * SightWordSpotter — 1st Grade
 * Source: MagneticReading p.4 — "Super Words: Lesson 1-4"
 *
 * Two modes:
 *  1. Flash card: see the word, read it, tap "I got it"
 *  2. Fill-in: word shown with one letter blanked — tap the missing letter
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { getSightWordItems, shuffle, type SightWordItem } from '../data/grade1Banks'
import { sfx, playTileSelect, playCorrectChime, playWrongBuzz } from '../lib/gameAudio'
import TapToHearButton from '../components/TapToHearButton'
import * as Haptics from 'expo-haptics'

interface Props {
  grade: number; level: number; onCorrect: (xp: number) => void; onWrong: () => void
  questionIndex: number; totalQuestions: number; streak: number; colors: { c1: string; c2: string }
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('')

export default function SightWordSpotter({ grade, level, onCorrect, onWrong, questionIndex, colors }: Props) {
  const [current, setCurrent]     = useState<SightWordItem | null>(null)
  const [selected, setSelected]   = useState<string | null>(null)
  const [revealed, setRevealed]   = useState(false)
  const [choices, setChoices]     = useState<string[]>([])

  const wordScale = useRef(new Animated.Value(1)).current
  const shakeAnim = useRef(new Animated.Value(0)).current

  // Persistent shuffled queue — never repeats
  const queueRef = useRef<SightWordItem[]>([])

  const loadQuestion = useCallback(() => {
    if (queueRef.current.length === 0) {
      queueRef.current = shuffle(getSightWordItems(Math.max(1, grade)))
    }
    const item = queueRef.current.shift()!
    setCurrent(item)
    setSelected(null)
    setRevealed(false)

    const correct = item.word[item.missingIdx]
    const wrong   = shuffle(ALPHABET.filter(l => l !== correct)).slice(0, 4)
    setChoices(shuffle([correct, ...wrong]))

    wordScale.setValue(0.7)
    Animated.spring(wordScale, { toValue: 1, useNativeDriver: true, damping: 12 }).start()
  }, [grade])

  useEffect(() => { loadQuestion() }, [questionIndex, grade])

  const handlePick = (letter: string) => {
    if (revealed || !current) return
    sfx(playTileSelect)
    setSelected(letter)
    setRevealed(true)

    if (letter === current.word[current.missingIdx]) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 200)
    } else {
      // Shake
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8,  duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 5,  duration: 45, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0,  duration: 35, useNativeDriver: true }),
      ]).start()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setTimeout(() => { sfx(playWrongBuzz); onWrong() }, 200)
    }
  }

  if (!current) return null

  // Build display word with blank
  const displayParts = current.word.split('').map((ch, i) =>
    i === current.missingIdx ? '_' : ch
  )

  const answerLetter = current.word[current.missingIdx]

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle}>⭐ Super Word!</Text>
        <Text style={styles.headerSub}>Fill in the missing letter</Text>
      </View>

      {/* Word display */}
      <Animated.View style={[styles.wordCard, { borderColor: `${colors.c1}50`, transform: [{ scale: wordScale }, { translateX: shakeAnim }] }]}>
        <View style={styles.wordLetterRow}>
          {current.word.split('').map((ch, i) => (
            <View key={i} style={[styles.letterBox, i === current.missingIdx && { borderBottomColor: colors.c1, borderBottomWidth: 3 }]}>
              {i === current.missingIdx ? (
                <Text style={[styles.blankLetter, { color: revealed ? (selected === answerLetter ? '#43E97B' : '#ef4444') : colors.c1 }]}>
                  {revealed ? answerLetter : '_'}
                </Text>
              ) : (
                <Text style={styles.letterText}>{ch}</Text>
              )}
            </View>
          ))}
        </View>
        <Text style={styles.wordHint}>Lesson {current.lesson} sight word</Text>
      </Animated.View>
      {/* Tap-to-hear — speaks the full word */}
      <TapToHearButton
        text={current.word}
        colors={colors}
        label="👆 Hear the sight word!"
        size={96}
        autoPlay
      />

      {/* Letter grid choices */}
      <View style={styles.choicesGrid}>
        {choices.map((letter) => {
          const isCorrect = revealed && letter === current.word[current.missingIdx]
          const isWrong   = revealed && selected === letter && letter !== current.word[current.missingIdx]
          return (
            <TouchableOpacity
              key={letter}
              onPress={() => handlePick(letter)}
              disabled={revealed}
              style={[
                styles.letterChoice,
                isCorrect && { backgroundColor: 'rgba(67,233,123,0.2)', borderColor: '#43E97B' },
                isWrong   && { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#ef4444' },
                !isCorrect && !isWrong && { borderColor: '#2a2a4a', backgroundColor: '#1a1a35' },
              ]}
              activeOpacity={0.75}
            >
              <Text style={[
                styles.letterChoiceText,
                isCorrect && { color: '#43E97B' },
                isWrong   && { color: '#ef4444' },
                !isCorrect && !isWrong && { color: '#e0d8f0' },
              ]}>
                {letter}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Sight word context when revealed */}
      {revealed && (
        <View style={[styles.revealBox, { borderColor: selected === answerLetter ? '#43E97B40' : '#ef444440' }]}>
          <Text style={styles.revealText}>
            {selected === answerLetter
              ? `✓ The word is "${current.word}" — a sight word you should know! 📖`
              : `The missing letter was "${answerLetter}" → "${current.word}"`
            }
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingHorizontal: 16, gap: 14 },
  headerBox: { backgroundColor: '#12112a', borderRadius: 14, padding: 12, width: '100%', alignItems: 'center', gap: 3 },
  headerTitle: { color: '#e0d8f0', fontSize: 16, fontWeight: '800' },
  headerSub: { color: '#6b5d80', fontSize: 12 },
  wordCard: { borderWidth: 2, borderRadius: 20, paddingHorizontal: 28, paddingVertical: 20, backgroundColor: '#1a1232', alignItems: 'center', gap: 8, width: '100%' },
  wordLetterRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  letterBox: { alignItems: 'center', paddingBottom: 4, minWidth: 36 },
  letterText: { color: '#e0d8f0', fontSize: 42, fontWeight: '800' },
  blankLetter: { fontSize: 42, fontWeight: '900' },
  wordHint: { color: '#4a4a6a', fontSize: 11 },
  choicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', width: '100%' },
  letterChoice: { borderWidth: 2, borderRadius: 12, width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  letterChoiceText: { fontSize: 20, fontWeight: '700' },
  revealBox: { borderWidth: 1, borderRadius: 12, padding: 12, width: '100%', backgroundColor: '#1a1a35' },
  revealText: { color: '#ADA3B8', fontSize: 13, textAlign: 'center', lineHeight: 18 },
})
