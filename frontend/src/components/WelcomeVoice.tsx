/**
 * WelcomeVoice
 * Plays a narration on mount/step-change using the backend Google Chirp 3: HD Aoede voice.
 * Accepts either:
 *   - charName  → picks one of 5 catchy Step-1 scripts that reference the hero by name
 *   - text      → speaks the exact string provided (used for Step 2, 3, etc.)
 * Shows an animated speaker indicator while audio is playing.
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

export default function WelcomeVoice({ charName, text, delayMs = 800 }: Props) {
  const [speaking, setSpeaking] = useState(false)
  const audioRef   = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const hasSpoken  = useRef(false)

  // The trigger key — changes cause the effect to re-run and speak
  const triggerKey = text ?? charName ?? ''

  useEffect(() => {
    if (!triggerKey || hasSpoken.current) return
    hasSpoken.current = true

    // Resolve the text to speak
    let speech: string
    if (text) {
      speech = text
    } else if (charName) {
      const pick = CHAR_SCRIPTS[Math.floor(Math.random() * CHAR_SCRIPTS.length)]
      speech = pick(charName)
    } else {
      return
    }

    const apiBase = import.meta.env.VITE_API_URL || ''

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${apiBase}/api/tts/speak`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: speech, mode: 'story' }), // Aoede — warm female storyteller
        })
        if (!res.ok) return

        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        blobUrlRef.current = url

        const audio = new Audio(url)
        audioRef.current = audio
        audio.onplay  = () => setSpeaking(true)
        audio.onended = () => setSpeaking(false)
        audio.onerror = () => setSpeaking(false)
        audio.play().catch(() => setSpeaking(false))
      } catch {
        // Silently fail — voice is enhancement only
      }
    }, delayMs)

    return () => {
      clearTimeout(timer)
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
      setSpeaking(false)
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
