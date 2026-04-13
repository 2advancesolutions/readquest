/**
 * SightWordFill — K-grade game
 * Source: wk201.pdf pp.5/20/50/78/94 (Starfall "circle the word" exercises)
 *
 * Exercise: See a sentence with a blank — tap the correct word to fill it in.
 * Directly mirrors the circle-the-word worksheets from the Starfall workbook.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { getSightFillItems, shuffle, type SightFillItem } from '../data/wordBanks'
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

export default function SightWordFill({ grade, onCorrect, onWrong, questionIndex, colors }: Props) {
  const [current, setCurrent]   = useState<SightFillItem | null>(null)
  const [choices, setChoices]   = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const sentenceScale = useRef(new Animated.Value(1)).current
  const scaleAnims    = useRef([0,1,2,3].map(() => new Animated.Value(1))).current

  const loadQuestion = useCallback(() => {
    const items = shuffle(getSightFillItems(Math.max(0, grade)))
    const item  = items[questionIndex % items.length]
    setCurrent(item)
    setChoices(shuffle(item.choices))
    setSelected(null)
    setRevealed(false)
    sentenceScale.setValue(0.85)
    Animated.spring(sentenceScale, { toValue: 1, useNativeDriver: true, damping: 13 }).start()
  }, [grade, questionIndex])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  const handleChoice = (word: string, idx: number) => {
    if (selected || !current) return
    sfx(playTileSelect)
    Animated.sequence([
      Animated.timing(scaleAnims[idx], { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnims[idx], { toValue: 1.0, duration: 120, useNativeDriver: true }),
    ]).start()
    setSelected(word)
    setRevealed(true)
    if (word === current.correct) {
      setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 150)
    } else {
      setTimeout(() => { sfx(playWrongBuzz); onWrong() }, 150)
    }
  }

  if (!current) return null

  // Render sentence with the blank replaced
  const renderSentence = () => {
    if (!revealed) {
      // Show blank as underline
      const parts = current.sentence.split('___')
      return (
        <Text style={styles.sentenceText}>
          {parts[0]}
          <Text style={[styles.blank, { color: colors.c1, borderBottomColor: colors.c1 }]}>{'  ?  '}</Text>
          {parts[1] ?? ''}
        </Text>
      )
    }
    // Show filled sentence
    const filled = current.sentence.replace('___', current.correct)
    return (
      <Text style={styles.sentenceText}>
        {filled.split(current.correct)[0]}
        <Text style={[styles.filledWord, { color: selected === current.correct ? '#43E97B' : '#ef4444' }]}>
          {current.correct}
        </Text>
        {filled.split(current.correct)[1]}
      </Text>
    )
  }

  return (
    <View style={styles.root}>
      {/* Instruction */}
      <Text style={styles.prompt}>📝 Fill in the blank!</Text>
      <Text style={styles.subPrompt}>Tap the word that best completes the sentence.</Text>

      {/* Sentence card */}
      <Animated.View style={[styles.sentenceCard, { borderColor: `${colors.c1}33`, transform: [{ scale: sentenceScale }] }]}>
        {renderSentence()}
      </Animated.View>

      {/* Word choices */}
      <View style={styles.choices}>
        {choices.map((word, idx) => {
          let bg     = '#1e1b36'
          let border = '#2a2a4a'
          let color  = '#e0d8f0'
          if (revealed) {
            if (word === current.correct) {
              bg = 'rgba(67,233,123,0.15)'; border = '#43E97B'; color = '#43E97B'
            } else if (word === selected) {
              bg = 'rgba(239,68,68,0.15)';  border = '#ef4444'; color = '#ef4444'
            }
          }
          return (
            <Animated.View key={`${word}-${idx}`} style={{ flex: 1, transform: [{ scale: scaleAnims[idx] }] }}>
              <TouchableOpacity
                onPress={() => handleChoice(word, idx)}
                disabled={!!revealed}
                style={[styles.choiceBtn, { backgroundColor: bg, borderColor: border }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.choiceText, { color }]}>{word}</Text>
                {revealed && word === current.correct && <Text style={styles.check}>✓</Text>}
                {revealed && word === selected && word !== current.correct && <Text style={styles.cross}>✗</Text>}
              </TouchableOpacity>
            </Animated.View>
          )
        })}
      </View>

      {/* Compete sentence reveal */}
      {revealed && (
        <View style={styles.fullSentenceBox}>
          <Text style={styles.fullSentenceLabel}>Complete sentence:</Text>
          <Text style={[styles.fullSentenceText, { color: selected === current.correct ? '#43E97B' : '#ef4444' }]}>
            {current.sentence.replace('___', current.correct)}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingHorizontal: 16, gap: 14 },
  prompt: { color: '#e0d8f0', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  subPrompt: { color: '#6b5d80', fontSize: 12, textAlign: 'center', marginTop: -8 },
  sentenceCard: {
    backgroundColor: '#1a1232', borderWidth: 2, borderRadius: 20,
    paddingHorizontal: 24, paddingVertical: 22, width: '100%',
    minHeight: 90, justifyContent: 'center',
  },
  sentenceText: { color: '#fff', fontSize: 22, fontWeight: '600', lineHeight: 34, textAlign: 'center' },
  blank: { fontWeight: '800', textDecorationLine: 'underline', letterSpacing: 4 },
  filledWord: { fontWeight: '900' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' },
  choiceBtn: {
    borderWidth: 1.5, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: '30%',
  },
  choiceText: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  check: { color: '#43E97B', fontSize: 16, fontWeight: '800' },
  cross: { color: '#ef4444', fontSize: 16, fontWeight: '800' },
  fullSentenceBox: { backgroundColor: '#1a1a35', borderRadius: 12, padding: 12, width: '100%', gap: 4 },
  fullSentenceLabel: { color: '#6b5d80', fontSize: 11, fontWeight: '600' },
  fullSentenceText: { fontSize: 16, fontWeight: '700', lineHeight: 24 },
})
