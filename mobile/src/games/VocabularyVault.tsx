/**
 * VocabularyVault — React Native port
 * Match words to definitions to unlock the vault!
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet, ScrollView } from 'react-native'
import { getVocabItems, shuffle, type VocabPair } from '../data/wordBanks'
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

const PAIRS_COUNT = (level: number) =>
  level <= 25 ? 3 : level <= 50 ? 4 : level <= 75 ? 5 : 6

export default function VocabularyVault({ grade, level, onCorrect, onWrong, questionIndex }: Props) {
  const [pairs, setPairs] = useState<VocabPair[]>([])
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [wrongPair, setWrongPair] = useState<string | null>(null)
  const [shuffledDefs, setShuffledDefs] = useState<string[]>([])
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pairsCount = PAIRS_COUNT(level)

  const loadQuestion = useCallback(() => {
    const all = getVocabItems(grade)
    const shuffledAll = shuffle(all)
    const selected = shuffledAll.slice(0, pairsCount)
    setPairs(selected)
    setShuffledDefs(shuffle(selected.map(p => p.definition)))
    setSelectedWord(null)
    setMatched(new Set())
    setWrongPair(null)
  }, [grade, level, pairsCount])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  const handleWord = (word: string) => {
    if (matched.has(word)) return
    sfx(playTileSelect)
    setSelectedWord(prev => prev === word ? null : word)
  }

  const handleDef = (def: string) => {
    if (!selectedWord) return
    const pair = pairs.find(p => p.word === selectedWord)
    if (!pair) return
    sfx(playTileSelect)

    if (pair.definition === def) {
      const newMatched = new Set(matched)
      newMatched.add(selectedWord)
      setMatched(newMatched)
      setSelectedWord(null)
      sfx(playCorrectChime)
      if (newMatched.size >= pairs.length) {
        setTimeout(() => onCorrect(0), 400)
      }
    } else {
      setWrongPair(selectedWord)
      sfx(playWrongBuzz)
      onWrong()
      if (wrongTimer.current) clearTimeout(wrongTimer.current)
      wrongTimer.current = setTimeout(() => {
        setWrongPair(null)
        setSelectedWord(null)
      }, 800)
    }
  }

  const matchedCount = matched.size

  return (
    <View style={styles.root}>
      <Text style={styles.icon}>🔐</Text>
      <Text style={styles.instruction}>Match each word to its definition to unlock the vault!</Text>

      {/* Progress */}
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>{matchedCount}/{pairs.length} matched</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(matchedCount / pairs.length) * 100}%` }]} />
        </View>
      </View>

      <View style={styles.grid}>
        {/* Words column */}
        <View style={styles.col}>
          <Text style={styles.colLabel}>WORDS</Text>
          {pairs.map(p => {
            const isMatched = matched.has(p.word)
            const isSelected = selectedWord === p.word
            const isWrong = wrongPair === p.word
            let bgColor = '#1e1b36'
            let borderColor = '#2a2a4a'
            let textColor = '#e0d8f0'
            if (isMatched) { bgColor = 'rgba(67,233,123,0.12)'; borderColor = '#43E97B'; textColor = '#43E97B' }
            else if (isWrong) { bgColor = 'rgba(239,68,68,0.12)'; borderColor = '#ef4444'; textColor = '#ef4444' }
            else if (isSelected) { bgColor = 'rgba(112,42,225,0.2)'; borderColor = '#702AE1'; textColor = '#B28CFF' }

            return (
              <TouchableOpacity
                key={p.word}
                onPress={() => !isMatched && handleWord(p.word)}
                disabled={isMatched}
                style={[styles.item, { backgroundColor: bgColor, borderColor }]}
                activeOpacity={0.75}
              >
                <Text style={[styles.itemText, { color: textColor }]} numberOfLines={1}>
                  {isMatched ? '✓ ' : ''}{p.word}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Definitions column */}
        <View style={[styles.col, { flex: 1.6 }]}>
          <Text style={[styles.colLabel, { color: 'rgba(56,249,215,0.7)' }]}>DEFINITIONS</Text>
          {shuffledDefs.map(def => {
            const matchingPair = pairs.find(p => p.definition === def)
            const isMatched = matchingPair ? matched.has(matchingPair.word) : false
            let bgColor = '#1e1b36'
            let borderColor = '#2a2a4a'
            let textColor = '#8a7aaa'
            if (isMatched) { bgColor = 'rgba(67,233,123,0.12)'; borderColor = '#43E97B'; textColor = '#43E97B' }
            else if (selectedWord) { bgColor = 'rgba(56,249,215,0.05)'; borderColor = 'rgba(56,249,215,0.3)'; textColor = '#e0d8f0' }

            return (
              <TouchableOpacity
                key={def}
                onPress={() => !isMatched && selectedWord && handleDef(def)}
                disabled={isMatched || !selectedWord}
                style={[styles.item, { backgroundColor: bgColor, borderColor }]}
                activeOpacity={0.75}
              >
                <Text style={[styles.itemDefText, { color: textColor }]} numberOfLines={3}>
                  {isMatched ? '✓ ' : ''}{def}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 16, gap: 12, alignItems: 'center' },
  icon: { fontSize: 36 },
  instruction: { color: 'rgba(204,195,216,0.7)', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  progressRow: { width: '100%', gap: 4 },
  progressText: { color: '#8a7aaa', fontSize: 11, fontWeight: '700' },
  progressTrack: { height: 4, backgroundColor: '#1e1b36', borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: '#43E97B', borderRadius: 2 },
  grid: { flexDirection: 'row', width: '100%', gap: 10 },
  col: { flex: 1, gap: 8 },
  colLabel: { color: 'rgba(67,233,123,0.7)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  item: {
    borderWidth: 1.5, borderRadius: 10, padding: 10, minHeight: 44,
    justifyContent: 'center',
  },
  itemText: { fontSize: 13, fontWeight: '700' },
  itemDefText: { fontSize: 11, fontWeight: '500', lineHeight: 16 },
})
