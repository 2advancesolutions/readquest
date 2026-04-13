/**
 * SentenceEnder — K-grade game
 * Source: SentenceMechanics-2-*.pdf + wk201.pdf p.2
 *
 * Exercise: Read the sentence — pick the correct ending punctuation: . ? !
 * Matches the PDF rule: period = telling, question mark = asking, exclamation = exciting.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { getSentenceEnderItems, shuffle, type SentenceEnderItem } from '../data/wordBanks'
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

const PUNCT_OPTIONS: Array<'.' | '?' | '!'> = ['.', '?', '!']

const PUNCT_META = {
  '.': { label: 'Period',          desc: 'Telling sentence',  emoji: '📢', color: '#10B981' },
  '?': { label: 'Question Mark',   desc: 'Asking sentence',   emoji: '🤔', color: '#3B82F6' },
  '!': { label: 'Exclamation Mark',desc: 'Exciting sentence', emoji: '🎉', color: '#F59E0B' },
}

export default function SentenceEnder({ grade, onCorrect, onWrong, questionIndex, colors }: Props) {
  const [current, setCurrent]   = useState<SentenceEnderItem | null>(null)
  const [selected, setSelected] = useState<'.' | '?' | '!' | null>(null)
  const [revealed, setRevealed] = useState(false)

  const wordScale  = useRef(new Animated.Value(1)).current
  const scaleAnims = useRef(PUNCT_OPTIONS.map(() => new Animated.Value(1))).current

  const loadQuestion = useCallback(() => {
    const items = shuffle(getSentenceEnderItems(Math.max(0, grade)))
    const item  = items[questionIndex % items.length]
    setCurrent(item)
    setSelected(null)
    setRevealed(false)
    wordScale.setValue(0.8)
    Animated.spring(wordScale, { toValue: 1, useNativeDriver: true, damping: 14 }).start()
  }, [grade, questionIndex])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  const handlePick = (punct: '.' | '?' | '!', idx: number) => {
    if (revealed || !current) return
    sfx(playTileSelect)
    Animated.sequence([
      Animated.timing(scaleAnims[idx], { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnims[idx], { toValue: 1.0, duration: 120, useNativeDriver: true }),
    ]).start()
    setSelected(punct)
    setRevealed(true)
    if (punct === current.correct) {
      setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 200)
    } else {
      setTimeout(() => { sfx(playWrongBuzz); onWrong() }, 200)
    }
  }

  if (!current) return null

  return (
    <View style={styles.root}>
      {/* Rule reminder */}
      <View style={styles.rulesBox}>
        <Text style={styles.rulesTitle}>💡 Remember:</Text>
        <View style={styles.ruleRow}>
          <Text style={[styles.ruleSymbol, { color: PUNCT_META['.'].color }]}>.</Text>
          <Text style={styles.ruleText}>Telling sentence (statement)</Text>
        </View>
        <View style={styles.ruleRow}>
          <Text style={[styles.ruleSymbol, { color: PUNCT_META['?'].color }]}>?</Text>
          <Text style={styles.ruleText}>Asking sentence (question)</Text>
        </View>
        <View style={styles.ruleRow}>
          <Text style={[styles.ruleSymbol, { color: PUNCT_META['!'].color }]}>!</Text>
          <Text style={styles.ruleText}>Exciting sentence (exclamation)</Text>
        </View>
      </View>

      {/* Sentence display */}
      <Animated.View style={[styles.sentenceCard, { borderColor: `${colors.c1}40`, transform: [{ scale: wordScale }] }]}>
        <Text style={styles.sentenceLabel}>Complete this sentence:</Text>
        <Text style={styles.sentenceText}>
          {current.sentence}
          <Text style={[styles.blankPunct, { color: revealed ? PUNCT_META[current.correct].color : '#4a4a6a' }]}>
            {revealed ? current.correct : ' ___'}
          </Text>
        </Text>
      </Animated.View>

      {/* Punctuation buttons */}
      <View style={styles.punctRow}>
        {PUNCT_OPTIONS.map((punct, idx) => {
          const meta = PUNCT_META[punct]
          const isCorrect  = revealed && punct === current.correct
          const isWrong    = revealed && selected === punct && punct !== current.correct
          const isSelected = selected === punct
          return (
            <Animated.View key={punct} style={[styles.punctWrapper, { transform: [{ scale: scaleAnims[idx] }] }]}>
              <TouchableOpacity
                onPress={() => handlePick(punct, idx)}
                disabled={revealed}
                style={[
                  styles.punctBtn,
                  { borderColor: isCorrect ? meta.color : isWrong ? '#ef4444' : '#2a2a4a' },
                  isCorrect && { backgroundColor: `${meta.color}20` },
                  isWrong   && { backgroundColor: 'rgba(239,68,68,0.12)' },
                  !revealed && { backgroundColor: '#1e1b36' },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.punctSymbol, { color: isCorrect ? meta.color : isWrong ? '#ef4444' : '#e0d8f0' }]}>
                  {punct}
                </Text>
                <Text style={[styles.punctLabel, { color: isCorrect ? meta.color : '#6b5d80' }]}>
                  {meta.label}
                </Text>
                <Text style={styles.punctEmoji}>{meta.emoji}</Text>
              </TouchableOpacity>
            </Animated.View>
          )
        })}
      </View>

      {/* Hint / explanation */}
      {revealed && (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>{current.hint}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingHorizontal: 16, gap: 14 },
  rulesBox: { backgroundColor: '#12112a', borderRadius: 14, padding: 12, width: '100%', gap: 5 },
  rulesTitle: { color: '#8a7aaa', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleSymbol: { fontSize: 18, fontWeight: '900', width: 20, textAlign: 'center' },
  ruleText: { color: '#6b5d80', fontSize: 12 },
  sentenceCard: {
    backgroundColor: '#1a1232', borderWidth: 2, borderRadius: 18,
    paddingHorizontal: 24, paddingVertical: 20, width: '100%', gap: 8,
  },
  sentenceLabel: { color: '#6b5d80', fontSize: 12, fontWeight: '600' },
  sentenceText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 34, flexWrap: 'wrap' },
  blankPunct: { fontSize: 26, fontWeight: '900' },
  punctRow: { flexDirection: 'row', gap: 10, width: '100%' },
  punctWrapper: { flex: 1 },
  punctBtn: {
    borderWidth: 2, borderRadius: 16, paddingVertical: 18, alignItems: 'center', gap: 4,
  },
  punctSymbol: { fontSize: 36, fontWeight: '900', lineHeight: 40 },
  punctLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  punctEmoji: { fontSize: 16 },
  hintBox: { backgroundColor: '#1a1a35', borderRadius: 12, padding: 12, width: '100%' },
  hintText: { color: '#ADA3B8', fontSize: 13, textAlign: 'center', lineHeight: 18 },
})
