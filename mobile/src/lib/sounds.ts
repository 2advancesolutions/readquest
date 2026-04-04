/**
 * sounds.ts — Cross-platform quiz sound effects (no bundled assets needed)
 *
 * Web: AudioContext oscillator (instant, zero network)
 * Native: Generates a minimal WAV buffer in-memory → cache → expo-av
 */
import { Platform } from 'react-native'
import { Audio as ExpoAudio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'

// ── WAV generator (works in both React Native and Web JS environments) ─────────
function generateToneWav(
  frequency: number,
  durationSec: number,
  sampleRate = 22050,
  volume = 0.6,
): ArrayBuffer {
  const numSamples = Math.floor(sampleRate * durationSec)
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)

  const write4 = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  // RIFF header
  write4(0, 'RIFF'); view.setUint32(4, 36 + numSamples * 2, true)
  write4(8, 'WAVE'); write4(12, 'fmt ')
  view.setUint32(16, 16, true)   // PCM chunk size
  view.setUint16(20, 1, true)    // PCM format
  view.setUint16(22, 1, true)    // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)    // block align
  view.setUint16(34, 16, true)   // bits/sample
  write4(36, 'data'); view.setUint32(40, numSamples * 2, true)

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    // soft attack (10ms) + exponential decay release
    const attack = Math.min(1, t / 0.01)
    const release = Math.exp(-3 * (t / durationSec))
    const sample = Math.sin(2 * Math.PI * frequency * t) * attack * release * volume
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true)
  }
  return buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

// ── Native playback ────────────────────────────────────────────────────────────
async function playNativeTone(freq: number, dur: number, volume = 0.7) {
  try {
    const wav = generateToneWav(freq, dur, 22050, volume)
    const b64 = arrayBufferToBase64(wav)
    const path = `${FileSystem.cacheDirectory}sfx_${Date.now()}.wav`
    await FileSystem.writeAsStringAsync(path, b64, { encoding: 'base64' as any })
    const { sound } = await ExpoAudio.Sound.createAsync(
      { uri: path },
      { shouldPlay: true, volume },
    )
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.isLoaded && s.didJustFinish) {
        sound.unloadAsync().catch(() => {})
        FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {})
      }
    })
  } catch (e) {
    console.warn('[SFX] Native tone error:', e)
  }
}

// ── Web playback ───────────────────────────────────────────────────────────────
function playWebTone(
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  volume = 0.3,
  startOffset = 0,
) {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
    const ctx = new Ctx() as AudioContext
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset)
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startOffset + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + dur)
    osc.start(ctx.currentTime + startOffset)
    osc.stop(ctx.currentTime + startOffset + dur + 0.05)
    setTimeout(() => ctx.close(), (startOffset + dur + 0.2) * 1000)
  } catch (e) {
    // AudioContext not available
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Happy two-tone ascending ding  ✅ */
export async function playCorrectSound(): Promise<void> {
  if (Platform.OS === 'web') {
    playWebTone(523, 0.18)           // C5
    playWebTone(784, 0.28, 'sine', 0.3, 0.14) // G5 — uplifting ding
  } else {
    void playNativeTone(523, 0.18, 0.7)
    setTimeout(() => void playNativeTone(784, 0.28, 0.7), 130)
  }
}

/** Low descending buzz  ❌ */
export async function playWrongSound(): Promise<void> {
  if (Platform.OS === 'web') {
    playWebTone(220, 0.15, 'sawtooth', 0.2)
    playWebTone(180, 0.3, 'sawtooth', 0.2, 0.14)
  } else {
    void playNativeTone(220, 0.15, 0.6)
    setTimeout(() => void playNativeTone(160, 0.3, 0.5), 130)
  }
}
