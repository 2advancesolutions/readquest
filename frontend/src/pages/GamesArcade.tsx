import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { loadGameLevel } from '../games/wordBanks'
import { sfx, playUiNavigate, isSfxMuted, toggleSfxMute } from '../lib/gameAudio'
import { gameProgressApi } from '../services/api'
import '../styles/games.css'

const GRADE_LABELS = ['Kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']

interface GameDef {
  id: string
  emoji: string
  title: string
  desc: string
  grades: string
  minGrade: number
  color1: string
  color2: string
  shadowColor: string
}

const GAMES: GameDef[] = [
  {
    id: 'rhyme',
    emoji: '🎵',
    title: 'Rhyme Time',
    desc: 'Match the rhyming word — fast and fun!',
    grades: 'Grades K–3',
    minGrade: 0,
    color1: '#FF6B9D',
    color2: '#C850C0',
    shadowColor: 'rgba(255,107,157,0.35)',
  },
  {
    id: 'sentence',
    emoji: '🏗️',
    title: 'Sentence Builder',
    desc: 'Tap word tiles to build perfect sentences',
    grades: 'Grades K–5',
    minGrade: 0,
    color1: '#4FACFE',
    color2: '#00F2FE',
    shadowColor: 'rgba(79,172,254,0.35)',
  },
  {
    id: 'phonics',
    emoji: '🔊',
    title: 'Phonics Power',
    desc: 'Hear a sound — tap the matching letters!',
    grades: 'Grades K–2',
    minGrade: 0,
    color1: '#FA709A',
    color2: '#FEE140',
    shadowColor: 'rgba(250,112,154,0.35)',
  },
  {
    id: 'vocab',
    emoji: '🔐',
    title: 'Vocabulary Vault',
    desc: 'Match words to definitions to unlock the vault',
    grades: 'Grades 1–8',
    minGrade: 1,
    color1: '#43E97B',
    color2: '#38F9D7',
    shadowColor: 'rgba(67,233,123,0.35)',
  },
  {
    id: 'synonym',
    emoji: '⚔️',
    title: 'Synonym Showdown',
    desc: 'Beat the clock — find synonyms & antonyms!',
    grades: 'Grades 2–8',
    minGrade: 2,
    color1: '#F093FB',
    color2: '#F5576C',
    shadowColor: 'rgba(240,147,251,0.35)',
  },
  {
    id: 'grammar',
    emoji: '🪐',
    title: 'Grammar Galaxy',
    desc: 'Fix sentences to save the galaxy!',
    grades: 'Grades 2–8',
    minGrade: 2,
    color1: '#A18CD1',
    color2: '#FBC2EB',
    shadowColor: 'rgba(161,140,209,0.35)',
  },
  {
    id: 'speed',
    emoji: '⚡',
    title: 'Speed Reader',
    desc: 'Read fast, answer faster — test your memory!',
    grades: 'Grades 3–8',
    minGrade: 3,
    color1: '#FF9A9E',
    color2: '#FECFEF',
    shadowColor: 'rgba(255,154,158,0.35)',
  },
  {
    id: 'context',
    emoji: '🔍',
    title: 'Context Clues',
    desc: 'Crack the mystery word from sentence clues',
    grades: 'Grades 3–8',
    minGrade: 3,
    color1: '#667EEA',
    color2: '#764BA2',
    shadowColor: 'rgba(102,126,234,0.35)',
  },
]

