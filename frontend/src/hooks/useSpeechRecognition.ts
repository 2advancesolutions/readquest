import { useRef, useState, useCallback, useEffect } from 'react'

declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition
    SpeechRecognition: typeof SpeechRecognition
  }
}

export interface SpeechRecognitionHook {
  startListening: () => void   // SYNC — must be called directly from a user gesture
  stopListening: () => void
  transcript: string
  interimTranscript: string
  resetTranscript: () => void
  isListening: boolean
  isSupported: boolean
  permissionError: string
}

function getSRClass(): typeof SpeechRecognition | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

// iOS Safari fires onend after every pause; we restart to simulate continuous
const isIOS = (() => {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
})()

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [isListening, setIsListening]             = useState(false)
  const [transcript, setTranscript]               = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [permissionError, setPermissionError]     = useState('')

  const recognitionRef  = useRef<any>(null)
  const shouldKeepRef   = useRef(false)  // true while user wants listening active
  const transcriptRef   = useRef('')     // accumulates across iOS restarts

  useEffect(() => () => {
    shouldKeepRef.current = false
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.abort() } catch { /**/ }
      recognitionRef.current = null
    }
  }, [])

  const isSupported = !!getSRClass()

  // ── Attach events and start an instance ──────────────────────────────────
  const attachAndStart = useCallback((rec: any) => {
    rec.onstart = () => {
      setIsListening(true)
      setPermissionError('')   // clear any stale error once the mic is live
    }

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let finalChunk = ''
      let interim    = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalChunk += r[0].transcript + ' '
        else interim += r[0].transcript
      }
      if (finalChunk.trim()) {
        transcriptRef.current = (transcriptRef.current + ' ' + finalChunk).trim()
        setTranscript(transcriptRef.current)
      }
      setInterimTranscript(interim)
    }

    rec.onend = () => {
      setInterimTranscript('')
      if (shouldKeepRef.current && isIOS) {
        // iOS stops after every utterance — restart silently
        try {
          const next = new (getSRClass()!)()
          next.continuous     = false
          next.interimResults = true
          next.lang           = 'en-US'
          recognitionRef.current = next
          attachAndStart(next)
        } catch { /**/ }
      } else {
        shouldKeepRef.current = false
        setIsListening(false)
        recognitionRef.current = null
      }
    }

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      setInterimTranscript('')
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setPermissionError(
          'Microphone blocked. Tap the 🔒 lock icon in the address bar, ' +
          'select Site Settings, and set Microphone to Allow.'
        )
        shouldKeepRef.current = false
        setIsListening(false)
      } else if (e.error === 'network') {
        setPermissionError('Network error. Make sure you have an internet connection.')
        shouldKeepRef.current = false
        setIsListening(false)
      }
      // 'no-speech', 'aborted' are non-fatal — ignore
    }

    try {
      rec.start()
    } catch (err: any) {
      // InvalidStateError = already started (ignore), anything else = real failure
      if (err?.name !== 'InvalidStateError') {
        setIsListening(false)
        shouldKeepRef.current = false
        console.warn('[SpeechRec] start() failed:', err)
      }
    }
  }, [])

  /**
   * startListening MUST be called synchronously from a user gesture (button click).
   * Do NOT put any await before calling this — it will break the browser's
   * permission chain on iOS Safari and Android Chrome.
   */
  const startListening = useCallback(() => {
    const SRClass = getSRClass()
    if (!SRClass) {
      setPermissionError('Speech recognition is not supported in this browser. Try Chrome.')
      return
    }
    if (shouldKeepRef.current) return  // already running

    // Clear previous error and state
    setPermissionError('')
    setTranscript('')
    setInterimTranscript('')
    transcriptRef.current = ''

    // Abort any lingering instance
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.abort() } catch { /**/ }
      recognitionRef.current = null
    }

    const rec = new SRClass()
    rec.continuous     = !isIOS  // continuous=true breaks iOS Safari
    rec.interimResults = true
    rec.lang           = 'en-US'
    rec.maxAlternatives = 1

    shouldKeepRef.current  = true
    recognitionRef.current = rec

    // Calling start() directly from the click handler lets the browser
    // show its own "Allow microphone?" dialog without us needing getUserMedia.
    attachAndStart(rec)
  }, [attachAndStart])

  const stopListening = useCallback(() => {
    shouldKeepRef.current = false
    setIsListening(false)
    setInterimTranscript('')
    if (recognitionRef.current) {
      const rec = recognitionRef.current
      recognitionRef.current = null
      rec.onend = null   // prevent iOS auto-restart
      try { rec.stop() } catch { /**/ }
    }
  }, [])

  const resetTranscript = useCallback(() => {
    transcriptRef.current = ''
    setTranscript('')
    setInterimTranscript('')
  }, [])

  return {
    startListening,
    stopListening,
    transcript,
    interimTranscript,
    resetTranscript,
    isListening,
    isSupported,
    permissionError,
  }
}
