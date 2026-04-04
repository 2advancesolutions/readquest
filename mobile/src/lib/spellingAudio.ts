/**
 * spellingAudio.ts (React Native)
 *
 * Native equivalents of the web Web Audio API feedback:
 * - playCorrectSound → Success haptic + spoken praise
 * - playWrongSound   → Error haptic   + spoken encouragement
 *
 * Both haptics AND speech fire together. Speech respects the global
 * 'readquest_muted' key written by MuteButton.tsx.
 *
 * Cheer/encouragement text helpers are identical to the web version.
 */

import * as Haptics from 'expo-haptics'
import { googleSpeak, googleStop } from './tts'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ── Mute helper (sync cache loaded on first use) ───────────────────────────
let _muted: boolean | null = null

async function getMuted(): Promise<boolean> {
  if (_muted !== null) return _muted
  try {
    const val = await AsyncStorage.getItem('readquest_muted')
    _muted = val === 'true'
  } catch {
    _muted = false
  }
  return _muted
}

// Invalidate mute cache when MuteButton fires (call from MuteButton if needed)
export function invalidateMuteCache() { _muted = null }

function speak(text: string): void {
  // Fire-and-forget: check mute then speak
  getMuted().then(muted => {
    if (muted) return
    void googleStop()
    void googleSpeak(text, 'word')
  })
}

// ── Audible + Haptic feedback ──────────────────────────────────────────────

/** Success haptic + spoken cheer — play on correct answer */
export function playCorrectSound(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  speak(nextCheer(false))
}

/** Error haptic — play on wrong answer (caller passes encouragement text) */
export function playWrongSound(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
}

/**
 * Speak encouragement after a wrong answer.
 * Call this separately so you can include the correct word in the message.
 */
export function speakEncouragement(text: string): void {
  speak(text)
}

// ── Rotating cheer / encouragement phrases ────────────────────────────────
// Identical to web version

const CORRECT_CHEERS = [
  "Amazing! You nailed it!",
  "Woohoo! That's correct! You're a spelling champion!",
  "Incredible! Keep that energy going!",
  "Yes! Perfect spelling! You're on fire!",
  "Brilliant! High five! You've got mad spelling skills!",
  "Outstanding! That word is yours forever now!",
  "Spectacular! You make spelling look easy!",
]

const MASTERY_CHEERS = [
  "You just mastered that word! That's huge! You're unstoppable!",
  "Word mastered! You are officially a spelling superstar!",
  "Boom! Mastery unlocked! Nothing can stop you now!",
]

let cheerIdx = 0
let masteryIdx = 0

export function nextCheer(mastery: boolean): string {
  if (mastery) {
    const msg = MASTERY_CHEERS[masteryIdx % MASTERY_CHEERS.length]
    masteryIdx++
    return msg
  }
  const msg = CORRECT_CHEERS[cheerIdx % CORRECT_CHEERS.length]
  cheerIdx++
  return msg
}

const WRONG_ENCOURAGEMENTS = [
  (word: string) => `Don't give up! The correct spelling is ${word}. You've got this!`,
  (word: string) => `Great try! Remember it's spelled ${word}. Keep going!`,
  (word: string) => `So close! The spelling is ${word}. Practice makes perfect!`,
  (word: string) => `Nice effort! It's actually spelled ${word}. You're learning!`,
  (word: string) => `Keep going! The correct word is ${word}. You'll get the next one!`,
]

let wrongIdx = 0

export function nextEncouragement(word: string): string {
  const fn = WRONG_ENCOURAGEMENTS[wrongIdx % WRONG_ENCOURAGEMENTS.length]
  wrongIdx++
  return fn(word)
}
