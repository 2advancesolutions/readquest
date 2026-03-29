/**
 * useTTS — shared TTS hook for the Spelling Arena.
 *
 * Calls POST /api/tts/speak with a configurable mode:
 *   'word'    → Chirp3-HD Kore (slow, clear pronunciation)
 *   'teacher' → Chirp3-HD Kore (warm, encouraging teacher voice)
 *   'quiz'    → Chirp3-HD Puck (bright, enthusiastic, fun for kids)
 *
 * Returns a `speak(text, mode?)` function and `speaking` state.
 * Auto-cancels previous audio on new call.
 */
import { useCallback, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

export type TTSMode = 'word' | 'teacher' | 'quiz' | 'story' | 'default'

export function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [speaking, setSpeaking] = useState(false)

  const speak = useCallback(async (text: string, mode: TTSMode = 'word') => {
    if (!text.trim()) return

    // Cancel current playback
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setSpeaking(true)

    try {
      const res = await fetch(`${API_BASE}/api/tts/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode }),
      })
      if (!res.ok) throw new Error('TTS request failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => {
        setSpeaking(false)
        URL.revokeObjectURL(url)
        audioRef.current = null
      }
      audio.onerror = () => {
        setSpeaking(false)
        URL.revokeObjectURL(url)
        audioRef.current = null
      }
      await audio.play()
    } catch {
      setSpeaking(false)
    }
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setSpeaking(false)
  }, [])

  return { speak, speaking, stop }
}
