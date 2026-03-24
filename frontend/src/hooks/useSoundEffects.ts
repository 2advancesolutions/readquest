import { useRef, useCallback } from 'react'

interface SoundEffectsHook {
  playClick: () => void
  playPageTurn: () => void
  playCorrect: () => void
  playError: () => void
  playSuccess: () => void
  playPop: () => void
  playStar: () => void
}

function createCtx(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)()
  } catch {
    return null
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  gain = 0.3,
  endFreq?: number
) {
  const osc = ctx.createOscillator()
  const gainNode = ctx.createGain()
  osc.connect(gainNode)
  gainNode.connect(ctx.destination)

  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime)
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration)
  }

  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

  osc.start(startTime)
  osc.stop(startTime + duration)
}

export function useSoundEffects(): SoundEffectsHook {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = useCallback((): AudioContext | null => {
    if (!ctxRef.current) ctxRef.current = createCtx()
    if (ctxRef.current?.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [])

  const playClick = useCallback(() => {
    const ctx = getCtx(); if (!ctx) return
    const t = ctx.currentTime
    playTone(ctx, 800, 'sine', t, 0.06, 0.15)
  }, [getCtx])

  const playPageTurn = useCallback(() => {
    const ctx = getCtx(); if (!ctx) return
    const t = ctx.currentTime
    // Whoosh — noise burst
    const bufferSize = ctx.sampleRate * 0.18
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(2000, t)
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.18)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.25, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    source.start(t)
    source.stop(t + 0.18)
  }, [getCtx])

  const playCorrect = useCallback(() => {
    const ctx = getCtx(); if (!ctx) return
    const t = ctx.currentTime
    // Happy ascending arpeggio
    playTone(ctx, 523, 'sine', t, 0.15, 0.3)       // C5
    playTone(ctx, 659, 'sine', t + 0.1, 0.15, 0.3)  // E5
    playTone(ctx, 784, 'sine', t + 0.2, 0.2, 0.35)  // G5
  }, [getCtx])

  const playError = useCallback(() => {
    const ctx = getCtx(); if (!ctx) return
    const t = ctx.currentTime
    // Gentle descending buzz
    playTone(ctx, 300, 'sawtooth', t, 0.12, 0.15, 220)
    playTone(ctx, 220, 'sawtooth', t + 0.12, 0.12, 0.1, 180)
  }, [getCtx])

  const playSuccess = useCallback(() => {
    const ctx = getCtx(); if (!ctx) return
    const t = ctx.currentTime
    // Victory fanfare
    const melody = [523, 523, 523, 659, 784, 784, 784, 988]
    const durations = [0.15, 0.15, 0.15, 0.25, 0.15, 0.15, 0.15, 0.5]
    let time = t
    melody.forEach((freq, i) => {
      playTone(ctx, freq, 'sine', time, durations[i] * 0.9, 0.35)
      time += durations[i]
    })
  }, [getCtx])

  const playPop = useCallback(() => {
    const ctx = getCtx(); if (!ctx) return
    const t = ctx.currentTime
    playTone(ctx, 1200, 'sine', t, 0.08, 0.2, 600)
  }, [getCtx])

  const playStar = useCallback(() => {
    const ctx = getCtx(); if (!ctx) return
    const t = ctx.currentTime
    // Twinkle
    playTone(ctx, 1047, 'sine', t, 0.1, 0.25)       // C6
    playTone(ctx, 1319, 'sine', t + 0.12, 0.1, 0.25) // E6
    playTone(ctx, 1568, 'sine', t + 0.24, 0.15, 0.3) // G6
    playTone(ctx, 2093, 'sine', t + 0.36, 0.2, 0.2)  // C7
  }, [getCtx])

  return { playClick, playPageTurn, playCorrect, playError, playSuccess, playPop, playStar }
}
