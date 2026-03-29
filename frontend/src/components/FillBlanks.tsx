import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  word: string
  exampleSentence?: string
  onSubmit: (answer: string) => void
  disabled?: boolean
  onReadAloud?: () => void
  speaking?: boolean
  grade?: number
}

/** Replace ~40% of letters with blanks, keeping first and last letter visible */
function buildBlanks(word: string): { chars: string[]; missingIndexes: Set<number> } {
  const chars = word.split('')
  const candidates = chars
    .map((c, i) => ({ c, i }))
    .filter(({ i }) => i > 0 && i < chars.length - 1 && /[a-zA-Z]/.test(chars[i]))
  const blankCount = Math.max(1, Math.floor(candidates.length * 0.45))
  const shuffled = [...candidates].sort(() => Math.random() - 0.5)
  const missing = new Set(shuffled.slice(0, blankCount).map(x => x.i))
  return { chars, missingIndexes: missing }
}

/** Build a bank of ONLY the missing letters (shuffled) + 2–3 distractors */
function buildBlankBank(word: string, missingIndexes: Set<number>): string[] {
  const chars = word.toUpperCase().split('')
  const missingLetters = Array.from(missingIndexes).map(i => chars[i])
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const extras: string[] = []
  const distCount = Math.min(4, missingLetters.length + 2)
  for (let i = 0; extras.length < distCount; i++) {
    const c = alphabet[Math.floor(Math.random() * 26)]
    extras.push(c)
    if (i > 100) break
  }
  return [...missingLetters, ...extras].sort(() => Math.random() - 0.5)
}

