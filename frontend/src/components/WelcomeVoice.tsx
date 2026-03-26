/**
 * WelcomeVoice
 * Plays a random welcome narration on page load using the backend Google Chirp 3: HD TTS
 * (same natural voice used throughout the app — no robotic browser synthesis).
 * Shows an animated speaker indicator while audio plays.
 */
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  charName: string  // name of the hero shown at top (e.g. "Iron Man")
}

// 5 catchy scripts — a different one is picked at random each page load
const SCRIPTS: Array<(name: string) => string> = [
  name => `Welcome to the Magic Story Workshop! I see ${name} is ready to go — just type their name in the box and we'll create an epic reading adventure together! Or explore the gallery below and pick any character you love!`,

  name => `Hey there, young storyteller! ${name} is waiting for you — type their name in the search box to kick off a totally amazing story, or choose any hero from the gallery below. Your adventure starts with one name!`,

  name => `Psst — want to create a super cool cartoon story? Try typing ${name} right here in the magic input box! Or scroll through the characters below and tap your all-time favorite. The story begins the moment you type!`,

  name => `Story alert! You can start your journey with ${name} — just type their name in the box and watch the magic happen! Prefer someone else? Browse the gallery below and pick your perfect hero!`,

  name => `Hello, creative genius! Your mission — type ${name} or any character you love into the magic search box, hit Let's Go, and we'll build an incredible personalised story just for you. The whole gallery is ready and waiting!`,
]

export default function WelcomeVoice({ charName }: Props) {
  const [speaking, setSpeaking] = useState(false)
  const audioRef  = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const hasSpoken  = useRef(false)

  useEffect(() => {
    // Only trigger once per mount, and only when we have a real char name
    if (!charName || hasSpoken.current) return
    hasSpoken.current = true

    const script = SCRIPTS[Math.floor(Math.random() * SCRIPTS.length)]
    const text = script(charName)

    const apiBase = import.meta.env.VITE_API_URL || ''

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${apiBase}/api/tts/speak`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, mode: 'story' }), // Aoede — warm, engaging female storyteller
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
        // Silently fail — voice is enhancement, not critical
      }
    }, 800) // small delay so page settles before audio starts

    return () => {
      clearTimeout(timer)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
      setSpeaking(false)
    }
  }, [charName])

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
          <span className="wv-tip">Playing intro…</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
