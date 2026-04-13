/**
 * TapToHearButton — Shared Component
 *
 * A large, round, gradient button with animated sonar ripple rings
 * that pulse outward while audio is playing.
 *
 * Usage:
 *   <TapToHearButton
 *     text="cat"          ← what to speak
 *     colors={colors}     ← game accent colors
 *     autoPlay            ← speak when mounted
 *   />
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native'
import * as Speech from 'expo-speech'
import * as Haptics from 'expo-haptics'

interface Props {
  text: string
  colors: { c1: string; c2: string }
  autoPlay?: boolean
  label?: string          // override the sub-label (default "Tap to listen!")
  size?: number           // button diameter (default 110)
  onSpeak?: () => void    // optional callback when speak fires
}

// ── Web Speech API with Google voice preference ────────────────────────────
function speakText(text: string, onDone?: () => void) {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate  = 0.78
    utter.pitch = 1.1
    utter.lang  = 'en-US'
    // Prefer Google US voice for crisp quality
    const voices = window.speechSynthesis.getVoices()
    const google  = voices.find(v => v.name.toLowerCase().includes('google') && v.lang === 'en-US')
    const usVoice = voices.find(v => v.lang === 'en-US')
    if (google)  utter.voice = google
    else if (usVoice) utter.voice = usVoice
    utter.onend = () => onDone?.()
    utter.onerror = () => onDone?.()
    window.speechSynthesis.speak(utter)
  } else {
    Speech.speak(text, { rate: 0.78, pitch: 1.1, onDone })
  }
}

export { speakText }

export default function TapToHearButton({ text, colors, autoPlay = true, label, size = 110, onSpeak }: Props) {
  const [playing, setPlaying] = useState(false)

  // Ripple rings
  const ripple1 = useRef(new Animated.Value(0)).current
  const ripple2 = useRef(new Animated.Value(0)).current
  const ripple3 = useRef(new Animated.Value(0)).current

  // Idle breathing
  const breathe  = useRef(new Animated.Value(1)).current
  const breathRef = useRef<Animated.CompositeAnimation | null>(null)

  // Label pulse to draw attention
  const labelOpacity = useRef(new Animated.Value(1)).current
  const labelRef = useRef<Animated.CompositeAnimation | null>(null)

  // Start gentle breathing when idle
  useEffect(() => {
    breathRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1.00, duration: 900, useNativeDriver: true }),
      ])
    )
    breathRef.current.start()

    // Label blink to hint "tap me"
    labelRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(labelOpacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        Animated.timing(labelOpacity, { toValue: 1.0, duration: 700, useNativeDriver: true }),
      ])
    )
    labelRef.current.start()

    return () => {
      breathRef.current?.stop()
      labelRef.current?.stop()
    }
  }, [])

  const startRipples = useCallback(() => {
    ripple1.setValue(0); ripple2.setValue(0); ripple3.setValue(0)
    breathRef.current?.stop()
    labelRef.current?.stop()

    const makeRipple = (val: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])

    Animated.loop(
      Animated.parallel([
        makeRipple(ripple1, 0),
        makeRipple(ripple2, 380),
        makeRipple(ripple3, 760),
      ]),
      { iterations: 3 }
    ).start(() => {
      // Restart breathing after playing
      breathRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1.06, duration: 900, useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 1.00, duration: 900, useNativeDriver: true }),
        ])
      )
      breathRef.current.start()
      labelRef.current?.start()
    })
  }, [])

  const handleSpeak = useCallback(() => {
    if (playing) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setPlaying(true)
    startRipples()
    onSpeak?.()
    speakText(text, () => setPlaying(false))
  }, [text, playing, startRipples, onSpeak])

  // Auto-play on mount or text change
  useEffect(() => {
    if (!autoPlay) return
    const t = setTimeout(() => handleSpeak(), 500)
    return () => clearTimeout(t)
  }, [text])

  const R = size         // outer ripple max size
  const half = size / 2

  const rippleStyle = (val: Animated.Value) => ({
    position: 'absolute' as const,
    width:  R * 1.9,
    height: R * 1.9,
    borderRadius: R,
    borderWidth: 2,
    borderColor: colors.c1,
    opacity: val.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.7, 0.5, 0] }),
    transform: [{
      scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.4] }),
    }],
  })

  return (
    <View style={styles.wrapper}>
      {/* Ripple rings — behind the button */}
      <View style={[styles.rippleContainer, { width: R * 2, height: R * 2 }]}>
        <Animated.View style={rippleStyle(ripple1)} />
        <Animated.View style={rippleStyle(ripple2)} />
        <Animated.View style={rippleStyle(ripple3)} />
      </View>

      {/* Main button */}
      <Animated.View style={{ transform: [{ scale: breathe }] }}>
        <TouchableOpacity
          onPress={handleSpeak}
          activeOpacity={0.82}
          style={[
            styles.btn,
            {
              width: size,
              height: size,
              borderRadius: half,
              backgroundColor: playing ? colors.c1 : `${colors.c1}22`,
              borderColor: colors.c1,
              // Glow shadow
              shadowColor: colors.c1,
              shadowOpacity: playing ? 0.7 : 0.35,
              shadowRadius: playing ? 20 : 10,
              shadowOffset: { width: 0, height: 0 },
              elevation: 8,
            },
          ]}
        >
          {/* Speaker icon */}
          <Text style={[styles.icon, { fontSize: size * 0.38, filter: playing ? 'brightness(10)' : undefined } as any]}>
            {playing ? '🔊' : '🔉'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* "Tap to listen!" label */}
      {!playing && (
        <Animated.Text style={[styles.label, { color: colors.c1, opacity: labelOpacity }]}>
          {label ?? '👆 Tap to listen!'}
        </Animated.Text>
      )}
      {playing && (
        <Text style={[styles.label, { color: colors.c1 }]}>🎵 Listening…</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  rippleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    lineHeight: undefined,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 2,
  },
})
