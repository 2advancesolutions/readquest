import { useRef, useState, useCallback } from 'react'

export type TtsMode = 'story' | 'teacher' | 'quiz' | 'word' | 'default'

interface SpeechSynthesisHook {
  speak: (text: string, mode?: TtsMode) => void
  stop: () => void
  isSpeaking: boolean
  isSupported: boolean
  currentWordIndex: number
}

/**
 * useSpeechSynthesis — natural human-sounding TTS.
 *
 * Uses Gemini TTS (Kore voice — warmest, most human female voice)
 * with a style-prompt prefix so it sounds like a real storyteller,
 * not a robot. Falls back to Web Speech API if the fetch fails.
 *
 * Pass `mode` to get the right delivery style:
 *   "story"   → warm engaged storyteller reading the page text
 *   "teacher" → friendly teacher giving directions
 *   "quiz"    → upbeat quiz feedback
 *   "word"    → slow clear pronunciation for practice
 *   "default" → warm natural voice
 */
export function useSpeechSynthesis(): SpeechSynthesisHook {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const isSupported = true

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
    setCurrentWordIndex(-1)
  }, [])

  const speak = useCallback(
    async (text: string, mode: TtsMode = 'default') => {
      stop()
      setIsSpeaking(true)

      const controller = new AbortController()
      abortRef.current = controller

      // Timeout: if Gemini TTS doesn't respond in 5s, fall back to Web Speech immediately
      const fetchTimeout = setTimeout(() => controller.abort(), 5000)

      try {
        // ── Gemini TTS (Kore — warm natural female) ──────────────────────────
        const res = await fetch('http://localhost:8000/api/tts/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: 'Kore', mode }),
          signal: controller.signal,
        })
        clearTimeout(fetchTimeout)

        if (!res.ok) throw new Error(`TTS failed: ${res.status}`)

        const blob = await res.blob()
        // Supports both audio/mpeg (Google Cloud TTS) and audio/wav (Gemini fallback)
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio

        audio.onended = () => {
          setIsSpeaking(false)
          setCurrentWordIndex(-1)
          URL.revokeObjectURL(url)
        }
        audio.onerror = () => {
          setIsSpeaking(false)
          URL.revokeObjectURL(url)
        }

        await audio.play()
      } catch (err: unknown) {
        clearTimeout(fetchTimeout)
        // If user explicitly called stop() — detected by abortRef being cleared — exit silently
        if (err instanceof Error && err.name === 'AbortError' && !abortRef.current) {
          setIsSpeaking(false)
          return
        }
        // TTS failed — stay silent rather than play robot Web Speech voice
        console.warn('[TTS] Chirp3-HD failed, staying silent:', err)
        setIsSpeaking(false)
      }
    },
    [stop]
  )

  return { speak, stop, isSpeaking, isSupported, currentWordIndex }
}
