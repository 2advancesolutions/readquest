/**
 * LongYSorter — K-grade game (Coloring Edition)
 * Source: Long-Y-1-*.pdf (Starfall "My Family" workbook)
 *
 * PDF exercise: "Read each word. Color RED if Y sounds like long-I. Color BLUE if Y sounds like long-E."
 *
 * Implementation:
 * - Show the word in a big card
 * - Child picks a color (RED or BLUE) using the color swatches
 * - Taps the word to "color" it — word lights up in that color
 * - Correct = advance, Wrong = feedback + try again
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { getLongYItems, shuffle, type LongYItem } from '../data/wordBanks'
import { sfx, playTileSelect, playCorrectChime, playWrongBuzz } from '../lib/gameAudio'
import TapToHearButton from '../components/TapToHearButton'
import * as Haptics from 'expo-haptics'

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

const LONG_I_COLOR = '#EF4444'  // RED — "color RED if Y sounds like long-I"
const LONG_E_COLOR = '#3B82F6'  // BLUE — "color BLUE if Y sounds like long-E"

const COLOR_SWATCHES = [
  { label: 'RED',  hex: LONG_I_COLOR, sound: 'long-i' as const, emoji: '🔴' },
  { label: 'BLUE', hex: LONG_E_COLOR, sound: 'long-e' as const, emoji: '🔵' },
]

// Extra crayon colors for the free coloring section
const EXTRA_CRAYONS = [
  { label: 'Purple', hex: '#A855F7' },
  { label: 'Green',  hex: '#22C55E' },
  { label: 'Orange', hex: '#F97316' },
  { label: 'Pink',   hex: '#EC4899' },
  { label: 'Yellow', hex: '#EAB308' },
]

export default function LongYSorter({ onCorrect, onWrong, questionIndex, colors }: Props) {
  const [current, setCurrent]           = useState<LongYItem | null>(null)
  const [selectedColor, setSelectedColor] = useState<'long-i' | 'long-e' | null>(null)
  const [appliedColor, setAppliedColor]   = useState<string | null>(null)
  const [revealed, setRevealed]           = useState(false)
  const [correct, setCorrect]             = useState<boolean | null>(null)

  const wordScale   = useRef(new Animated.Value(1)).current
  const colorAnim   = useRef(new Animated.Value(0)).current
  const shakeAnim   = useRef(new Animated.Value(0)).current

  const loadQuestion = useCallback(() => {
    const items = shuffle(getLongYItems())
    const item  = items[questionIndex % items.length]
    setCurrent(item)
    setSelectedColor(null)
    setAppliedColor(null)
    setRevealed(false)
    setCorrect(null)
    colorAnim.setValue(0)
    wordScale.setValue(0.7)
    Animated.spring(wordScale, { toValue: 1, useNativeDriver: true, damping: 12 }).start()
  }, [questionIndex])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  const handleColorPick = (sound: 'long-i' | 'long-e') => {
    if (revealed) return
    sfx(playTileSelect)
    setSelectedColor(sound)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleColorWord = () => {
    if (!current || !selectedColor || revealed) return
    const chosenHex = selectedColor === 'long-i' ? LONG_I_COLOR : LONG_E_COLOR
    setAppliedColor(chosenHex)
    setRevealed(true)

    // Animate word coloring
    Animated.timing(colorAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start()

    const isCorrect = selectedColor === current.sound
    setCorrect(isCorrect)

    if (isCorrect) {
      sfx(playCorrectChime)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTimeout(() => { onCorrect(0) }, 800)
    } else {
      sfx(playWrongBuzz)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      // Shake
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10,  duration: 60,  useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60,  useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6,   duration: 50,  useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0,   duration: 40,  useNativeDriver: true }),
      ]).start()
      setTimeout(() => { onWrong() }, 700)
    }
  }

  if (!current) return null

  const correctHex = current.sound === 'long-i' ? LONG_I_COLOR : LONG_E_COLOR

  return (
    <View style={styles.root}>
      {/* Rule reminder */}
      <View style={styles.rulesBox}>
        <Text style={styles.rulesTitle}>🖍 Color the word!</Text>
        <View style={styles.ruleRow}>
          <View style={[styles.swatch, { backgroundColor: LONG_I_COLOR }]} />
          <Text style={styles.ruleText}><Text style={{ color: LONG_I_COLOR, fontWeight: '800' }}>RED</Text> = Y sounds like "eye" — my, why, try</Text>
        </View>
        <View style={styles.ruleRow}>
          <View style={[styles.swatch, { backgroundColor: LONG_E_COLOR }]} />
          <Text style={styles.ruleText}><Text style={{ color: LONG_E_COLOR, fontWeight: '800' }}>BLUE</Text> = Y sounds like "ee" — baby, silly</Text>
        </View>
      </View>

      {/* Tap-to-hear speaker button */}
      <TapToHearButton
        text={current.word}
        colors={colors}
        label="👆 Tap to hear the word!"
        size={100}
      />

      {/* Step 1: Pick color */}
      <View style={styles.stepBox}>
        <Text style={styles.stepLabel}>Step 1 — Pick a color:</Text>
        <View style={styles.colorRow}>
          {COLOR_SWATCHES.map(sw => (
            <TouchableOpacity
              key={sw.sound}
              onPress={() => handleColorPick(sw.sound)}
              disabled={revealed}
              style={[
                styles.colorBtn,
                { borderColor: sw.hex, backgroundColor: selectedColor === sw.sound ? `${sw.hex}30` : '#1a1a35' },
                selectedColor === sw.sound && styles.colorBtnSelected,
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.colorBtnEmoji}>{sw.emoji}</Text>
              <Text style={[styles.colorBtnLabel, { color: sw.hex }]}>{sw.label}</Text>
              <Text style={[styles.colorBtnSub, { color: sw.hex }]}>
                {sw.sound === 'long-i' ? '"eye" sound' : '"ee" sound'}
              </Text>
              {selectedColor === sw.sound && <Text style={styles.selectedCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Step 2: Tap word to color it */}
      <View style={styles.stepBox}>
        <Text style={styles.stepLabel}>Step 2 — Tap the word to color it:</Text>
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <TouchableOpacity
            onPress={handleColorWord}
            disabled={!selectedColor || revealed}
            style={[
              styles.wordBtn,
              !selectedColor && styles.wordBtnDisabled,
              selectedColor && !revealed && { borderColor: selectedColor === 'long-i' ? LONG_I_COLOR : LONG_E_COLOR },
            ]}
            activeOpacity={0.8}
          >
            <Animated.View style={[
              styles.wordCard,
              {
                backgroundColor: colorAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['rgba(255,255,255,0.03)', appliedColor ? `${appliedColor}25` : 'rgba(255,255,255,0.03)'],
                }),
              },
            ]}>
              <Animated.Text style={[
                styles.wordText,
                {
                  color: colorAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#e0d8f0', appliedColor ?? '#e0d8f0'],
                  }),
                },
              ]}>
                {current.word}
              </Animated.Text>
              {!selectedColor && !revealed && (
                <Text style={styles.wordHint}>← pick a color first</Text>
              )}
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Feedback */}
      {revealed && (
        <View style={[
          styles.feedbackBox,
          { borderColor: correct ? '#43E97B' : '#ef4444', backgroundColor: correct ? 'rgba(67,233,123,0.08)' : 'rgba(239,68,68,0.08)' },
        ]}>
          <Text style={styles.feedbackIcon}>{correct ? '🎨 ✓' : '🔄 ✗'}</Text>
          <Text style={[styles.feedbackText, { color: correct ? '#43E97B' : '#ef4444' }]}>
            {correct
              ? `Right! "${current.word}" — Y sounds like ${current.sound === 'long-i' ? '"eye" (long-I) 🔴' : '"ee" (long-E) 🔵'}`
              : `The Y in "${current.word}" sounds like ${current.sound === 'long-i' ? '"eye" → should be RED 🔴' : '"ee" → should be BLUE 🔵'}`
            }
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingHorizontal: 16, gap: 12 },

  rulesBox: { backgroundColor: '#12112a', borderRadius: 14, padding: 12, width: '100%', gap: 6 },
  rulesTitle: { color: '#e0d8f0', fontSize: 14, fontWeight: '700' },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  ruleText: { color: '#8a7aaa', fontSize: 12, flex: 1 },

  stepBox: { width: '100%', gap: 8 },
  stepLabel: { color: '#6b5d80', fontSize: 12, fontWeight: '700', paddingLeft: 2 },

  colorRow: { flexDirection: 'row', gap: 10 },
  colorBtn: {
    flex: 1, borderWidth: 2, borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 4,
  },
  colorBtnSelected: { transform: [{ scale: 1.04 }] },
  colorBtnEmoji: { fontSize: 28 },
  colorBtnLabel: { fontSize: 18, fontWeight: '900' },
  colorBtnSub: { fontSize: 10, fontWeight: '600' },
  selectedCheck: { position: 'absolute', top: 6, right: 8, color: '#fff', fontSize: 14, fontWeight: '800' },

  wordBtn: { borderWidth: 2.5, borderColor: '#2a2a4a', borderRadius: 20 },
  wordBtnDisabled: { opacity: 0.5 },
  wordCard: { borderRadius: 18, paddingHorizontal: 40, paddingVertical: 22, alignItems: 'center', gap: 6 },
  wordText: { fontSize: 52, fontWeight: '900', letterSpacing: 2 },
  wordHint: { color: '#4a4a6a', fontSize: 11 },

  feedbackBox: { borderWidth: 1.5, borderRadius: 14, padding: 12, width: '100%', gap: 4, flexDirection: 'row', alignItems: 'center' },
  feedbackIcon: { fontSize: 22 },
  feedbackText: { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },
})
