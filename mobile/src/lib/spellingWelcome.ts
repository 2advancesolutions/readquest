/**
 * spellingWelcome.ts (React Native)
 *
 * Pre-speaks the Spelling Arena welcome message using expo-speech, matching
 * the exact TTS pattern in spell.tsx (`Speech.speak(text, options)`).
 *
 * Changes from web version:
 * - sessionStorage → storage lib (AsyncStorage wrapper)
 * - import.meta.env.VITE_API_URL → not needed (expo-speech speaks directly)
 * - new Audio() / FileReader → expo-speech
 *
 * Note: expo-speech speaks immediately — there is no "preload then play" concept
 * on native (the OS TTS engine handles buffering). We keep the same API surface
 * so callers need no changes, but preloadSpellingWelcome becomes a no-op.
 * When the screen mounts it calls playSpellingWelcome which speaks instantly.
 *
 * Cache key: `rq_welcome_spoken_<studentId>` — tracks whether we should replay.
 */

import { googleSpeak, googleStop } from './tts'
import { storage } from './storage'
import { isSfxMuted } from './gameAudio'

const CACHE_PREFIX = 'rq_welcome_spoken_'

/** Returns just the first name from a full name string */
export function firstNameOnly(fullName: string): string {
  return (fullName || '').trim().split(/\s+/)[0] || ''
}

/** Build the personalised welcome message */
function buildWelcomeText(firstName: string): string {
  const name     = firstName ? `, ${firstName}` : ''
  const nameBang = firstName ? `, ${firstName}` : ''
  return (
    `Welcome to the Spelling Arena${name}! ` +
    `I'm so excited to practice spelling with you today! ` +
    `Here's how it works: you'll play three fun games. ` +
    `In Spelling Bee, you'll listen and type the word. ` +
    `In Fill in the Blanks, you'll complete the missing letters. ` +
    `And in Word Scramble, you'll tap the letters in the right order. ` +
    `For every word you get right, you earn XP and work toward mastering it! ` +
    `First, pick a character coach, choose your word source, and let's get spelling! ` +
    `You've totally got this${nameBang}!`
  )
}

/**
 * No-op on native — expo-speech speaks on demand with zero delay.
 * Kept for API compatibility with callers in Dashboard.
 */
export async function preloadSpellingWelcome(
  _studentId: string,
  _fullName: string,
): Promise<void> {
  // no-op — native TTS needs no preloading
}

/**
 * Speak the welcome message using expo-speech.
 * Returns true if it spoke (always true on native unless speech fails).
 */
export async function playSpellingWelcome(
  studentId: string,
  onEnd?: () => void,
): Promise<boolean> {
  try {
    if (isSfxMuted()) { onEnd?.(); return false }
    const firstName = (await storage.getString(`${CACHE_PREFIX}name_${studentId}`)) ?? ''
    const text = buildWelcomeText(firstName)
    void googleStop()
    void googleSpeak(text, 'teacher', () => onEnd?.())
    return true
  } catch {
    onEnd?.()
    return false
  }
}

/**
 * Store the student's first name so playSpellingWelcome can personalise it.
 * Call this from Dashboard when a child is selected (replaces preload).
 */
export async function cacheStudentName(studentId: string, fullName: string): Promise<void> {
  try {
    await storage.setString(`${CACHE_PREFIX}name_${studentId}`, firstNameOnly(fullName))
  } catch {}
}

/** Stop any currently playing speech and clear cached name (call on logout). */
export async function clearSpellingWelcomeCache(): Promise<void> {
  void googleStop()
  try {
    const keys = await storage.getKeysWithPrefix(CACHE_PREFIX)
    for (const key of keys) await storage.remove(key)
  } catch {}
}
