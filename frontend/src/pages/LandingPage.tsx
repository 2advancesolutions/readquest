import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { studentsApi } from '../services/api'
import '../styles/landing.css'

const GRADE_DATA = [
  { label: 'K', full: 'Kindergarten', emoji: '🌱', color: '#4ADE80' },
  { label: '1st', full: '1st Grade',  emoji: '⭐', color: '#FBBF24' },
  { label: '2nd', full: '2nd Grade',  emoji: '🦋', color: '#F87171' },
  { label: '3rd', full: '3rd Grade',  emoji: '🚀', color: '#38BDF8' },
  { label: '4th', full: '4th Grade',  emoji: '🦁', color: '#A78BFA' },
  { label: '5th', full: '5th Grade',  emoji: '🐉', color: '#2DD4BF' },
  { label: '6th', full: '6th Grade',  emoji: '🔮', color: '#F59E0B' },
  { label: '7th', full: '7th Grade',  emoji: '🏆', color: '#EC4899' },
  { label: '8th', full: '8th Grade',  emoji: '🌟', color: '#7C3AED' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'welcome' | 'name' | 'grade'>('welcome')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // If student already exists, go to dashboard
  useEffect(() => {
    const stored = localStorage.getItem('readquest_student_id')
    if (stored) navigate('/dashboard')
  }, [navigate])

  const handleNameNext = () => {
    if (name.trim().length < 2) {
      setNameError('Please enter at least 2 characters 😊')
      return
    }
    setNameError('')
    setStep('grade')
  }

  const handleGradeSelect = async (gradeIndex: number) => {
    setSelectedGrade(gradeIndex)
    setLoading(true)
    try {
      const res = await studentsApi.create(name.trim(), gradeIndex)
      localStorage.setItem('readquest_student_id', res.data.id)
      localStorage.setItem('readquest_student_name', name.trim())
      localStorage.setItem('readquest_grade', String(gradeIndex))
      setTimeout(() => navigate('/dashboard'), 800)
    } catch {
      // For demo without backend — use mock data
      localStorage.setItem('readquest_student_id', 'demo-student-1')
      localStorage.setItem('readquest_student_name', name.trim())
      localStorage.setItem('readquest_grade', String(gradeIndex))
      setTimeout(() => navigate('/dashboard'), 800)
    }
  }

  return (
    <div className="landing-root">
      {/* Animated background blobs */}
      <div className="landing-blob blob-1" />
      <div className="landing-blob blob-2" />
      <div className="landing-blob blob-3" />

      {/* Floating decorations */}
      <div className="floating-decor">
        {['📚','⭐','✏️','🎨','🌈','🎯','💡','🦋'].map((em, i) => (
          <span key={i} className="deco-item" style={{ '--delay': `${i * 0.4}s`, '--x': `${10 + i * 11}%`, '--y': `${8 + (i % 3) * 25}%` } as React.CSSProperties}>{em}</span>
        ))}
      </div>

      <div className="landing-center">
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div key="welcome" className="landing-card" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
              <div className="landing-mascot animate-float">🦉</div>
              <h1 className="landing-title">ReadQuest</h1>
              <p className="landing-subtitle">Your magical reading adventure awaits! ✨</p>
              <p className="landing-desc">AI-powered stories, epic quests, and awesome rewards — crafted just for you!</p>
              <motion.button className="landing-btn" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={() => setStep('name')}>
                🚀 Start My Adventure!
              </motion.button>
            </motion.div>
          )}

          {step === 'name' && (
            <motion.div key="name" className="landing-card" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
              <div className="landing-mascot animate-float" style={{ fontSize: '4rem' }}>🦉</div>
              <h2 className="landing-subtitle" style={{ fontSize: '1.8rem', marginBottom: 8 }}>Hi there, friend! 👋</h2>
              <p className="landing-desc">What's your name?</p>
              <input
                className={`landing-input ${nameError ? 'error' : ''}`}
                type="text"
                placeholder="My name is..."
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameNext()}
                autoFocus
                maxLength={30}
              />
              {nameError && <p className="landing-error">{nameError}</p>}
              <div className="landing-btn-row">
                <button className="landing-btn-ghost" onClick={() => setStep('welcome')}>← Back</button>
                <motion.button className="landing-btn" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={handleNameNext}>
                  Next →
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 'grade' && (
            <motion.div key="grade" className="landing-card grade-card" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
              <h2 className="landing-subtitle" style={{ fontSize: '1.6rem' }}>
                Welcome, <span style={{ color: 'var(--rq-purple)' }}>{name}!</span> 🎉
              </h2>
              <p className="landing-desc">What grade are you in?</p>
              <div className="grade-grid">
                {GRADE_DATA.map((g, i) => (
                  <motion.button
                    key={i}
                    className={`grade-btn ${selectedGrade === i ? 'selected' : ''}`}
                    style={{ '--grade-color': g.color } as React.CSSProperties}
                    whileHover={{ scale: 1.08, y: -4 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleGradeSelect(i)}
                    disabled={loading}
                  >
                    <span className="grade-emoji">{g.emoji}</span>
                    <span className="grade-label">{g.label}</span>
                  </motion.button>
                ))}
              </div>
              {loading && (
                <motion.div className="loading-msg" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <span className="spinner" /> Getting your adventure ready...
                </motion.div>
              )}
              <button className="landing-btn-ghost" style={{ marginTop: 12 }} onClick={() => setStep('name')}>← Back</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
