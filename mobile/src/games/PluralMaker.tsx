/**
 * PluralMaker — 1st Grade
 * Source: MagneticReading p.5 — "Word Analysis Lesson 1: Plurals with –s"
 *
 * Show a word + picture — child taps "+ S" to form the plural, then taps
 * the correct plural spelling from 3 options.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { getPluralItems, shuffle, type PluralItem } from '../data/grade1Banks'
import { sfx, playTileSelect, playCorrectChime, playWrongBuzz } from '../lib/gameAudio'
import * as Haptics from 'expo-haptics'

interface Props {
  grade: number; level: number; onCorrect: (xp: number) => void; onWrong: () => void
  questionIndex: number; totalQuestions: number; streak: number; colors: { c1: string; c2: string }
}

function makeFakeplural(word: string): string[] {
  // Generate plausible wrong plurals
  return [
    word + 'es',
    word.slice(0, -1) + 'ies',
    word + word.slice(-1) + 's',
  ].filter(f => f !== word + 's').slice(0, 2)
}

export default function PluralMaker({ grade, onCorrect, onWrong, questionIndex, colors }: Props) {
  const [current, setCurrent]   = useState<PluralItem | null>(null)
  const [phase, setPhase]       = useState<'add-s' | 'pick-word'>('add-s')
  const [choices, setChoices]   = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const wordScale  = useRef(new Animated.Value(1)).current
  const plusSScale = useRef(new Animated.Value(1)).current
  const bounceAnim = useRef(new Animated.Value(0)).current

  // Persistent shuffled queue — never repeats
  const queueRef = useRef<PluralItem[]>([])

  const loadQuestion = useCallback(() => {
    if (queueRef.current.length === 0) {
      queueRef.current = shuffle(getPluralItems(Math.max(1, grade)))
    }
    const item = queueRef.current.shift()!
    setCurrent(item)
    setPhase('add-s')
    setSelected(null)
    setRevealed(false)

    const fakes  = makeFakeplural(item.singular)
    setChoices(shuffle([item.plural, ...fakes]))

    wordScale.setValue(0.7)
    bounceAnim.setValue(0)
    Animated.spring(wordScale, { toValue: 1, useNativeDriver: true, damping: 12 }).start()
  }, [grade])

  useEffect(() => { loadQuestion() }, [questionIndex, grade])

  const handleAddS = () => {
    if (phase !== 'add-s') return
    sfx(playTileSelect)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // Animate the +S button
    Animated.sequence([
      Animated.timing(plusSScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.timing(plusSScale, { toValue: 1.0, duration: 150, useNativeDriver: true }),
    ]).start(() => setPhase('pick-word'))
    // Bounce word
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: -8, duration: 100, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 0,  duration: 140, useNativeDriver: true }),
    ]).start()
  }

  const handleChoiceWord = (word: string) => {
    if (revealed || !current || phase !== 'pick-word') return
    sfx(playTileSelect)
    setSelected(word)
    setRevealed(true)
    if (word === current.plural) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 200)
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setTimeout(() => { sfx(playWrongBuzz); onWrong() }, 200)
    }
  }

  if (!current) return null

  return (
    <View style={styles.root}>
      {/* Rule banner */}
      <View style={styles.ruleBanner}>
        <Text style={styles.ruleText}>📏 Rule: Add <Text style={{ color: colors.c1, fontWeight: '900' }}>–s</Text> to make more than one!</Text>
        <Text style={styles.ruleExample}>bag → <Text style={{ color: colors.c1 }}>bags</Text> · cat → <Text style={{ color: colors.c1 }}>cats</Text></Text>
      </View>

      {/* Word + emoji */}
      <Animated.View style={[styles.wordCard, { borderColor: `${colors.c1}40`, transform: [{ scale: wordScale }, { translateY: bounceAnim }] }]}>
        <Text style={styles.wordEmoji}>{current.emoji}</Text>
        <View style={styles.wordRow}>
          <Text style={[styles.wordText, { color: phase === 'pick-word' ? '#6b5d80' : '#e0d8f0' }]}>
            {current.singular}
          </Text>
          {phase === 'pick-word' && (
            <Text style={[styles.sAdded, { color: colors.c1 }]}>+ s</Text>
          )}
        </View>
        <Text style={styles.wordLabel}>{phase === 'add-s' ? '(1 thing)' : '(more than 1)'}</Text>
      </Animated.View>

      {/* Step indicator */}
      <Text style={styles.stepGuide}>
        {phase === 'add-s'
          ? '👇 Step 1: Tap the button to add –s!'
          : '👇 Step 2: Pick the correct plural word!'
        }
      </Text>

      {/* Add-S button */}
      {phase === 'add-s' && (
        <Animated.View style={{ transform: [{ scale: plusSScale }] }}>
          <TouchableOpacity onPress={handleAddS} style={[styles.addSBtn, { backgroundColor: colors.c1 }]} activeOpacity={0.8}>
            <Text style={styles.addSText}>＋ S</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Word choices */}
      {phase === 'pick-word' && (
        <View style={styles.choices}>
          {choices.map(word => {
            const isCorrect = revealed && word === current.plural
            const isWrong   = revealed && selected === word && word !== current.plural
            return (
              <TouchableOpacity
                key={word}
                onPress={() => handleChoiceWord(word)}
                disabled={revealed}
                style={[
                  styles.choiceBtn,
                  isCorrect && { backgroundColor: 'rgba(67,233,123,0.15)', borderColor: '#43E97B' },
                  isWrong   && { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' },
                  !isCorrect && !isWrong && { backgroundColor: '#1e1b36', borderColor: '#2a2a4a' },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.choiceText, { color: isCorrect ? '#43E97B' : isWrong ? '#ef4444' : '#e0d8f0' }]}>
                  {word}
                </Text>
                {isCorrect && <Text style={styles.check}>✓</Text>}
                {isWrong   && <Text style={styles.cross}>✗</Text>}
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {revealed && (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackText}>
            {selected === current.plural
              ? `✓ "${current.singular}" + s = "${current.plural}" — more than one!`
              : `The plural of "${current.singular}" is "${current.plural}"`
            }
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  ruleBanner: { backgroundColor: '#12112a', borderRadius: 14, padding: 12, width: '100%', gap: 3 },
  ruleText: { color: '#e0d8f0', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  ruleExample: { color: '#6b5d80', fontSize: 12, textAlign: 'center' },
  wordCard: { borderWidth: 2, borderRadius: 20, padding: 20, backgroundColor: '#1a1232', alignItems: 'center', gap: 6, width: '100%' },
  wordEmoji: { fontSize: 50 },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wordText: { fontSize: 44, fontWeight: '800' },
  sAdded: { fontSize: 30, fontWeight: '900' },
  wordLabel: { color: '#4a4a6a', fontSize: 12 },
  stepGuide: { color: '#8a7aaa', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  addSBtn: { borderRadius: 20, paddingHorizontal: 48, paddingVertical: 18 },
  addSText: { color: '#fff', fontSize: 26, fontWeight: '900' },
  choices: { width: '100%', gap: 10 },
  choiceBtn: { borderWidth: 2, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  choiceText: { fontSize: 20, fontWeight: '700' },
  check: { color: '#43E97B', fontSize: 18, fontWeight: '800' },
  cross: { color: '#ef4444', fontSize: 18, fontWeight: '800' },
  feedbackBox: { backgroundColor: '#1a1a35', borderRadius: 12, padding: 12, width: '100%' },
  feedbackText: { color: '#ADA3B8', fontSize: 13, textAlign: 'center', lineHeight: 18 },
})
