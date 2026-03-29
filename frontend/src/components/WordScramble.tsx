import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  word: string
  onSubmit: (answer: string) => void
  disabled?: boolean
  onReadAloud?: () => void
  speaking?: boolean
}

function scramble(word: string): string[] {
  const letters = word.toUpperCase().split('')
  let attempt = 0
  do {
    letters.sort(() => Math.random() - 0.5)
    attempt++
  } while (letters.join('') === word.toUpperCase() && attempt < 10)
  return letters
}

export default function WordScramble({ word, onSubmit, disabled, onReadAloud, speaking }: Props) {
  const [tiles, setTiles] = useState<string[]>(() => scramble(word))
  const [selected, setSelected] = useState<number[]>([])

  useEffect(() => {
    setTiles(scramble(word))
    setSelected([])
  }, [word])

  const builtWord = selected.map(i => tiles[i]).join('')
  const selectedSet = new Set(selected)

  const selectTile = (idx: number) => {
    if (disabled || selectedSet.has(idx)) return
    setSelected(prev => [...prev, idx])
  }

  const removeLastSelected = () => setSelected(prev => prev.slice(0, -1))
  const handleClear = () => setSelected([])

  const handleSubmit = () => {
    if (disabled || selected.length === 0) return
    onSubmit(builtWord.toLowerCase())
    setSelected([])
  }

  return (
    <div className="sp-mode-card">
      <div className="sp-mode-header">
        <span className="sp-mode-badge">🔀 Word Scramble</span>
      </div>

      <div className="sp-mode-header-row">
        <p className="sp-mode-prompt">Tap the letters in the right order</p>
        {/* TTS replay button */}
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

      {/* Answer slots */}
      <div className="sp-answer-row">
        {Array.from({ length: word.length }).map((_, i) => (
          <div key={i} className={`sp-answer-slot ${i < selected.length ? 'filled' : ''}`}>
            {selected[i] !== undefined ? tiles[selected[i]] : ''}
          </div>
        ))}
      </div>

      {/* Source tiles */}
      <div className="sp-tiles-row">
        <AnimatePresence>
          {tiles.map((letter, idx) => (
            <motion.button
              key={idx}
              className={`sp-tile ${selectedSet.has(idx) ? 'used' : ''}`}
              onClick={() => selectTile(idx)}
              disabled={disabled || selectedSet.has(idx)}
              whileHover={!selectedSet.has(idx) ? { scale: 1.1, y: -4 } : {}}
              whileTap={!selectedSet.has(idx) ? { scale: 0.92 } : {}}
              layout
              type="button"
            >
              {letter}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="sp-scramble-controls">
        <motion.button
          className="sp-secondary-btn"
          onClick={removeLastSelected}
          disabled={disabled || selected.length === 0}
          whileTap={{ scale: 0.95 }}
          type="button"
        >
          ⌫ Undo
        </motion.button>
        <motion.button
          className="sp-secondary-btn"
          onClick={handleClear}
          disabled={disabled || selected.length === 0}
          whileTap={{ scale: 0.95 }}
          type="button"
        >
          Clear
        </motion.button>
        <motion.button
          className="sp-submit-btn sp-submit-inline"
          onClick={handleSubmit}
          disabled={disabled || selected.length !== word.length}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          type="button"
        >
          Check ✓
        </motion.button>
      </div>
    </div>
  )
}
