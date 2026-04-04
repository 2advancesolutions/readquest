/**
 * PhonicsPower — React Native port
 * window.speechSynthesis → expo-speech (already installed)
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { googleSpeak, googleStop } from '../lib/tts'
import { getPhonicItems, shuffle, type PhonicsItem } from '../data/wordBanks'
import { sfx, isSfxMuted, playTileSelect, playCorrectChime, playWrongBuzz } from '../lib/gameAudio'

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

export default function PhonicsPower({ grade, level, onCorrect, onWrong, questionIndex, colors }: Props) {
  const [item, setItem] = useState<PhonicsItem | null>(null)
  const [choices, setChoices] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [playing, setPlaying] = useState(false)

  const speakerScale = useRef(new Animated.Value(1)).current
  const scaleAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(1))).current

  const loadQuestion = useCallback(() => {
    const items = getPhonicItems(Math.min(grade, 2))
    const q = items[questionIndex % items.length]
    setItem(q)
    setChoices(shuffle(q.choices))
    setSelected(null)
    setRevealed(false)
    setPlaying(false)
  }, [grade, level, questionIndex])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  // Auto-play on load
  useEffect(() => {
    if (item) {
      const t = setTimeout(() => speakPrompt(item.prompt), 600)
      return () => clearTimeout(t)
    }
  }, [item])

  const speakPrompt = async (text: string) => {
    if (isSfxMuted()) return
    try {
      void googleStop()
      setPlaying(true)
      // Animate speaker ring
      Animated.loop(
        Animated.sequence([
          Animated.timing(speakerScale, { toValue: 1.15, duration: 400, useNativeDriver: true }),
          Animated.timing(speakerScale, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        { iterations: 3 }
      ).start()
      await googleSpeak(text, 'word', () => setPlaying(false))
    } catch {
      setPlaying(false)
    }
  }

  const handleChoice = (answer: string, idx: number) => {
    if (revealed || !item) return
    sfx(playTileSelect)

    Animated.sequence([
      Animated.timing(scaleAnims[idx], { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnims[idx], { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start()

    setSelected(answer)
    setRevealed(true)
    if (answer === item.answer) {
      setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 200)
    } else {
      setTimeout(() => { sfx(playWrongBuzz); onWrong() }, 200)
    }
  }

  if (!item) return null

  const numCols = choices.length <= 3 ? choices.length : 2

  return (
    <View style={styles.root}>
      <Text style={styles.instruction}>Listen to the sound — tap the matching letters</Text>

      {/* Speaker button */}
      <Animated.View style={{ transform: [{ scale: speakerScale }] }}>
        <TouchableOpacity
          style={[styles.speakerBtn, { backgroundColor: `${colors.c1}22`, borderColor: colors.c1 }]}
          onPress={() => item && speakPrompt(item.prompt)}
          activeOpacity={0.8}
        >
          <Text style={styles.speakerEmoji}>{playing ? '🔊' : '🔉'}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Word hint */}
      <View style={[styles.wordHint, { borderColor: `${colors.c1}44` }]}>
        <Text style={[styles.wordHintText, { color: colors.c1 }]}>{item.prompt}</Text>
      </View>

      {/* Answer tiles */}
      <View style={[styles.tilesGrid, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }]}>
        {choices.map((c, idx) => {
          let bgColor = '#1e1b36'
          let borderColor = `${colors.c1}55`
          let textColor = colors.c1
          if (revealed) {
            if (c === item.answer) { bgColor = 'rgba(67,233,123,0.15)'; borderColor = '#43E97B'; textColor = '#43E97B' }
            else if (c === selected) { bgColor = 'rgba(239,68,68,0.15)'; borderColor = '#ef4444'; textColor = '#ef4444' }
          }
          return (
            <Animated.View key={c} style={{ transform: [{ scale: scaleAnims[idx] }] }}>
              <TouchableOpacity
                onPress={() => handleChoice(c, idx)}
                disabled={revealed}
                style={[styles.tile, { backgroundColor: bgColor, borderColor, width: numCols < 3 ? 110 : 80 }]}
                activeOpacity={0.75}
              >
                <Text style={[styles.tileText, { color: textColor }]}>{c}</Text>
              </TouchableOpacity>
            </Animated.View>
          )
        })}
      </View>

      {/* Hear again button */}
      <TouchableOpacity
        onPress={() => item && speakPrompt(item.prompt)}
        style={styles.hearAgainBtn}
      >
        <Text style={styles.hearAgainText}>🔁 Hear Again</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingHorizontal: 16, gap: 18 },
  instruction: { color: 'rgba(204,195,216,0.7)', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  speakerBtn: {
    width: 90, height: 90, borderRadius: 45, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  speakerEmoji: { fontSize: 38 },
  wordHint: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  wordHintText: { fontSize: 22, fontWeight: '700', letterSpacing: 0.5 },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  tile: {
    borderWidth: 2, borderRadius: 14, paddingVertical: 20, paddingHorizontal: 12,
    alignItems: 'center', justifyContent: 'center', minWidth: 70,
  },
  tileText: { fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  hearAgainBtn: {
    borderWidth: 1, borderColor: 'rgba(250,112,154,0.3)', borderRadius: 99,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  hearAgainText: { color: 'rgba(204,195,216,0.5)', fontSize: 13 },
})
