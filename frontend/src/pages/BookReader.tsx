import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { storiesApi, progressApi } from '../services/api'
import type { Story, QuizQuestion, PageScore, ReadingSession, ComprehensionAnswer } from '../types'
import { MOCK_STORY } from './mockStory'  // keep for dev reference but not used as fallback
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSoundEffects } from '../hooks/useSoundEffects'
import '../styles/reader.css'

function normalize(w: string) {
  return w.replace(/[^a-zA-Z']/g, '').toLowerCase()
}

// Levenshtein distance for fuzzy speech matching
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

// Allow 1 char off for words ≤5 letters, 2 chars off for longer
function isClose(said: string, target: string): boolean {
  if (said === target) return true
  const threshold = target.length <= 5 ? 1 : 2
  return levenshtein(said, target) <= threshold
}

function comprehensionScore(answer: string, storyText: string): number {
  const keywords = storyText.toLowerCase().split(/\W+/).filter(w => w.length > 4)
  const answerWords = new Set(answer.toLowerCase().split(/\W+/))
  const matches = keywords.filter(k => answerWords.has(k))
  return Math.min(100, Math.round((matches.length / Math.max(keywords.length * 0.15, 1)) * 100))
}

const COMPREHENSION_QUESTIONS = [
  'Who was the main character in the story?',
  'What problem did they face?',
  'How did the story end?',
  'What lesson did you learn?',
]

type WordStatus = 'idle' | 'correct' | 'wrong' | 'current'
type ReaderPhase = 'reading' | 'quiz' | 'comprehension'

export default function BookReader() {
  const { storyId } = useParams()
  const navigate = useNavigate()

  const [story, setStory] = useState<Story | null>(null)
  const [storyLoading, setStoryLoading] = useState(true)
  const [storyError, setStoryError] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [direction, setDirection] = useState(1)
  const [phase, setPhase] = useState<ReaderPhase>('reading')
  const [quizQ, setQuizQ] = useState<QuizQuestion | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null)

  // Word tracking
  const [wordStatuses, setWordStatuses] = useState<WordStatus[]>([])
  const [pageScores, setPageScores] = useState<PageScore[]>([])

  const [xpToast, setXpToast] = useState<{ amount: number; id: number } | null>(null)
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([])

  // Comprehension
  const [comprehensionAnswers, setComprehensionAnswers] = useState<ComprehensionAnswer[]>(
    COMPREHENSION_QUESTIONS.map(q => ({ question: q, answer: '' }))
  )
  const [comprehensionSubmitted, setComprehensionSubmitted] = useState(false)
  const [summaryText, setSummaryText] = useState('')
  const [compScore, setCompScore] = useState(0)
  const [session, setSession] = useState<ReadingSession | null>(null)

  const tts = useSpeechSynthesis()
  const mic = useSpeechRecognition()
  const sfx = useSoundEffects()

  const prevTranscriptRef = useRef('')
  const pageWordsRef = useRef<string[]>([])
  const readingWordIdxRef = useRef(0)  // which page word we're matching next
  const spokenWordIdxRef = useRef(0)   // which spoken word we've processed up to

  // ── Load story ────────────────────────────────────────────────────────────
  useEffect(() => {
    setStoryLoading(true)
    storiesApi.get(storyId!)
      .then(r => { setStory(r.data); setStoryLoading(false) })
      .catch(() => {
        setStoryError('Could not load story. Please go back and try again.')
        setStoryLoading(false)
      })
  }, [storyId])

  // ── Setup page ────────────────────────────────────────────────────────────
  const page = story?.pages[currentPage]
  const progress = story ? ((currentPage + 1) / story.pages.length) * 100 : 0

  useEffect(() => {
    if (!page) return
    const words = page.content.split(/\s+/).filter(Boolean)
    pageWordsRef.current = words
    readingWordIdxRef.current = 0
    spokenWordIdxRef.current = 0
    setWordStatuses(words.map(() => 'idle'))
    setPhase('reading')
    prevTranscriptRef.current = ''
    tts.stop()
    mic.stopListening()
  }, [currentPage, story])  // eslint-disable-line

  // ── Voice recognition → word matching ─────────────────────────────────────
  useEffect(() => {
    if (phase !== 'reading' || !mic.isListening) return
    const transcript = mic.transcript
    if (!transcript) return

    const words = pageWordsRef.current
    const spoken = transcript.toLowerCase().split(/\s+/).filter(Boolean)

    // Only process words we haven't matched yet
    const startFrom = spokenWordIdxRef.current
    for (let i = startFrom; i < spoken.length; i++) {
      const wordIdx = readingWordIdxRef.current
      if (wordIdx >= words.length) break

      const target = normalize(words[wordIdx])
      const said = normalize(spoken[i])

      if (isClose(said, target)) {
        // ✅ Correct (exact or close enough) — green + sparkle
        const capturedIdx = wordIdx
        setWordStatuses(prev => {
          const next = [...prev]
          next[capturedIdx] = 'correct'
          return next
        })
        sfx.playPop()
        readingWordIdxRef.current++
        spokenWordIdxRef.current = i + 1

        const el = document.getElementById(`word-${capturedIdx}`)
        if (el) {
          const rect = el.getBoundingClientRect()
          const id = Date.now() + Math.random()
          setSparkles(s => [...s, { id, x: rect.x + rect.width / 2, y: rect.y }])
          setTimeout(() => setSparkles(s => s.filter(sp => sp.id !== id)), 1200)
        }
      } else {
        // ❌ Wrong — mark red silently, keep going
        const capturedIdx = wordIdx
        setWordStatuses(prev => {
          const next = [...prev]
          next[capturedIdx] = 'wrong'
          return next
        })
        readingWordIdxRef.current++
        spokenWordIdxRef.current = i + 1
      }
    }
  }, [mic.transcript, phase, mic.isListening, sfx])

  // ── XP toast ─────────────────────────────────────────────────────────────
  const showXPToast = (amount: number) => {
    setXpToast({ amount, id: Date.now() })
    setTimeout(() => setXpToast(null), 2000)
  }

  // ── Next page ─────────────────────────────────────────────────────────────
  const handleNextPage = useCallback(() => {
    if (!story || !page) return
    sfx.playPageTurn()
    tts.stop()
    mic.stopListening()

    const words = pageWordsRef.current
    const correct = wordStatuses.filter(s => s === 'correct').length
    const score: PageScore = {
      pageNumber: currentPage + 1,
      correctWords: correct,
      totalWords: words.length,
      incorrectWords: words
        .map((w, i) => ({ word: w, correct: wordStatuses[i] === 'correct', attempts: 1 }))
        .filter(w => !w.correct),
    }
    const newScores = [...pageScores, score]
    setPageScores(newScores)
    progressApi.markPageRead(story.id, page.page_number).catch(() => {})
    showXPToast(5 + Math.round((correct / Math.max(words.length, 1)) * 10))

    // Quiz check
    const q = story.quiz_questions.find(q => q.story_page_id === page.id) ?? null
    if (q && !selectedAnswer) {
      setQuizQ(q)
      setPhase('quiz')
      setSelectedAnswer(null)
      setAnswerResult(null)
      return
    }
    advancePage(newScores)
  }, [story, page, wordStatuses, pageScores, currentPage, selectedAnswer, sfx, tts, mic])

  const advancePage = useCallback((newScores: PageScore[]) => {
    if (!story) return
    if (currentPage >= story.pages.length - 1) {
      const totalCorrect = newScores.reduce((a, s) => a + s.correctWords, 0)
      const totalWords = newScores.reduce((a, s) => a + s.totalWords, 0)
      const sess: ReadingSession = {
        scores: newScores,
        totalCorrect,
        totalWords,
        accuracyPct: totalWords > 0 ? Math.round((totalCorrect / totalWords) * 100) : 100,
      }
      setSession(sess)
      setPhase('comprehension')
      progressApi.markBookComplete(story.id).catch(() => {})
      showXPToast(50)
    } else {
      setDirection(1)
      setCurrentPage(p => p + 1)
      setSelectedAnswer(null)
      setAnswerResult(null)
    }
  }, [story, currentPage])

  const handlePrevPage = () => {
    if (currentPage > 0) {
      sfx.playPageTurn()
      tts.stop()
      mic.stopListening()
      setDirection(-1)
      setCurrentPage(p => p - 1)
      setSelectedAnswer(null)
      setAnswerResult(null)
    }
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────
  const handleAnswerSelect = (choice: string) => {
    if (selectedAnswer) return
    sfx.playClick()
    setSelectedAnswer(choice)
    const correct = choice === quizQ?.correct_answer
    setAnswerResult(correct ? 'correct' : 'wrong')
    if (correct) { sfx.playCorrect(); showXPToast(10) }
    else { sfx.playError(); showXPToast(3) }
    tts.speak(correct
      ? 'Great job! That is correct! ' + (quizQ?.explanation ?? '')
      : 'Good try! The answer is ' + quizQ?.correct_answer + '. ' + (quizQ?.explanation ?? ''))
  }

  const handleQuizContinue = () => {
    sfx.playClick()
    setPhase('reading')
    advancePage(pageScores)
  }

  // ── Read paragraph (on-demand TTS) ────────────────────────────────────────
  const handleReadParagraph = () => {
    sfx.playClick()
    if (tts.isSpeaking) { tts.stop(); return }
    mic.stopListening()
    if (page) tts.speak(page.content)
  }

  // ── Mic toggle ────────────────────────────────────────────────────────────
  const toggleMic = () => {
    sfx.playClick()
    if (mic.isListening) {
      mic.stopListening()
    } else {
      tts.stop()
      mic.resetTranscript()
      spokenWordIdxRef.current = 0  // reset spoken word cursor
      mic.startListening()
    }
  }

  // ── Comprehension submit ──────────────────────────────────────────────────
  const handleComprehensionSubmit = () => {
    sfx.playSuccess()
    const allText = story?.pages.map(p => p.content).join(' ') ?? ''
    const score = comprehensionScore(summaryText + ' ' + comprehensionAnswers.map(a => a.answer).join(' '), allText)
    setCompScore(score)
    setComprehensionSubmitted(true)
    showXPToast(50 + Math.round(score * 0.5))
    tts.speak('Wonderful! You did an amazing job reading and understanding this story!')
  }

  const getStars = (pct: number) => {
    if (pct >= 90) return 5; if (pct >= 75) return 4
    if (pct >= 60) return 3; if (pct >= 40) return 2; return 1
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (storyLoading) return (
    <div className="reader-loading">
      <div className="reader-loading-owl">🦉</div>
      <div className="reader-loading-dots">
        {[0,1,2].map(i => <motion.div key={i} className="loading-dot" animate={{ y: [0,-12,0] }} transition={{ repeat: Infinity, duration: 0.6, delay: i*0.15 }} />)}
      </div>
      <p>Opening your story... 📚</p>
    </div>
  )

  if (storyError || !story) return (
    <div className="reader-loading">
      <div style={{ fontSize: '3rem' }}>😔</div>
      <p style={{ color: '#EF4444', fontWeight: 700, marginBottom: 8 }}>{storyError || 'Story not found.'}</p>
      <button className="ghost-btn" onClick={() => navigate('/generate')}
        style={{ marginTop: 8 }}>← Create a New Story</button>
    </div>
  )

  // ── Comprehension Screen ──────────────────────────────────────────────────
  if (phase === 'comprehension') {
    const stars = getStars(session?.accuracyPct ?? 100)
    return (
      <div className="reader-root">
        <div className="reader-progress-bar">
          <motion.div className="reader-progress-fill" animate={{ width: '100%' }} transition={{ duration: 0.5 }} />
        </div>
        <div className="comprehension-root">
          <motion.div className="comprehension-card" initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}>
            {!comprehensionSubmitted ? (
              <>
                <div className="comp-header">
                  <span className="comp-trophy">🎉</span>
                  <h2>You finished the story!</h2>
                  <p className="comp-sub">Now let's see how much you remember! ✨</p>
                </div>

                {/* Reading score */}
                {session && (
                  <div className="comp-score-row">
                    <div className="comp-score-item">
                      <span className="comp-score-num">{session.accuracyPct}%</span>
                      <span className="comp-score-label">Reading Accuracy</span>
                    </div>
                    <div className="star-rating">
                      {[1,2,3,4,5].map(i => (
                        <motion.span key={i} className={`star ${i<=stars?'lit':''}`}
                          initial={{scale:0}} animate={{scale:1}} transition={{delay:0.1*i,type:'spring',stiffness:300}}>★</motion.span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Word accuracy breakdown */}
                {session && session.scores.some(s => s.incorrectWords.length > 0) && (
                  <div className="comp-section">
                    <label className="comp-label">📊 Words to practice:</label>
                    <div className="word-review-row">
                      {session.scores.flatMap(s => s.incorrectWords).slice(0,12).map((w, i) => (
                        <span key={i} className="word-review-chip wrong">{w.word}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary writing */}
                <div className="comp-section">
                  <label className="comp-label">📝 Tell us what the story was about:</label>
                  <textarea className="comp-textarea" placeholder="Write a few sentences about what happened..."
                    value={summaryText} onChange={e => setSummaryText(e.target.value)} rows={4} />
                  <span className="comp-word-count">{summaryText.trim().split(/\s+/).filter(Boolean).length} words</span>
                </div>

                {/* Q&A */}
                <div className="comp-section">
                  <label className="comp-label">🤔 Answer these questions:</label>
                  {comprehensionAnswers.map((qa, i) => (
                    <div key={i} className="comp-qa">
                      <p className="comp-question">{qa.question}</p>
                      <textarea className="comp-textarea small" placeholder="Write your answer here..."
                        value={qa.answer} onChange={e => {
                          const next = [...comprehensionAnswers]
                          next[i] = { ...next[i], answer: e.target.value }
                          setComprehensionAnswers(next)
                        }} rows={2} />
                    </div>
                  ))}
                </div>

                <motion.button className="comp-submit-btn" whileHover={{scale:1.03}} whileTap={{scale:0.97}}
                  onClick={handleComprehensionSubmit}
                  disabled={summaryText.trim().split(/\s+/).filter(Boolean).length < 5}>
                  🚀 Submit My Answers!
                </motion.button>
              </>
            ) : (
              <>
                <div className="comp-header">
                  <span className="comp-trophy">🏆</span>
                  <h2>Amazing Work!</h2>
                  <p className="comp-sub">Here's how you did today:</p>
                </div>
                <div className="comp-results">
                  <div className="result-card">
                    <span className="result-icon">📖</span>
                    <span className="result-val">{session?.accuracyPct ?? 100}%</span>
                    <span className="result-label">Reading Accuracy</span>
                  </div>
                  <div className="result-card">
                    <span className="result-icon">🧠</span>
                    <span className="result-val">{compScore}%</span>
                    <span className="result-label">Comprehension</span>
                  </div>
                  <div className="result-card">
                    <span className="result-icon">⭐</span>
                    <span className="result-val">{50 + Math.round(compScore*0.5) + (session?.accuracyPct ?? 0)}</span>
                    <span className="result-label">Total XP</span>
                  </div>
                </div>
                <div className="star-rating large" style={{justifyContent:'center',margin:'8px 0'}}>
                  {[1,2,3,4,5].map(i => (
                    <motion.span key={i} className={`star ${i<=getStars(((session?.accuracyPct??100)+compScore)/2)?'lit':''}`}
                      initial={{scale:0,rotate:-30}} animate={{scale:1,rotate:0}}
                      transition={{delay:0.15*i,type:'spring',stiffness:250}}>★</motion.span>
                  ))}
                </div>
                <div className="finished-actions">
                  <motion.button className="hero-btn" whileHover={{scale:1.05}} onClick={()=>navigate('/generate')}>✨ Read Another Story</motion.button>
                  <motion.button className="ghost-btn" whileHover={{scale:1.05}} onClick={()=>navigate('/dashboard')}>🏠 Dashboard</motion.button>
                </div>
              </>
            )}
          </motion.div>
        </div>
        <AnimatePresence>
          {xpToast && <motion.div key={xpToast.id} className="xp-toast" initial={{opacity:1,y:0,x:'-50%'}} animate={{opacity:0,y:-60}} transition={{duration:1.8}}>⭐ +{xpToast.amount} XP!</motion.div>}
        </AnimatePresence>
      </div>
    )
  }

  // ── Main Reading UI ───────────────────────────────────────────────────────
  return (
    <div className="reader-root">
      {/* Sparkles */}
      <AnimatePresence>
        {sparkles.map(sp=>(
          <motion.div key={sp.id} className="sparkle" style={{left:sp.x,top:sp.y}}
            initial={{opacity:1,scale:1,y:0}} animate={{opacity:0,scale:1.5,y:-60}} transition={{duration:1.2}}>✨</motion.div>
        ))}
      </AnimatePresence>

      {/* Progress bar */}
      <div className="reader-progress-bar">
        <motion.div className="reader-progress-fill" animate={{width:`${progress}%`}} transition={{duration:0.5}} />
      </div>

      {/* Top bar */}
      <div className="reader-topbar">
        <button className="reader-back-btn" onClick={()=>{tts.stop();mic.stopListening();navigate('/dashboard')}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Exit
        </button>
        <h1 className="reader-title">{story.title}</h1>
        <div className="reader-topbar-right">
          <span className="reader-page-counter">Page {currentPage+1} of {story.pages.length}</span>
          {pageScores.length > 0 && (
            <span className="reader-acc-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {Math.round(pageScores.reduce((a,s)=>a+s.correctWords,0)/Math.max(pageScores.reduce((a,s)=>a+s.totalWords,0),1)*100)}% Accuracy
            </span>
          )}
        </div>
      </div>

      {/* Status banner */}
      <AnimatePresence>
        {mic.isListening && (
          <motion.div className="phase-banner reading active" initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
            <span className="banner-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></span>
            <span>Listening... Please read aloud.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Book */}
      <div className="reader-book-container">
        <AnimatePresence mode="wait" custom={direction}>
          {phase === 'quiz' ? (
            <motion.div key="quiz" className="quiz-panel"
              initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
              exit={{opacity:0}} transition={{duration:0.3}}>
              <div className="quiz-header">
                <h3>Comprehension Check</h3>
                <p className="quiz-sub">Select the best answer to continue.</p>
              </div>
              <p className="quiz-question">{quizQ?.question}</p>
              <div className="quiz-choices">
                {quizQ?.choices.map((c,i)=>{
                  let cls='quiz-choice'
                  if(selectedAnswer){
                    if(c===quizQ.correct_answer) cls+=' correct'
                    else if(c===selectedAnswer) cls+=' wrong'
                    else cls+=' disabled'
                  }
                  return (
                    <motion.button key={i} className={cls}
                      whileHover={!selectedAnswer?{x:4}:{}}
                      onClick={()=>handleAnswerSelect(c)}>
                      <span className="choice-letter">{String.fromCharCode(65+i)}</span>{c}
                    </motion.button>
                  )
                })}
              </div>
              {answerResult && (
                <motion.div className={`quiz-feedback ${answerResult}`} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
                  {answerResult==='correct'
                    ?<><span className="feedback-icon">✓</span><div><strong>Correct</strong><p>{quizQ?.explanation}</p></div></>
                    :<><span className="feedback-icon">✗</span><div><strong>Incorrect</strong><p>The correct answer is: {quizQ?.correct_answer}. {quizQ?.explanation}</p></div></>}
                </motion.div>
              )}
              {selectedAnswer && (
                <div style={{display:'flex', justifyContent:'flex-end', marginTop: 24}}>
                  <motion.button className="quiz-continue-btn" onClick={handleQuizContinue}
                    initial={{opacity:0}} animate={{opacity:1}} whileHover={{scale:1.02}} whileTap={{scale:0.98}}>
                    {currentPage>=(story?.pages.length??0)-1?'Complete Reading':'Continue Reading'}
                  </motion.button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key={`page-${currentPage}`} className="reader-spread"
              custom={direction}
              variants={{
                enter:(d:number)=>({x:d*20,opacity:0}),
                center:{x:0,opacity:1},
                exit:(d:number)=>({x:d*-20,opacity:0}),
              }}
              initial="enter" animate="center" exit="exit"
              transition={{duration:0.3, ease:'easeInOut'}}>

              {/* Top/Left — Image (for mobile, flows to top. For desktop, could be left) */}
              <div className="book-page book-left">
                {page?.image_url ? (
                  <div className="book-image-wrap">
                    <img
                      src={page.image_url}
                      alt={`Page ${currentPage+1}`}
                      className="book-illustration"
                    />
                  </div>
                ) : (
                  <div className="book-illustration-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                  </div>
                )}
              </div>

              {/* Bottom/Right — Text content */}
              <div className="book-page book-right">

                {/* Live score counter */}
                {wordStatuses.some(s => s !== 'idle') && (() => {
                  const correctCount = wordStatuses.filter(s => s === 'correct').length
                  const total = pageWordsRef.current.length
                  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0
                  return (
                    <div className="live-score-bar">
                      <div className="live-score-fill" style={{width: `${pct}%`}} />
                      <span className="live-score-text">{pct}% Read</span>
                    </div>
                  )
                })()}

                <div className="book-text-content">
                  <p className="book-text">
                    {pageWordsRef.current.map((word,i)=>(
                      <span key={i} id={`word-${i}`}
                        className={`word word-${wordStatuses[i]||'idle'}`}
                        style={{transition: 'color 0.2s'}}>
                        {word}{' '}
                      </span>
                    ))}
                  </p>
                </div>

                {/* Controls row */}
                <div className="controls-row">
                  {mic.isSupported && (
                    <button className={`control-btn ${mic.isListening?'active':''}`} onClick={toggleMic}>
                      {mic.isListening ? <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth={2} /><rect x="9" y="9" width="6" height="6" fill="currentColor" /></svg> Stop</> : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg> Read Aloud</>}
                    </button>
                  )}
                  <button className={`control-btn ${tts.isSpeaking?'active':''}`} onClick={handleReadParagraph}>
                    {tts.isSpeaking ? <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth={2} /><rect x="9" y="9" width="6" height="6" fill="currentColor" /></svg> Stop</> : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg> Listen</>}
                  </button>
                </div>

                {/* Navigation */}
                <div className="book-nav">
                  <button className="book-nav-btn" onClick={handlePrevPage} disabled={currentPage===0}>Previous</button>
                  <button className="book-nav-btn primary" onClick={handleNextPage}>
                    {currentPage>=story.pages.length-1?'Finish':'Next Page'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* XP Toast */}
      <AnimatePresence>
        {xpToast&&(
          <motion.div key={xpToast.id} className="xp-toast"
            initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} transition={{duration:0.3}}>
            +{xpToast.amount} XP
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
