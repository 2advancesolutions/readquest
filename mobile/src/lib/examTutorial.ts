/**
 * examTutorial.ts (React Native)
 *
 * Pre-speaks the Exam Center tutorial using expo-speech, matching the exact
 * TTS pattern in spell.tsx (`Speech.speak(text, options)`).
 *
 * Changes from web version:
 * - sessionStorage → storage lib (AsyncStorage wrapper)
 * - import.meta.env.VITE_API_URL → not needed (expo-speech speaks directly)
 * - new Audio() / FileReader → expo-speech
 *
 * Like spellingWelcome.ts, preloading is a no-op on native — the OS TTS engine
 * handles buffering. Cache stores the student first name for personalisation.
 *
 * Cache key: `rq_exam_tutorial_name_<studentId>`
 */

import { googleSpeak, googleStop } from './tts'
import { storage } from './storage'
import { isSfxMuted } from './gameAudio'

const CACHE_PREFIX = 'rq_exam_tutorial_'

/** Returns just the first name from a full name string */
export function firstNameOnly(fullName: string): string {
  return (fullName || '').trim().split(/\s+/)[0] || ''
}

/** Build the personalised exam tutorial message */
function buildTutorialText(firstName: string): string {
  const name     = firstName ? `, ${firstName}` : ''
  const nameBang = firstName ? `, ${firstName}` : ''
  return (
    `Welcome to the Reading Exam Center${name}! ` +
    `This is where you prove everything you have learned and work toward moving to the next grade! ` +

    `Before we start, here is how everything works. ` +

    `There is a Practice Test you can take first. ` +
    `It has only 15 questions and takes 10 minutes, so you can get comfortable with how the exams look before the real thing. ` +
    `The practice test does not count toward your grade — it is just for you to get ready! ` +

    `To move to the next grade, you need to do three big things. ` +
    `First, you must pass 10 exams. ` +
    `Second, you must read 60 books. ` +
    `Third, your average score across all your exams must be 80 percent or higher! ` +

    `The 10 exams get harder as you go. ` +
    `Exams one through five are easier — they test the basics and build your confidence. ` +
    `Exams six, seven, and eight are medium difficulty — they push you to think a little deeper. ` +
    `Exams nine and ten are the hardest — the final challenge to show you are truly ready! ` +

    `You need a score of 80 percent or above to pass each exam. ` +
    `If you do not pass, do not worry! You get two retakes for each exam. ` +
    `But listen carefully — if you use all two retakes and still do not pass one section, ` +
    `your progress will reset and you will need to start all the exams over. ` +
    `So do your absolute best every time! ` +

    `To take an exam, just tap the section you want to test: Phonics, Vocabulary, Comprehension, Grammar, or the Mixed Assessment. ` +
    `Each full exam has 30 questions and you have 30 minutes. ` +
    `The timer starts as soon as your exam loads, so pay close attention! ` +
    `Use the dots at the bottom to jump between questions. ` +
    `Your answers will not be shown as right or wrong until you press Submit Exam. ` +
    `After submitting, you will see your score, earn XP, and can review every answer. ` +

    `For parents: this system is designed to make sure students are truly ready before advancing. ` +
    `The combination of 10 progressively harder exams, 60 books read, and an 80 percent average ` +
    `ensures your child has mastered the grade level skills. ` +

    `You have got this${nameBang}! ` +
    `Start with the Practice Test to warm up, then pick your first real exam!`
  )
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Store the student's first name so autoPlayExamTutorial can personalise it.
 * Call this from Dashboard when a child is selected (replaces preload).
 */
export async function preloadExamTutorial(studentId: string, fullName: string): Promise<void> {
  try {
    await storage.setString(`${CACHE_PREFIX}name_${studentId}`, firstNameOnly(fullName))
  } catch {}
}

/**
 * Speak the cached tutorial using expo-speech.
 * Returns true if it spoke, false if no name is cached.
 */
export async function playExamTutorial(
  studentId: string,
  onEnd?: () => void,
): Promise<boolean> {
  try {
    if (isSfxMuted()) { onEnd?.(); return false }
    const firstName = (await storage.getString(`${CACHE_PREFIX}name_${studentId}`)) ?? ''
    const text = buildTutorialText(firstName)
    void googleStop()
    void googleSpeak(text, 'teacher', () => onEnd?.())
    return true
  } catch {
    onEnd?.()
    return false
  }
}

/**
 * Auto-play the exam tutorial on screen mount — mirrors the web pattern.
 *
 * On native, expo-speech speaks instantly so there is no cache-miss delay.
 * Returns a cancel function for useEffect cleanup (stops speech).
 *
 * @example
 * useEffect(() => {
 *   const cancel = autoPlayExamTutorial(studentId, firstName)
 *   return cancel
 * }, [])
 */
export function autoPlayExamTutorial(
  studentId: string,
  firstName: string,
  onEnd?: () => void,
): () => void {
  let cancelled = false

  // Cache the name first, then speak
  storage.setString(`${CACHE_PREFIX}name_${studentId}`, firstName)
    .catch(() => {})
    .then(() => {
      if (cancelled) return
      void googleStop()
      void googleSpeak(buildTutorialText(firstName), 'teacher', () => { if (!cancelled) onEnd?.() })
    })

  return () => {
    cancelled = true
    void googleStop()
  }
}

/**
 * Speak fresh tutorial audio directly (legacy — prefer autoPlayExamTutorial).
 */
export async function fetchAndPlayExamTutorial(
  firstName: string,
  onEnd?: () => void,
): Promise<void> {
  try {
    void googleStop()
    void googleSpeak(buildTutorialText(firstName), 'teacher', () => onEnd?.())
  } catch {
    onEnd?.()
  }
}

/** Stop speech and clear cached names on logout. */
export async function clearExamTutorialCache(): Promise<void> {
  void googleStop()
  try {
    const keys = await storage.getKeysWithPrefix(CACHE_PREFIX)
    for (const key of keys) await storage.remove(key)
  } catch {}
}
