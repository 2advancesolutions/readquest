/**
 * StoryQuiz — 1st Grade Reading Comprehension
 * Source: SpringComprehensionPassages pp.1-2 + MagneticReading p.3
 *
 * Story is ALWAYS visible above the question (worksheet-style).
 * No phase switching — passage stays on screen the whole time.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, Animated, ScrollView, StyleSheet } from 'react-native'
import { getPassageItems, shuffle, type PassageItem, type PassageQuestion } from '../data/grade1Banks'
import { sfx, playTileSelect, playCorrectChime, playWrongBuzz } from '../lib/gameAudio'
import * as Haptics from 'expo-haptics'

interface Props {
  grade: number; level: number; onCorrect: (xp: number) => void; onWrong: () => void
  questionIndex: number; totalQuestions: number; streak: number; colors: { c1: string; c2: string }
}

// Persistent queue so the same story isn't repeated until all are seen
const storyQueueRef: PassageItem[] = []

export default function StoryQuiz({ grade, onCorrect, onWrong, questionIndex, colors }: Props) {
  const [passage, setPassage]   = useState<PassageItem | null>(null)
  const [qIdx, setQIdx]         = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore]       = useState(0)

  const fadeAnim  = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(16)).current

  const loadQuestion = useCallback(() => {
    if (storyQueueRef.length === 0) {
      const items = shuffle(getPassageItems(Math.max(1, grade)))
      storyQueueRef.push(...items)
    }
    const item = storyQueueRef.shift()!
    setPassage(item)
    setQIdx(0)
    setSelected(null)
    setRevealed(false)
    setScore(0)
    fadeAnim.setValue(0)
    slideAnim.setValue(16)
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start()
  }, [grade])

  useEffect(() => { loadQuestion() }, [questionIndex, grade])

  const handleAnswer = (choice: string) => {
    if (revealed || !passage) return
    const q = passage.questions[qIdx]
    sfx(playTileSelect)
    setSelected(choice)
    setRevealed(true)
    const correct = choice === q.correct

    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setScore(s => s + 1)
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      sfx(playWrongBuzz)
    }

    setTimeout(() => {
      const nextQ = qIdx + 1
      if (nextQ >= passage.questions.length) {
        sfx(playCorrectChime)
        setTimeout(() => onCorrect(0), 500)
      } else {
        // Slide next question in
        setQIdx(nextQ)
        setSelected(null)
        setRevealed(false)
        slideAnim.setValue(14)
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start()
      }
    }, 900)
  }

  if (!passage) return null
  const currentQ: PassageQuestion = passage.questions[qIdx]

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

      {/* ── Story passage — always visible ─────────────────────── */}
      <View style={[styles.passageCard, { borderColor: `${colors.c1}35` }]}>
        {/* Title bar */}
        <View style={styles.passageTitleRow}>
          <Text style={styles.passageEmoji}>{passage.emoji}</Text>
          <View>
            <Text style={[styles.passageTitle, { color: colors.c1 }]}>{passage.title}</Text>
            <Text style={styles.passageSubtitle}>📖 Read the story, then answer below</Text>
          </View>
        </View>
        {/* Passage text — scrollable if long */}
        <ScrollView
          style={styles.passageScroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <Text style={styles.passageText}>{passage.passage}</Text>
        </ScrollView>
      </View>

      {/* ── Question + progress ────────────────────────────────── */}
      <View style={styles.questionSection}>
        {/* Question progress dots */}
        <View style={styles.qProgressRow}>
          {passage.questions.map((_, i) => (
            <View key={i} style={[styles.qDot, {
              backgroundColor: i < qIdx
                ? `${colors.c1}70`
                : i === qIdx
                ? colors.c1
                : '#2a2a4a',
              width: i === qIdx ? 22 : 10,
            }]} />
          ))}
          <Text style={styles.qProgressText}>Question {qIdx + 1} of {passage.questions.length}</Text>
        </View>

        {/* Question text */}
        <Animated.View style={[styles.questionBox, { borderColor: `${colors.c1}35`, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.questionText}>
            {qIdx + 1}. {currentQ.question}
          </Text>
        </Animated.View>

        {/* Answer choices */}
        <View style={styles.choices}>
          {currentQ.choices.map((choice, i) => {
            const isCorrect = revealed && choice === currentQ.correct
            const isWrong   = revealed && selected === choice && choice !== currentQ.correct
            return (
              <TouchableOpacity
                key={i}
                onPress={() => handleAnswer(choice)}
                disabled={revealed}
                style={[
                  styles.choiceBtn,
                  isCorrect && { backgroundColor: 'rgba(67,233,123,0.15)', borderColor: '#43E97B' },
                  isWrong   && { backgroundColor: 'rgba(239,68,68,0.12)',  borderColor: '#ef4444' },
                  !isCorrect && !isWrong && { backgroundColor: '#1a1232', borderColor: '#2a2a4a' },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.choiceLetter, {
                  color: isCorrect ? '#43E97B' : isWrong ? '#ef4444' : `${colors.c1}90`,
                }]}>
                  {String.fromCharCode(65 + i)}.
                </Text>
                <Text style={[styles.choiceText, {
                  color: isCorrect ? '#43E97B' : isWrong ? '#ef4444' : '#e0d8f0',
                }]}>
                  {choice}
                </Text>
                {isCorrect && <Text style={styles.checkmark}>✓</Text>}
                {isWrong   && <Text style={styles.crossmark}>✗</Text>}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Score */}
        <Text style={styles.scoreText}>⭐ {score} / {passage.questions.length} correct</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingHorizontal: 14, gap: 10, width: '100%' },

  // Story passage card
  passageCard: {
    width: '100%', backgroundColor: '#12112a', borderRadius: 16,
    borderWidth: 1.5, overflow: 'hidden',
  },
  passageTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#1e1b36',
  },
  passageEmoji: { fontSize: 28 },
  passageTitle: { fontSize: 15, fontWeight: '800' },
  passageSubtitle: { color: '#4a4a6a', fontSize: 11, marginTop: 1 },
  passageScroll: { maxHeight: 150 },
  passageText: { color: '#c8c0dc', fontSize: 14, lineHeight: 22, padding: 14 },

  // Question section
  questionSection: { width: '100%', gap: 9 },
  qProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qDot: { height: 8, borderRadius: 4 },
  qProgressText: { color: '#6b5d80', fontSize: 11, marginLeft: 4 },
  questionBox: {
    backgroundColor: '#1a1232', borderRadius: 13, padding: 13,
    borderWidth: 1.5,
  },
  questionText: { color: '#e0d8f0', fontSize: 15, fontWeight: '700', lineHeight: 22 },
  choices: { gap: 8 },
  choiceBtn: {
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  choiceLetter: { fontSize: 13, fontWeight: '800', width: 18 },
  choiceText: { fontSize: 14, fontWeight: '600', flex: 1 },
  checkmark: { color: '#43E97B', fontSize: 15, fontWeight: '800' },
  crossmark: { color: '#ef4444', fontSize: 15, fontWeight: '800' },
  scoreText: { color: '#4a4a6a', fontSize: 11, textAlign: 'center' },
})
