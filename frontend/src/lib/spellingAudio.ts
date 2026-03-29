/**
 * spellingAudio.ts
 * Instant synthesized audio feedback using the Web Audio API (zero network latency).
 */

function audioCtx(): AudioContext {
  return new (window.AudioContext || (window as any).webkitAudioContext)()
}

/** Ascending fanfare — play on correct answer */
export function playCorrectSound() {
  try {
    const ctx = audioCtx()
    // Cheerful ascending major chord arpeggio: C5 E5 G5 C6
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.11
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.35, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
      osc.start(t)
      osc.stop(t + 0.42)
    })
    // Add a gentle shimmer overtone
    const shimmer = ctx.createOscillator()
    const shimGain = ctx.createGain()
    shimmer.connect(shimGain)
    shimGain.connect(ctx.destination)
    shimmer.type = 'triangle'
    shimmer.frequency.setValueAtTime(2093, ctx.currentTime + 0.3)
    shimmer.frequency.exponentialRampToValueAtTime(4186, ctx.currentTime + 0.6)
    shimGain.gain.setValueAtTime(0, ctx.currentTime + 0.3)
    shimGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.35)
    shimGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65)
    shimmer.start(ctx.currentTime + 0.3)
    shimmer.stop(ctx.currentTime + 0.66)
  } catch { /* Safari / blocked context — silent */ }
}

/** Gentle descending tone — play on wrong answer */
export function playWrongSound() {
  try {
    const ctx = audioCtx()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(392, ctx.currentTime)          // G4
    osc.frequency.exponentialRampToValueAtTime(261.63, ctx.currentTime + 0.35)  // C4
    gain.gain.setValueAtTime(0.28, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  } catch { /* silent */ }
}

// ── Rotating cheer / encouragement phrases ────────────────────────────────

const CORRECT_CHEERS = [
  "Amazing! You nailed it!",
  "Woohoo! That's correct! You're a spelling champion!",
  "Incredible! Keep that energy going!",
  "Yes! Perfect spelling! You're on fire!",
  "Brilliant! High five! You've got mad spelling skills!",
  "Outstanding! That word is yours forever now!",
  "Spectacular! You make spelling look easy!",
]

const MASTERY_CHEERS = [
  "You just mastered that word! That's huge! You're unstoppable!",
  "Word mastered! You are officially a spelling superstar!",
  "Boom! Mastery unlocked! Nothing can stop you now!",
]

let cheerIdx = 0
let masteryIdx = 0

export function nextCheer(mastery: boolean): string {
  if (mastery) {
    const msg = MASTERY_CHEERS[masteryIdx % MASTERY_CHEERS.length]
    masteryIdx++
    return msg
  }
  const msg = CORRECT_CHEERS[cheerIdx % CORRECT_CHEERS.length]
  cheerIdx++
  return msg
}

const WRONG_ENCOURAGEMENTS = [
  (word: string) => `Don't give up! The correct spelling is ${word}. You've got this!`,
  (word: string) => `Great try! Remember it's spelled ${word}. Keep going!`,
  (word: string) => `So close! The spelling is ${word}. Practice makes perfect!`,
  (word: string) => `Nice effort! It's actually spelled ${word}. You're learning!`,
  (word: string) => `Keep going! The correct word is ${word}. You'll get the next one!`,
]

let wrongIdx = 0

export function nextEncouragement(word: string): string {
  const fn = WRONG_ENCOURAGEMENTS[wrongIdx % WRONG_ENCOURAGEMENTS.length]
  wrongIdx++
  return fn(word)
}
