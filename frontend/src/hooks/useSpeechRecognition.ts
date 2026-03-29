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

// Detect iOS Safari — requires special handling
const isIOS = (() => {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
})()

// Detect Android Chrome
const isAndroid = (() => {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
})()

// Use non-continuous mode on iOS and some Android browsers
const useNonContinuous = isIOS

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [isListening, setIsListening]             = useState(false)
  const [transcript, setTranscript]               = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [permissionError, setPermissionError]     = useState('')

  const recognitionRef  = useRef<any>(null)
  const shouldKeepRef   = useRef(false)
  const transcriptRef   = useRef('')

  // Cleanup on unmount
  useEffect(() => () => {
    shouldKeepRef.current = false
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.abort() } catch { /**/ }
      recognitionRef.current = null
    }
  }, [])

  const isSupported = !!getSRClass()

  // ── Create and start one recognition session ──────────────────────────────
  // On iOS: one session per user tap (non-continuous). When it ends, isListening
  // goes false and the user taps again. This is the ONLY reliable pattern on iOS.
  // On Desktop Chrome: continuous mode runs indefinitely until stopListening().
  const startSession = useCallback(() => {
    const SRClass = getSRClass()
    if (!SRClass) return

    // Abort any lingering instance
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.abort() } catch { /**/ }
      recognitionRef.current = null
    }

    const rec = new SRClass()

    if (useNonContinuous) {
      // iOS: single-shot mode
      // - continuous: false — iOS requires this
      // - interimResults: false — interim results are unreliable on iOS and
      //   cause empty onresult events that swallow final transcripts
      rec.continuous     = false
      rec.interimResults = false
    } else {
      // Desktop Chrome / Android: full continuous mode
      rec.continuous     = true
      rec.interimResults = true
    }

    rec.lang            = 'en-US'
    rec.maxAlternatives = 1

    recognitionRef.current = rec

    rec.onstart = () => {
      setIsListening(true)
      setPermissionError('')
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
      if (!useNonContinuous) {
        setInterimTranscript(interim)
      }
    }

    rec.onend = () => {
      setInterimTranscript('')
      recognitionRef.current = null

      if (useNonContinuous) {
        // iOS: session ended naturally (silence, or done speaking).
        // Set isListening false — the user must tap again to continue.
        // Do NOT restart here — that would be outside a user gesture and fail silently.
        shouldKeepRef.current = false
        setIsListening(false)
      } else {
        // Desktop: restart if user hasn't stopped
        if (shouldKeepRef.current) {
          try {
            startSession()
          } catch { /**/ }
        } else {
          setIsListening(false)
        }
      }
    }

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      setInterimTranscript('')
      recognitionRef.current = null

      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        let msg = 'Microphone access denied.'
        if (isIOS) {
          msg = 'Microphone blocked. Go to Settings → Safari → Microphone and set it to Allow.'
        } else if (isAndroid) {
          msg = 'Microphone blocked. Tap the 🔒 lock in the address bar → Site Settings → Microphone → Allow.'
        } else {
          msg = 'Microphone blocked. Tap the 🔒 lock in the address bar and set Microphone to Allow.'
        }
        setPermissionError(msg)
        shouldKeepRef.current = false
        setIsListening(false)
      } else if (e.error === 'network') {
        setPermissionError('Network error — check your internet connection and try again.')
        shouldKeepRef.current = false
        setIsListening(false)
      } else if (e.error === 'no-speech') {
        // iOS fires this after silence — just stop cleanly
        shouldKeepRef.current = false
        setIsListening(false)
      } else if (e.error === 'aborted') {
        // Intentionally stopped — ignore
        if (!shouldKeepRef.current) setIsListening(false)
      }
      // All other errors: stop cleanly
      else {
        shouldKeepRef.current = false
        setIsListening(false)
      }
    }

    try {
      rec.start()
    } catch (err: any) {
      if (err?.name !== 'InvalidStateError') {
        setIsListening(false)
        shouldKeepRef.current = false
        recognitionRef.current = null
        console.warn('[SpeechRec] start() failed:', err)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * startListening MUST be called synchronously from a user gesture (button click).
   * Do NOT put any await before calling this — it will break the browser's
   * permission chain on iOS Safari and Android Chrome.
   */
  const startListening = useCallback(() => {
    const SRClass = getSRClass()
    if (!SRClass) {
      setPermissionError(
        isIOS
          ? 'Voice input requires Safari on iOS 14.5+. Make sure you are using Safari.'
          : 'Speech recognition is not supported in this browser. Try Chrome or Safari.'
      )
      return
    }
    if (shouldKeepRef.current) return  // already running

    setPermissionError('')
    // On iOS we DON'T clear the transcript between sessions so text accumulates
    // across multiple taps (one tap = one iOS session)
    if (!useNonContinuous) {
      setTranscript('')
      setInterimTranscript('')
      transcriptRef.current = ''
    }

    shouldKeepRef.current = true
    startSession()
  }, [startSession])

  const stopListening = useCallback(() => {
    shouldKeepRef.current = false
    setIsListening(false)
    setInterimTranscript('')
    if (recognitionRef.current) {
      const rec = recognitionRef.current
      recognitionRef.current = null
      rec.onend = null   // prevent any restart logic
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
