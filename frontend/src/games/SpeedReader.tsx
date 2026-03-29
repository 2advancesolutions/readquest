import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { getSpeedItems, type SpeedItem } from '../games/wordBanks'
import { sfx, playTimerTick, playTimerUrgent, playCorrectChime, playWrongBuzz, playCountdown } from '../lib/gameAudio'

interface Props {
  grade: number
  level: number
  onCorrect: (xp: number) => void
  onWrong: () => void
  questionIndex: number
  totalQuestions: number
}

type Phase = 'ready' | 'reading' | 'answering' | 'revealed'

function getReadTime(item: SpeedItem, level: number): number {
  const base = item.readTime
  const reduction = Math.floor(level / 20) * 2
  return Math.max(base - reduction, 5)
}

export default function SpeedReader({ grade, level, onCorrect, onWrong, questionIndex }: Props) {
  const [item, setItem] = useState<SpeedItem | null>(null)
  const [choiceList, setChoiceList] = useState<string[]>([])
  const [phase, setPhase] = useState<Phase>('ready')
  const [timeLeft, setTimeLeft] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadQuestion = useCallback(() => {
    const items = getSpeedItems(grade)
    const q = items[questionIndex % items.length]
    setItem(q)
    setChoiceList(q.choices)
    setPhase('ready')
    setSelected(null)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [grade, level, questionIndex])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  const startReading = () => {
    if (!item) return
    const readTime = getReadTime(item, level)
    setTimeLeft(readTime)
    setPhase('reading')
  }

  useEffect(() => {
    if (phase !== 'reading' || !item) return
    const readTime = getReadTime(item, level)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          setPhase('answering')
          return 0
        }
        if (t <= 3) sfx(playTimerUrgent)
        else if (t <= 5) sfx(playTimerTick)
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  const handleChoice = (choice: string) => {
    if (phase !== 'answering' || !item) return
    setSelected(choice)
    setPhase('revealed')
    if (choice === item.correct) {
      sfx(playCorrectChime)
      setTimeout(() => onCorrect(0), 400)
    } else {
      sfx(playWrongBuzz)
      setTimeout(() => onWrong(), 400)
    }
  }

  if (!item) return null

  const readTime = getReadTime(item, level)
  const circum = 2 * Math.PI * 38
  const offset = circum * (1 - timeLeft / readTime)
  const urgent = timeLeft <= 3 && phase === 'reading'

  return (
    <div className="sr-root">
      {/* Timer ring (only during reading) */}
      {phase === 'reading' && (
        <div className="sr-timer-ring">
          <svg viewBox="0 0 90 90" className="sr-timer-svg" width="90" height="90">
            <defs>
              <linearGradient id="srGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ff9a9e" />
                <stop offset="100%" stopColor="#fecfef" />
              </linearGradient>
            </defs>
            <circle className="sr-timer-track" cx="45" cy="45" r="38" />
            <circle
              className="sr-timer-fill"
              cx="45" cy="45" r="38"
              strokeDasharray={circum}
              strokeDashoffset={offset}
            />
          </svg>
          <div className={`sr-timer-num ${urgent ? 'urgent' : ''}`}>{timeLeft}s</div>
        </div>
      )}

      {/* Ready state */}
      {phase === 'ready' && (
        <>
          <p style={{ color: 'rgba(204,195,216,0.7)', fontSize: '0.95rem', fontWeight: 600, textAlign: 'center', margin: 0 }}>
            ⚡ Read the passage quickly, then answer the question!
          </p>
          <div className="sr-passage">
            {item.passage.slice(0, 40)}…
          </div>
          <button className="sr-read-btn" onClick={startReading}>
            🚀 Start Reading!
          </button>
        </>
      )}

      {/* Reading state */}
      {phase === 'reading' && (
        <motion.div
          className="sr-passage"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {item.passage}
        </motion.div>
      )}

      {/* Answering state */}
      {(phase === 'answering' || phase === 'revealed') && (
        <>
          <div className="sr-passage hidden">
            <span className="sr-hidden-text">🕵️ Passage hidden — answer from memory!</span>
          </div>
          <p className="sr-question">{item.question}</p>
          <div className="sr-choices">
            {choiceList.map(c => {
              let cls = 'sr-choice'
              if (phase === 'revealed') {
                if (c === item.correct) cls += ' correct'
                else if (c === selected) cls += ' wrong'
              }
              return (
                <motion.button
                  key={c}
                  className={cls}
                  onClick={() => handleChoice(c)}
                  disabled={phase === 'revealed'}
                  whileHover={phase === 'answering' ? { x: 4 } : {}}
                  whileTap={phase === 'answering' ? { scale: 0.97 } : {}}
                >
                  {c}
                </motion.button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
