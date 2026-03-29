/**
 * examTutorial.ts
 *
 * Pre-fetches and caches the Exam Center voice tutorial in sessionStorage
 * so it plays instantly without delay when the student arrives.
 *
 * Cache key: `rq_exam_tutorial_<studentId>`
 *
 * Usage pattern (mirrors SpellingArena / StoryGenerator):
 *   1. Dashboard calls `preloadExamTutorial(id, fullName)` on child-select   → silent background fetch
 *   2. ReadingExams mounts → calls `autoPlayExamTutorial(id, firstName, cb)` → plays cache instantly
 *      If cache misses (direct navigation), fetches live and plays without any perceivable delay.
 */

const API_BASE    = import.meta.env.VITE_API_URL || ''
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

    `To take an exam, just click the section you want to test: Phonics, Vocabulary, Comprehension, Grammar, or the Mixed Assessment. ` +
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

// ── Internal helpers ──────────────────────────────────────────────────────────

async function fetchTutorialBlob(firstName: string): Promise<Blob | null> {
  try {
    const res = await fetch(`${API_BASE}/api/tts/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: buildTutorialText(firstName), mode: 'teacher' }),
    })
    if (!res.ok) return null
    return res.blob()
  } catch {
    return null
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

function playDataUrl(dataUrl: string, onEnd?: () => void): void {
  try {
    const audio = new Audio(dataUrl)
    audio.onended = () => onEnd?.()
    audio.onerror = () => onEnd?.()
    audio.play().catch(() => onEnd?.())
  } catch {
    onEnd?.()
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Pre-fetch and cache the exam tutorial audio (fire-and-forget).
 * Called from Dashboard when a child is selected so the audio is
 * ready the instant the student hits /exams.
 */
export async function preloadExamTutorial(studentId: string, fullName: string): Promise<void> {
  const cacheKey = `${CACHE_PREFIX}${studentId}`
  if (sessionStorage.getItem(cacheKey)) return   // already cached

  const firstName = firstNameOnly(fullName)
  const blob = await fetchTutorialBlob(firstName)
  if (!blob) return

  try {
    const dataUrl = await blobToDataUrl(blob)
    sessionStorage.setItem(cacheKey, dataUrl)
  } catch {
    // sessionStorage quota exceeded — silently skip
  }
}

/**
 * Play the cached tutorial audio.
 * Returns true on cache hit (plays instantly), false on miss.
 */
export function playExamTutorial(studentId: string, onEnd?: () => void): boolean {
  const dataUrl = sessionStorage.getItem(`${CACHE_PREFIX}${studentId}`)
  if (!dataUrl) return false
  playDataUrl(dataUrl, onEnd)
  return true
}

/**
 * Auto-play the exam tutorial on page mount — mirrors SpellingArena pattern exactly.
 *
 * 1. If audio is already cached from Dashboard preload → plays INSTANTLY (zero delay)
 * 2. If cache misses (user navigated directly to /exams) → fetches live, plays as soon as ready,
 *    AND saves to cache so next visit is instant
 *
 * Call this inside a useEffect with a useRef guard to prevent double-fire.
 *
 * @returns cleanup function (cancels pending fetch if component unmounts)
 */
export function autoPlayExamTutorial(
  studentId: string,
  firstName: string,
  onEnd?: () => void,
): () => void {
  let cancelled = false

  // Cache hit → instant playback
  if (playExamTutorial(studentId, onEnd)) {
    return () => {}  // nothing to cancel
  }

  // Cache miss → fetch live, then play + cache
  fetchTutorialBlob(firstName).then(async blob => {
    if (cancelled || !blob) { onEnd?.(); return }

    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)

    audio.onended = () => { URL.revokeObjectURL(url); onEnd?.() }
    audio.onerror = () => { URL.revokeObjectURL(url); onEnd?.() }

    if (cancelled) { URL.revokeObjectURL(url); onEnd?.(); return }
    audio.play().catch(() => onEnd?.())

    // Save to cache so next visit is instant
    try {
      const dataUrl = await blobToDataUrl(blob)
      if (!cancelled) sessionStorage.setItem(`${CACHE_PREFIX}${studentId}`, dataUrl)
    } catch { /* quota exceeded */ }
  })

  return () => { cancelled = true }
}

/**
 * Fetch fresh tutorial audio directly (legacy — prefer autoPlayExamTutorial).
 */
export async function fetchAndPlayExamTutorial(
  firstName: string,
  onEnd?: () => void,
): Promise<void> {
  const blob = await fetchTutorialBlob(firstName)
  if (!blob) { onEnd?.(); return }

  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.onended = () => { URL.revokeObjectURL(url); onEnd?.() }
  audio.onerror = () => { URL.revokeObjectURL(url); onEnd?.() }
  audio.play().catch(() => onEnd?.())
}

/** Evict cached tutorial audio on logout. */
export function clearExamTutorialCache(): void {
  Object.keys(sessionStorage)
    .filter(k => k.startsWith(CACHE_PREFIX))
    .forEach(k => sessionStorage.removeItem(k))
}
