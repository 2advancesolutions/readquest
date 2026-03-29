import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { getPhonicItems, shuffle, type PhonicsItem } from '../games/wordBanks'
import { sfx, playTileSelect, playCorrectChime, playWrongBuzz } from '../lib/gameAudio'

interface Props {
  grade: number
  level: number
  onCorrect: (xp: number) => void
  onWrong: () => void
  questionIndex: number
  totalQuestions: number
}

export default function PhonicsPower({ grade, level, onCorrect, onWrong, questionIndex }: Props) {
  const [item, setItem] = useState<PhonicsItem | null>(null)
  const [choices, setChoices] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [playing, setPlaying] = useState(false)

  const loadQuestion = useCallback(() => {
    const items = getPhonicItems(Math.min(grade, 2))
    const q = items[questionIndex % items.length]
    setItem(q)
    setChoices(shuffle(q.choices))
    setSelected(null)
    setRevealed(false)
    setPlaying(false)
  }, [grade, level, questionIndex])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  // Auto-play sound on load
  useEffect(() => {
    if (item) { setTimeout(() => speakPrompt(item.prompt), 500) }
  }, [item])

  const speakPrompt = (text: string) => {
    if (!window.speechSynthesis) return
    setPlaying(true)
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.75
    utt.pitch = 1.1
    utt.volume = 1
    utt.onend = () => setPlaying(false)
    window.speechSynthesis.speak(utt)
  }

  const handleChoice = (answer: string) => {
    if (revealed || !item) return
    sfx(playTileSelect)
    setSelected(answer)
    setRevealed(true)
    if (answer === item.answer) {
      setTimeout(() => { sfx(playCorrectChime); onCorrect(0) }, 200)
    } else {
      setTimeout(() => { sfx(playWrongBuzz); onWrong() }, 200)
    }
  }

  if (!item) return null

  const numCols = choices.length <= 3 ? choices.length : 2

  return (
    <div className="pp-root">
      <p className="pp-instruction">Listen to the sound — tap the matching letters</p>

      {/* Speaker */}
      <button
        className={`pp-speaker ${playing ? 'playing' : ''}`}
        onClick={() => item && speakPrompt(item.prompt)}
        title="Play sound again"
      >
        {playing ? '🔊' : '🔉'}
        <span className="pp-speaker-ring" />
        <span className="pp-speaker-ring" />
        <span className="pp-speaker-ring" />
      </button>

      {/* Visual word — displayed clearly so kids can see + hear it */}
      <div className="pp-word-hint">{item.prompt}</div>


      {/* Answer tiles */}
      <div
        className="pp-choices"
        style={{ gridTemplateColumns: `repeat(${Math.min(numCols, 4)}, 1fr)` }}
      >
        {choices.map((c) => {
          let cls = 'pp-tile'
          if (revealed) {
            if (c === item.answer) cls += ' correct'
            else if (c === selected) cls += ' wrong'
          }
          return (
            <motion.button
              key={c}
              className={cls}
              onClick={() => handleChoice(c)}
              disabled={revealed}
              whileHover={!revealed ? { scale: 1.08 } : {}}
              whileTap={!revealed ? { scale: 0.93 } : {}}
            >
              {c}
            </motion.button>
          )
        })}
      </div>

      <button
        onClick={() => item && speakPrompt(item.prompt)}
        style={{
          background: 'none', border: '1px dashed rgba(250,112,154,0.3)',
          color: 'rgba(204,195,216,0.5)', padding: '6px 16px', borderRadius: '99px',
          fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'var(--ga-font)',
        }}
      >
        🔁 Hear Again
      </button>
    </div>
  )
}
