/**
 * ShortVowelFill — 1st Grade
 * Source: MagneticReading p.8 — "Phonics Lesson 1: Short a" fill-in grid
 *
 * Shows a CVC word with the vowel blanked out: c_t, b_g, h_t
 * Child taps the correct short vowel (a/e/i/o/u).
 * Includes an emoji picture clue.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { getVowelFillItems, shuffle, type VowelFillItem } from '../data/grade1Banks'
import { sfx, playTileSelect, playCorrectChime, playWrongBuzz } from '../lib/gameAudio'
import * as Haptics from 'expo-haptics'

interface Props {
  grade: number; level: number; onCorrect: (xp: number) => void; onWrong: () => void
  questionIndex: number; totalQuestions: number; streak: number; colors: { c1: string; c2: string }
}

const VOWEL_COLORS: Record<string, string> = {
  a: '#EF4444', e: '#F97316', i: '#EAB308', o: '#22C55E', u: '#3B82F6',
}

export default function ShortVowelFill({ grade, onCorrect, onWrong, questionIndex, colors }: Props) {
  const [current, setCurrent]   = useState<VowelFillItem | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const wordScale  = useRef(new Animated.Value(1)).current
  const shakeAnim  = useRef(new Animated.Value(0)).current

  // Persistent shuffled queue — never repeats a word until all are seen
  const queueRef = useRef<VowelFillItem[]>([])

  const loadQuestion = useCallback(() => {
    // Refill queue if empty (ensures no repeats until all words are seen)
    if (queueRef.current.length === 0) {
      queueRef.current = shuffle(getVowelFillItems(Math.max(1, grade)))
    }
    const item = queueRef.current.shift()!
    setCurrent(item)
    setSelected(null)
    setRevealed(false)
    wordScale.setValue(0.65)
    Animated.spring(wordScale, { toValue: 1, useNativeDriver: true, damping: 11 }).start()
  }, [grade])

  useEffect(() => { loadQuestion() }, [questionIndex, grade])

  const handleVowel = (vowel: string) => {
    if (revealed || !current) return
    sfx(playTileSelect)
    setSelected(vowel)
    setRevealed(true)
    if (vowel === current.vowel) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 200)
    } else {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8,  duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0,  duration: 50, useNativeDriver: true }),
      ]).start()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setTimeout(() => { sfx(playWrongBuzz); onWrong() }, 200)
    }
  }

  if (!current) return null

  const parts = current.word.split('')

  return (
    <View style={styles.root}>
      {/* Vowel chart */}
      <View style={styles.vowelChart}>
        <Text style={styles.chartTitle}>Short vowels:</Text>
        <View style={styles.chartRow}>
          {['a','e','i','o','u'].map(v => (
            <View key={v} style={[styles.chartItem, { backgroundColor: `${VOWEL_COLORS[v]}20` }]}>
              <Text style={[styles.chartVowel, { color: VOWEL_COLORS[v] }]}>{v}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Picture clue */}
      <Animated.View style={[styles.wordCard, { borderColor: `${colors.c1}40`, transform: [{ scale: wordScale }, { translateX: shakeAnim }] }]}>
        <Text style={styles.emojiClue}>{current.emoji}</Text>
        <Text style={styles.pictureLabel}>Picture clue</Text>
        {/* Word with blank */}
        <View style={styles.wordRow}>
          {parts.map((ch, i) => (
            <View key={i} style={[styles.letterSlot, i === current.vowelIdx && styles.blankSlot]}>
              {i === current.vowelIdx ? (
                <Text style={[
                  styles.vowelSlotText,
                  { color: revealed
                    ? (selected === current.vowel ? VOWEL_COLORS[current.vowel] : '#ef4444')
                    : `${colors.c1}80`
                  }
                ]}>
                  {revealed ? current.vowel : '_'}
                </Text>
              ) : (
                <Text style={styles.wordLetterText}>{ch}</Text>
              )}
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Pick a vowel */}
      <Text style={styles.prompt}>Tap the short vowel that fits:</Text>
      <View style={styles.vowelBtns}>
        {['a','e','i','o','u'].map((vowel) => {
          const isCorrect = revealed && vowel === current.vowel
          const isWrong   = revealed && selected === vowel && vowel !== current.vowel
          return (
            <TouchableOpacity
              key={vowel}
              onPress={() => handleVowel(vowel)}
              disabled={revealed}
              style={[
                styles.vowelBtn,
                { borderColor: isCorrect ? VOWEL_COLORS[vowel] : isWrong ? '#ef4444' : VOWEL_COLORS[vowel] + '60' },
                isCorrect && { backgroundColor: `${VOWEL_COLORS[vowel]}25` },
                isWrong   && { backgroundColor: 'rgba(239,68,68,0.12)' },
                !isCorrect && !isWrong && { backgroundColor: `${VOWEL_COLORS[vowel]}10` },
              ]}
              activeOpacity={0.8}
            >
              <Text style={[styles.vowelBtnText, { color: isCorrect ? VOWEL_COLORS[vowel] : isWrong ? '#ef4444' : VOWEL_COLORS[vowel] }]}>
                {vowel}
              </Text>
              {isCorrect && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          )
        })}
      </View>

      {revealed && (
        <View style={styles.revealBox}>
          <Text style={styles.revealText}>
            {selected === current.vowel
              ? `✓ "${current.word}" has the short-${current.vowel.toUpperCase()} sound!`
              : `The word is "${current.word}" — short ${current.vowel.toUpperCase()} vowel sound`
            }
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  vowelChart: { backgroundColor: '#12112a', borderRadius: 14, padding: 10, width: '100%', gap: 6 },
  chartTitle: { color: '#6b5d80', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  chartRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  chartItem: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  chartVowel: { fontSize: 16, fontWeight: '800' },
  wordCard: { borderWidth: 2, borderRadius: 20, padding: 20, backgroundColor: '#1a1232', alignItems: 'center', gap: 8, width: '100%' },
  emojiClue: { fontSize: 54 },
  pictureLabel: { color: '#4a4a6a', fontSize: 11 },
  wordRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-end' },
  letterSlot: { minWidth: 40, alignItems: 'center', paddingBottom: 4 },
  blankSlot: { borderBottomWidth: 3, borderBottomColor: '#2a2a4a' },
  wordLetterText: { color: '#e0d8f0', fontSize: 46, fontWeight: '800' },
  vowelSlotText: { fontSize: 46, fontWeight: '900' },
  prompt: { color: '#8a7aaa', fontSize: 13, fontWeight: '600' },
  vowelBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  vowelBtn: { flex: 1, borderWidth: 2, borderRadius: 14, paddingVertical: 18, alignItems: 'center', gap: 4 },
  vowelBtnText: { fontSize: 28, fontWeight: '900' },
  checkmark: { color: '#43E97B', fontSize: 12, fontWeight: '800' },
  revealBox: { backgroundColor: '#1a1a35', borderRadius: 12, padding: 12, width: '100%' },
  revealText: { color: '#ADA3B8', fontSize: 13, textAlign: 'center', lineHeight: 18 },
})
