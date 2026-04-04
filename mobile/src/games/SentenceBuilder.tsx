/**
 * SentenceBuilder — React Native port
 * Drag-to-place becomes tap-to-place (bank → placed, placed → bank)
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet, ScrollView } from 'react-native'
import { getSentenceItems, shuffle, type SentenceItem } from '../data/wordBanks'
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

export default function SentenceBuilder({ grade, level, onCorrect, onWrong, questionIndex, colors }: Props) {
  const [item, setItem] = useState<SentenceItem | null>(null)
  const [bank, setBank] = useState<string[]>([])
  const [placed, setPlaced] = useState<string[]>([])
  const [checked, setChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const checkBtnScale = useRef(new Animated.Value(1)).current

  const loadQuestion = useCallback(() => {
    const items = getSentenceItems(grade)
    const idx = questionIndex % items.length
    const q = items[idx]
    setItem(q)
    setBank(shuffle([...q.words]))
    setPlaced([])
    setChecked(false)
    setIsCorrect(false)
  }, [grade, questionIndex])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  const handleBank = (word: string, i: number) => {
    if (checked) return
    sfx(playTileSelect)
    const newBank = [...bank]
    newBank.splice(i, 1)
    setBank(newBank)
    setPlaced(p => [...p, word])
  }

  const handlePlaced = (word: string, i: number) => {
    if (checked) return
    sfx(playTileSelect)
    const newPlaced = [...placed]
    newPlaced.splice(i, 1)
    setPlaced(newPlaced)
    setBank(b => [...b, word])
  }

  const handleCheck = () => {
    if (!item || placed.length !== item.words.length) return
    const correct = placed.join(' ') === item.words.join(' ')
    setChecked(true)
    setIsCorrect(correct)

    // Bounce check button
    Animated.sequence([
      Animated.timing(checkBtnScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(checkBtnScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start()

    if (correct) {
      setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 300)
    } else {
      setTimeout(() => { sfx(playWrongBuzz); onWrong() }, 300)
    }
  }

  if (!item) return null

  const tileColor = (isPlaced: boolean) => {
    if (!checked) return isPlaced ? colors.c1 : '#2a2a4a'
    return isCorrect ? '#43E97B' : '#ef4444'
  }

  return (
    <View style={styles.root}>
      <Text style={styles.prompt}>Build the sentence — tap words in order</Text>

      {/* Answer slots */}
      <View style={styles.answerArea}>
        {placed.length === 0 ? (
          <Text style={styles.placeholder}>Tap words below to build the sentence</Text>
        ) : (
          <View style={styles.wordRow}>
            {placed.map((w, i) => (
              <TouchableOpacity
                key={i + w}
                onPress={() => handlePlaced(w, i)}
                disabled={checked}
                style={[styles.tile, { backgroundColor: `${tileColor(true)}22`, borderColor: tileColor(true) }]}
              >
                <Text style={[styles.tileText, { color: tileColor(true) }]}>{w}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Word bank */}
      <View style={styles.bankArea}>
        <Text style={styles.bankLabel}>WORD BANK</Text>
        <View style={styles.wordRow}>
          {bank.map((w, i) => (
            <TouchableOpacity
              key={i + w}
              onPress={() => handleBank(w, i)}
              disabled={checked}
              style={[styles.tile, { backgroundColor: '#1e1b36', borderColor: '#2a2a4a' }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tileText, { color: '#e0d8f0' }]}>{w}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Animated.View style={{ transform: [{ scale: checkBtnScale }], width: '100%' }}>
        <TouchableOpacity
          style={[styles.checkBtn, {
            backgroundColor: placed.length === item.words.length && !checked ? colors.c1 : '#1e1b36',
            borderColor: placed.length === item.words.length && !checked ? colors.c1 : '#2a2a4a',
          }]}
          onPress={handleCheck}
          disabled={placed.length !== item.words.length || checked}
        >
          <Text style={[styles.checkBtnText, {
            color: placed.length === item.words.length && !checked ? '#fff' : '#4a3d6a',
          }]}>
            ✓ Check Sentence
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {checked && (
        <View style={[styles.resultBanner, { backgroundColor: isCorrect ? 'rgba(67,233,123,0.15)' : 'rgba(239,68,68,0.15)' }]}>
          <Text style={{ color: isCorrect ? '#43E97B' : '#ef4444', fontWeight: '700', fontSize: 14 }}>
            {isCorrect ? '🎉 Correct! Great sentence!' : `❌ The correct order: "${item.words.join(' ')}"`}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 16, gap: 14 },
  prompt: { color: 'rgba(204,195,216,0.7)', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  answerArea: {
    minHeight: 80, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    borderWidth: 1, borderColor: '#2a2a4a', borderStyle: 'dashed',
    padding: 12, alignItems: 'flex-start', justifyContent: 'center',
  },
  placeholder: { color: 'rgba(204,195,216,0.3)', fontSize: 13 },
  wordRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bankArea: { gap: 8 },
  bankLabel: { color: 'rgba(204,195,216,0.4)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  tile: {
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  tileText: { fontSize: 14, fontWeight: '600' },
  checkBtn: {
    borderWidth: 1.5, borderRadius: 14, paddingVertical: 15, alignItems: 'center',
  },
  checkBtnText: { fontSize: 16, fontWeight: '700' },
  resultBanner: { borderRadius: 10, padding: 12 },
})
