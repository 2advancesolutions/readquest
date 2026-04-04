/**
 * ContextClues — React Native port
 * HTML <mark> element → inline Text span with color.
 * Sentence with *target* → split into parts and highlight.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { getContextItems, shuffle, type ContextItem } from '../data/wordBanks'
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

const CLUE_TYPE_LABELS: Record<string, string> = {
  definition: '📖 Definition Clue',
  synonym:    '🔄 Synonym Clue',
  antonym:    '⚡ Contrast Clue',
  example:    '🌟 Example Clue',
  inference:  '🔍 Inference Clue',
}

export default function ContextClues({ grade, level, onCorrect, onWrong, questionIndex }: Props) {
  const [item, setItem] = useState<ContextItem | null>(null)
  const [choices, setChoices] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const sentenceAnim = useRef(new Animated.Value(0)).current
  const scaleAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(1))).current

  const loadQuestion = useCallback(() => {
    const items = getContextItems(grade)
    const q = items[questionIndex % items.length]
    setItem(q)
    setChoices(shuffle(q.choices))
    setSelected(null)
    setRevealed(false)

    // Slide sentence in
    sentenceAnim.setValue(0)
    Animated.timing(sentenceAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start()
  }, [grade, level, questionIndex])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  const handleChoice = (choice: string, idx: number) => {
    if (revealed || !item) return
    sfx(playTileSelect)

    Animated.sequence([
      Animated.timing(scaleAnims[idx], { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnims[idx], { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start()

    setSelected(choice)
    setRevealed(true)
    if (choice === item.correct) {
      setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 200)
    } else {
      setTimeout(() => { sfx(playWrongBuzz); onWrong() }, 200)
    }
  }

  if (!item) return null

  // Render sentence with target word highlighted
  const renderSentence = (sentence: string, target: string) => {
    const parts = sentence.split(`*${target}*`)
    return (
      <Text style={styles.sentenceText}>
        {parts[0]}
        <Text style={styles.highlightedWord}>{target}</Text>
        {parts[1] || ''}
      </Text>
    )
  }

  return (
    <View style={styles.root}>
      <Text style={styles.icon}>🔍</Text>

      {/* Clue type badge */}
      <View style={styles.clueBadge}>
        <Text style={styles.clueBadgeText}>{CLUE_TYPE_LABELS[item.clueType] ?? item.clueType}</Text>
      </View>

      {/* Sentence */}
      <Animated.View style={[styles.sentenceBox, {
        opacity: sentenceAnim,
        transform: [{ translateY: sentenceAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }]}>
        {renderSentence(item.sentence, item.targetWord)}
      </Animated.View>

      {/* Question */}
      <Text style={styles.question}>
        What does <Text style={styles.targetInQuestion}>&ldquo;{item.targetWord}&rdquo;</Text> most likely mean?
      </Text>

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
  icon: { fontSize: 36 },
  clueBadge: {
    backgroundColor: 'rgba(102,126,234,0.2)', borderWidth: 1, borderColor: 'rgba(102,126,234,0.4)',
    borderRadius: 99, paddingHorizontal: 14, paddingVertical: 5,
  },
  clueBadgeText: { color: '#9db4ff', fontSize: 12, fontWeight: '700' },
  sentenceBox: {
    width: '100%', backgroundColor: 'rgba(102,126,234,0.08)',
    borderWidth: 1, borderColor: 'rgba(102,126,234,0.3)',
    borderRadius: 16, padding: 16,
  },
  sentenceText: { color: '#c8c0e0', fontSize: 15, lineHeight: 24 },
  highlightedWord: {
    backgroundColor: 'rgba(192,132,252,0.25)', color: '#c084fc', fontWeight: '800',
    borderRadius: 4,
  },
  question: { color: 'rgba(204,195,216,0.8)', fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  targetInQuestion: { color: '#c084fc', fontWeight: '800' },
  choices: { width: '100%', gap: 10 },
  choiceBtn: {
    borderWidth: 1.5, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16,
  },
  choiceText: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
})
