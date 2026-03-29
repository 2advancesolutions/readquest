/**
 * spellingWelcome.ts
 *
 * Preloads the Spelling Arena welcome audio in the background (e.g. from the
 * Dashboard when a child is selected) and caches it in sessionStorage as a
 * base64 data-URL so SpellingArena can play it instantly with zero delay.
 *
 * Cache key: `rq_welcome_<studentId>` — automatically stale when student changes.
 */

const API_BASE = import.meta.env.VITE_API_URL || ''
const CACHE_PREFIX = 'rq_welcome_'

/** Returns just the first name from a full name string */
export function firstNameOnly(fullName: string): string {
  return (fullName || '').trim().split(/\s+/)[0] || ''
}

/** Build the personalised welcome message */
function buildWelcomeText(firstName: string): string {
  const name = firstName ? `, ${firstName}` : ''
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

/** Pre-fetch and cache the welcome audio for a student (fire-and-forget). */
export async function preloadSpellingWelcome(studentId: string, fullName: string): Promise<void> {
  const cacheKey = `${CACHE_PREFIX}${studentId}`

  // Already cached for this student — nothing to do
  if (sessionStorage.getItem(cacheKey)) return

  const firstName = firstNameOnly(fullName)
  try {
    const res = await fetch(`${API_BASE}/api/tts/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: buildWelcomeText(firstName), mode: 'teacher' }),
    })
    if (!res.ok) return

    const blob = await res.blob()
    // Convert to base64 and persist
    const reader = new FileReader()
    reader.onloadend = () => {
      try {
        const dataUrl = reader.result as string
        sessionStorage.setItem(cacheKey, dataUrl)
        sessionStorage.setItem(`${cacheKey}_mime`, blob.type)
      } catch {
        // sessionStorage quota exceeded — silently skip
      }
    }
    reader.readAsDataURL(blob)
  } catch {
    // Network or TTS error — SpellingArena will generate fresh
  }
}

/** Play the cached welcome audio. Returns true if cache hit, false if miss. */
export function playSpellingWelcome(
  studentId: string,
  onEnd?: () => void,
): boolean {
  const cacheKey = `${CACHE_PREFIX}${studentId}`
  const dataUrl = sessionStorage.getItem(cacheKey)
  if (!dataUrl) return false

  try {
    const audio = new Audio(dataUrl)
    audio.onended = () => onEnd?.()
    audio.onerror = () => onEnd?.()
    audio.play().catch(() => onEnd?.())
    return true
  } catch {
    return false
  }
}

/** Evict cached audio for all students (call on logout). */
export function clearSpellingWelcomeCache(): void {
  Object.keys(sessionStorage)
    .filter(k => k.startsWith(CACHE_PREFIX))
    .forEach(k => sessionStorage.removeItem(k))
}
