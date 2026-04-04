/**
 * tts.ts — Google Cloud TTS with precise word timestamps
 *
 * Native (iOS/Android): POST /api/tts/speak-timed → base64 + timepoints → disk → expo-av
 * Web: POST /api/tts/speak-timed → base64 + timepoints → Blob URL → HTMLAudioElement
 *
 * Word highlighting is driven by real per-word timestamps from the Google TTS
 * audio engine (via SSML <mark> tags), not proportional estimation.
 * This eliminates drift and the "2 words behind" problem entirely.
 */

import { Audio as ExpoAudio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

export type TTSMode = 'word' | 'teacher' | 'quiz' | 'quiz-q' | 'story' | 'default'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

let _currentSound: ExpoAudio.Sound | null = null
let _webAudio: HTMLAudioElement | null = null
let _speaking = false
let _generation = 0  // incremented on every googleStop to cancel in-flight fetches
let _wordTimer: ReturnType<typeof setInterval> | null = null
let _audioCtx: AudioContext | null = null

// ── Timepoint type from /speak-timed ──────────────────────────────────────────
interface WordTimepoint {
  word: number   // 0-indexed word position
  time: number   // exact timestamp in seconds from the audio engine
}

/**
 * Call this SYNCHRONOUSLY inside any click/touch handler before async work.
 * Primes the browser AudioContext so audio.play() succeeds after async awaits.
 * No-op on native.
 */
export function unlockWebAudio(): void {
  if (Platform.OS !== 'web') return
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!_audioCtx) _audioCtx = new Ctx()
    const ctx = _audioCtx!
    if (ctx.state === 'suspended') ctx.resume()
    const buf = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start(0)
    console.log('[TTS] Web AudioContext unlocked')
  } catch (e) {
    console.warn('[TTS] unlockWebAudio failed:', e)
  }
}

// Only call setAudioModeAsync on native
if (Platform.OS !== 'web') {
  ExpoAudio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    allowsRecordingIOS: false,
    shouldDuckAndroid: true,
    staysActiveInBackground: false,
  }).catch((e) => console.warn('[TTS] AudioMode init failed:', e))
}

export function isGoogleSpeaking(): boolean {
  return _speaking
}

function _clearWordTimer() {
  if (_wordTimer) {
    clearInterval(_wordTimer)
    _wordTimer = null
  }
}

export async function googleStop(): Promise<void> {
  _generation++ // cancel any in-flight fetch
  _speaking = false
  _clearWordTimer()
  if (_currentSound) {
    try {
      await _currentSound.stopAsync()
      await _currentSound.unloadAsync()
    } catch {}
    _currentSound = null
  }
  if (_webAudio) {
    try {
      _webAudio.pause()
      _webAudio.src = ''
    } catch {}
    _webAudio = null
  }
}

// ── Proportional highlighting fallback (when timepoints unavailable) ──────────
function _startWordHighlighting(
  text: string,
  durationMs: number,
  wordCount: number,
  onWordChange: (idx: number) => void,
) {
  const words = text.split(/\s+/).filter(Boolean)
  const totalChars = words.reduce((sum, w) => sum + w.length, 0)
  const wordDurations = words.map(w => (w.length / Math.max(totalChars, 1)) * durationMs)
  const leadIn = 120
  let elapsed = 0
  let wordIdx = 0
  onWordChange(0)
  _wordTimer = setInterval(() => {
    elapsed += 50
    const threshold = leadIn + wordDurations.slice(0, wordIdx + 1).reduce((a, b) => a + b, 0)
    if (elapsed >= threshold) {
      wordIdx++
      if (wordIdx < words.length) onWordChange(wordIdx)
      else _clearWordTimer()
    }
  }, 50)
}

// ── Precise timepoint-driven highlighting ─────────────────────────────────────
// Uses real timestamps from the audio engine — pinned to playhead, zero drift.
function _startTimepointHighlighting(
  timepoints: WordTimepoint[],
  getTimeSec: () => number,
  onWordChange: (idx: number) => void,
) {
  if (timepoints.length === 0) return
  onWordChange(timepoints[0].word)

  _wordTimer = setInterval(() => {
    if (!_speaking) return
    const nowSec = getTimeSec()
    // Find the rightmost timepoint whose time <= current playhead
    let idx = timepoints[0].word
    for (let i = 0; i < timepoints.length; i++) {
      if (timepoints[i].time <= nowSec) idx = timepoints[i].word
      else break
    }
    onWordChange(idx)
  }, 50)
}


