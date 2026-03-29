import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getContextItems, shuffle, type ContextItem } from '../games/wordBanks'
import { sfx, playTileSelect, playCorrectChime, playWrongBuzz } from '../lib/gameAudio'

interface Props {
  grade: number
  level: number
  onCorrect: (xp: number) => void
  onWrong: () => void
  questionIndex: number
  totalQuestions: number
}

const CLUE_TYPE_LABELS: Record<string, string> = {
  definition: '📖 Definition Clue',
  synonym:    '🔄 Synonym Clue',
  antonym:    '⚡ Contrast Clue',
  example:    '🌟 Example Clue',
  inference:  '🔍 Inference Clue',
}

export default function ContextClues({ grade, level, onCorrect, onWrong, questionIndex }: Props) {
  const [item, setItem] = useState<ContextItem | null>(null)
  const [choices, setChoices] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const loadQuestion = useCallback(() => {
    const items = getContextItems(grade)
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

  // Render sentence with target word highlighted
  const renderSentence = (sentence: string, target: string) => {
    const parts = sentence.split(`*${target}*`)
    return (
      <>
        {parts[0]}
        <mark>{target}</mark>
        {parts[1] || ''}
      </>
    )
  }

  return (
    <div className="cc-root">
      <div className="cc-magnifier">🔍</div>

      {/* Clue type badge */}
      <span className="cc-clue-type">
        {CLUE_TYPE_LABELS[item.clueType] ?? item.clueType}
      </span>

      {/* Sentence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={item.targetWord + questionIndex}
          className="cc-sentence"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
        >
          {renderSentence(item.sentence, item.targetWord)}
        </motion.div>
      </AnimatePresence>

      <p className="cc-question">
        What does <strong style={{ color: '#c084fc' }}>&ldquo;{item.targetWord}&rdquo;</strong> most likely mean?
      </p>

      <div className="cc-choices">
        {choices.map(c => {
          let cls = 'cc-choice'
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
    </div>
  )
}