export default function GamesArcade() {
  const navigate = useNavigate()
  const grade = parseInt(localStorage.getItem('readquest_student_grade') || '1', 10)
  const [selectedGrade, setSelectedGrade] = useState(grade)
  const [muted, setMuted] = useState(isSfxMuted())

  // Sync localStorage game levels to backend on load
  useEffect(() => {
    const studentId = localStorage.getItem('readquest_student_id')
    if (!studentId) return
    // Sync all games for current grade
    GAMES.forEach(game => {
      const lvl = loadGameLevel(game.id, selectedGrade)
      const starsKey = `rq_game_${game.id}_g${selectedGrade}_stars`
      const starsData = JSON.parse(localStorage.getItem(starsKey) || '{}')
      const totalStarsVal = Object.values(starsData).reduce((a: number, b) => a + (b as number), 0)
      if (lvl > 1 || totalStarsVal > 0) {
        gameProgressApi.upsert(studentId, game.id, selectedGrade, lvl, totalStarsVal).catch(() => {})
      }
    })
  }, [selectedGrade])

  const handleGameClick = (game: GameDef) => {
    if (game.minGrade > selectedGrade) return
    sfx(playUiNavigate)
    navigate(`/games/${game.id}`)
  }

  const handleToggleMute = () => {
    const next = toggleSfxMute()
    setMuted(next)
  }

  // Stars per game from localStorage
  const totalStars = (gameId: string) => {
    const key = `rq_game_${gameId}_g${selectedGrade}_stars`
    const all = JSON.parse(localStorage.getItem(key) || '{}')
    return Object.values(all).reduce((a: number, b) => a + (b as number), 0)
  }

  return (
    <div className="ga-root">
      {/* Starfield */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="ga-star"
          style={{
            left: `${(i * 17 + 5) % 97}%`,
            top: `${(i * 23 + 3) % 93}%`,
            width: `${(i % 3) + 1}px`,
            height: `${(i % 3) + 1}px`,
            animationDelay: `${(i * 0.41) % 3}s`,
          }}
        />
      ))}

      {/* Nebula blobs */}
      <div className="ga-nebula" style={{ width: 600, height: 600, left: '-10%', top: '-10%', background: 'rgba(112,42,225,0.07)' }} />
      <div className="ga-nebula" style={{ width: 500, height: 500, right: '-8%', bottom: '5%', background: 'rgba(236,72,153,0.06)', animationDelay: '8s' }} />

      {/* Header */}
      <div className="ga-header">
        <button className="ga-back-btn" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
        <div className="ga-title-wrap">
          <h1 className="ga-title">🎮 Games Arcade</h1>
          <p className="ga-subtitle">Play, learn, and earn XP — Levels 1 to 100!</p>
        </div>
        <button className="ga-sfx-btn" onClick={handleToggleMute} title={muted ? 'Unmute sounds' : 'Mute sounds'}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Grade filter */}
      <div className="ga-grade-filter">
        <span className="ga-grade-label">Grade:</span>
        {GRADE_LABELS.map((label, i) => (
          <button
            key={i}
            className={`ga-grade-pill ${selectedGrade === i ? 'active' : ''}`}
            onClick={() => { setSelectedGrade(i); sfx(playUiNavigate) }}
          >
            {i === 0 ? 'K' : label}
          </button>
        ))}
      </div>

      {/* Games grid */}
      <div className="ga-grid">
        {GAMES.map((game, i) => {
          const isLocked = game.minGrade > selectedGrade
          const lvl = loadGameLevel(game.id, selectedGrade)
          const pct = ((lvl - 1) / 100) * 100
          const stars = totalStars(game.id)

          return (
            <motion.div
              key={game.id}
              className={`ga-card ${isLocked ? 'locked' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              onClick={() => handleGameClick(game)}
              whileHover={!isLocked ? { y: -8, boxShadow: `0 20px 50px ${game.shadowColor}` } : {}}
              whileTap={!isLocked ? { scale: 0.97 } : {}}
              style={{
                '--game-color1': game.color1,
                '--game-color2': game.color2,
                borderColor: `${game.color1}22`,
              } as React.CSSProperties}
            >
              {/* Emoji */}
              <span className="ga-card-emoji">{game.emoji}</span>

              {/* Title & grades */}
              <div>
                <p className="ga-card-title"
                   style={{
                     background: `linear-gradient(135deg, ${game.color1}, ${game.color2})`,
                     WebkitBackgroundClip: 'text',
                     WebkitTextFillColor: 'transparent',
                     backgroundClip: 'text',
                   }}
                >
                  {game.title}
                </p>
                <span className="ga-card-grade-badge" style={{ background: `${game.color1}22`, color: game.color1 }}>
                  {game.grades}
                </span>
              </div>

              <p className="ga-card-desc">{game.desc}</p>

              {/* Stars earned */}
              {stars > 0 && (
                <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>
                  {'⭐'.repeat(Math.min(stars, 5))}
                </div>
              )}

              {/* Level progress */}
              <div className="ga-card-level">
                <span className="ga-card-level-text">Lvl {lvl}/100</span>
                <div className="ga-card-progress-track">
                  <div className="ga-card-progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Lock overlay */}
              {isLocked && (
                <div className="ga-lock-overlay">
                  <div className="ga-lock-icon">🔒</div>
                  <div className="ga-lock-text">
                    Unlocks at<br/>
                    {GRADE_LABELS[game.minGrade]} grade
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
