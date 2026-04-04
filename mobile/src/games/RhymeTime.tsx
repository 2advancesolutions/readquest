/**
 * RhymeTime — React Native port
 * Replaces: framer-motion → Animated, HTML buttons → TouchableOpacity,
 * alert() → Alert.alert()
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, Alert, StyleSheet } from 'react-native'
import { getRhymeItems, shuffle, type RhymePair } from '../data/wordBanks'
import { sfx, playTileSelect, playCorrectChime, playWrongBuzz, playHintReveal } from '../lib/gameAudio'

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

export default function RhymeTime({ grade, level, onCorrect, onWrong, questionIndex, colors }: Props) {
  const [current, setCurrent] = useState<RhymePair | null>(null)
  const [choices, setChoices] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  // Animated values for each choice button
  const scaleAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(1))).current
  const wordScale = useRef(new Animated.Value(1)).current

  const loadQuestion = useCallback(() => {
    const bank = getRhymeItems(grade)
    const shuffled = shuffle(bank)
    const item = shuffled[questionIndex % shuffled.length]
    setCurrent(item)
    const distractorCount = level < 25 ? 2 : 3
    const pickedDistractors = shuffle(item.distractors).slice(0, distractorCount)
    setChoices(shuffle([item.rhyme, ...pickedDistractors]))
    setSelected(null)
    setRevealed(false)

    // Bounce the word in
    wordScale.setValue(0.5)
    Animated.spring(wordScale, { toValue: 1, useNativeDriver: true, damping: 12 }).start()
  }, [grade, level, questionIndex])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  const handleChoice = (word: string, idx: number) => {
    if (selected || !current) return
    sfx(playTileSelect)

    // Press animation
    Animated.sequence([
      Animated.timing(scaleAnims[idx], { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnims[idx], { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start()

    setSelected(word)
    setRevealed(true)
    if (word === current.rhyme) {
      setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 150)
    } else {
      setTimeout(() => { sfx(playWrongBuzz); onWrong() }, 150)
    }
  }

  const handleHint = () => {
    if (!current) return
    sfx(playHintReveal)
    Alert.alert('💡 Hint', `The rhyming word starts with "${current.rhyme[0].toUpperCase()}"`)
  }

  if (!current) return null

  return (
    <View style={styles.root}>
      <Text style={styles.prompt}>Find the word that rhymes with…</Text>

      <Animated.View style={[styles.wordDisplay, { borderColor: `${colors.c1}55`, transform: [{ scale: wordScale }] }]}>
        <Text style={[styles.wordText, { color: colors.c1 }]}>{current.word}</Text>
      </Animated.View>

      <View style={styles.choices}>
        {choices.map((word, idx) => {
          let bgColor = '#1e1b36'
          let borderColor = '#2a2a4a'
          let textColor = '#e0d8f0'
          if (revealed) {
            if (word === current.rhyme) {
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
                {revealed && word === current.rhyme && <Text style={styles.checkmark}>✓</Text>}
                {revealed && word === selected && word !== current.rhyme && <Text style={styles.crossmark}>✗</Text>}
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
  prompt: { color: 'rgba(204,195,216,0.7)', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  wordDisplay: {
    borderWidth: 2, borderRadius: 20, paddingHorizontal: 32, paddingVertical: 18,
    backgroundColor: 'rgba(255,107,157,0.08)',
  },
  wordText: { fontSize: 40, fontWeight: '800', letterSpacing: 1 },
  choices: { width: '100%', gap: 10 },
  choiceBtn: {
    borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  choiceText: { fontSize: 16, fontWeight: '600' },
  checkmark: { color: '#43E97B', fontSize: 18, fontWeight: '800' },
  crossmark: { color: '#ef4444', fontSize: 18, fontWeight: '800' },
  hintBtn: {
    borderWidth: 1, borderColor: 'rgba(255,107,157,0.3)', borderRadius: 99,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  hintText: { color: 'rgba(204,195,216,0.5)', fontSize: 13 },
})
