import { useRef, useState, useCallback, useEffect } from 'react'

declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition
    SpeechRecognition: typeof SpeechRecognition
  }
}

export interface SpeechRecognitionHook {
  startListening: () => Promise<void>
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

// iOS Safari fires onend after each pause — we must restart manually
const isIOS = (() => {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
})()

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [isListening, setIsListening]             = useState(false)
  const [transcript, setTranscript]               = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [permissionError, setPermissionError]     = useState('')

  const recognitionRef = useRef<any>(null)
  const shouldListenRef = useRef(false)  // intention flag, survives iOS onend restarts
  const transcriptRef  = useRef('')      // accumulates across iOS restarts

  useEffect(() => () => {
    shouldListenRef.current = false
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.abort() } catch { /**/ }
      recognitionRef.current = null
    }
  }, [])

  const isSupported = !!getSRClass()

  // ── Ensure mic permission is granted ───────────────────────────────────────
  // Returns true if we can proceed, false if denied.
  const ensurePermission = async (): Promise<boolean> => {
    // 1. Check if already granted — skip the dialog entirely
    if (typeof navigator.permissions !== 'undefined') {
      try {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        if (status.state === 'granted') return true
        if (status.state === 'denied') {
          setPermissionError('Microphone blocked. Go to browser Settings > Site Settings and allow microphone.')
          return false
        }
      } catch { /* Permissions API not supported — fall through */ }
    }

    // 2. Show the permission dialog via getUserMedia
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionError('This browser does not support microphone access.')
      return false
    }

    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err: any) {
      const n = err?.name ?? ''
      if (n === 'NotAllowedError' || n === 'PermissionDeniedError' || n === 'SecurityError') {
        setPermissionError('Microphone blocked. Tap the address bar lock icon and allow Microphone.')
      } else if (n === 'NotFoundError' || n === 'DevicesNotFoundError') {
        setPermissionError('No microphone found on this device.')
      } else {
        setPermissionError(`Microphone error: ${err?.message ?? n}`)
      }
      return false
    }

    // IMPORTANT: Stop the stream tracks SYNCHRONOUSLY and IMMEDIATELY.
    // We must fully release the mic before SpeechRecognition tries to grab it.
    // If we delay this, recognition.start() races with the open stream and gets a
    // "not-allowed" error even though permission was granted.
    try { stream.getTracks().forEach(t => t.stop()) } catch { /**/ }

    // Give the OS a moment to release the audio device before recognition grabs it
    await delay(isIOS ? 250 : 100)
    return true
  }

  // ── Create a fresh recognition instance and start it ──────────────────────
  const createAndStart = useCallback(() => {
    const SRClass = getSRClass()
    if (!SRClass || !shouldListenRef.current) return

    // Abort any lingering instance first
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.abort() } catch { /**/ }
      recognitionRef.current = null
    }

    const rec = new SRClass()
    rec.continuous      = !isIOS   // continuous=true breaks iOS Safari
    rec.interimResults  = true
    rec.lang            = 'en-US'
    rec.maxAlternatives = 1

    rec.onstart = () => {
      // Clear any stale permission error the moment the mic is actually live
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
      setInterimTranscript(interim)
    }

    rec.onend = () => {
      setInterimTranscript('')
      if (shouldListenRef.current) {
        if (isIOS) {
          // iOS Safari stops after every pause — restart immediately
          try { rec.start() } catch { /**/ }
        } else {
          // Non-iOS: recognition ended unexpectedly while we still wanted it
          // (e.g. silence timeout) — just reflect the stopped state
          shouldListenRef.current = false
          setIsListening(false)
          recognitionRef.current = null
        }
      } else {
        setIsListening(false)
        recognitionRef.current = null
      }
    }

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      setInterimTranscript('')
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setPermissionError('Microphone blocked. Allow access in browser settings and try again.')
        shouldListenRef.current = false
        setIsListening(false)
      }
      // 'no-speech', 'aborted', 'network' are non-fatal — don't stop listening
    }

    recognitionRef.current = rec
    try {
      rec.start()
    } catch (err) {
      console.warn('[SpeechRec] start() threw:', err)
      shouldListenRef.current = false
      setIsListening(false)
    }
  }, [])

  const startListening = useCallback(async () => {
    if (!getSRClass()) {
      setPermissionError('Speech recognition is not supported in this browser.')
      return
    }
    // Clear previous errors
    setPermissionError('')

    const ok = await ensurePermission()
    if (!ok) return

    // Set intent BEFORE calling createAndStart
    shouldListenRef.current = true
    transcriptRef.current   = ''
    setTranscript('')
    setInterimTranscript('')
    setIsListening(true)
    createAndStart()
  }, [createAndStart])  // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = useCallback(() => {
    shouldListenRef.current = false
    setIsListening(false)
    setInterimTranscript('')
    if (recognitionRef.current) {
      const rec = recognitionRef.current
      recognitionRef.current = null
      rec.onend = null  // prevent auto-restart on iOS
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
