/**
 * useSpeechRecognition — universal speech recognition hook.
 *
 * PATH 1: Browser SpeechRecognition API (Chrome desktop, Safari iOS)
 *   → Uses webkitSpeechRecognition directly. Fast, no server round-trip.
 *   → Single-shot mode on iOS/Android (tap per phrase).
 *
 * PATH 2: Server-side STT via MediaRecorder (Chrome iOS, Firefox, any unsupported browser)
 *   → Records audio with MediaRecorder (works EVERYWHERE)
 *   → Sends audio blob to POST /api/stt/transcribe (Gemini transcription)
 *   → Returns transcribed text. Slightly slower but universally compatible.
 *
 * The hook automatically detects which path to use. Callers don't need to know.
 */
import { useRef, useState, useCallback, useEffect } from 'react'

declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition
    SpeechRecognition: typeof SpeechRecognition
  }
}

export interface SpeechRecognitionHook {
  startListening: (lang?: string) => void
  stopListening: () => void
  transcript: string
  interimTranscript: string
  resetTranscript: () => void
  isListening: boolean
  isSupported: boolean      // always true now (MediaRecorder fallback)
  permissionError: string
}

function getSRClass(): typeof SpeechRecognition | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

const isIOS = (() => {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
})()

const isAndroid = (() => {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
})()

// Browser SpeechRecognition: single-shot on mobile, continuous on desktop
const useNonContinuous = isIOS || isAndroid

// Can we use the browser SpeechRecognition API?
const hasBrowserSR = !!getSRClass()

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || ''


export function useSpeechRecognition(): SpeechRecognitionHook {
  const [isListening, setIsListening]             = useState(false)
  const [transcript, setTranscript]               = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [permissionError, setPermissionError]     = useState('')

  const recognitionRef   = useRef<any>(null)
  const shouldKeepRef    = useRef(false)
  const transcriptRef    = useRef('')
  const currentLangRef   = useRef('en-US')

  // MediaRecorder fallback refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef   = useRef<Blob[]>([])
  const mediaStreamRef   = useRef<MediaStream | null>(null)
  const silenceTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup on unmount
  useEffect(() => () => {
    shouldKeepRef.current = false
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.abort() } catch { /**/ }
      recognitionRef.current = null
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      try { mediaRecorderRef.current.stop() } catch { /**/ }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  // Always supported: browser SR or MediaRecorder fallback
  const isSupported = true

  // ═══════════════════════════════════════════════════════════════════════════
  // PATH 1: Browser SpeechRecognition
  // ═══════════════════════════════════════════════════════════════════════════
  const startBrowserSession = useCallback((lang = 'en-US') => {
    const SRClass = getSRClass()
    if (!SRClass) return

    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.abort() } catch { /**/ }
      recognitionRef.current = null
    }

    const rec = new SRClass()
    if (useNonContinuous) {
      rec.continuous     = false
      rec.interimResults = false
    } else {
      rec.continuous     = true
      rec.interimResults = true
    }
    rec.lang            = lang
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
      if (!useNonContinuous) setInterimTranscript(interim)
    }

    rec.onend = () => {
      setInterimTranscript('')
      recognitionRef.current = null
      if (useNonContinuous) {
        shouldKeepRef.current = false
        setIsListening(false)
      } else if (shouldKeepRef.current) {
        try { startBrowserSession(currentLangRef.current) } catch { /**/ }
      } else {
        setIsListening(false)
      }
    }

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      setInterimTranscript('')
      recognitionRef.current = null
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        const msg = isIOS
          ? 'Microphone blocked. Go to Settings → Safari → Microphone → Allow.'
          : isAndroid
            ? 'Microphone blocked. Tap the 🔒 in the address bar → Site Settings → Microphone → Allow.'
            : 'Microphone blocked. Tap the 🔒 in the address bar and set Microphone to Allow.'
        setPermissionError(msg)
      } else if (e.error === 'network') {
        setPermissionError('Network error — check your internet connection.')
      }
      shouldKeepRef.current = false
      setIsListening(false)
    }

    try {
      rec.start()
    } catch (err: any) {
      if (err?.name !== 'InvalidStateError') {
        setIsListening(false)
        shouldKeepRef.current = false
        recognitionRef.current = null
      }
    }
  }, []) // eslint-disable-line

  // ═══════════════════════════════════════════════════════════════════════════
  // PATH 2: MediaRecorder + Server-side STT (works EVERYWHERE)
  // ═══════════════════════════════════════════════════════════════════════════
  const startMediaRecorder = useCallback(async (lang = 'en-US') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      // Check for supported mime types
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''  // let browser pick

      const mr = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      audioChunksRef.current = []
      mediaRecorderRef.current = mr

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mr.onstop = async () => {
        // Stop the stream tracks
        stream.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null

        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' })
        audioChunksRef.current = []

        if (blob.size < 100) {
          setIsListening(false)
          return
        }

        // Show "processing" state
        setInterimTranscript('Processing...')

        try {
          const formData = new FormData()
          formData.append('audio', blob, 'recording.webm')
          formData.append('lang', lang)

          const res = await fetch(`${API_BASE}/api/stt/transcribe`, {
            method: 'POST',
            body: formData,
          })

          if (!res.ok) throw new Error(`STT failed: ${res.status}`)

          const data = await res.json()
          const text = data.text?.trim() ?? ''

          if (text) {
            transcriptRef.current = (transcriptRef.current + ' ' + text).trim()
            setTranscript(transcriptRef.current)
          }
        } catch (err) {
          console.warn('[STT] Server transcription failed:', err)
          setPermissionError('Voice recognition failed. Please try again.')
        } finally {
          setInterimTranscript('')
          setIsListening(false)
        }
      }

      mr.start(250)  // collect data every 250ms
      setIsListening(true)
      setPermissionError('')

    } catch (err: any) {
      console.warn('[STT] MediaRecorder start failed:', err)
      if (err?.name === 'NotAllowedError') {
        setPermissionError(
          isIOS
            ? 'Microphone blocked. Go to Settings → Chrome → Microphone → Allow.'
            : 'Microphone access denied. Allow microphone in your browser settings.'
        )
      } else {
        setPermissionError('Could not access microphone.')
      }
      setIsListening(false)
    }
  }, []) // eslint-disable-line

  const stopMediaRecorder = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()  // → triggers onstop → server STT
    } else {
      setIsListening(false)
    }
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API — auto-routes to the best available path
  // ═══════════════════════════════════════════════════════════════════════════
  const startListening = useCallback((lang = 'en-US') => {
    currentLangRef.current = lang

    // Path 1: Use browser SpeechRecognition if available
    if (hasBrowserSR) {
      if (shouldKeepRef.current) return  // already running
      setPermissionError('')
      if (!useNonContinuous) {
        setTranscript('')
        setInterimTranscript('')
        transcriptRef.current = ''
      }
      shouldKeepRef.current = true
      startBrowserSession(lang)
      return
    }

    // Path 2: MediaRecorder + server STT (Chrome iOS, Firefox, etc.)
    setTranscript('')
    setInterimTranscript('')
    transcriptRef.current = ''
    startMediaRecorder(lang)
  }, [startBrowserSession, startMediaRecorder])

  const stopListening = useCallback(() => {
    if (hasBrowserSR) {
      shouldKeepRef.current = false
      setIsListening(false)
      setInterimTranscript('')
      if (recognitionRef.current) {
        const rec = recognitionRef.current
        recognitionRef.current = null
        rec.onend = null
        try { rec.stop() } catch { /**/ }
      }
    } else {
      stopMediaRecorder()
    }
  }, [stopMediaRecorder])

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
