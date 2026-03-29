import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { getVocabItems, shuffle, type VocabPair } from '../games/wordBanks'
import { sfx, playTileSelect, playCorrectChime, playWrongBuzz } from '../lib/gameAudio'

interface Props {
  grade: number
  level: number
  onCorrect: (xp: number) => void
  onWrong: () => void
  questionIndex: number
  totalQuestions: number
}

const PAIRS_COUNT = (level: number) =>
  level <= 25 ? 3 : level <= 50 ? 4 : level <= 75 ? 5 : 6

export default function VocabularyVault({ grade, level, onCorrect, onWrong, questionIndex }: Props) {
  const [pairs, setPairs] = useState<VocabPair[]>([])
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [wrongPair, setWrongPair] = useState<string | null>(null)
  const [shuffledDefs, setShuffledDefs] = useState<string[]>([])
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pairsCount = PAIRS_COUNT(level)

  const loadQuestion = useCallback(() => {
    const all = getVocabItems(grade)
    const shuffledAll = shuffle(all)
    const selected = shuffledAll.slice(0, pairsCount)
    setPairs(selected)
    setShuffledDefs(shuffle(selected.map(p => p.definition)))
    setSelectedWord(null)
    setMatched(new Set())
    setWrongPair(null)
  }, [grade, level, pairsCount])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  const handleWord = (word: string) => {
    if (matched.has(word)) return
    sfx(playTileSelect)
    setSelectedWord(prev => prev === word ? null : word)
  }

  const handleDef = (def: string) => {
    if (!selectedWord) return
    const pair = pairs.find(p => p.word === selectedWord)
    if (!pair) return
    sfx(playTileSelect)

    if (pair.definition === def) {
      const newMatched = new Set(matched)
      newMatched.add(selectedWord)
      setMatched(newMatched)
      setSelectedWord(null)
      sfx(playCorrectChime)
      // Check if all matched
      if (newMatched.size >= pairs.length) {
        setTimeout(() => onCorrect(0), 400)
      }
    } else {
      setWrongPair(selectedWord)
      sfx(playWrongBuzz)
      onWrong()
      if (wrongTimer.current) clearTimeout(wrongTimer.current)
      wrongTimer.current = setTimeout(() => {
        setWrongPair(null)
        setSelectedWord(null)
      }, 800)
    }
  }

  return (
    <div className="vv-root">
      <div className="vv-vault-icon">🔐</div>
      <p style={{ color: 'rgba(204,195,216,0.7)', fontSize: '0.9rem', fontWeight: 600, margin: 0, textAlign: 'center' }}>
        Match each word to its definition to unlock the vault!
      </p>

      <div className="vv-pairs-grid">
        {/* Words column */}
        <div className="vv-col">
          <p style={{ color: 'rgba(67,233,123,0.7)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Words</p>
          {pairs.map(p => {
            const isMatched = matched.has(p.word)
            const isSelected = selectedWord === p.word
            const isWrong = wrongPair === p.word
            let cls = 'vv-item word'
            if (isMatched) cls += ' matched'
            if (isSelected) cls += ' selected'
            if (isWrong) cls += ' wrong'
            return (
              <motion.button
                key={p.word}
                className={cls}
                onClick={() => !isMatched && handleWord(p.word)}
                whileHover={!isMatched ? { scale: 1.03 } : {}}
                whileTap={!isMatched ? { scale: 0.97 } : {}}
                disabled={isMatched}
              >
                {isMatched ? '✓ ' : ''}{p.word}
              </motion.button>
            )
          })}
        </div>

        {/* Definitions column */}
        <div className="vv-col">
          <p style={{ color: 'rgba(56,249,215,0.7)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Definitions</p>
          {shuffledDefs.map(def => {
            const matchingPair = pairs.find(p => p.definition === def)
            const isMatched = matchingPair ? matched.has(matchingPair.word) : false
            let cls = 'vv-item def'
            if (isMatched) cls += ' matched'
            return (
              <motion.button
                key={def}
                className={cls}
                onClick={() => !isMatched && selectedWord && handleDef(def)}
                whileHover={!isMatched && !!selectedWord ? { scale: 1.02 } : {}}
                style={{ cursor: isMatched ? 'default' : selectedWord ? 'pointer' : 'not-allowed', opacity: isMatched ? 0.5 : selectedWord ? 1 : 0.6 }}
                disabled={isMatched}
              >
                {isMatched ? '✓ ' : ''}{def}
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