// ── Fetch timed TTS data ──────────────────────────────────────────────────────
async function _fetchTimedTTS(text: string, mode: TTSMode): Promise<{
  audio: string  // base64
  mime: string
  timepoints: WordTimepoint[]
}> {
  const res = await fetch(`${API_URL}/api/tts/speak-timed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.slice(0, 4500), mode }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Web TTS via speak-timed ───────────────────────────────────────────────────
async function _speakWeb(
  text: string,
  mode: TTSMode,
  onDone?: () => void,
  wordCount?: number,
  onWordChange?: (idx: number) => void,
) {
  try {
    const data = await _fetchTimedTTS(text, mode)
    if (!_speaking) { onDone?.(); return }

    // Decode base64 → Blob → object URL
    const raw = atob(data.audio)
    const arr = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
    const blob = new Blob([arr], { type: data.mime || 'audio/mpeg' })
    const blobUrl = URL.createObjectURL(blob)

    const audio = new (window as any).Audio() as HTMLAudioElement
    audio.preload = 'auto'
    _webAudio = audio

    audio.addEventListener('canplaythrough', () => {
      if (!_speaking) return
      // Start timepoint-driven highlighting (or proportional fallback)
      if (data.timepoints.length > 0 && onWordChange) {
        _startTimepointHighlighting(data.timepoints, () => audio.currentTime, onWordChange)
      } else if (wordCount && wordCount > 0 && onWordChange) {
        _startWordHighlighting(text, (audio.duration || 5) * 1000, wordCount, onWordChange)
      }
      audio.play().catch(() => {})
    }, { once: true })

    audio.addEventListener('ended', () => {
      _speaking = false
      _clearWordTimer()
      _webAudio = null
      URL.revokeObjectURL(blobUrl)
      onWordChange?.(-1)
      onDone?.()
      console.log('[TTS] Web playback finished')
    })

    audio.addEventListener('error', () => {
      _speaking = false
      _clearWordTimer()
      _webAudio = null
      URL.revokeObjectURL(blobUrl)
      onWordChange?.(-1)
      onDone?.()
    })

    audio.src = blobUrl
    console.log(`[TTS] Web: ${data.timepoints.length} timepoints, playing blob`)

  } catch (err) {
    console.warn('[TTS] Web speak-timed failed:', err)
    _speaking = false
    _clearWordTimer()
    _webAudio = null
    onWordChange?.(-1)
    onDone?.()
  }
}

/**
 * Main entry point. Uses /speak-timed for precise word highlighting.
 */
export async function googleSpeak(
  text: string,
  mode: TTSMode = 'default',
  onDone?: () => void,
  wordCount?: number,
  onWordChange?: (idx: number) => void,
): Promise<void> {
  if (!text.trim()) { onDone?.(); return }

  try {
    const muted = await AsyncStorage.getItem('readquest_muted')
    if (muted === 'true') { onDone?.(); return }
  } catch {}

  await googleStop()
  _speaking = true
  const gen = _generation // snapshot — if this changes, we've been superseded

  console.log(`[TTS] Requesting ${mode} voice for: "${text.slice(0, 60)}..."`)

  // ── Web path ──────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    _speakWeb(text, mode, onDone, wordCount, onWordChange)
    return
  }

  // ── Native path: speak-timed → base64 → disk → expo-av ──────────────────
  try {
    const data = await _fetchTimedTTS(text, mode)
    const b64 = data.audio
    const mimeType = data.mime || 'audio/mp3'
    const ext = mimeType.includes('wav') ? 'wav' : 'mp3'

    // Bail out if a newer googleSpeak() call has taken over — do NOT chain onDone
    if (!b64) { onDone?.(); return }  // empty audio = genuine failure, still chain
    if (gen !== _generation) { return } // interrupted = silent bail, no chain

    console.log(`[TTS] Got timed audio (${b64.length} chars, ${ext}, ${data.timepoints.length} timepoints)`)

    const tmpPath = `${FileSystem.cacheDirectory}tts_${Date.now()}.${ext}`
    await FileSystem.writeAsStringAsync(tmpPath, b64, { encoding: 'base64' as any })

    // Check again after the disk write — silent bail if interrupted
    if (gen !== _generation) {
      FileSystem.deleteAsync(tmpPath, { idempotent: true }).catch(() => {})
      return // do NOT call onDone — a newer voice already took over
    }

    await ExpoAudio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      shouldDuckAndroid: true,
    })

    const { sound } = await ExpoAudio.Sound.createAsync(
      { uri: tmpPath },
      { shouldPlay: true, volume: 1.0 },
    )
    _currentSound = sound
    console.log('[TTS] Playing with timepoints via expo-av')

    // Use timepoint-driven highlighting if available
    if (data.timepoints.length > 0 && onWordChange) {
      _startTimepointHighlighting(
        data.timepoints,
        // Read playhead time from expo-av status
        () => {
          // This is called every 50ms — we'll use the last known position
          // updated by the status listener below
          return _lastPlaybackSec
        },
        onWordChange,
      )
    } else if (wordCount && wordCount > 0 && onWordChange) {
      // Fallback to proportional estimation
      const status = await sound.getStatusAsync()
      const durationMs = status.isLoaded && status.durationMillis
        ? status.durationMillis
        : (text.length / 12) * 1000
      _startWordHighlighting(text, durationMs, wordCount, onWordChange)
    }

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded) {
        // Update position for timepoint highlighting
        _lastPlaybackSec = (status.positionMillis || 0) / 1000
        if (status.didJustFinish) {
          _speaking = false
          _clearWordTimer()
          _currentSound = null
          _lastPlaybackSec = 0
          sound.unloadAsync().catch(() => {})
          FileSystem.deleteAsync(tmpPath, { idempotent: true }).catch(() => {})
          console.log('[TTS] Playback finished')
          onWordChange?.(-1)
          onDone?.()
        }
      }
    })
  } catch (err) {
    console.warn('[TTS] Failed, no fallback:', err)
    _speaking = false
    onWordChange?.(-1)
    onDone?.()
  }
}

// Track native playback position for timepoint highlighting
let _lastPlaybackSec = 0
