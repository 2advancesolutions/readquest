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
        // Only exit silently if the user explicitly called stop() — detected by abortRef being cleared
        if (err instanceof Error && err.name === 'AbortError' && !abortRef.current) {
          setIsSpeaking(false)
          return  // user stopped intentionally — don't fall back to Web Speech
        }
        // Timeout-abort or network error → fall through to Web Speech fallback
        console.warn('[TTS] Gemini TTS failed, falling back to Web Speech API:', err)

        // ── Web Speech API fallback ──────────────────────────────────────────
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
          setIsSpeaking(false)
          return
        }

        window.speechSynthesis.cancel()
        const words = text.split(/\s+/)
        const utter = new SpeechSynthesisUtterance(text)

        // Tune delivery per mode
        if (mode === 'story') {
          utter.rate = 0.88; utter.pitch = 1.08
        } else if (mode === 'word') {
          utter.rate = 0.7; utter.pitch = 1.1
        } else if (mode === 'quiz') {
          utter.rate = 0.95; utter.pitch = 1.12
        } else {
          utter.rate = 0.9; utter.pitch = 1.05
        }
        utter.volume = 1

        // Best natural voices ordered by quality (macOS Enhanced > Microsoft Natural > Google)
        const PREFERRED_VOICES = [
          // macOS premium voices (Enhanced = neural)
          'Ava (Enhanced)', 'Ava', 'Allison (Enhanced)', 'Allison',
          'Samantha (Enhanced)', 'Samantha', 'Karen (Enhanced)', 'Karen',
          'Victoria (Enhanced)', 'Victoria',
          // Windows/Edge natural voices
          'Microsoft Aria Online (Natural)', 'Microsoft Jenny Online (Natural)',
          'Microsoft Aria', 'Microsoft Jenny',
          // Google voices
          'Google US English', 'Google UK English Female',
        ]

        const applyVoice = () => {
          const voices = window.speechSynthesis.getVoices()
          for (const name of PREFERRED_VOICES) {
            const v = voices.find(v => v.name === name || v.name.startsWith(name))
            if (v) { utter.voice = v; break }
          }
          // Final fallback: any English female voice
          if (!utter.voice) {
            const femaleEn = window.speechSynthesis.getVoices()
              .find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('female')))
            if (femaleEn) utter.voice = femaleEn
          }
        }

        // Voices may not be loaded yet on first call
        if (window.speechSynthesis.getVoices().length > 0) {
          applyVoice()
        } else {
          window.speechSynthesis.onvoiceschanged = () => { applyVoice(); window.speechSynthesis.onvoiceschanged = null }
        }

        utter.onstart = () => setIsSpeaking(true)
        utter.onend = () => { setIsSpeaking(false); setCurrentWordIndex(-1) }
        utter.onerror = () => { setIsSpeaking(false); setCurrentWordIndex(-1) }
        utter.onboundary = (e: SpeechSynthesisEvent) => {
          if (e.name !== 'word') return
          let idx = 0, charCount = 0
          for (let i = 0; i < words.length; i++) {
            if (charCount + words[i].length > e.charIndex) { idx = i; break }
            charCount += words[i].length + 1
          }
          setCurrentWordIndex(idx)
        }
        utterRef.current = utter
        window.speechSynthesis.speak(utter)

      }
    },
    [stop]
  )

  return { speak, stop, isSpeaking, isSupported, currentWordIndex }
}
