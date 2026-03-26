import { useRef, useState, useCallback, useEffect } from 'react'

// Extend window for vendor-prefixed API
declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition
    SpeechRecognition: typeof SpeechRecognition
  }
}

interface SpeechRecognitionHook {
  startListening: () => void
  stopListening: () => void
  transcript: string          // accumulated confirmed final words
  interimTranscript: string   // current in-progress phrase (not finalized yet)
  resetTranscript: () => void
  isListening: boolean
  isSupported: boolean
}

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const SpeechRecognitionClass =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null

  const isSupported = !!SpeechRecognitionClass

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  const startListening = useCallback(() => {
    if (!isSupported || !SpeechRecognitionClass) return

    const recognition = new SpeechRecognitionClass()
    recognition.continuous = true
    recognition.interimResults = true   // expose partial results for live feedback
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 3     // get up to 3 alternatives for better matching

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let finalChunk = ''
      let interim = ''

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        if (result.isFinal) {
          // Use the most confident alternative (index 0 is highest confidence)
          finalChunk += result[0].transcript + ' '
        } else {
          // Show the best interim guess for live feedback
          interim += result[0].transcript
        }
      }

      if (finalChunk.trim()) {
        setTranscript(prev => (prev + ' ' + finalChunk).trim())
      }
      setInterimTranscript(interim)
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
    }

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== 'aborted') setIsListening(false)
      setInterimTranscript('')
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
    setTranscript('')
    setInterimTranscript('')
  }, [isSupported, SpeechRecognitionClass])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
    setInterimTranscript('')
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
  }, [])

  return { startListening, stopListening, transcript, interimTranscript, resetTranscript, isListening, isSupported }
}
