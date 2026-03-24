import { useRef, useState, useCallback, useEffect } from 'react'

interface SpeechSynthesisHook {
  speak: (text: string, onWordBoundary?: (charIndex: number, word: string) => void) => void
  stop: () => void
  isSpeaking: boolean
  isSupported: boolean
  currentWordIndex: number
}

const preferredVoiceNames = [
  'Samantha', 'Karen', 'Moira', 'Tessa', // Mac
  'Microsoft Zira', 'Google US English', // Windows/Chrome
  'Google UK English Female',
]

function pickKidVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  for (const name of preferredVoiceNames) {
    const v = voices.find(v => v.name.includes(name))
    if (v) return v
  }
  return voices.find(v => v.lang.startsWith('en')) ?? null
}

export function useSpeechSynthesis(): SpeechSynthesisHook {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  // Load voices (some browsers fire voiceschanged event)
  useEffect(() => {
    if (!isSupported) return
    window.speechSynthesis.getVoices()
    window.speechSynthesis.addEventListener('voiceschanged', () =>
      window.speechSynthesis.getVoices()
    )
  }, [isSupported])

  const stop = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setCurrentWordIndex(-1)
  }, [isSupported])

  const speak = useCallback(
    (text: string, onWordBoundary?: (charIndex: number, word: string) => void) => {
      if (!isSupported) return
      window.speechSynthesis.cancel()

      const words = text.split(/\s+/)
      const utter = new SpeechSynthesisUtterance(text)
      utter.rate = 0.85
      utter.pitch = 1.1
      utter.volume = 1

      const voice = pickKidVoice()
      if (voice) utter.voice = voice

      utter.onstart = () => setIsSpeaking(true)
      utter.onend = () => {
        setIsSpeaking(false)
        setCurrentWordIndex(-1)
      }
      utter.onerror = () => {
        setIsSpeaking(false)
        setCurrentWordIndex(-1)
      }

      utter.onboundary = (e: SpeechSynthesisEvent) => {
        if (e.name !== 'word') return
        // Find which word index we're on by char position
        let idx = 0, charCount = 0
        for (let i = 0; i < words.length; i++) {
          if (charCount + words[i].length > e.charIndex) { idx = i; break }
          charCount += words[i].length + 1
        }
        setCurrentWordIndex(idx)
        if (onWordBoundary) onWordBoundary(e.charIndex, words[idx] || '')
      }

      utterRef.current = utter
      window.speechSynthesis.speak(utter)
    },
    [isSupported]
  )

  return { speak, stop, isSpeaking, isSupported, currentWordIndex }
}
