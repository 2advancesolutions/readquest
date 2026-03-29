import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getGrammarItems, shuffle, type GrammarItem } from '../games/wordBanks'
import { sfx, playTileSelect, playCorrectChime, playWrongBuzz } from '../lib/gameAudio'

interface Props {
  grade: number
  level: number
  onCorrect: (xp: number) => void
  onWrong: () => void
  questionIndex: number
  totalQuestions: number
}

export default function GrammarGalaxy({ grade, level, onCorrect, onWrong, questionIndex }: Props) {
  const [item, setItem] = useState<GrammarItem | null>(null)
  const [choices, setChoices] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const loadQuestion = useCallback(() => {
    const items = getGrammarItems(grade)
    const q = items[questionIndex % items.length]
    setItem(q)
    setChoices(shuffle(q.choices))
    setSelected(null)
    setRevealed(false)
  }, [grade, level, questionIndex])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  const handleChoice = (choice: string) => {
    if (revealed || !item) return
    sfx(playTileSelect)
    setSelected(choice)
    setRevealed(true)
    if (choice === item.correct) {
      setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 200)
    } else {
      setTimeout(() => { sfx(playWrongBuzz); onWrong() }, 200)
    }
  }

  if (!item) return null

  return (
    <div className="gg-root">
      <div className="gg-planet">🪐</div>

      <p style={{ color: 'rgba(204,195,216,0.7)', fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
        Fix the sentence! Pick the correct version:
      </p>

      {/* Error sentence display */}
      <div className="gg-error-sentence">
        <em>Error:</em> &ldquo;{item.sentence}&rdquo;
      </div>

      {/* Choices */}
      <div className="gg-choices">
        {choices.map((c) => {
          let cls = 'gg-choice'
          if (revealed) {
            if (c === item.correct) cls += ' correct'
            else if (c === selected) cls += ' wrong'
          }
          return (
            <motion.button
              key={c}
              className={cls}
              onClick={() => handleChoice(c)}
              disabled={revealed}
              whileHover={!revealed ? { x: 4 } : {}}
              whileTap={!revealed ? { scale: 0.97 } : {}}
            >
              {c}
            </motion.button>
          )
        })}
      </div>

      {/* Explanation after reveal */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            className="gg-explanation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            💡 <strong>Why?</strong> {item.explanation}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
