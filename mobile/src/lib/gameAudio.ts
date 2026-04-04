/**
 * gameAudio.ts — Games Arcade Feedback (React Native)
 *
 * Provides AUDIBLE feedback using expo-speech (text-to-speech) + expo-haptics.
 * This replaces the haptics-only version which produced no sound on simulators
 * or devices with sound on.
 *
 * Spoken feedback is short and energetic so it feels like a game.
 * Haptics run in parallel for tactile feel.
 *
 * Call loadSfxMuteState() once on app start (e.g. in _layout.tsx).
 */

import * as Haptics from 'expo-haptics'
import { googleSpeak, googleStop } from './tts'
import { storage } from './storage'

const MUTE_KEY = 'readquest_muted'

// ── Module-level mute cache (keeps sfx() synchronous) ─────────────────────────

let _muted: boolean | null = null

/** Load mute state from AsyncStorage. Call once at app startup. */
export async function loadSfxMuteState(): Promise<void> {
  try {
    const val = await storage.getString(MUTE_KEY)
    // MuteButton stores 'true' / 'false' strings
    _muted = val === 'true'
  } catch {
    _muted = false
  }
}

export function isSfxMuted(): boolean {
  return _muted === true
}

export async function toggleSfxMute(): Promise<boolean> {
  const next = !isSfxMuted()
  _muted = next
  try {
    // Write same format as MuteButton.tsx
    await storage.setString(MUTE_KEY, next ? 'true' : 'false')
  } catch {}
  return next
}

/** Wrap any feedback call to respect mute preference (synchronous cache). */
export function sfx(fn: () => void): void {
  if (!isSfxMuted()) fn()
}

// ── Speech helpers ─────────────────────────────────────────────────────────────

const CORRECT_PHRASES = [
  'Correct!', 'Great job!', 'Awesome!', 'You got it!', 'Excellent!'
]
const WRONG_PHRASES = [
  'Oops!', 'Not quite!', 'Try again!', 'So close!'
]

let _phraseIdx = 0
function nextPhrase(arr: string[]): string {
  const p = arr[_phraseIdx % arr.length]
  _phraseIdx++
  return p
}

function speak(text: string, rate = 1.2): void {
  if (isSfxMuted()) return
  void googleStop()
  void googleSpeak(text, 'quiz')
}

// ── Audible + Haptic feedback ──────────────────────────────────────────────────

/** Quick pop when tapping a tile */
export function playTileSelect(): void {
  sfx(() => Haptics.selectionAsync())
}

/** Ascending arpeggio → success chime + spoken praise */
export function playCorrectChime(): void {
  sfx(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    speak(nextPhrase(CORRECT_PHRASES))
  })
}

/** Gentle descending buzz → error notification + spoken hint */
export function playWrongBuzz(): void {
  sfx(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    speak(nextPhrase(WRONG_PHRASES))
  })
}

/** Quick ascending whoosh → heavy impact (streak milestone) */
export function playStreakFire(): void {
  sfx(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    speak("You're on fire!", 1.1)
  })
}

/** Full victory fanfare → success + heavy impact + speech */
export function playLevelComplete(): void {
  sfx(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200)
    speak('Level complete! Amazing work!', 1.0)
  })
}

/** Gentle descending → warning notification (level failed) */
export function playLevelFail(): void {
  sfx(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    speak("Don't give up! Try again!", 1.0)
  })
}

/** Single tick → light impact (timer countdown) */
export function playTimerTick(): void {
  sfx(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
}

/** Double urgent blip → medium impact × 2 (last 3 seconds) */
export function playTimerUrgent(): void {
  sfx(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 100)
    speak('Hurry up!', 1.3)
  })
}

/** Star twinkle → success notification (earning a star) */
export function playStarEarn(): void {
  sfx(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    speak('You earned a star!', 1.1)
  })
}

/** Coin ring → selection (XP tick animation) */
export function playXPRing(): void {
  sfx(() => Haptics.selectionAsync())
}

/** Low thud → heavy impact (combo streak breaks) */
export function playComboBreak(): void {
  sfx(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    speak('Streak broken!', 1.1)
  })
}

/** 3-2-1 countdown → escalating impacts */
export function playCountdown(n: 3 | 2 | 1): void {
  const style = n === 1
    ? Haptics.ImpactFeedbackStyle.Heavy
    : n === 2
    ? Haptics.ImpactFeedbackStyle.Medium
    : Haptics.ImpactFeedbackStyle.Light
  sfx(() => {
    Haptics.impactAsync(style)
    speak(String(n), 1.3)
  })
}

/** Soft menu navigation → selection */
export function playUiNavigate(): void {
  sfx(() => Haptics.selectionAsync())
}

/** Magic shimmer → success + selection (hint reveal) */
export function playHintReveal(): void {
  sfx(() => {
    Haptics.selectionAsync()
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 150)
    speak('Hint revealed!', 1.0)
  })
}

/** Stop all speech immediately */
export function stopAllAudio(): void {
  void googleStop()
}
