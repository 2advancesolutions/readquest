/**
 * WelcomeVoice
 * Plays a narration on mount/step-change using the backend Google Chirp 3: HD Aoede voice.
 * Accepts either:
 *   - charName  → picks one of 5 catchy Step-1 scripts that reference the hero by name
 *   - text      → speaks the exact string provided (used for Step 2, 3, etc.)
 * Shows an animated speaker indicator while audio is playing.
 *
 * IMPORTANT: Uses a module-level singleton so that at most ONE audio plays at any time.
 * When a new WelcomeVoice mounts (step change), it immediately stops any audio that is
 * still playing from the previous step before starting its own.
 */
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  /** Step 1 mode: hero character name — picks a random catchy script */
  charName?: string
  /** Direct mode: exact text to speak (Step 2+) */
  text?: string
  /** Optional delay before speaking, default 800ms */
  delayMs?: number
}

// ── Step 1 scripts (reference the character by name) ──────────────────────
const CHAR_SCRIPTS: Array<(name: string) => string> = [
  name => `Welcome to the Magic Story Workshop! I see ${name} is ready to go — just type their name in the box and we'll create an epic reading adventure together! Or explore the gallery below and pick any character you love!`,
  name => `Hey there, young storyteller! ${name} is waiting for you — type their name in the search box to kick off a totally amazing story, or choose any hero from the gallery below. Your adventure starts with one name!`,
  name => `Psst — want to create a super cool cartoon story? Try typing ${name} right here in the magic input box! Or scroll through the characters below and tap your all-time favorite. The story begins the moment you type!`,
  name => `Story alert! You can start your journey with ${name} — just type their name in the box and watch the magic happen! Prefer someone else? Browse the gallery below and pick your perfect hero!`,
  name => `Hello, creative genius! Your mission — type ${name} or any character you love into the magic search box, hit Let's Go, and we'll build an incredible personalised story just for you. The whole gallery is ready and waiting!`,
]

// ── Step 2 scripts (world building / theme picker) ────────────────────────
export const STEP2_SCRIPTS = [
  `Now it's time to build your hero's world! On the left, pick a theme for your adventure — maybe a magical forest, outer space, or under the ocean. Or describe your very own setting in the text box below! Once you've chosen, hit Next to bring your story to life!`,
  `Great choice on your hero! Now let's set the scene. Pick a theme from the cards on the left — each one takes your character on a totally different adventure. Feeling creative? Type your own unique setting in the box! Hit the microphone if you'd rather just say it out loud!`,
  `Step two — time to choose your world! Tap one of the adventure themes to set the stage for your story. You can also describe a custom setting in your own words, or tap the microphone and just say it! When you're happy, tap Next and we'll build something amazing!`,
]

// ─────────────────────────────────────────────────────────────────────────────
// PRELOAD CACHE
// Dashboard calls preloadWelcomeVoice() the moment the user clicks "Create Story".
// The TTS fetch starts immediately — by the time the page loads and WelcomeVoice
// mounts, the audio blob is ready and plays with zero delay.
// ─────────────────────────────────────────────────────────────────────────────

// Same seed pool as StoryGenerator so the preloaded voice matches what plays
const PRELOAD_SEEDS = ['SpongeBob', 'Mickey Mouse', 'Pikachu', 'Mario', 'Stitch', 'Elsa', 'Simba']

// key → Promise<blob URL string | null>
const preloadCache = new Map<string, Promise<string | null>>()