export default function FillBlanks({
  word, exampleSentence, onSubmit, disabled, onReadAloud, speaking, grade = 5
}: Props) {
  const useBlocks = grade < 4

  const [blanks, setBlanks] = useState<{ chars: string[]; missingIndexes: Set<number> }>(
    () => buildBlanks(word)
  )

  // ── Text-input mode state ──────────────────────────────────────────────
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  // ── Block mode state ───────────────────────────────────────────────────
  const [bank, setBank] = useState<string[]>([])
  const [bankUsed, setBankUsed] = useState<Set<number>>(new Set())
  // slotAnswers: maps slot index (missingIndex) → { bankIdx, letter }
  const [slotAnswers, setSlotAnswers] = useState<Record<number, { bankIdx: number; letter: string } | null>>({})

  useEffect(() => {
    const b = buildBlanks(word)
    setBlanks(b)
    setAnswers({})
    setSlotAnswers(Object.fromEntries(Array.from(b.missingIndexes).map(i => [i, null])))

    if (useBlocks) {
      const bk = buildBlankBank(word, b.missingIndexes)
      setBank(bk)
      setBankUsed(new Set())
    } else {
      const firstMissing = Math.min(...Array.from(b.missingIndexes))
      setTimeout(() => inputRefs.current[firstMissing]?.focus(), 50)
    }
  }, [word, useBlocks])

  // ── Block mode handlers ─────────────────────────────────────────────────
  const handleBankTap = (bankIdx: number, letter: string) => {
    if (disabled || bankUsed.has(bankIdx)) return
    // Find first empty slot
    const sorted = Array.from(blanks.missingIndexes).sort((a, b) => a - b)
    const firstEmpty = sorted.find(i => slotAnswers[i] === null)
    if (firstEmpty === undefined) return
    setSlotAnswers(prev => ({ ...prev, [firstEmpty]: { bankIdx, letter } }))
    setBankUsed(prev => new Set(prev).add(bankIdx))
  }

  const handleSlotTap = (slotIdx: number) => {
    if (disabled || slotAnswers[slotIdx] === null) return
    const removed = slotAnswers[slotIdx]!
    setSlotAnswers(prev => ({ ...prev, [slotIdx]: null }))
    setBankUsed(prev => { const s = new Set(prev); s.delete(removed.bankIdx); return s })
  }

  const handleClearBlocks = () => {
    setSlotAnswers(Object.fromEntries(Array.from(blanks.missingIndexes).map(i => [i, null])))
    setBankUsed(new Set())
  }

  const handleBlockSubmit = () => {
    if (disabled) return
    const answer = blanks.chars.map((c, i) =>
      blanks.missingIndexes.has(i) ? (slotAnswers[i]?.letter.toLowerCase() ?? '') : c
    ).join('')
    onSubmit(answer)
  }

  // ── Text-input mode handlers ────────────────────────────────────────────
  const handleChange = (idx: number, val: string) => {
    const letter = val.slice(-1)
    setAnswers(prev => ({ ...prev, [idx]: letter }))
    const sorted = Array.from(blanks.missingIndexes).sort((a, b) => a - b)
    const next = sorted[sorted.indexOf(idx) + 1]
    if (next !== undefined && letter) inputRefs.current[next]?.focus()
  }

  const buildTextAnswer = () =>
    blanks.chars.map((c, i) =>
      blanks.missingIndexes.has(i) ? (answers[i] ?? '') : c
    ).join('')

  const handleTextSubmit = () => {
    if (disabled) return
    onSubmit(buildTextAnswer())
  }

  const allBlocksFilled = Array.from(blanks.missingIndexes).every(i => slotAnswers[i] !== null)
  const allTextFilled = Array.from(blanks.missingIndexes).every(i => !!answers[i])

  // Sentence with blanks shown as underscores
  const sentenceWithBlanks = exampleSentence?.replace(
    new RegExp(`\\b${word}\\b`, 'i'),
    blanks.chars.map((c, i) => blanks.missingIndexes.has(i) ? '___' : c).join('')
  )

  const sortedMissing = Array.from(blanks.missingIndexes).sort((a, b) => a - b)

  return (
    <div className="sp-mode-card">
      <div className="sp-mode-header">
        <span className="sp-mode-badge">✏️ Fill in the Blanks</span>
      </div>

      <div className="sp-mode-header-row">
        <p className="sp-mode-prompt">
          {useBlocks ? 'Tap a letter block to fill each blank!' : 'Fill in the missing letters'}
        </p>
        <motion.button
          className={`sp-listen-btn sp-listen-sm ${speaking ? 'listening' : ''}`}
          whileHover={{ scale: speaking ? 1 : 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReadAloud}
          type="button"
          disabled={speaking}
          title="Hear the word"
        >
          {speaking ? '🔊 …' : '🔊'}
        </motion.button>
      </div>

      {sentenceWithBlanks && (
        <div className="sp-hint-box sp-hint-example">
          <span className="sp-hint-italic">{sentenceWithBlanks}</span>
        </div>
      )}

      {/* ── BLOCK MODE (grade K–3) ──────────────────────────────────── */}
      {useBlocks ? (
        <>
          {/* Word display: known letters + tappable filled slots */}
          <div className="sp-blanks-row sp-blanks-block-row">
            {blanks.chars.map((c, i) =>
              blanks.missingIndexes.has(i) ? (
                <motion.div
                  key={i}
                  className={`sp-blank-block ${slotAnswers[i] ? 'filled' : 'empty'}`}
                  onClick={() => handleSlotTap(i)}
                  whileTap={slotAnswers[i] ? { scale: 0.88 } : {}}
                  title={slotAnswers[i] ? 'Tap to remove' : 'Blank'}
                >
                  <AnimatePresence mode="wait">
                    {slotAnswers[i] && (
                      <motion.span
                        key={slotAnswers[i]!.bankIdx}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        {slotAnswers[i]!.letter}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <span key={i} className={`sp-known-letter ${c === ' ' ? 'sp-space' : ''}`}>
                  {c === ' ' ? '\u00a0' : c}
                </span>
              )
            )}
          </div>

          {/* Progress hint */}
          <p className="sp-slot-hint">
            {sortedMissing.filter(i => slotAnswers[i] !== null).length} / {sortedMissing.length} blanks filled
          </p>

          {/* Letter bank */}
          <div className="sp-tiles-row sp-blank-bank">
            <AnimatePresence>
              {bank.map((letter, idx) => (
                <motion.button
                  key={idx}
                  className={`sp-tile sp-blank-tile ${bankUsed.has(idx) ? 'used' : ''}`}
                  onClick={() => handleBankTap(idx, letter)}
                  disabled={disabled || bankUsed.has(idx)}
                  whileHover={!bankUsed.has(idx) ? { scale: 1.12, y: -5 } : {}}
                  whileTap={!bankUsed.has(idx) ? { scale: 0.9 } : {}}
                  layout
                  type="button"
                >
                  {letter}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>

          <div className="sp-scramble-controls">
            <motion.button
              className="sp-secondary-btn"
              onClick={handleClearBlocks}
              disabled={disabled || Object.values(slotAnswers).every(v => v === null)}
              whileTap={{ scale: 0.95 }}
              type="button"
            >
              Clear
            </motion.button>
            <motion.button
              className="sp-submit-btn sp-submit-inline"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleBlockSubmit}
              disabled={disabled || !allBlocksFilled}
              type="button"
            >
              Check Answer ✓
            </motion.button>
          </div>
        </>
      ) : (
        /* ── TEXT INPUT MODE (grade 4+) ──────────────────────────────── */
        <>
          <div className="sp-blanks-row">
            {blanks.chars.map((c, i) =>
              blanks.missingIndexes.has(i) ? (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el }}
                  className="sp-blank-input"
                  type="text"
                  maxLength={2}
                  value={answers[i] ?? ''}
                  onChange={e => handleChange(i, e.target.value)}
                  disabled={disabled}
                  autoComplete="off"
                  spellCheck={false}
                />
              ) : (
                <span key={i} className={`sp-known-letter ${c === ' ' ? 'sp-space' : ''}`}>
                  {c === ' ' ? '\u00a0' : c}
                </span>
              )
            )}
          </div>

          <motion.button
            className="sp-submit-btn"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleTextSubmit}
            disabled={disabled || !allTextFilled}
            type="button"
          >
            Check Answer ✓
          </motion.button>
        </>
      )}
    </div>
  )
}
