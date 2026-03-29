import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { calcXP, calcLevelBonus, saveGameLevel, loadGameLevel, saveStars } from '../games/wordBanks'
import { sfx, playLevelComplete, playLevelFail, playStarEarn, playXPRing, playComboBreak, isSfxMuted, toggleSfxMute } from '../lib/gameAudio'
import { emitXpUpdate, getStoredXp } from '../components/XpBadge'
import RhymeTime from '../games/RhymeTime'
import SentenceBuilder from '../games/SentenceBuilder'
import SynonymShowdown from '../games/SynonymShowdown'
import VocabularyVault from '../games/VocabularyVault'
import PhonicsPower from '../games/PhonicsPower'
import GrammarGalaxy from '../games/GrammarGalaxy'
import SpeedReader from '../games/SpeedReader'
import ContextClues from '../games/ContextClues'
import '../styles/games.css'

const TOTAL_QUESTIONS = 8
const MAX_LIVES = 3
const COLORS: Record<string, { c1: string; c2: string }> = {
  rhyme:    { c1: '#FF6B9D', c2: '#C850C0' },
  sentence: { c1: '#4FACFE', c2: '#00F2FE' },
  synonym:  { c1: '#F093FB', c2: '#F5576C' },
  vocab:    { c1: '#43E97B', c2: '#38F9D7' },
  phonics:  { c1: '#FA709A', c2: '#FEE140' },
  grammar:  { c1: '#A18CD1', c2: '#FBC2EB' },
  speed:    { c1: '#FF9A9E', c2: '#FECFEF' },
  context:  { c1: '#667EEA', c2: '#764BA2' },
}

const GAME_NAMES: Record<string, string> = {
  rhyme: '🎵 Rhyme Time', sentence: '🏗️ Sentence Builder',
  synonym: '⚔️ Synonym Showdown', vocab: '🔐 Vocabulary Vault',
  phonics: '🔊 Phonics Power', grammar: '🪐 Grammar Galaxy',
  speed: '⚡ Speed Reader', context: '🔍 Context Clues',
}

type Phase = 'playing' | 'complete' | 'failed'

function spawnConfetti() {
  const colors = ['#FF6B9D','#4FACFE','#F093FB','#43E97B','#FA709A','#A18CD1','#FF9A9E','#667EEA','#f59e0b','#22c55e']
  const container = document.body
  for (let i = 0; i < 24; i++) {
    const el = document.createElement('div')
    el.className = 'ga-confetti'
    const tx = `translate(${(Math.random() - 0.5) * 400}px, ${-(100 + Math.random() * 300)}px)`
    el.style.cssText = `
      left: ${30 + Math.random() * 40}%;
      top: 50%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      --tx: ${tx};
      animation-delay: ${Math.random() * 0.3}s;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `
    container.appendChild(el)
    setTimeout(() => el.remove(), 1100)
  }
}

function flashScreen(type: 'correct' | 'wrong', rootEl: HTMLElement | null) {
  if (!rootEl) return
  if (type === 'wrong') {
    rootEl.classList.remove('shake')
    void rootEl.offsetWidth // reflow
    rootEl.classList.add('shake')
    setTimeout(() => rootEl.classList.remove('shake'), 400)
  } else {
    const flash = document.createElement('div')
    flash.className = 'gp-correct-flash'
    document.body.appendChild(flash)
    setTimeout(() => flash.remove(), 500)
  }
}

