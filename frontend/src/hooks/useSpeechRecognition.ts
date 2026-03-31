/**
 * useSpeechRecognition — universal speech recognition hook.
 *
 * Single strategy for ALL browsers:
 *   continuous=true, interimResults=true
 *
 * - Desktop Chrome/Edge: works perfectly, one long session
 * - iOS Safari 15+: works with continuous=true (supported since iOS 15.4)
 * - Android Chrome: works perfectly
 * - If a session ends unexpectedly (silence, iOS timeout ~60s), restart in onend
 *
 * Chrome on iOS (CriOS): SpeechRecognition is broken there — MediaRecorder fallback.
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
  isSupported: boolean
  permissionError: string
}

function getSRClass(): typeof SpeechRecognition | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const isIOS        = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
const isAndroid    = /Android/i.test(ua)
const isChromeiOS  = isIOS && /CriOS/i.test(ua)   // Chrome on iOS — SR broken

// Use browser SR everywhere EXCEPT Chrome on iOS
const hasBrowserSR = !!getSRClass() && !isChromeiOS

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || ''


export function useSpeechRecognition(): SpeechRecognitionHook {
  const [isListening, setIsListening]             = useState(false)
  const [transcript, setTranscript]               = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [permissionError, setPermissionError]     = useState('')

  const recognitionRef  = useRef<any>(null)
  const shouldKeepRef   = useRef(false)
  const transcriptRef   = useRef('')
  const currentLangRef  = useRef('en-US')
  const restartingRef   = useRef(false)

  // MediaRecorder refs — Chrome iOS only
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef   = useRef<Blob[]>([])
  const mediaStreamRef   = useRef<MediaStream | null>(null)

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

  const isSupported = true

  // ═══════════════════════════════════════════════════════════════════════════
  // Browser SpeechRecognition — continuous=true on ALL platforms
  // ═══════════════════════════════════════════════════════════════════════════
  const startBrowserSession = useCallback((lang = 'en-US', _retryCount = 0) => {
    const SRClass = getSRClass()
    if (!SRClass) return

    // Tear down any previous recognition instance
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.abort() } catch { /**/ }
      recognitionRef.current = null
    }

    const rec = new SRClass()

    // continuous=true on ALL platforms.
    // iOS Safari 15.4+ supports this. If an older iOS fires onerror('not-allowed')
    // or ends unexpectedly, onend restarts the session automatically.
    rec.continuous     = true
    rec.interimResults = true
    rec.lang           = lang
    rec.maxAlternatives = 1
    recognitionRef.current = rec

    // Safety timeout — on mobile, rec.start() can succeed but onstart never fires.
    // If that happens, retry once after 2 seconds.
    let startFired = false
    const safetyTimer = setTimeout(() => {
      if (!startFired && shouldKeepRef.current && recognitionRef.current === rec) {
        // onstart never fired — session is dead, retry once
        try { rec.onend = null; rec.abort() } catch { /**/ }
        recognitionRef.current = null
        if (_retryCount < 2) {
          startBrowserSession(lang, _retryCount + 1)
        } else {
          shouldKeepRef.current = false
          restartingRef.current = false
          setIsListening(false)
        }
      }
    }, 2000)

    rec.onstart = () => {
      startFired = true
      clearTimeout(safetyTimer)
      restartingRef.current = false
      setIsListening(true)
      setPermissionError('')
    }

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let finalChunk = ''
      let interim    = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalChunk += r[0].transcript + ' '
        else           interim    += r[0].transcript
      }
      if (finalChunk.trim()) {
        transcriptRef.current = (transcriptRef.current + ' ' + finalChunk).trim()
        setTranscript(transcriptRef.current)
      }
      setInterimTranscript(interim)
    }

    rec.onend = () => {
      startFired = true         // prevent safety timer from firing
      clearTimeout(safetyTimer)
      setInterimTranscript('')
      recognitionRef.current = null

      if (!shouldKeepRef.current || restartingRef.current) {
        setIsListening(false)
        return
      }

      // Session ended (iOS timeout, silence, etc.) — restart to keep listening.
      // Keep isListening=true so the UI doesn't flicker.
      restartingRef.current = true
      try {
        startBrowserSession(currentLangRef.current)
      } catch {
        shouldKeepRef.current = false
        restartingRef.current = false
        setIsListening(false)
      }
    }

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      clearTimeout(safetyTimer)
      setInterimTranscript('')
      recognitionRef.current = null

      // no-speech: silence detected — not fatal, restart
      if (e.error === 'no-speech' && shouldKeepRef.current) {
        restartingRef.current = true
        try {
          startBrowserSession(currentLangRef.current)
        } catch {
          shouldKeepRef.current = false
          restartingRef.current = false
          setIsListening(false)
        }
        return
      }

      // aborted: we stopped it ourselves
      if (e.error === 'aborted') {
        setIsListening(false)
        return
      }

      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        const msg = isIOS
          ? 'Microphone blocked. Go to Settings → Safari → Microphone → Allow.'
          : isAndroid
            ? 'Microphone blocked. Tap the 🔒 → Site Settings → Microphone → Allow.'
            : 'Microphone blocked. Allow it in your browser settings.'
        setPermissionError(msg)
      } else if (e.error === 'network') {
        setPermissionError('Network error — check your internet connection.')
      }

      shouldKeepRef.current = false
      restartingRef.current = false
      setIsListening(false)
    }

    try {
      rec.start()
    } catch (err: any) {
      clearTimeout(safetyTimer)
      if (err?.name === 'InvalidStateError' && _retryCount < 2) {
        // Mobile: previous session hasn't fully released — retry after a short delay
        recognitionRef.current = null
        setTimeout(() => {
          if (shouldKeepRef.current) startBrowserSession(lang, _retryCount + 1)
        }, 150)
      } else {
        shouldKeepRef.current = false
        restartingRef.current = false
        recognitionRef.current = null
        setIsListening(false)
      }
    }
  }, []) // eslint-disable-line

  // ═══════════════════════════════════════════════════════════════════════════
  // MediaRecorder + Server STT — Chrome on iOS ONLY
  // ═══════════════════════════════════════════════════════════════════════════
  const startMediaRecorder = useCallback(async (lang = 'en-US') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      audioChunksRef.current = []
      mediaRecorderRef.current = mr

      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }

      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/mp4' })
        audioChunksRef.current = []
        if (blob.size < 100) { setIsListening(false); return }
        try {
          const fd = new FormData()
          fd.append('audio', blob, 'rec.mp4')
          fd.append('lang', lang)
          const res = await fetch(`${API_BASE}/api/stt/transcribe`, { method: 'POST', body: fd })
          const data = await res.json()
          const text = data.text?.trim() ?? ''
          if (text) { transcriptRef.current = text; setTranscript(text) }
        } catch { /**/ } finally {
          setInterimTranscript('')
          setIsListening(false)
        }
      }

      mr.start(250)
      setIsListening(true)
      setPermissionError('')
    } catch (err: any) {
      setPermissionError(
        err?.name === 'NotAllowedError'
          ? 'Microphone blocked. Go to Settings → Chrome → Microphone → Allow.'
          : 'Could not access microphone.'
      )
      setIsListening(false)
    }
  }, []) // eslint-disable-line

  const stopMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    else setIsListening(false)
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════
  const startListening = useCallback((lang = 'en-US') => {
    currentLangRef.current = lang
    if (hasBrowserSR) {
      // If a previous session is still flagged as active, force-stop it first.
      // On mobile, sessions can die without properly resetting shouldKeepRef,
      // causing startListening to silently no-op. This prevents that.
      if (shouldKeepRef.current) {
        shouldKeepRef.current = false
        restartingRef.current = false
        if (recognitionRef.current) {
          const old = recognitionRef.current
          recognitionRef.current = null
          old.onend = null
          try { old.abort() } catch { /**/ }
        }
      }
      setPermissionError('')
      setTranscript('')
      setInterimTranscript('')
      transcriptRef.current   = ''
      shouldKeepRef.current   = true
      restartingRef.current   = false
      startBrowserSession(lang)
    } else {
      setTranscript('')
      setInterimTranscript('')
      transcriptRef.current = ''
      startMediaRecorder(lang)
    }
  }, [startBrowserSession, startMediaRecorder])

  const stopListening = useCallback(() => {
    if (hasBrowserSR) {
      shouldKeepRef.current = false
      restartingRef.current = false
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

  return { startListening, stopListening, transcript, interimTranscript, resetTranscript, isListening, isSupported, permissionError }
}
