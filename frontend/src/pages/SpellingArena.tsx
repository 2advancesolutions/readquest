import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { spellingApi, SpellingWordOut, AttemptResultOut } from '../services/api'
import { ALL_CHARACTERS } from '../components/CharacterGallery'
import SpellingCoach from '../components/SpellingCoach'
import SpellingBee from '../components/SpellingBee'
import FillBlanks from '../components/FillBlanks'
import WordScramble from '../components/WordScramble'
import { useTTS } from '../hooks/useTTS'
import { firstNameOnly, playSpellingWelcome } from '../lib/spellingWelcome'
import { playCorrectSound, playWrongSound, nextCheer, nextEncouragement } from '../lib/spellingAudio'
import { emitXpUpdate, getStoredXp } from '../components/XpBadge'
import '../styles/spelling.css'

type Phase = 'select' | 'game' | 'summary'
type GameMode = 'bee' | 'blanks' | 'scramble'
type CoachState = 'idle' | 'correct' | 'wrong' | 'mastery' | 'intro'

const ROUND_SIZE = 10
const MODES: GameMode[] = ['bee', 'blanks', 'scramble']

function randomMode(): GameMode {
  return MODES[Math.floor(Math.random() * MODES.length)]
}

interface RoundResult {
  word: string
  correct: boolean
  xpEarned: number
  mastered: boolean
}

