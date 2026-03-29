import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getRhymeItems, shuffle, type RhymePair } from '../games/wordBanks'
import { sfx, playTileSelect, playCorrectChime, playWrongBuzz, playHintReveal } from '../lib/gameAudio'

interface Props {
  grade: number
  level: number
  onCorrect: (xp: number) => void
  onWrong: () => void
  questionIndex: number
  totalQuestions: number
}

export default function RhymeTime({ grade, level, onCorrect, onWrong, questionIndex, totalQuestions }: Props) {
  const [items, setItems] = useState<RhymePair[]>([])
  const [current, setCurrent] = useState<RhymePair | null>(null)
  const [choices, setChoices] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const loadQuestion = useCallback(() => {
    const bank = getRhymeItems(grade)
    const shuffled = shuffle(bank)
    const item = shuffled[questionIndex % shuffled.length]
    setCurrent(item)
    // Always include the correct answer — pick N distractors then shuffle in the rhyme
    const distractorCount = level < 25 ? 2 : 3  // 3 or 4 total choices
    const pickedDistractors = shuffle(item.distractors).slice(0, distractorCount)
    setChoices(shuffle([item.rhyme, ...pickedDistractors]))
    setSelected(null)
    setRevealed(false)
  }, [grade, level, questionIndex])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  const handleChoice = (word: string) => {
    if (selected || !current) return
    sfx(playTileSelect)
    setSelected(word)
    setRevealed(true)
    if (word === current.rhyme) {
      setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 150)
    } else {
      setTimeout(() => { sfx(playWrongBuzz); onWrong() }, 150)
    }
  }

  const handleHint = () => {
    if (!current) return
    sfx(playHintReveal)
    // Reveal first letter of the rhyme as hint
    alert(`Hint: The rhyming word starts with "${current.rhyme[0].toUpperCase()}"`)
  }

  if (!current) return null

  return (
    <div className="rt-root">
      <p className="rt-prompt">Find the word that rhymes with…</p>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.word + questionIndex}
          className="rt-word-display"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.2, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          {current.word}
        </motion.div>
      </AnimatePresence>

      <div className="rt-choices">
        {choices.map((word) => {
          let cls = 'rt-choice'
          if (revealed) {
            if (word === current.rhyme) cls += ' correct'
            else if (word === selected) cls += ' wrong'
          }
          return (
            <motion.button
              key={word}
              className={cls}
              onClick={() => handleChoice(word)}
              disabled={revealed}
              whileHover={!revealed ? { scale: 1.05 } : {}}
              whileTap={!revealed ? { scale: 0.95 } : {}}
            >
              {word}
            </motion.button>
          )
        })}
      </div>

      {!revealed && level < 50 && (
        <button
          onClick={handleHint}
          style={{
            background: 'none', border: '1px dashed rgba(255,107,157,0.3)',
            color: 'rgba(204,195,216,0.5)', padding: '6px 16px', borderRadius: '99px',
            fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--ga-font)',
          }}
        >
          💡 Hint
        </button>
      )}
    </div>
  )
}
