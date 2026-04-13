/**
 * SentenceStairs — 1st Grade
 * Source: MagneticReading pp.9-10 — "Sentence Stairs"
 *
 * Words appear one at a time as a growing staircase.
 * Child taps "Next Word →" to advance, reads each partial sentence aloud,
 * then taps "Done ✓" when the full sentence is complete.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, Animated, ScrollView, StyleSheet } from 'react-native'
import { getSentenceStairItems, shuffle, type SentenceStairItem } from '../data/grade1Banks'
import { sfx, playTileSelect, playCorrectChime } from '../lib/gameAudio'
import * as Speech from 'expo-speech'
import * as Haptics from 'expo-haptics'

interface Props {
  grade: number; level: number; onCorrect: (xp: number) => void; onWrong: () => void
  questionIndex: number; totalQuestions: number; streak: number; colors: { c1: string; c2: string }
}

function speakSentence(words: string[], upTo: number) {
  const text = words.slice(0, upTo + 1).join(' ')
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 0.75; utter.pitch = 1.1; utter.lang = 'en-US'
    const voices = window.speechSynthesis.getVoices()
    const v = voices.find(v => v.name.includes('Google') && v.lang === 'en-US') ?? voices.find(v => v.lang === 'en-US')
    if (v) utter.voice = v
    window.speechSynthesis.speak(utter)
  } else {
    Speech.speak(text, { rate: 0.75, pitch: 1.1 })
  }
}

export default function SentenceStairs({ grade, onCorrect, questionIndex, colors }: Props) {
  const [current, setCurrent]   = useState<SentenceStairItem | null>(null)
  const [wordIdx, setWordIdx]   = useState(0)
  const [done, setDone]         = useState(false)
  const stairAnim  = useRef(new Animated.Value(0)).current
  const newWordAnim = useRef(new Animated.Value(0)).current   // slide-in for latest word

  const loadQuestion = useCallback(() => {
    const items = shuffle(getSentenceStairItems(Math.max(1, grade)))
    const item  = items[questionIndex % items.length]
    setCurrent(item)
    setWordIdx(0)
    setDone(false)
    stairAnim.setValue(0)
    newWordAnim.setValue(1)   // ← first word immediately visible

    // Speak first word
    setTimeout(() => speakSentence(item.words, 0), 400)
  }, [grade, questionIndex])

  // Trigger on both grade and questionIndex changes
  useEffect(() => { loadQuestion() }, [questionIndex, grade])

  const handleNextWord = () => {
    if (!current || done) return
    sfx(playTileSelect)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    const next = wordIdx + 1
    if (next >= current.words.length) {
      setWordIdx(current.words.length - 1)
      setDone(true)
      Animated.spring(stairAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start()
      setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 600)
    } else {
      // Animate new word sliding in
      newWordAnim.setValue(0)
      setWordIdx(next)
      Animated.spring(newWordAnim, { toValue: 1, useNativeDriver: true, friction: 9 }).start()
      speakSentence(current.words, next)
    }
  }

  if (!current) return null

  const progress = (wordIdx + 1) / current.words.length

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle}>🪜 Sentence Stairs</Text>
        <Text style={styles.headerSub}>Tap to add one word at a time — read it aloud!</Text>
      </View>

      {/* The staircase — only revealed words + dot-placeholder for hidden */}
      <ScrollView style={styles.stairsScroll} contentContainerStyle={styles.stairsContainer} showsVerticalScrollIndicator={false}>
        {current.words.map((word, i) => {
          const shown = i <= wordIdx
          const isNew = i === wordIdx && !done
          // Indent grows per step but capped so nothing goes off-screen
          const indent = Math.min(i * 14, 56)

          if (!shown) {
            // Hidden word: show placeholder dash line — no real text visible
            return (
              <View key={i} style={[styles.stairRow, { paddingLeft: indent }]}>
                <View style={styles.bulletHidden} />
                <View style={styles.placeholderLine}>
                  <Text style={styles.placeholderDots}>• • •</Text>
                </View>
              </View>
            )
          }

          return (
            <Animated.View
              key={i}
              style={[
                styles.stairRow,
                { paddingLeft: indent },
                isNew && {
                  // New word pops in from right
                  opacity: newWordAnim,
                  transform: [{ translateX: newWordAnim.interpolate({ inputRange: [0,1], outputRange: [20, 0] }) }],
                },
              ]}
            >
              {/* Bullet */}
              <View style={[styles.bullet, { backgroundColor: isNew ? colors.c1 : '#3a3a5a' }]} />
              {/* Word chip */}
              <View style={[
                styles.wordChip,
                isNew
                  ? { borderColor: colors.c1, backgroundColor: `${colors.c1}18` }
                  : { borderColor: `${colors.c1}35`, backgroundColor: 'transparent' },
              ]}>
                <Text style={[styles.wordChipText, { color: isNew ? colors.c1 : '#c0b8d8' }]}>
                  {word}
                </Text>
              </View>
            </Animated.View>
          )
        })}

        {/* Full sentence celebration banner */}
        {done && (
          <Animated.View style={[styles.fullSentenceBanner, { transform: [{ scale: stairAnim }] }]}>
            <Text style={styles.checkBig}>⭐</Text>
            <Text style={styles.fullSentenceText}>
              {current.words.join(' ')}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: colors.c1 }]} />
      </View>
      <Text style={styles.progressText}>{wordIdx + 1} / {current.words.length} words</Text>

      {/* Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={() => speakSentence(current.words, wordIdx)}
          style={styles.speakBtn}
        >
          <Text style={styles.speakText}>🔊 Read</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleNextWord}
          disabled={done}
          style={[styles.nextBtn, { backgroundColor: done ? '#2a2a4a' : colors.c1 }]}
        >
          <Text style={styles.nextText}>
            {done
              ? '⭐ Done!'
              : wordIdx === current.words.length - 1
              ? 'Finish ✓'
              : 'Next Word →'
            }
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  headerBox: { backgroundColor: '#12112a', borderRadius: 14, padding: 12, width: '100%', gap: 3 },
  headerTitle: { color: '#e0d8f0', fontSize: 15, fontWeight: '800' },
  headerSub: { color: '#6b5d80', fontSize: 12 },
  stairsScroll: { width: '100%', maxHeight: 260 },
  stairsContainer: { paddingVertical: 8, gap: 8 },
  stairRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bullet:       { width: 8, height: 8, borderRadius: 4 },
  bulletHidden: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1e1b36' },
  placeholderLine: { borderWidth: 1, borderColor: '#1e1b36', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  placeholderDots: { color: '#252540', fontSize: 14, letterSpacing: 3 },
  wordChip: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderColor: '#2a2a4a' },
  wordChipText: { fontSize: 17, fontWeight: '700' },
  fullSentenceBanner: { backgroundColor: 'rgba(67,233,123,0.1)', borderRadius: 14, padding: 14, marginTop: 10, borderWidth: 1.5, borderColor: '#43E97B50', alignItems: 'center', gap: 6 },
  checkBig: { fontSize: 28 },
  fullSentenceText: { color: '#43E97B', fontSize: 16, fontWeight: '700', textAlign: 'center', lineHeight: 24 },
  progressBar: { width: '100%', height: 6, backgroundColor: '#1e1b36', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { color: '#4a4a6a', fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 10, width: '100%' },
  speakBtn: { flex: 1, backgroundColor: '#1a1a35', borderRadius: 14, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a4a' },
  speakText: { color: '#8a7aaa', fontSize: 13, fontWeight: '600' },
  nextBtn: { flex: 2, borderRadius: 14, padding: 13, alignItems: 'center' },
  nextText: { color: '#fff', fontSize: 14, fontWeight: '800' },
})