export default function SpellingArena() {
  const navigate = useNavigate()

  // TTS hook — shared across all game modes
  const { speak, speaking, stop } = useTTS()

  // Auth
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState<string>('')
  const [studentGrade, setStudentGrade] = useState<number>(5)
  const welcomeFiredRef = useRef(false)

  // Phase
  const [phase, setPhase] = useState<Phase>('select')

  // Character select & word source mode
  const [search, setSearch] = useState('')
  const [selectedChar, setSelectedChar] = useState('')
  const [failedImgs, setFailedImgs] = useState<Set<string>>(new Set())
  const [wordSource, setWordSource] = useState<'my_words' | 'grade_words' | 'mixed'>('mixed')

  // Game state
  const [words, setWords] = useState<SpellingWordOut[]>([])
  const [wordModes, setWordModes] = useState<GameMode[]>([])
  const [sessionId, setSessionId] = useState('')
  const [wordIndex, setWordIndex] = useState(0)
  const [results, setResults] = useState<RoundResult[]>([])
  const [coachState, setCoachState] = useState<CoachState>('idle')
  const [coachMsg, setCoachMsg] = useState<string | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ correct: boolean; correct_answer: string; xp: number } | null>(null)
  const [attemptCount, setAttemptCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionXP, setSessionXP] = useState(0)

  // Resolve studentId + name from the keys the Dashboard writes
  useEffect(() => {
    const id    = localStorage.getItem('readquest_student_id')
    const name  = localStorage.getItem('readquest_student_name')
    const grade = parseInt(localStorage.getItem('readquest_student_grade') ?? '5', 10)
    if (id)   setStudentId(id)
    if (name) setStudentName(name)
    if (!isNaN(grade)) setStudentGrade(grade)

    // Fallback: if nothing in localStorage, pull from Supabase session
    if (!id) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id) {
          setStudentId(session.user.id)
          const meta = session.user.user_metadata
          const fullName = [meta?.first_name, meta?.last_name].filter(Boolean).join(' ')
          if (fullName) setStudentName(fullName)
        }
      })
    }
  }, [])

  // ── Welcome speech on first arrival ───────────────────────
  useEffect(() => {
    if (welcomeFiredRef.current || !studentId) return

    const firstName = firstNameOnly(studentName)
    const nameGreet = firstName ? `, ${firstName}` : ''

    // Try instant playback from Dashboard-preloaded cache first
    const hitCache = playSpellingWelcome(studentId, () => { /* onEnd — nothing needed */ })
    if (hitCache) {
      welcomeFiredRef.current = true
      return
    }

    // Cache miss — generate live (happens if user navigates directly to /spelling)
    const welcome =
      `Welcome to the Spelling Arena${nameGreet}! ` +
      `I'm so excited to practice spelling with you today! ` +
      `Here's how it works: you'll play three fun games. ` +
      `In Spelling Bee, you'll listen and type the word. ` +
      `In Fill in the Blanks, you'll complete the missing letters. ` +
      `And in Word Scramble, you'll tap the letters in the right order. ` +
      `For every word you get right, you earn XP and work toward mastering it! ` +
      `First, pick a character coach, choose your word source, and let's get spelling! ` +
      `You've totally got this${nameGreet}!`

    welcomeFiredRef.current = true
    speak(welcome, 'teacher')
  }, [studentId, studentName])  // fires once when id+name resolve

  // ── Auto-play word via TTS when word changes ───────────────────────────
  useEffect(() => {
    if (phase !== 'game' || !words[wordIndex]) return
    const currentWord = words[wordIndex]
    const mode = wordModes[wordIndex]
    const prompt =
      mode === 'bee'
        ? `Spell this word: ${currentWord.word}`
        : mode === 'blanks'
        ? `Fill in the missing letters. The word is: ${currentWord.word}`
        : `Unscramble the letters to spell: ${currentWord.word}`
    const timer = setTimeout(() => speak(prompt, 'word'), 400)
    return () => clearTimeout(timer)
  }, [wordIndex, phase])   // eslint-disable-line

  // ── Character select ────────────────────────────────────────────────────
  const filteredChars = ALL_CHARACTERS.filter(c =>
    !failedImgs.has(c.name) &&
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const startGame = useCallback(async () => {
    if (!studentId || !selectedChar) return
    setLoading(true)
    setError('')
    try {
      // Fetch words based on the selected source mode
      let pool: SpellingWordOut[] = []
      if (wordSource === 'my_words') {
        const res = await spellingApi.getWords(studentId, ROUND_SIZE)
        pool = res.data
      } else if (wordSource === 'grade_words') {
        const res = await spellingApi.getGradeWords(studentId, ROUND_SIZE)
        pool = res.data
      } else {
        // Mixed: half from each source
        const half = Math.ceil(ROUND_SIZE / 2)
        const [myRes, gradeRes] = await Promise.all([
          spellingApi.getWords(studentId, half),
          spellingApi.getGradeWords(studentId, half),
        ])
        // Dedup by word (lowercase)
        const seen = new Set<string>()
        const combined: SpellingWordOut[] = []
        for (const w of [...myRes.data, ...gradeRes.data]) {
          const key = w.word.toLowerCase()
          if (!seen.has(key)) { seen.add(key); combined.push(w) }
        }
        pool = combined.slice(0, ROUND_SIZE)
      }

      // If "my_words" had nothing but grade words can fill in
      if (pool.length === 0 && wordSource === 'my_words') {
        setError('No missed words yet — try "Grade Words" or "Mixed" mode!')
        setLoading(false)
        return
      }
      if (pool.length === 0) {
        setError('No spelling words found. Try again!')
        setLoading(false)
        return
      }

      const sessionRes = await spellingApi.createSession(studentId, selectedChar, pool.length)
      setWords(pool)
      setWordModes(pool.map(() => randomMode()))
      setSessionId(sessionRes.data.session_id)
      setWordIndex(0)
      setResults([])
      setFeedback(null)
      setAttemptCount(0)
      setCoachState('intro')
      setCoachMsg(undefined)
      setPhase('game')
    } catch (e) {
      setError('Could not load spelling words. Try again.')
    } finally {
      setLoading(false)
    }
  }, [studentId, selectedChar, wordSource])

  // ── Submit answer ───────────────────────────────────────────────────────
  const handleAnswer = useCallback(async (answer: string) => {
    if (submitting || !sessionId || !studentId) return
    const currentWord = words[wordIndex]
    const mode = wordModes[wordIndex]
    setSubmitting(true)
    try {
      const res = await spellingApi.submitAttempt(
        studentId, sessionId, currentWord.word, mode, answer, attemptCount + 1
      )
      const result: AttemptResultOut = res.data
      setFeedback({ correct: result.is_correct, correct_answer: result.correct_answer, xp: result.xp_awarded })

      if (result.is_correct) {
        // ── Instant celebratory sound + rotating TTS cheer
        playCorrectSound()
        const cheer = nextCheer(result.newly_mastered)
        speak(cheer, 'quiz')
        // Update running session XP + global badge
        const newTotal = getStoredXp() + result.xp_awarded
        setSessionXP(prev => prev + result.xp_awarded)
        emitXpUpdate(newTotal, result.xp_awarded)

        if (result.newly_mastered) {
          setCoachState('mastery')
          setCoachMsg(`You mastered "${currentWord.word}"! 🏆`)
        } else {
          setCoachState('correct')
          setCoachMsg(undefined)
        }
      } else {
        // ── Gentle wrong-answer sound + rotating TTS encouragement
        playWrongSound()
        const encouragement = nextEncouragement(result.correct_answer)
        speak(encouragement, 'teacher')
        setCoachState('wrong')
        setCoachMsg(undefined)
        setAttemptCount(prev => prev + 1)
      }

      if (result.is_correct) {
        setResults(prev => [...prev, {
          word: currentWord.word,
          correct: true,
          xpEarned: result.xp_awarded,
          mastered: result.mastered,
        }])
        // Advance after short delay
        setTimeout(() => {
          if (wordIndex + 1 >= words.length) {
            setPhase('summary')
          } else {
            setWordIndex(i => i + 1)
            setFeedback(null)
            setAttemptCount(0)
            setCoachState('idle')
            setCoachMsg(undefined)
          }
        }, 1600)
      } else if (attemptCount >= 1) {
        // After 2 wrong attempts, reveal and move on
        setResults(prev => [...prev, {
          word: currentWord.word,
          correct: false,
          xpEarned: 0,
          mastered: false,
        }])
        setTimeout(() => {
          if (wordIndex + 1 >= words.length) {
            setPhase('summary')
          } else {
            setWordIndex(i => i + 1)
            setFeedback(null)
            setAttemptCount(0)
            setCoachState('idle')
            setCoachMsg(undefined)
          }
        }, 2800)
      }
    } catch {
      setCoachState('wrong')
    } finally {
      setSubmitting(false)
    }
  }, [submitting, sessionId, studentId, words, wordIndex, wordModes, attemptCount])

  const handleReadAloud = useCallback(() => {
    if (!words[wordIndex]) return
    const currentWord = words[wordIndex]
    const mode = wordModes[wordIndex]
    const prompt =
      mode === 'bee'
        ? `Spell this word: ${currentWord.word}`
        : mode === 'blanks'
        ? `Fill in the missing letters. The word is: ${currentWord.word}`
        : `Unscramble the letters to spell: ${currentWord.word}`
    speak(prompt)
  }, [words, wordIndex, wordModes, speak])

  // ── Summary stats ───────────────────────────────────────────────────────
  const totalCorrect = results.filter(r => r.correct).length
  const totalXP = results.reduce((sum, r) => sum + r.xpEarned, 0)
  const masteredCount = results.filter(r => r.mastered).length
  const score = results.length > 0 ? Math.round((totalCorrect / results.length) * 100) : 0

  // ── JSX ─────────────────────────────────────────────────────────────────
  return (
    <div className="sp-root">
      {/* Back button */}
      <button className="sp-back-btn" onClick={() => navigate('/dashboard')}>
        ← Dashboard
      </button>

      <AnimatePresence mode="wait">

        {/* ── Phase 1: Character Select ── */}
        {phase === 'select' && (
          <motion.div
            key="select"
            className="sp-select-page"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="sp-select-hero">
              <h1 className="sp-title">Spelling Arena</h1>
              <p className="sp-subtitle">Pick your spelling coach to get started!</p>
            </div>

            <input
              className="sp-char-search"
              placeholder="🔍 Search characters…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <div className="sp-char-grid">
              {filteredChars.map(char => (
                <motion.button
                  key={char.name}
                  className={`sp-char-card ${selectedChar === char.name ? 'selected' : ''}`}
                  onClick={() => setSelectedChar(char.name)}
                  whileHover={{ scale: 1.06, y: -4 }}
                  whileTap={{ scale: 0.94 }}
                >
                  <div className="sp-char-img-wrap">
                    <img
                      src={char.img}
                      alt={char.name}
                      className="sp-char-img"
                      onError={() => setFailedImgs(prev => new Set(prev).add(char.name))}
                    />
                  </div>
                  <span className="sp-char-name">{char.name}</span>
                  {selectedChar === char.name && (
                    <motion.div
                      className="sp-char-check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >✓</motion.div>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Word source mode toggle */}
            <div className="sp-source-toggle">
              <span className="sp-source-label">Word Source:</span>
              <div className="sp-source-btns">
                <button
                  className={`sp-source-btn ${wordSource === 'my_words' ? 'active' : ''}`}
                  onClick={() => setWordSource('my_words')}
                >
                  📖 My Words
                </button>
                <button
                  className={`sp-source-btn ${wordSource === 'grade_words' ? 'active' : ''}`}
                  onClick={() => setWordSource('grade_words')}
                >
                  🎓 Grade Words
                </button>
                <button
                  className={`sp-source-btn ${wordSource === 'mixed' ? 'active' : ''}`}
                  onClick={() => setWordSource('mixed')}
                >
                  🔀 Mixed
                </button>
              </div>
              <p className="sp-source-hint">
                {wordSource === 'my_words' && 'Practice words from your reading mistakes & vocab bank'}
                {wordSource === 'grade_words' && 'Get spelling words matched to your grade level'}
                {wordSource === 'mixed' && 'A mix of reading words + grade-level words'}
              </p>
            </div>

            {error && <p className="sp-error">{error}</p>}


            <motion.button
              className="sp-start-btn"
              disabled={!selectedChar || loading}
              onClick={startGame}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              {loading ? 'Loading words…' : `Start Game with ${selectedChar || '…'}! 🚀`}
            </motion.button>
          </motion.div>
        )}

        {/* ── Phase 2: Game ── */}
        {phase === 'game' && words.length > 0 && (
          <motion.div
            key="game"
            className="sp-game-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Progress bar */}
            <div className="sp-progress-bar-wrap">
              <div className="sp-progress-info">
                <span className="sp-progress-label">Word {wordIndex + 1} / {words.length}</span>
                <div className="sp-progress-right">
                  <span className="sp-progress-score">⭐ {results.filter(r => r.correct).length} correct</span>
                  {sessionXP > 0 && (
                    <span className="sp-session-xp">⚡ +{sessionXP} XP this round</span>
                  )}
                </div>
              </div>
              <div className="sp-progress-track">
                <motion.div
                  className="sp-progress-fill"
                  animate={{ width: `${((wordIndex) / words.length) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            <div className="sp-game-layout">
              {/* Coach */}
              <div className="sp-coach-col">
                <SpellingCoach
                  characterName={selectedChar}
                  state={coachState}
                  message={coachMsg}
                />
              </div>

              {/* Feedback + Game Mode */}
              <div className="sp-mode-col">
                <AnimatePresence mode="wait">
                  {feedback && (
                    <motion.div
                      key="feedback"
                      className={`sp-feedback-banner ${feedback.correct ? 'correct' : 'wrong'}`}
                      initial={{ opacity: 0, y: -12, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94 }}
                    >
                      {feedback.correct ? (
                        <div className="sp-feedback-correct">
                          <span className="sp-feedback-emoji">✅</span>
                          <span className="sp-feedback-text">Correct!</span>
                          {feedback.xp > 0 && (
                            <span className="sp-feedback-xp">+{feedback.xp} XP</span>
                          )}
                        </div>
                      ) : (
                        <div className="sp-feedback-wrong">
                          <span className="sp-feedback-emoji">😊</span>
                          <span className="sp-feedback-text">Keep going — you've got this!</span>
                          <div className="sp-correct-word-reveal">
                            <span className="sp-correct-word-label">Correct spelling:</span>
                            <span className="sp-correct-word">{feedback.correct_answer}</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${wordIndex}-${wordModes[wordIndex]}`}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.3 }}
                  >
                    {wordModes[wordIndex] === 'bee' && (
                      <SpellingBee
                        word={words[wordIndex].word}
                        definition={words[wordIndex].definition}
                        exampleSentence={words[wordIndex].example_sentence}
                        onSubmit={handleAnswer}
                        disabled={submitting}
                        onReadAloud={handleReadAloud}
                        speaking={speaking}
                        grade={studentGrade}
                      />
                    )}
                    {wordModes[wordIndex] === 'blanks' && (
                      <FillBlanks
                        word={words[wordIndex].word}
                        exampleSentence={words[wordIndex].example_sentence}
                        onSubmit={handleAnswer}
                        disabled={submitting}
                        onReadAloud={handleReadAloud}
                        speaking={speaking}
                        grade={studentGrade}
                      />
                    )}
                    {wordModes[wordIndex] === 'scramble' && (
                      <WordScramble
                        word={words[wordIndex].word}
                        onSubmit={handleAnswer}
                        disabled={submitting}
                        onReadAloud={handleReadAloud}
                        speaking={speaking}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Phase 3: Summary ── */}
        {phase === 'summary' && (
          <motion.div
            key="summary"
            className="sp-summary-page"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="sp-summary-coach">
              <SpellingCoach
                characterName={selectedChar}
                state={score >= 70 ? 'mastery' : 'idle'}
                message={score >= 70 ? "You're amazing! 🏆" : 'Great practice! Keep going! 💪'}
              />
            </div>

            <div className="sp-summary-card">
              <h2 className="sp-summary-title">Round Complete!</h2>
              <div className="sp-summary-stats">
                <div className="sp-stat-pill">
                  <span className="sp-stat-num">{totalCorrect}/{results.length}</span>
                  <span className="sp-stat-label">Correct</span>
                </div>
                <div className="sp-stat-pill highlight">
                  <span className="sp-stat-num">+{totalXP}</span>
                  <span className="sp-stat-label">XP Earned</span>
                </div>
                <div className="sp-stat-pill">
                  <span className="sp-stat-num">{masteredCount}</span>
                  <span className="sp-stat-label">Mastered</span>
                </div>
              </div>

              {/* Word results list */}
              <div className="sp-results-list">
                {results.map((r, i) => (
                  <div key={i} className={`sp-result-row ${r.correct ? 'correct' : 'wrong'}`}>
                    <span className="sp-result-icon">{r.correct ? '✅' : '❌'}</span>
                    <span className="sp-result-word">{r.word}</span>
                    {r.mastered && <span className="sp-mastery-badge">⭐ Mastered</span>}
                    {r.xpEarned > 0 && <span className="sp-result-xp">+{r.xpEarned} XP</span>}
                  </div>
                ))}
              </div>

              <div className="sp-summary-actions">
                <motion.button
                  className="sp-start-btn"
                  onClick={() => { setPhase('select'); setSelectedChar(''); }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  🔁 Play Again
                </motion.button>
                <motion.button
                  className="sp-secondary-btn sp-back-home"
                  onClick={() => navigate('/dashboard')}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  🏠 Back to Dashboard
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
