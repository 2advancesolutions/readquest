/**
 * OppositeFinder — K-grade game
 * Source: wk201.pdf pp.72 & 92 (Starfall "circle the opposite" exercises)
 *
 * Exercise: Look at the word — find its opposite (antonym).
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { getOppositeItems, shuffle, type OppositeItem } from '../data/wordBanks'
import { sfx, playTileSelect, playCorrectChime, playWrongBuzz, playHintReveal } from '../lib/gameAudio'
import { Alert } from 'react-native'

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

export default function OppositeFinder({ grade, level, onCorrect, onWrong, questionIndex, colors }: Props) {
  const [current, setCurrent]   = useState<OppositeItem | null>(null)
  const [choices, setChoices]   = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const wordScale   = useRef(new Animated.Value(1)).current
  const scaleAnims  = useRef([0,1,2,3].map(() => new Animated.Value(1))).current

  const loadQuestion = useCallback(() => {
    const items = shuffle(getOppositeItems(Math.max(0, grade)))
    const item  = items[questionIndex % items.length]
    setCurrent(item)
    setChoices(shuffle(item.choices))
    setSelected(null)
    setRevealed(false)
    wordScale.setValue(0.5)
    Animated.spring(wordScale, { toValue: 1, useNativeDriver: true, damping: 12 }).start()
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

  const handleHint = () => {
    if (!current) return
    sfx(playHintReveal)
    Alert.alert('💡 Hint', `The opposite of "${current.word}" starts with "${current.correct[0].toUpperCase()}"`)
  }

  if (!current) return null

  return (
    <View style={styles.root}>
      {/* Instruction */}
      <Text style={styles.prompt}>🔄 Find the opposite!</Text>

      {/* Word display */}
      <Animated.View style={[styles.wordCard, { borderColor: `${colors.c1}55`, transform: [{ scale: wordScale }] }]}>
        <Text style={styles.wordLabel}>opposite of</Text>
        <Text style={[styles.wordText, { color: colors.c1 }]}>{current.word}</Text>
        <Text style={styles.wordLabel}>is…</Text>
      </Animated.View>

      {/* Choices */}
      <View style={styles.choices}>
        {choices.map((word, idx) => {
          let bgColor    = '#1e1b36'
          let borderColor = '#2a2a4a'
          let textColor  = '#e0d8f0'
          if (revealed) {
            if (word === current.correct) {
              bgColor = 'rgba(67,233,123,0.15)'
              borderColor = '#43E97B'
              textColor = '#43E97B'
            } else if (word === selected) {
              bgColor = 'rgba(239,68,68,0.15)'
              borderColor = '#ef4444'
              textColor = '#ef4444'
            }
          }
          return (
            <Animated.View key={word} style={{ transform: [{ scale: scaleAnims[idx] }] }}>
              <TouchableOpacity
                onPress={() => handleChoice(word, idx)}
                disabled={!!revealed}
                style={[styles.choiceBtn, { backgroundColor: bgColor, borderColor }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.choiceText, { color: textColor }]}>{word}</Text>
                {revealed && word === current.correct && <Text style={styles.check}>✓</Text>}
                {revealed && word === selected && word !== current.correct && <Text style={styles.cross}>✗</Text>}
              </TouchableOpacity>
            </Animated.View>
          )
        })}
      </View>

      {!revealed && level < 50 && (
        <TouchableOpacity onPress={handleHint} style={styles.hintBtn}>
          <Text style={styles.hintText}>💡 Hint</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingHorizontal: 16, gap: 16 },
  prompt: { color: 'rgba(204,195,216,0.8)', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  wordCard: {
    borderWidth: 2, borderRadius: 20, paddingHorizontal: 32, paddingVertical: 18,
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', gap: 4,
  },
  wordLabel: { color: '#6b5d80', fontSize: 12, fontWeight: '600' },
  wordText: { fontSize: 44, fontWeight: '800', letterSpacing: 1 },
  choices: { width: '100%', gap: 10 },
  choiceBtn: {
    borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  choiceText: { fontSize: 17, fontWeight: '600' },
  check: { color: '#43E97B', fontSize: 18, fontWeight: '800' },
  cross: { color: '#ef4444', fontSize: 18, fontWeight: '800' },
  hintBtn: {
    borderWidth: 1, borderColor: 'rgba(204,195,216,0.2)', borderRadius: 99,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  hintText: { color: 'rgba(204,195,216,0.5)', fontSize: 13 },
})