/** Call this before navigating to /generate. Fires TTS in the background. */
export function preloadWelcomeVoice() {
  const apiBase = (typeof import.meta !== 'undefined'
    ? (import.meta as any).env?.VITE_API_URL
    : '') || ''
  // Pick the same random character the generator will use
  const charName = PRELOAD_SEEDS[Math.floor(Math.random() * PRELOAD_SEEDS.length)]
  const script   = CHAR_SCRIPTS[Math.floor(Math.random() * CHAR_SCRIPTS.length)]
  const speech   = script(charName)
  const cacheKey = speech

  if (preloadCache.has(cacheKey)) return // already in flight or done

  const promise = fetch(`${apiBase}/api/tts/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: speech, mode: 'story' }),
  })
    .then(res => res.ok ? res.blob() : null)
    .then(blob => blob ? URL.createObjectURL(blob) : null)
    .catch(() => null)

  preloadCache.set(cacheKey, promise)

  // Stash the resolved text so WelcomeVoice can look it up by charName
  preloadCache.set(`__char__${charName}`, Promise.resolve(speech))
  preloadCache.set(`__url__${charName}`, promise)
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL GLOBAL VOICE SINGLETON
// Only one audio element + one pending timer can exist at a time across ALL
// WelcomeVoice instances. Any new instance calls stopGlobalVoice() first.
// ─────────────────────────────────────────────────────────────────────────────
const globalVoice = {
  audio: null as HTMLAudioElement | null,
  blobUrl: null as string | null,
  timer: null as ReturnType<typeof setTimeout> | null,
  setSpeaking: null as ((v: boolean) => void) | null,
}

function stopGlobalVoice() {
  // Clear pending timer (voice hasn't started speaking yet)
  if (globalVoice.timer !== null) {
    clearTimeout(globalVoice.timer)
    globalVoice.timer = null
  }
  // Stop & tear down the audio element
  if (globalVoice.audio) {
    globalVoice.audio.pause()
    globalVoice.audio.src = ''
    globalVoice.audio = null
  }
  // Revoke blob URL to free memory
  if (globalVoice.blobUrl) {
    URL.revokeObjectURL(globalVoice.blobUrl)
    globalVoice.blobUrl = null
  }
  // Tell the previous owner's React state to update
  globalVoice.setSpeaking?.(false)
  globalVoice.setSpeaking = null
}

export default function WelcomeVoice({ charName, text, delayMs = 800 }: Props) {
  const [speaking, setSpeaking] = useState(false)
  // Track whether this instance is the current "owner" of the global voice
  const isOwnerRef = useRef(false)

  // The trigger key — changes cause the effect to re-run and speak
  const triggerKey = text ?? charName ?? ''

  useEffect(() => {
    if (!triggerKey) return

    // ── 1. Stop whatever is currently playing (different step's voice) ────────
    stopGlobalVoice()

    // ── 2. Resolve the text to speak ─────────────────────────────────────────
    let speech: string
    if (text) {
      speech = text
    } else if (charName) {
      const pick = CHAR_SCRIPTS[Math.floor(Math.random() * CHAR_SCRIPTS.length)]
      speech = pick(charName)
    } else {
      return
    }

    // ── 3. Claim ownership of the global singleton ────────────────────────────
    isOwnerRef.current = true
    globalVoice.setSpeaking = setSpeaking

    const apiBase = import.meta.env.VITE_API_URL || ''

    // ── 4. Check preload cache: if audio is already downloaded, play instantly ─
    const cachedUrlPromise = charName
      ? preloadCache.get(`__url__${charName}`) ?? null
      : preloadCache.get(speech) ?? null

    const playAudio = async (urlPromise: Promise<string | null> | null, delay: number) => {
      const doPlay = async () => {
        if (!isOwnerRef.current) return
        globalVoice.timer = null
        try {
          let url: string | null = null
          if (urlPromise) {
            // Use preloaded blob — already downloaded!
            url = await urlPromise
            // Clean entry so it can't be replayed unintentionally
            preloadCache.delete(`__url__${charName}`)
            preloadCache.delete(`__char__${charName}`)
            preloadCache.delete(speech)
          } else {
            const res = await fetch(`${apiBase}/api/tts/speak`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: speech, mode: 'story' }),
            })
            if (!res.ok || !isOwnerRef.current) return
            const blob = await res.blob()
            if (!isOwnerRef.current) return
            url = URL.createObjectURL(blob)
          }

          if (!url || !isOwnerRef.current) return

          globalVoice.blobUrl = url
          const audio = new Audio(url)
          globalVoice.audio = audio

          audio.onplay = () => { if (isOwnerRef.current) setSpeaking(true) }
          audio.onended = () => {
            setSpeaking(false)
            globalVoice.audio = null
            globalVoice.blobUrl && URL.revokeObjectURL(globalVoice.blobUrl)
            globalVoice.blobUrl = null
          }
          audio.onerror = () => {
            setSpeaking(false)
            globalVoice.audio = null
          }
          audio.play().catch(() => setSpeaking(false))
        } catch {
          // Silently fail — voice is enhancement only
        }
      }

      if (delay > 0) {
        const timer = setTimeout(doPlay, delay)
        globalVoice.timer = timer
      } else {
        doPlay()
      }
    }

    // If preloaded: play with 0 delay. Otherwise use normal delay.
    playAudio(cachedUrlPromise, cachedUrlPromise ? 0 : delayMs)

    // ── 5. Cleanup: runs when this instance unmounts or triggerKey changes ────
    return () => {
      isOwnerRef.current = false
      if (globalVoice.setSpeaking === setSpeaking) {
        stopGlobalVoice()
      }
    }
  }, [triggerKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {speaking && (
        <motion.div
          className="wv-indicator"
          initial={{ opacity: 0, y: 6, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.88 }}
          transition={{ duration: 0.25 }}
        >
          <span className="wv-icon" aria-label="Speaking">🔊</span>
          <div className="wv-bars" aria-hidden>
            <span /><span /><span /><span /><span />
          </div>
          <span className="wv-tip">Playing instructions…</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
