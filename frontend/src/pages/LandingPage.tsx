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
    if (stored) navigate('/signup')
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
      setTimeout(() => navigate('/signup'), 800)
    } catch {
      // For demo without backend — use mock data
      localStorage.setItem('readquest_student_id', 'demo-student-1')
      localStorage.setItem('readquest_student_name', name.trim())
      localStorage.setItem('readquest_grade', String(gradeIndex))
      setTimeout(() => navigate('/signup'), 800)
    }
  }

  return (
    <div className="landing-root">
      <div className="landing-bg-pattern" />

      <div className="landing-nav">
        <div className="landing-logo">ReadQuest</div>
      </div>

      <div className="landing-center">
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div key="welcome" className="landing-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
              <div className="landing-icon-wrap">
                <svg className="landing-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="landing-title">Empower Your Reading Journey</h1>
              <p className="landing-subtitle">AI-driven reading platform designed for growth.</p>
              <p className="landing-desc">Personalized stories, measurable progress, and interactive comprehension tools built for modern education.</p>
              <motion.button className="landing-btn" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep('name')}>
                Get Started
              </motion.button>
            </motion.div>
          )}

          {step === 'name' && (
            <motion.div key="name" className="landing-card" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
              <h2 className="landing-subtitle" style={{ marginBottom: 8, color: 'var(--rq-text)' }}>Create Your Profile</h2>
              <p className="landing-desc">Enter your name to personalize your workspace.</p>

              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input
                  className={`landing-input ${nameError ? 'error' : ''}`}
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNameNext()}
                  autoFocus
                  maxLength={30}
                />
                {nameError && <p className="landing-error">{nameError}</p>}
              </div>

              <div className="landing-btn-row">
                <button className="landing-btn-ghost" onClick={() => setStep('welcome')}>Back</button>
                <motion.button className="landing-btn" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleNameNext}>
                  Continue
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 'grade' && (
            <motion.div key="grade" className="landing-card grade-card" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
              <h2 className="landing-subtitle" style={{ marginBottom: 8, color: 'var(--rq-text)' }}>
                Welcome, {name}
              </h2>
              <p className="landing-desc">Select your current grade level to calibrate your reading material.</p>
              <div className="grade-grid">
                {GRADE_DATA.map((g, i) => (
                  <motion.button
                    key={i}
                    className={`grade-btn ${selectedGrade === i ? 'selected' : ''}`}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleGradeSelect(i)}
                    disabled={loading}
                  >
                    <span className="grade-label">{g.label}</span>
                    <span className="grade-full">{g.full}</span>
                  </motion.button>
                ))}
              </div>
              {loading && (
                <motion.div className="loading-msg" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <span className="spinner" /> Provisioning workspace...
                </motion.div>
              )}
              <div className="landing-btn-row" style={{ marginTop: 24, justifyContent: 'flex-start' }}>
                <button className="landing-btn-ghost" onClick={() => setStep('name')}>Back</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