export default function GamePlay() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)

  const grade = parseInt(localStorage.getItem('readquest_student_grade') || '1', 10)
  const [level, setLevel] = useState(() => loadGameLevel(gameId ?? 'rhyme', grade))
  const [lives, setLives] = useState(MAX_LIVES)
  const [streak, setStreak] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [xpEarned, setXpEarned] = useState(0)
  const [phase, setPhase] = useState<Phase>('playing')
  const [starsEarned, setStarsEarned] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [muted, setMuted] = useState(isSfxMuted())

  const game = gameId ?? 'rhyme'
  const colors = COLORS[game] ?? COLORS.rhyme

  const handleCorrect = useCallback(() => {
    const xp = calcXP(level, streak + 1)
    setXpEarned(prev => prev + xp)
    setStreak(s => s + 1)
    flashScreen('correct', rootRef.current)
    spawnConfetti()

    const next = questionIndex + 1
    if (next >= TOTAL_QUESTIONS) {
      // Level complete!
      const bonus = calcLevelBonus(level)
      const totalXp = xpEarned + xp + bonus
      setXpEarned(totalXp)
      const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1
      setStarsEarned(stars)
      saveStars(game, grade, level, stars)
      sfx(playLevelComplete)
      for (let i = 0; i < stars; i++) {
        setTimeout(() => sfx(playStarEarn), 500 + i * 200)
      }
      // Award XP globally
      const storedXp = getStoredXp()
      emitXpUpdate(storedXp + totalXp, totalXp)
      // Advance level
      const nextLevel = Math.min(level + 1, 100)
      saveGameLevel(game, grade, nextLevel)
      setPhase('complete')
    } else {
      sfx(playXPRing)
      setQuestionIndex(next)
    }
  }, [level, streak, questionIndex, xpEarned, mistakes, game, grade])

  const handleWrong = useCallback(() => {
    flashScreen('wrong', rootRef.current)
    if (streak > 0) sfx(playComboBreak)
    setStreak(0)
    setMistakes(m => m + 1)
    setLives(l => {
      const next = l - 1
      if (next <= 0) {
        sfx(playLevelFail)
        setPhase('failed')
      }
      return next
    })
    // Still advance question even on wrong
    const next = questionIndex + 1
    if (next < TOTAL_QUESTIONS && lives > 1) {
      setTimeout(() => setQuestionIndex(next), 800)
    }
  }, [streak, questionIndex, lives])

  const handleNextLevel = () => {
    setLevel(l => Math.min(l + 1, 100))
    setLives(MAX_LIVES)
    setStreak(0)
    setQuestionIndex(0)
    setXpEarned(0)
    setMistakes(0)
    setPhase('playing')
  }

  const handleRetry = () => {
    setLives(MAX_LIVES)
    setStreak(0)
    setQuestionIndex(0)
    setXpEarned(0)
    setMistakes(0)
    setPhase('playing')
  }

  const handleToggleMute = () => {
    const next = toggleSfxMute()
    setMuted(next)
  }

  const renderGame = () => {
    const props = { grade, level, onCorrect: handleCorrect, onWrong: handleWrong, questionIndex, totalQuestions: TOTAL_QUESTIONS, streak }
    switch (game) {
      case 'rhyme':    return <RhymeTime    {...props} />
      case 'sentence': return <SentenceBuilder {...props} />
      case 'synonym':  return <SynonymShowdown {...props} />
      case 'vocab':    return <VocabularyVault {...props} />
      case 'phonics':  return <PhonicsPower  {...props} />
      case 'grammar':  return <GrammarGalaxy  {...props} />
      case 'speed':    return <SpeedReader   {...props} />
      case 'context':  return <ContextClues   {...props} />
      default:         return <div style={{ color: '#fff' }}>Unknown game</div>
    }
  }

  const qPct = ((questionIndex) / TOTAL_QUESTIONS) * 100
  const fireStreak = streak >= 5

  return (
    <div className="gp-root" ref={rootRef}>
      {/* HUD */}
      <div className="gp-hud" style={{ borderBottomColor: `${colors.c1}22` }}>
        <button className="gp-back" onClick={() => navigate('/games')}>← Games</button>
        <span className="gp-game-title" style={{ background: `linear-gradient(135deg, ${colors.c1}, ${colors.c2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {GAME_NAMES[game] ?? game}
        </span>
        <span className="gp-level-badge">Lvl {level}</span>
        <span className="gp-xp-badge">⚡ +{xpEarned} XP</span>
        <div className="gp-hearts">
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <span key={i} className={`gp-heart ${i >= lives ? 'lost' : ''}`}>❤️</span>
          ))}
        </div>
        <button className="gp-sfx-btn" onClick={handleToggleMute} title={muted ? 'Unmute' : 'Mute'}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Streak dots */}
      <div className="gp-streak-bar">
        <span className="gp-streak-label">{fireStreak ? '🔥 ON FIRE!' : '⚡ Streak:'}</span>
        <div className="gp-streak-dots">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`gp-streak-dot ${i < streak ? (fireStreak ? 'fire' : 'lit') : ''}`}
            />
          ))}
        </div>
        {streak >= 7 && <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 800 }}>MAX!</span>}
      </div>

      {/* Question progress */}
      <div className="gp-q-progress">
        <div className="gp-q-track">
          <motion.div
            className="gp-q-fill"
            style={{ background: `linear-gradient(90deg, ${colors.c1}, ${colors.c2})` }}
            animate={{ width: `${qPct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <div className="gp-q-label">Q {questionIndex + 1} / {TOTAL_QUESTIONS}</div>
      </div>

      {/* Game area */}
      <div className="gp-body">
        <AnimatePresence mode="wait">
          {phase === 'playing' && (
            <motion.div
              key={`q-${questionIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
            >
              {renderGame()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Level Complete Overlay */}
      <AnimatePresence>
        {phase === 'complete' && (
          <motion.div
            className="gp-level-complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="gp-lc-emoji">🏆</div>
            <div className="gp-lc-title">Level {level} Complete!</div>
            <div className="gp-lc-xp">⚡ +{xpEarned} XP Earned!</div>
            <div className="gp-lc-stars">
              {Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  className={`gp-lc-star ${i < starsEarned ? 'earned' : ''}`}
                  style={{ animationDelay: `${0.1 + i * 0.15}s` }}
                >
                  {i < starsEarned ? '⭐' : '☆'}
                </span>
              ))}
            </div>
            <div className="gp-lc-actions">
              {level < 100 ? (
                <button className="gp-lc-next" onClick={handleNextLevel}>
                  Level {level + 1} →
                </button>
              ) : (
                <button className="gp-lc-next" onClick={() => navigate('/games')}>
                  🏆 You beat all 100 levels!
                </button>
              )}
              <button className="gp-lc-retry" onClick={() => navigate('/games')}>Back to Arcade</button>
            </div>
          </motion.div>
        )}

        {phase === 'failed' && (
          <motion.div
            className="gp-failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="gp-failed-emoji">💔</div>
            <div className="gp-failed-title">Don't Give Up!</div>
            <div className="gp-failed-sub">You've got this — try again!</div>
            <div className="gp-lc-actions" style={{ marginTop: 16 }}>
              <button className="gp-lc-next" onClick={handleRetry}>Try Again 🔁</button>
              <button className="gp-lc-retry" onClick={() => navigate('/games')}>Back to Arcade</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
