import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  word: string
  definition?: string
  exampleSentence?: string
  onSubmit: (answer: string) => void
  disabled?: boolean
  onReadAloud?: () => void
  speaking?: boolean
  grade?: number
}

/** Shuffle an array without mutation */
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

/** Build the letter block bank: all letters of the word (uppercase) plus 3–6 random distractors */
function buildLetterBank(word: string): string[] {
  const wordLetters = word.toUpperCase().split('')
  const distCount = Math.min(6, Math.max(3, Math.floor(word.length * 0.5)))
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const extras: string[] = []
  const used = new Set(wordLetters)
  for (let i = 0; extras.length < distCount; i++) {
    const candidate = alphabet[Math.floor(Math.random() * 26)]
    if (!used.has(candidate)) { extras.push(candidate); used.add(candidate) }
    if (i > 200) break
  }
  return shuffle([...wordLetters, ...extras])
}

/** Simple phonics syllable hint: count vowel groups as syllables */
function syllableHint(word: string): string {
  const syllables = word.toLowerCase().match(/[aeiouy]+/g)?.length ?? 1
  return `${syllables} syllable${syllables !== 1 ? 's' : ''}`
}

export default function SpellingBee({
  word, definition, exampleSentence,
  onSubmit, disabled, onReadAloud, speaking, grade = 5
}: Props) {
  const useBlocks = grade < 4

  // ── Text-input mode (grade 4+) ─────────────────────────────────────────
  const [textValue, setTextValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Block mode (grade K–3) ─────────────────────────────────────────────
  const [bank, setBank] = useState<string[]>([])                // shuffled letter pool
  const [bankUsed, setBankUsed] = useState<Set<number>>(new Set()) // which bank idx are used
  const [slots, setSlots] = useState<Array<{ bankIdx: number; letter: string } | null>>([]) // placed letters
  const [hintUsed, setHintUsed] = useState(false)
  const [showPhonics, setShowPhonics] = useState(false)

  useEffect(() => {
    setTextValue('')
    inputRef.current?.focus()
    if (useBlocks) {
      const b = buildLetterBank(word)
      setBank(b)
      setBankUsed(new Set())
      setSlots(Array(word.length).fill(null))
      setHintUsed(false)
      setShowPhonics(false)
    }
  }, [word, useBlocks])

  // ── Block mode handlers ───────────────────────────────────────────────
  const handleBankTap = (bankIdx: number) => {
    if (disabled || bankUsed.has(bankIdx)) return
    const firstEmpty = slots.indexOf(null)
    if (firstEmpty === -1) return
    const next = [...slots]
    next[firstEmpty] = { bankIdx, letter: bank[bankIdx] }
    setSlots(next)
    setBankUsed(prev => new Set(prev).add(bankIdx))
  }

  const handleSlotTap = (slotIdx: number) => {
    if (disabled || slots[slotIdx] === null) return
    const removed = slots[slotIdx]!
    const next = [...slots]
    next[slotIdx] = null
    setSlots(next)
    setBankUsed(prev => { const s = new Set(prev); s.delete(removed.bankIdx); return s })
  }

  const handleClearBlocks = () => {
    setSlots(Array(word.length).fill(null))
    setBankUsed(new Set())
  }

  const handleUndoBlock = () => {
    const lastFilled = [...slots].reverse().findIndex(s => s !== null)
    if (lastFilled === -1) return
    const idx = slots.length - 1 - lastFilled
    const removed = slots[idx]!
    const next = [...slots]
    next[idx] = null
    setSlots(next)
    setBankUsed(prev => { const s = new Set(prev); s.delete(removed.bankIdx); return s })
  }

  const handleHint = () => {
    if (hintUsed || disabled) return
    setHintUsed(true)
    // Fill slot 0 with the correct first letter
    const correctFirst = word[0].toUpperCase()
    const bankIdx = bank.findIndex((l, i) => l === correctFirst && !bankUsed.has(i))
    if (bankIdx === -1) return
    const next = [...slots]
    next[0] = { bankIdx, letter: correctFirst }
    setSlots(next)
    setBankUsed(prev => new Set(prev).add(bankIdx))
  }

  const handleBlockSubmit = () => {
    if (disabled || slots.some(s => s === null)) return
    const answer = slots.map(s => s!.letter).join('').toLowerCase()
    onSubmit(answer)
    // Reset
    const b = buildLetterBank(word)
    setBank(b)
    setBankUsed(new Set())
    setSlots(Array(word.length).fill(null))
  }

  // ── Text-input submit ──────────────────────────────────────────────────
  const handleTextSubmit = () => {
    if (!textValue.trim() || disabled) return
    onSubmit(textValue.trim())
    setTextValue('')
  }

  const builtWord = slots.map(s => s?.letter ?? '').join('')
  const allFilled = slots.every(s => s !== null)

  return (
    <div className="sp-mode-card">
      <div className="sp-mode-header">
        <span className="sp-mode-badge">🐝 Spelling Bee</span>
      </div>

      <div className="sp-mode-header-row">
        <p className="sp-mode-prompt">
          {useBlocks ? 'Tap the letters to spell the word!' : 'Listen carefully, then spell the word'}
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
          {speaking ? <><span className="sp-listen-wave">🔊</span> Speaking…</> : '🔊 Hear Word'}
        </motion.button>
      </div>

      {definition && (
        <div className="sp-hint-box">
          <span className="sp-hint-label">Hint:</span>
          <span className="sp-hint-text">{definition}</span>
        </div>
      )}
      {exampleSentence && (
        <div className="sp-hint-box sp-hint-example">
          <span className="sp-hint-label">Example:</span>
          <span className="sp-hint-text sp-hint-italic">{exampleSentence}</span>
        </div>
      )}

      {/* ── BLOCK MODE (grade K–3) ─────────────────────────────────── */}
      {useBlocks ? (
        <>
          {/* Helper row */}
          <div className="sp-bee-helpers">
            <motion.button
              className={`sp-helper-btn ${hintUsed ? 'used' : ''}`}
              onClick={handleHint}
              disabled={hintUsed || disabled}
              whileTap={{ scale: 0.93 }}
              type="button"
              title="Show first letter"
            >
              💡 First Letter
            </motion.button>
            <motion.button
              className={`sp-helper-btn ${showPhonics ? 'active' : ''}`}
              onClick={() => setShowPhonics(p => !p)}
              whileTap={{ scale: 0.93 }}
              type="button"
              title="Phonics tip"
            >
              👄 Sound It Out
            </motion.button>
          </div>

          <AnimatePresence>
            {showPhonics && (
              <motion.div
                className="sp-phonics-tip"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <span className="sp-phonics-icon">🔤</span>
                <span>
                  This word has <strong>{syllableHint(word)}</strong>.
                  Say it slow: <strong>{word.toUpperCase().split('').join(' · ')}</strong>
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Answer slots */}
          <div className="sp-bee-slots-wrap">
            <div className="sp-answer-row sp-bee-slots">
              {slots.map((slot, i) => (
                <motion.div
                  key={i}
                  className={`sp-answer-slot sp-bee-slot ${slot ? 'filled' : ''} ${hintUsed && i === 0 && slot ? 'hinted' : ''}`}
                  onClick={() => handleSlotTap(i)}
                  whileTap={slot ? { scale: 0.9 } : {}}
                  title={slot ? 'Tap to remove' : ''}
                >
                  <AnimatePresence mode="wait">
                    {slot && (
                      <motion.span
                        key={slot.bankIdx}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        {slot.letter}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
            {/* Word length label */}
            <p className="sp-slot-hint">{word.length} letters</p>
          </div>

          {/* Letter bank */}
          <div className="sp-tiles-row sp-bee-bank">
            <AnimatePresence>
              {bank.map((letter, idx) => (
                <motion.button
                  key={idx}
                  className={`sp-tile sp-bee-tile ${bankUsed.has(idx) ? 'used' : ''}`}
                  onClick={() => handleBankTap(idx)}
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
              onClick={handleUndoBlock}
              disabled={disabled || slots.every(s => s === null)}
              whileTap={{ scale: 0.95 }}
              type="button"
            >
              ⌫ Undo
            </motion.button>
            <motion.button
              className="sp-secondary-btn"
              onClick={handleClearBlocks}
              disabled={disabled || slots.every(s => s === null)}
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
              disabled={!allFilled || disabled}
              type="button"
            >
              Check ✓
            </motion.button>
          </div>
        </>
      ) : (
        /* ── TEXT INPUT MODE (grade 4+) ────────────────────────────── */
        <>
          <input
            ref={inputRef}
            className="sp-input"
            type="text"
            placeholder="Type your spelling here…"
            value={textValue}
            onChange={e => setTextValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
            disabled={disabled}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <motion.button
            className="sp-submit-btn"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleTextSubmit}
            disabled={!textValue.trim() || disabled}
            type="button"
          >
            Check Spelling ✓
          </motion.button>
        </>
      )}
    </div>
  )
}
