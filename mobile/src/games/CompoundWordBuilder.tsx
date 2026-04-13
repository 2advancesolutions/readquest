/**
 * CompoundWordBuilder — K-grade game
 * Source: wk201.pdf pp.78/87/94 (Starfall compound word exercises)
 *
 * Exercise: Add two words to make a new compound word.
 * Tap the two word tiles in order — they snap together to form the new word.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { getCompoundItems, shuffle, type CompoundItem } from '../data/wordBanks'
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

export default function CompoundWordBuilder({ grade, onCorrect, onWrong, questionIndex, colors }: Props) {
  const [current, setCurrent]       = useState<CompoundItem | null>(null)
  const [revealed, setRevealed]     = useState(false)
  const [phase, setPhase]           = useState<'pick-first' | 'pick-second' | 'done'>('pick-first')
  const [options, setOptions]       = useState<string[]>([])
  const [firstPick, setFirstPick]   = useState<string | null>(null)
  const [wrongTap, setWrongTap]     = useState<string | null>(null)

  // Animations
  const wordScale   = useRef(new Animated.Value(1)).current
  const resultScale = useRef(new Animated.Value(0)).current
  const tileAnims   = useRef<Animated.Value[]>([]).current

  const loadQuestion = useCallback(() => {
    const items = shuffle(getCompoundItems(Math.max(0, grade)))
    const item  = items[questionIndex % items.length]
    setCurrent(item)
    setPhase('pick-first')
    setFirstPick(null)
    setRevealed(false)
    setWrongTap(null)
    resultScale.setValue(0)

    // Build 4-tile option pool: correct parts + 2 distractors
    const pool = shuffle(getCompoundItems(Math.max(0, grade)))
    const distractors = pool
      .filter(c => c.combined !== item.combined)
      .slice(0, 2)
      .flatMap(c => [c.part1, c.part2])
    const all = shuffle([item.part1, item.part2, ...distractors.slice(0, 2)])
    setOptions(all)

    wordScale.setValue(0.6)
    Animated.spring(wordScale, { toValue: 1, useNativeDriver: true, damping: 12 }).start()
  }, [grade, questionIndex])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  const handleTile = (word: string) => {
    if (!current || revealed) return
    sfx(playTileSelect)

    if (phase === 'pick-first') {
      if (word === current.part1) {
        setFirstPick(word)
        setPhase('pick-second')
        setWrongTap(null)
      } else {
        // Wrong first word
        setWrongTap(word)
        sfx(playWrongBuzz)
        setTimeout(() => setWrongTap(null), 600)
        onWrong()
      }
    } else if (phase === 'pick-second') {
      if (word === current.part2) {
        // Correct!
        setPhase('done')
        setRevealed(true)
        Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, damping: 10 }).start()
        setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 300)
      } else {
        setWrongTap(word)
        sfx(playWrongBuzz)
        setTimeout(() => setWrongTap(null), 600)
        onWrong()
      }
    }
  }

  if (!current) return null

  const getTileStyle = (word: string) => {
    if (word === firstPick && phase === 'pick-second') {
      return { backgroundColor: `${colors.c1}22`, borderColor: colors.c1 }
    }
    if (word === wrongTap) {
      return { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' }
    }
    if (revealed && (word === current.part1 || word === current.part2)) {
      return { backgroundColor: 'rgba(67,233,123,0.15)', borderColor: '#43E97B' }
    }
    return { backgroundColor: '#1e1b36', borderColor: '#2a2a4a' }
  }

  return (
    <View style={styles.root}>
      {/* Instruction */}
      <View style={styles.instructionBox}>
        <Text style={styles.instructionTitle}>🧩 Build a compound word!</Text>
        <Text style={styles.instructionSub}>
          {phase === 'pick-first'
            ? `Tap the FIRST word part`
            : phase === 'pick-second'
            ? `Great! Now tap the SECOND part to complete "${current.part1 + '+ ?'}"`
            : `You built a new word! 🎉`}
        </Text>
      </View>

      {/* Progress display */}
      <View style={styles.combineRow}>
        <View style={[styles.partBox, phase !== 'pick-first' && { borderColor: colors.c1, backgroundColor: `${colors.c1}15` }]}>
          <Text style={[styles.partText, { color: phase !== 'pick-first' ? colors.c1 : '#6b5d80' }]}>
            {firstPick ?? '?'}
          </Text>
        </View>
        <Text style={styles.plusText}>+</Text>
        <View style={[styles.partBox, revealed && { borderColor: '#43E97B', backgroundColor: 'rgba(67,233,123,0.1)' }]}>
          <Text style={[styles.partText, { color: revealed ? '#43E97B' : '#6b5d80' }]}>
            {revealed ? current.part2 : '?'}
          </Text>
        </View>
        <Text style={styles.plusText}>=</Text>
        <View style={[styles.partBox, styles.resultBox, revealed && { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.12)' }]}>
          <Text style={[styles.partText, { color: revealed ? '#f59e0b' : '#2a2a4a', fontWeight: '800' }]}>
            {revealed ? current.combined : '?'}
          </Text>
        </View>
      </View>

      {/* Word tiles */}
      <View style={styles.tilesGrid}>
        {options.map((word, i) => {
          const ts = getTileStyle(word)
          const isUsed = word === firstPick && phase === 'pick-second'
          const isRevealed = revealed && (word === current.part1 || word === current.part2)
          return (
            <TouchableOpacity
              key={`${word}-${i}`}
              onPress={() => handleTile(word)}
              disabled={revealed || isUsed}
              style={[styles.tile, ts, (isUsed || isRevealed) && { opacity: 0.6 }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tileText, { color: word === wrongTap ? '#ef4444' : isUsed ? colors.c1 : isRevealed ? '#43E97B' : '#e0d8f0' }]}>
                {word}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Example hint */}
      <Text style={styles.hintText}>
        e.g. snow + man = <Text style={{ color: colors.c1, fontWeight: '700' }}>snowman</Text>
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingHorizontal: 16, gap: 14 },
  instructionBox: { backgroundColor: '#1a1a35', borderRadius: 16, padding: 14, width: '100%', gap: 4 },
  instructionTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  instructionSub: { color: '#8a7aaa', fontSize: 13 },
  combineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%' },
  partBox: { flex: 1, borderWidth: 2, borderColor: '#2a2a4a', borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: '#1a1a35' },
  resultBox: { flex: 1.4 },
  partText: { fontSize: 16, fontWeight: '700' },
  plusText: { color: '#4a4a6a', fontSize: 18, fontWeight: '800' },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%', justifyContent: 'center' },
  tile: { borderWidth: 2, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 16, minWidth: '45%', alignItems: 'center' },
  tileText: { fontSize: 18, fontWeight: '700' },
  hintText: { color: '#4a4a6a', fontSize: 12 },
})
