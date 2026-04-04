/**
 * GrammarGalaxy — React Native port
 * Fix the broken sentence — pick the correct version.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { getGrammarItems, shuffle, type GrammarItem } from '../data/wordBanks'
import { sfx, playTileSelect, playCorrectChime, playWrongBuzz } from '../lib/gameAudio'

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

export default function GrammarGalaxy({ grade, level, onCorrect, onWrong, questionIndex, colors }: Props) {
  const [item, setItem] = useState<GrammarItem | null>(null)
  const [choices, setChoices] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const explainAnim = useRef(new Animated.Value(0)).current
  const scaleAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(1))).current

  const loadQuestion = useCallback(() => {
    const items = getGrammarItems(grade)
    const q = items[questionIndex % items.length]
    setItem(q)
    setChoices(shuffle(q.choices))
    setSelected(null)
    setRevealed(false)
    explainAnim.setValue(0)
  }, [grade, level, questionIndex])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  const handleChoice = (choice: string, idx: number) => {
    if (revealed || !item) return
    sfx(playTileSelect)

    Animated.sequence([
      Animated.timing(scaleAnims[idx], { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnims[idx], { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start()

    setSelected(choice)
    setRevealed(true)

    if (choice === item.correct) {
      setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 200)
    } else {
      setTimeout(() => { sfx(playWrongBuzz); onWrong() }, 200)
    }

    // Animate explanation in
    setTimeout(() => {
      Animated.timing(explainAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start()
    }, 250)
  }

  if (!item) return null

  return (
    <View style={styles.root}>
      <Text style={styles.planet}>🪐</Text>
      <Text style={styles.instruction}>Fix the sentence! Pick the correct version:</Text>

      {/* Error sentence */}
      <View style={[styles.errorBox, { borderColor: `${colors.c1}44` }]}>
        <Text style={styles.errorLabel}>Error:</Text>
        <Text style={[styles.errorSentence, { color: '#e0d8f0' }]}>&ldquo;{item.sentence}&rdquo;</Text>
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

      {/* Explanation */}
      {revealed && (
        <Animated.View style={[styles.explanation, { opacity: explainAnim }]}>
          <Text style={styles.explanationText}>
            💡 <Text style={styles.boldText}>Why?</Text> {item.explanation}
          </Text>
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 16, gap: 14, alignItems: 'center' },
  planet: { fontSize: 42 },
  instruction: { color: 'rgba(204,195,216,0.7)', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  errorBox: {
    width: '100%', backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1, borderRadius: 14, padding: 16, gap: 4,
  },
  errorLabel: { color: '#ef4444', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  errorSentence: { fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  choices: { width: '100%', gap: 10 },
  choiceBtn: {
    borderWidth: 1.5, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16,
  },
  choiceText: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  explanation: {
    width: '100%', backgroundColor: 'rgba(161,140,209,0.12)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(161,140,209,0.3)',
    padding: 14,
  },
  explanationText: { color: 'rgba(204,195,216,0.85)', fontSize: 13, lineHeight: 18 },
  boldText: { fontWeight: '700', color: '#B28CFF' },
})
