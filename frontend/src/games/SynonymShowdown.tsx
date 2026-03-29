import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSynonymItems, shuffle, type SynonymItem } from '../games/wordBanks'
import { sfx, playTileSelect, playCorrectChime, playWrongBuzz, playTimerTick, playTimerUrgent, playStreakFire } from '../lib/gameAudio'

interface Props {
  grade: number
  level: number
  onCorrect: (xp: number) => void
  onWrong: () => void
  questionIndex: number
  totalQuestions: number
  streak: number
}

const TIME_FOR_LEVEL = (level: number) =>
  level <= 25 ? 12 : level <= 50 ? 9 : level <= 75 ? 7 : 5

export default function SynonymShowdown({ grade, level, onCorrect, onWrong, questionIndex, streak }: Props) {
  const [item, setItem] = useState<SynonymItem | null>(null)
  const [choices, setChoices] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TIME_FOR_LEVEL(level))
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const maxTime = TIME_FOR_LEVEL(level)

  const loadQuestion = useCallback(() => {
    const items = getSynonymItems(grade)
    const q = items[questionIndex % items.length]
    setItem(q)
    setChoices(shuffle(q.choices))
    setSelected(null)
    setRevealed(false)
    setTimeLeft(maxTime)
  }, [grade, level, questionIndex, maxTime])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  // Timer
  useEffect(() => {
    if (revealed) { if (timerRef.current) clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          setRevealed(true)
          sfx(playWrongBuzz)
          onWrong()
          return 0
        }
        if (t <= 4) sfx(playTimerUrgent)
        else if (t <= 6) sfx(playTimerTick)
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [revealed, onWrong])

  useEffect(() => {
    if (streak > 0 && streak % 3 === 0) sfx(playStreakFire)
  }, [streak])

  const handleChoice = (word: string) => {
    if (revealed || !item) return
    if (timerRef.current) clearInterval(timerRef.current)
    sfx(playTileSelect)
    setSelected(word)
    setRevealed(true)
    if (word === item.correct) {
      setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 180)
    } else {
      setTimeout(() => { sfx(playWrongBuzz); onWrong() }, 180)
    }
  }

  if (!item) return null
  const pct = (timeLeft / maxTime) * 100
  const urgent = timeLeft <= 3

  return (
    <div className="ss-root">
      <span className={`ss-mode-pill ${item.type}`}>
        {item.type === 'synonym' ? '⚔️ Find the Synonym' : '🛡️ Find the Antonym'}
      </span>

      {/* Timer */}
      <div className="ss-timer-bar">
        <motion.div
          className={`ss-timer-fill ${urgent ? 'urgent' : ''}`}
          style={{ width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25 }}
        />
      </div>

      {/* Arena */}
      <div className="ss-arena">
        <AnimatePresence mode="wait">
          <motion.p
            key={item.word + questionIndex}
            className="ss-battle-word"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {item.word}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="ss-choices">
        {choices.map((c) => {
          let cls = 'ss-choice'
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
              whileHover={!revealed ? { translateY: -3 } : {}}
              whileTap={!revealed ? { scale: 0.96 } : {}}
            >
              {c}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
