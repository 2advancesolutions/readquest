/**
 * LetterTracerGame — K-grade drawing game (v2 — fixed coords + Google voice)
 *
 * Fixes:
 *  1. Coordinate mapping: uses canvasRef.measure() to get true pageX/pageY offset,
 *     then subtracts it from evt.nativeEvent.pageX/pageY for pixel-perfect drawing.
 *  2. Voice: prefers Google TTS via Web Speech API (window.speechSynthesis + getVoices),
 *     falls back to expo-speech on native.
 *  3. Larger canvas (fills width), cleaner layout.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, PanResponder,
  StyleSheet, Animated, ScrollView, Platform,
} from 'react-native'
import Svg, { Path, Text as SvgText } from 'react-native-svg'
import * as Speech from 'expo-speech'
import * as Haptics from 'expo-haptics'
import { sfx, playCorrectChime } from '../lib/gameAudio'
import { shuffle } from '../data/wordBanks'

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

// Letters from the PDF curriculum (W, Y, Z most important + full set)
const LETTER_SETS: Record<number, { letter: string; word: string; emoji: string }[]> = {
  0: [
    { letter: 'W', word: 'window',   emoji: '🪟' },
    { letter: 'Y', word: 'yo-yo',    emoji: '🪀' },
    { letter: 'Z', word: 'zipper',   emoji: '🤐' },
    { letter: 'A', word: 'apple',    emoji: '🍎' },
    { letter: 'B', word: 'ball',     emoji: '⚽' },
    { letter: 'C', word: 'cat',      emoji: '🐱' },
    { letter: 'D', word: 'dog',      emoji: '🐶' },
    { letter: 'E', word: 'egg',      emoji: '🥚' },
    { letter: 'F', word: 'fish',     emoji: '🐟' },
    { letter: 'G', word: 'goat',     emoji: '🐐' },
    { letter: 'H', word: 'hat',      emoji: '🎩' },
    { letter: 'I', word: 'igloo',    emoji: '🏠' },
    { letter: 'J', word: 'jar',      emoji: '🫙' },
    { letter: 'K', word: 'kite',     emoji: '🪁' },
    { letter: 'L', word: 'lion',     emoji: '🦁' },
    { letter: 'M', word: 'moon',     emoji: '🌙' },
    { letter: 'N', word: 'nest',     emoji: '🪺' },
    { letter: 'O', word: 'orange',   emoji: '🍊' },
    { letter: 'P', word: 'penguin',  emoji: '🐧' },
    { letter: 'Q', word: 'queen',    emoji: '👑' },
    { letter: 'R', word: 'robot',    emoji: '🤖' },
    { letter: 'S', word: 'star',     emoji: '⭐' },
    { letter: 'T', word: 'tree',     emoji: '🌳' },
    { letter: 'U', word: 'umbrella', emoji: '☂️' },
    { letter: 'V', word: 'van',      emoji: '🚐' },
    { letter: 'X', word: 'xylophone',emoji: '🎵' },
  ],
  1: [
    { letter: 'a', word: 'ant',    emoji: '🐜' },
    { letter: 'b', word: 'bee',    emoji: '🐝' },
    { letter: 'c', word: 'cloud',  emoji: '☁️' },
    { letter: 'd', word: 'drum',   emoji: '🥁' },
    { letter: 'e', word: 'earth',  emoji: '🌍' },
    { letter: 'f', word: 'frog',   emoji: '🐸' },
    { letter: 'g', word: 'grape',  emoji: '🍇' },
    { letter: 'h', word: 'heart',  emoji: '❤️' },
    { letter: 'w', word: 'wolf',   emoji: '🐺' },
    { letter: 'y', word: 'yak',    emoji: '🦬' },
    { letter: 'z', word: 'zebra',  emoji: '🦓' },
  ],
}

const CRAYON_COLORS = [
  { label: 'Red',    hex: '#EF4444' },
  { label: 'Orange', hex: '#F97316' },
  { label: 'Yellow', hex: '#EAB308' },
  { label: 'Green',  hex: '#22C55E' },
  { label: 'Blue',   hex: '#3B82F6' },
  { label: 'Purple', hex: '#A855F7' },
  { label: 'Pink',   hex: '#EC4899' },
  { label: 'White',  hex: '#F1F5F9' },
]

interface DrawnPath { d: string; color: string; width: number }

// ── Voice helper ─────────────────────────────────────────────────────────────
// Tries Google TTS on web; falls back to expo-speech on native.
let googleVoiceCache: SpeechSynthesisVoice | null | undefined = undefined

function getGoogleVoice(): SpeechSynthesisVoice | null {
  if (googleVoiceCache !== undefined) return googleVoiceCache
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  // Prefer Google en-US, then any Google voice, then any en-US, then first available
  googleVoiceCache =
    voices.find(v => v.name.includes('Google') && v.lang === 'en-US') ??
    voices.find(v => v.name.includes('Google')) ??
    voices.find(v => v.lang === 'en-US') ??
    voices[0] ?? null
  return googleVoiceCache
}

function speakText(text: string, rate = 0.78, pitch = 1.1) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate  = rate
    utter.pitch = pitch
    utter.lang  = 'en-US'
    // Voices may not be loaded yet — wait then speak
    const trySpeak = () => {
      const v = getGoogleVoice()
      if (v) utter.voice = v
      window.speechSynthesis.speak(utter)
    }
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        googleVoiceCache = undefined  // reset cache so we re-check
        trySpeak()
      }
    } else {
      trySpeak()
    }
  } else {
    Speech.speak(text, { rate, pitch })
  }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function LetterTracerGame({
  grade, onCorrect, questionIndex, colors,
}: Props) {
  const set  = LETTER_SETS[grade >= 1 ? 1 : 0]
  const item = set[questionIndex % set.length]

  const [paths,       setPaths]       = useState<DrawnPath[]>([])
  const [currentPath, setCurrentPath] = useState('')
  const [penColor,    setPenColor]    = useState(CRAYON_COLORS[0].hex)
  const [penWidth,    setPenWidth]    = useState(12)
  const [isEraser,    setIsEraser]    = useState(false)
  const [hasDrawn,    setHasDrawn]    = useState(false)
  const [done,        setDone]        = useState(false)

  const starAnim = useRef(new Animated.Value(0)).current

  // Canvas refs
  const canvasViewRef = useRef<View>(null)
  const canvasOrigin  = useRef({ x: 0, y: 0 })
  const [canvasSize, setCanvasSize] = useState({ w: 320, h: 300 })

  // ── Get canvas screen offset (synchronous on web via getBoundingClientRect) ──
  const getCanvasOffset = (): { x: number; y: number } => {
    if (Platform.OS === 'web') {
      // @ts-ignore — React Native Web exposes the underlying DOM node
      const domNode = canvasViewRef.current as unknown as HTMLElement | null
      if (domNode?.getBoundingClientRect) {
        const rect = domNode.getBoundingClientRect()
        // pageX/pageY from PanResponder already includes scroll, so we add scrollY too
        return {
          x: rect.left + (window.scrollX ?? window.pageXOffset ?? 0),
          y: rect.top  + (window.scrollY ?? window.pageYOffset ?? 0),
        }
      }
    }
    // Native: use cached value from measure()
    return canvasOrigin.current
  }

  // Keep mutable refs for PanResponder closures
  const currentPathRef = useRef('')
  const penColorRef    = useRef(penColor)
  const penWidthRef    = useRef(penWidth)
  const isEraserRef    = useRef(isEraser)
  const pathsRef       = useRef<DrawnPath[]>([])

  useEffect(() => { currentPathRef.current = currentPath }, [currentPath])
  useEffect(() => { penColorRef.current = penColor },   [penColor])
  useEffect(() => { penWidthRef.current = penWidth },   [penWidth])
  useEffect(() => { isEraserRef.current = isEraser },   [isEraser])
  useEffect(() => { pathsRef.current = paths },         [paths])

  // Reset on new letter
  useEffect(() => {
    setDone(false)
    setPaths([])
    setCurrentPath('')
    setHasDrawn(false)
    starAnim.setValue(0)
    currentPathRef.current = ''
    pathsRef.current = []

    const t = setTimeout(() => {
      speakText(`${item.letter}. ${item.letter} is for ${item.word}.`)
    }, 350)
    return () => clearTimeout(t)
  }, [item.letter])

  // ── PanResponder — uses getBoundingClientRect on web (synchronous) ──────────
  const panRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,

      onPanResponderGrant: (evt) => {
        // Snapshot canvas position at stroke start (sync on web, cached on native)
        if (Platform.OS !== 'web') {
          // Native: update async cache for next stroke (offset rarely changes mid-session)
          canvasViewRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
            canvasOrigin.current = { x: pageX, y: pageY }
          })
        }
        const offset = getCanvasOffset()
        const lx = evt.nativeEvent.pageX - offset.x
        const ly = evt.nativeEvent.pageY - offset.y
        const move = `M ${lx.toFixed(1)} ${ly.toFixed(1)}`
        currentPathRef.current = move
        setCurrentPath(move)
        setHasDrawn(true)
      },

      onPanResponderMove: (evt) => {
        const offset = getCanvasOffset()
        const lx = evt.nativeEvent.pageX - offset.x
        const ly = evt.nativeEvent.pageY - offset.y
        const updated = `${currentPathRef.current} L ${lx.toFixed(1)} ${ly.toFixed(1)}`
        currentPathRef.current = updated
        setCurrentPath(updated)
      },

      onPanResponderRelease: () => {
        if (!currentPathRef.current) return
        const color = isEraserRef.current ? '#0a0a1e' : penColorRef.current
        const newPath: DrawnPath = {
          d: currentPathRef.current,
          color,
          width: penWidthRef.current,
        }
        const updated = [...pathsRef.current, newPath]
        pathsRef.current = updated
        setPaths(updated)
        currentPathRef.current = ''
        setCurrentPath('')
      },
    })
  ).current

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleClear = () => {
    setPaths([])
    setCurrentPath('')
    setHasDrawn(false)
    pathsRef.current = []
    currentPathRef.current = ''
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  const handleSpeak = () => {
    speakText(`${item.letter}. ${item.letter} is for ${item.word}.`)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleDone = useCallback(() => {
    if (!hasDrawn) return
    setDone(true)
    sfx(playCorrectChime)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    Animated.spring(starAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start()
    setTimeout(() => onCorrect(0), 800)
  }, [hasDrawn, onCorrect])

  const activeDrawColor = isEraser ? '#0d0d1f' : penColor

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerLabel}>Trace the letter</Text>
          <Text style={[styles.headerLetter, { color: colors.c1 }]}>{item.letter}</Text>
        </View>
        <TouchableOpacity onPress={handleSpeak} style={styles.speakHeader} activeOpacity={0.7}>
          <Text style={styles.emoji}>{item.emoji}</Text>
          <Text style={styles.headerWordMuted}>{item.letter} is for</Text>
          <Text style={[styles.headerWord, { color: colors.c1 }]}>{item.word}</Text>
          <Text style={styles.speakHint}>🔊 tap to hear</Text>
        </TouchableOpacity>
      </View>

      {/* ── Drawing Canvas ── */}
      <View
        ref={canvasViewRef}
        style={[styles.canvasOuter, { borderColor: `${colors.c1}40` }]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout
          setCanvasSize({ w: width, h: height })
          // For native: seed the async cache once on layout
          if (Platform.OS !== 'web') {
            setTimeout(() => {
              canvasViewRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
                canvasOrigin.current = { x: pageX, y: pageY }
              })
            }, 100)
          }
        }}
        {...panRef.panHandlers}
      >
        <Svg
          width={canvasSize.w}
          height={canvasSize.h}
          style={StyleSheet.absoluteFill}
          // Prevent SVG from intercepting pointer events — let PanResponder handle them
          pointerEvents="none"
        >
          {/* Ghost guide letter */}
          <SvgText
            x={canvasSize.w / 2}
            y={canvasSize.h * 0.76}
            fontSize={Math.min(canvasSize.w, canvasSize.h) * 0.82}
            fontWeight="900"
            textAnchor="middle"
            fill={`${colors.c1}10`}
            stroke={`${colors.c1}18`}
            strokeWidth={1.5}
          >
            {item.letter}
          </SvgText>

          {/* Dot-start indicator */}
          <SvgText
            x={canvasSize.w * 0.28}
            y={canvasSize.h * 0.27}
            fontSize={10}
            fill={`${colors.c1}60`}
            textAnchor="middle"
          >
            ● start here
          </SvgText>

          {/* Committed paths */}
          {paths.map((p, i) => (
            <Path
              key={i}
              d={p.d}
              stroke={p.color}
              strokeWidth={p.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}

          {/* Live active path */}
          {currentPath !== '' && (
            <Path
              d={currentPath}
              stroke={activeDrawColor}
              strokeWidth={penWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}
        </Svg>

        {/* Done celebration */}
        {done && (
          <Animated.Text style={[styles.doneStamp, { transform: [{ scale: starAnim }] }]}>
            ⭐
          </Animated.Text>
        )}

        {/* Initial prompt */}
        {!hasDrawn && !done && (
          <View style={styles.startPrompt} pointerEvents="none">
            <Text style={styles.startPromptText}>✏️ Draw here!</Text>
          </View>
        )}
      </View>

      {/* Color palette */}
      <View style={styles.paletteSection}>
        <Text style={styles.paletteLabel}>🖍 Pick a crayon:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.palette}>
          {CRAYON_COLORS.map((c) => (
            <TouchableOpacity
              key={c.hex}
              onPress={() => { setPenColor(c.hex); setIsEraser(false) }}
              style={[
                styles.crayon,
                { backgroundColor: c.hex },
                !isEraser && penColor === c.hex && styles.crayonSelected,
              ]}
              activeOpacity={0.8}
            >
              <View style={[styles.crayonShine, { backgroundColor: `${c.hex}55` }]} />
            </TouchableOpacity>
          ))}
          {/* Eraser */}
          <TouchableOpacity
            onPress={() => setIsEraser(true)}
            style={[styles.crayon, styles.eraser, isEraser && styles.crayonSelected]}
            activeOpacity={0.8}
          >
            <Text style={styles.eraserIcon}>⬜</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Brush size */}
      <View style={styles.brushRow}>
        <Text style={styles.brushLabel}>✏️ Size:</Text>
        {[5, 10, 18, 28].map(s => (
          <TouchableOpacity
            key={s}
            onPress={() => setPenWidth(s)}
            style={[
              styles.brushBtn,
              penWidth === s && { borderColor: colors.c1, backgroundColor: `${colors.c1}20` },
            ]}
          >
            <View style={{
              width: Math.min(s * 1.2, 26),
              height: Math.min(s * 1.2, 26),
              borderRadius: s * 2,
              backgroundColor: isEraser ? '#555' : penColor,
            }} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.8}>
          <Text style={styles.clearText}>🗑️ Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDone}
          disabled={!hasDrawn || done}
          style={[styles.doneBtn, { backgroundColor: hasDrawn && !done ? colors.c1 : '#2a2a4a' }]}
          activeOpacity={0.8}
        >
          <Text style={styles.doneText}>{done ? '⭐ Great job!' : 'Done ✓'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const CANVAS_HEIGHT = 300

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingHorizontal: 12, gap: 10 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 4 },
  headerLeft: {},
  headerLabel: { color: '#6b5d80', fontSize: 11, fontWeight: '600' },
  headerLetter: { fontSize: 56, fontWeight: '900', lineHeight: 64 },
  speakHeader: { alignItems: 'flex-end', gap: 2 },
  emoji: { fontSize: 32 },
  headerWordMuted: { color: '#6b5d80', fontSize: 11 },
  headerWord: { fontSize: 16, fontWeight: '800' },
  speakHint: { color: '#4a4a6a', fontSize: 10 },

  canvasOuter: {
    width: '100%',
    height: CANVAS_HEIGHT,
    borderRadius: 20,
    backgroundColor: '#0a0a1e',
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
    // Make it clickable / touchable everywhere
    cursor: 'crosshair' as any,
  },

  doneStamp: {
    position: 'absolute', top: '28%', left: '38%',
    fontSize: 90, textAlign: 'center',
  },
  startPrompt: {
    position: 'absolute', bottom: 14, left: 0, right: 0,
    alignItems: 'center',
  },
  startPromptText: { color: '#2e2e50', fontSize: 13, fontWeight: '600' },

  paletteSection: { width: '100%' },
  paletteLabel: { color: '#8a7aaa', fontSize: 11, fontWeight: '600', marginBottom: 6, paddingLeft: 2 },
  palette: { flexDirection: 'row', gap: 9, paddingHorizontal: 2, paddingBottom: 4 },
  crayon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'transparent',
    overflow: 'hidden',
  },
  crayonShine: { position: 'absolute', top: 4, left: 6, width: 10, height: 10, borderRadius: 5 },
  crayonSelected: {
    borderColor: '#ffffff',
    borderWidth: 3,
    transform: [{ scale: 1.18 }],
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  eraser: { backgroundColor: '#2a2a4a' },
  eraserIcon: { fontSize: 18 },

  brushRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', paddingHorizontal: 2 },
  brushLabel: { color: '#6b5d80', fontSize: 11, fontWeight: '600' },
  brushBtn: {
    borderWidth: 2, borderColor: '#2a2a4a', borderRadius: 10,
    padding: 8, alignItems: 'center', justifyContent: 'center',
    width: 46, height: 46,
  },

  actionRow: { flexDirection: 'row', gap: 10, width: '100%' },
  clearBtn: {
    flex: 1, backgroundColor: '#1a1a35', borderRadius: 14,
    padding: 13, alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a4a',
  },
  clearText: { color: '#8a7aaa', fontSize: 13, fontWeight: '600' },
  doneBtn: { flex: 2, borderRadius: 14, padding: 13, alignItems: 'center' },
  doneText: { color: '#fff', fontSize: 14, fontWeight: '800' },
})
