/**
 * gameAudio.ts — Games Arcade Sound Effects
 * All synthesized via Web Audio API (zero latency, no file downloads).
 * Extends the spellingAudio.ts / useSoundEffects.ts pattern.
 */

function getCtx(): AudioContext | null {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch { return null }
}

function tone(
  ctx: AudioContext,
  freq: number,
  type: OscillatorType,
  start: number,
  dur: number,
  vol = 0.28,
  endFreq?: number,
) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.connect(g); g.connect(ctx.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (endFreq !== undefined)
    osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur)
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(vol, start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, start + dur)
  osc.start(start); osc.stop(start + dur + 0.01)
}

/** Quick pop when tapping a tile */
export function playTileSelect() {
  const ctx = getCtx(); if (!ctx) return
  const t = ctx.currentTime
  tone(ctx, 900, 'sine', t, 0.07, 0.22, 1300)
}

/** Ascending arpeggio — correct answer */
export function playCorrectChime() {
  const ctx = getCtx(); if (!ctx) return
  const t = ctx.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => tone(ctx, f, 'sine', t + i * 0.09, 0.35, 0.3))
  // shimmer
  tone(ctx, 2093, 'triangle', t + 0.3, 0.35, 0.12, 4186)
}

/** Gentle descending buzz — wrong answer */
export function playWrongBuzz() {
  const ctx = getCtx(); if (!ctx) return
  const t = ctx.currentTime
  tone(ctx, 380, 'sawtooth', t, 0.14, 0.2, 240)
  tone(ctx, 240, 'sawtooth', t + 0.14, 0.14, 0.12, 190)
}

/** Quick ascending whoosh — streak milestone */
export function playStreakFire() {
  const ctx = getCtx(); if (!ctx) return
  const t = ctx.currentTime
  ;[1319, 1568, 1976].forEach((f, i) => tone(ctx, f, 'sine', t + i * 0.055, 0.12, 0.22))
}

/** Full victory fanfare — level complete */
export function playLevelComplete() {
  const ctx = getCtx(); if (!ctx) return
  const t = ctx.currentTime
  const melody = [523, 523, 523, 659, 784, 784, 784, 988]
  const durs =   [0.12, 0.12, 0.12, 0.2, 0.12, 0.12, 0.12, 0.55]
  let time = t
  melody.forEach((f, i) => {
    tone(ctx, f, 'sine', time, durs[i] * 0.9, 0.35)
    time += durs[i]
  })
}

/** Gentle descending — level failed / out of lives */
export function playLevelFail() {
  const ctx = getCtx(); if (!ctx) return
  const t = ctx.currentTime
  ;[659, 523, 415].forEach((f, i) => tone(ctx, f, 'triangle', t + i * 0.18, 0.28, 0.2))
}

/** Single tick for timer countdown */
export function playTimerTick() {
  const ctx = getCtx(); if (!ctx) return
  tone(ctx, 1000, 'sine', ctx.currentTime, 0.04, 0.15)
}

/** Double urgent blip for last 3 seconds */
export function playTimerUrgent() {
  const ctx = getCtx(); if (!ctx) return
  const t = ctx.currentTime
  tone(ctx, 1400, 'square', t, 0.05, 0.18)
  tone(ctx, 1400, 'square', t + 0.08, 0.05, 0.18)
}

/** Star twinkle — earning a star */
export function playStarEarn() {
  const ctx = getCtx(); if (!ctx) return
  const t = ctx.currentTime
  ;[1047, 1319, 1568, 2093].forEach((f, i) => tone(ctx, f, 'sine', t + i * 0.1, 0.18, 0.22))
}

/** Coin ring — XP tick animation */
export function playXPRing() {
  const ctx = getCtx(); if (!ctx) return
  tone(ctx, 1800, 'sine', ctx.currentTime, 0.06, 0.18, 2400)
}

/** Low thud — combo streak breaks */
export function playComboBreak() {
  const ctx = getCtx(); if (!ctx) return
  const t = ctx.currentTime
  tone(ctx, 200, 'triangle', t, 0.12, 0.25, 120)
}

/** 3-2-1 countdown beeps (call at each second) */
export function playCountdown(n: 3 | 2 | 1) {
  const ctx = getCtx(); if (!ctx) return
  const freqs: Record<number, number> = { 3: 880, 2: 698, 1: 587 }
  tone(ctx, freqs[n], 'sine', ctx.currentTime, 0.18, 0.3)
}

/** Soft menu navigation click */
export function playUiNavigate() {
  const ctx = getCtx(); if (!ctx) return
  tone(ctx, 600, 'sine', ctx.currentTime, 0.05, 0.12)
}

/** Magic shimmer — hint reveal */
export function playHintReveal() {
  const ctx = getCtx(); if (!ctx) return
  const t = ctx.currentTime
  ;[1047, 1319, 1568, 1976, 2637].forEach((f, i) =>
    tone(ctx, f, 'triangle', t + i * 0.06, 0.15, 0.15))
}

// ── Volume mute helpers ─────────────────────────────────────────────────────

const MUTE_KEY = 'rq_sfx_muted'

export function isSfxMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === '1'
}

export function toggleSfxMute(): boolean {
  const next = !isSfxMuted()
  localStorage.setItem(MUTE_KEY, next ? '1' : '0')
  return next
}

/** Wrap any SFX call to respect mute preference */
export function sfx(fn: () => void) {
  if (!isSfxMuted()) fn()
}
