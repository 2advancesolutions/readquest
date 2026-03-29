import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSentenceItems, shuffle, type SentenceItem } from '../games/wordBanks'
import { sfx, playTileSelect, playCorrectChime, playWrongBuzz } from '../lib/gameAudio'

interface Props {
  grade: number
  level: number
  onCorrect: (xp: number) => void
  onWrong: () => void
  questionIndex: number
  totalQuestions: number
}

export default function SentenceBuilder({ grade, level, onCorrect, onWrong, questionIndex }: Props) {
  const [item, setItem] = useState<SentenceItem | null>(null)
  const [bank, setBank] = useState<string[]>([])
  const [placed, setPlaced] = useState<string[]>([])
  const [checked, setChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const loadQuestion = useCallback(() => {
    const items = getSentenceItems(grade)
    const idx = questionIndex % items.length
    const q = items[idx]
    setItem(q)
    setBank(shuffle([...q.words]))
    setPlaced([])
    setChecked(false)
    setIsCorrect(false)
  }, [grade, questionIndex])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  const handleBank = (word: string, i: number) => {
    if (checked) return
    sfx(playTileSelect)
    const newBank = [...bank]
    newBank.splice(i, 1)
    setBank(newBank)
    setPlaced(p => [...p, word])
  }

  const handlePlaced = (word: string, i: number) => {
    if (checked) return
    sfx(playTileSelect)
    const newPlaced = [...placed]
    newPlaced.splice(i, 1)
    setPlaced(newPlaced)
    setBank(b => [...b, word])
  }

  const handleCheck = () => {
    if (!item || placed.length !== item.words.length) return
    const correct = placed.join(' ') === item.words.join(' ')
    setChecked(true)
    setIsCorrect(correct)
    if (correct) {
      setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 300)
    } else {
      setTimeout(() => { sfx(playWrongBuzz); onWrong() }, 300)
    }
  }

  if (!item) return null

  return (
    <div className="sb-root">
      <p className="sb-prompt">Build the sentence — tap words in order</p>

      {/* Answer slots */}
      <div className="sb-answer-slots">
        {placed.length === 0 && (
          <span style={{ color: 'rgba(204,195,216,0.3)', fontSize: '0.9rem' }}>
            Tap words below to build the sentence
          </span>
        )}
        <AnimatePresence>
          {placed.map((w, i) => {
            let cls = 'sb-word-tile placed'
            if (checked) cls += isCorrect ? ' correct-tile' : ' wrong-tile'
            return (
              <motion.button
                key={i + w}
                className={cls}
                onClick={() => handlePlaced(w, i)}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                disabled={checked}
              >
                {w}
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Word bank */}
      <div className="sb-bank">
        <AnimatePresence>
          {bank.map((w, i) => (
            <motion.button
              key={i + w}
              className="sb-word-tile bank"
              onClick={() => handleBank(w, i)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              disabled={checked}
            >
              {w}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <button
        className="sb-check-btn"
        onClick={handleCheck}
        disabled={placed.length !== item.words.length || checked}
      >
        ✓ Check Sentence
      </button>
    </div>
  )
}
