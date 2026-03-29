import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

const isIOS = /iPad|iPhone|iPod/.test(typeof navigator !== 'undefined' ? navigator.userAgent : '') && !(window as any).MSStream
// Chrome on iOS uses WKWebView but blocks SpeechRecognition — only Safari works
const isIOSChrome = isIOS && /CriOS/.test(typeof navigator !== 'undefined' ? navigator.userAgent : '')
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { storiesApi, progressApi, rewardsApi, readingLogsApi } from '../services/api'
import { saveRecording } from '../services/recordingsDb'
import { useAudioRecorder } from '../hooks/useAudioRecorder'

import type { Story, QuizQuestion, PageScore, ReadingSession, ComprehensionAnswer } from '../types'
import { MOCK_STORY } from './mockStory'  // keep for dev reference but not used as fallback
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSoundEffects } from '../hooks/useSoundEffects'
import '../styles/reader.css'
import { emitXpUpdate, getStoredXp } from '../components/XpBadge'

function normalize(w: string) {
  // Strip punctuation, hyphens, possessives; lowercase
  return w.replace(/[^a-zA-Z]/g, '').toLowerCase()
}

/**
 * syllabify — disabled (produced incorrect splits like 'Ha·rmony')
 * Words are displayed and spoken whole.
 */
function syllabify(word: string): string {
  return word
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

function isClose(said: string, target: string): boolean {
  if (!said || !target) return false
  if (said === target) return true
  // Very short words — exact only to avoid false positives (e.g. "a"↔"at")
  if (target.length <= 3) return said === target
  // Medium words — 1 edit distance
  if (target.length <= 6) return levenshtein(said, target) <= 1
  // Long words — 2 edit distance, OR if the spoken word starts with at least
  // 60% of the target (handles dropped endings like "runnin" / "swimmin")
  if (levenshtein(said, target) <= 2) return true
  const prefixLen = Math.ceil(target.length * 0.6)
  return said.startsWith(target.slice(0, prefixLen)) || target.startsWith(said.slice(0, prefixLen))
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
type ReaderPhase = 'reading' | 'review' | 'quiz' | 'comprehension'

/**
 * evaluateFullReading — batch algorithm run AFTER the student finishes speaking.
 * Aligns the full spoken transcript against all page words using a forward
 * greedy scan with a lookahead window. Much more accurate than real-time matching
 * because pauses, restarts, and interim noise don't cause false negatives.
 */
function evaluateFullReading(transcript: string, pageWords: string[]): WordStatus[] {
  const spoken = transcript.toLowerCase().split(/\s+/).filter(Boolean).map(normalize)
  const statuses: WordStatus[] = new Array(pageWords.length).fill('idle')
  if (!spoken.length) return statuses

  let si = 0  // how far we've consumed in the spoken array

  for (let wi = 0; wi < pageWords.length; wi++) {
    const target = normalize(pageWords[wi])
    if (!target) continue

    // Window: proportional lookahead so skipped filler words don't desync
    const lookahead = target.length <= 3 ? 3 : 6
    let matched = false

    for (let offset = 0; offset < lookahead && si + offset < spoken.length; offset++) {
      if (isClose(spoken[si + offset], target)) {
        statuses[wi] = 'correct'
        si += offset + 1
        matched = true
        break
      }
    }

    if (!matched) {
      // Word was skipped or mispronounced — mark wrong but don't advance spoken pointer
      statuses[wi] = 'wrong'
    }
  }

  return statuses
}

export default function BookReader() {
  const { storyId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  // Double-points mode — activated when student retries after scoring < 77%
  const doublePoints = !!(location.state as any)?.doublePoints

  const [story, setStory] = useState<Story | null>(null)
  const [storyLoading, setStoryLoading] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [storyError, setStoryError] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [direction, setDirection] = useState(1)
  const [phase, setPhase] = useState<ReaderPhase>('reading')
  const [quizQ, setQuizQ] = useState<QuizQuestion | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quizIdx, setQuizIdx] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null)
  const [quizResults, setQuizResults] = useState<{ pageNum: number; correct: boolean }[]>([])

  // Word tracking
  const [wordStatuses, setWordStatuses] = useState<WordStatus[]>([])
  const [pageScores, setPageScores] = useState<PageScore[]>([])
  // Missed words review
  const [missedWords, setMissedWords] = useState<{ word: string; idx: number }[]>([])
  const [reviewIdx, setReviewIdx] = useState(0)
  const [reviewStarted, setReviewStarted] = useState(false)  // user must press Start first

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
  const recorder = useAudioRecorder()

  // Map story language name → BCP-47 locale for speech recognition & TTS
  const storyLang = useMemo(() => {
    const map: Record<string, string> = {
      english: 'en-US', spanish: 'es-ES', french: 'fr-FR',
      portuguese: 'pt-BR', german: 'de-DE', italian: 'it-IT',
      mandarin: 'zh-CN', japanese: 'ja-JP', arabic: 'ar-SA',
    }
    return map[(story?.language ?? 'english').toLowerCase()] ?? 'en-US'
  }, [story?.language])

  // Shared MediaStream for both SpeechRecognition and MediaRecorder
  const mediaStreamRef = useRef<MediaStream | null>(null)

  // ── Proactive mic permission ──────────────────────────────────────────
  // 'prompt' = not yet asked, 'granted' = approved, 'denied' = blocked
  const [micPerm, setMicPerm] = useState<'prompt' | 'granted' | 'denied'>('prompt')

  // Check current permission state on mount (no dialog shown)
  // NOTE: navigator.permissions is NOT supported on iOS Safari — fall back to 'granted'
  // so the mic button is immediately accessible without requiring a banner tap.
  useEffect(() => {
    if (!navigator.permissions) {
      // iOS Safari / older browsers — assume 'prompt' but don't block the mic button.
      // The first tap on toggleMic will trigger the browser's own permission dialog.
      setMicPerm('prompt')
      return
    }
    navigator.permissions.query({ name: 'microphone' as PermissionName })
      .then(status => {
        setMicPerm(status.state as 'prompt' | 'granted' | 'denied')
        status.onchange = () => setMicPerm(status.state as 'prompt' | 'granted' | 'denied')
      })
      .catch(() => {
        // Permissions API threw (some Android WebViews) — don't block the mic
        setMicPerm('prompt')
      })
  }, [])

  // Called when student taps the "Enable Microphone" banner — triggers native OS dialog
  // MUST be async so we can await getUserMedia directly inside the user-gesture handler.
  // On iOS Safari, any code inside .then() is no longer in the gesture chain.
  const handleRequestMicPerm = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicPerm('granted')  // no API = probably desktop, just allow
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      setMicPerm('granted')
    } catch {
      setMicPerm('denied')
    }
  }

  // ── Comprehension-page voice dictation ───────────────────────────────────
  const [activeCompMic, setActiveCompMic] = useState<string | null>(null)
  const compMicRef = useRef<SpeechRecognition | null>(null)
  const compMicTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startCompDictation = useCallback((fieldKey: string, onResult: (text: string) => void) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Voice input needs Chrome or Edge!'); return }
    if (compMicRef.current) { compMicRef.current.stop(); compMicRef.current = null }
    if (compMicTimeoutRef.current) clearTimeout(compMicTimeoutRef.current)
    const rec: SpeechRecognition = new SR()
    // iOS Safari requires continuous:false and interimResults:false
    const iosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    rec.lang = 'en-US'
    rec.continuous = !iosDevice
    rec.interimResults = !iosDevice
    compMicRef.current = rec
    let finalText = ''
    const resetTimer = () => {
      if (compMicTimeoutRef.current) clearTimeout(compMicTimeoutRef.current)
      compMicTimeoutRef.current = setTimeout(() => rec.stop(), iosDevice ? 5000 : 2500)
    }
    rec.onstart = () => { setActiveCompMic(fieldKey); resetTimer() }
    rec.onresult = (e: SpeechRecognitionEvent) => {
      resetTimer()
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' '
        else if (!iosDevice) interim = e.results[i][0].transcript
      }
      onResult(finalText + interim)
    }
    rec.onend = () => {
      if (compMicTimeoutRef.current) clearTimeout(compMicTimeoutRef.current)
      compMicRef.current = null; setActiveCompMic(null)
      if (finalText.trim()) onResult(finalText.trim())
    }
    rec.onerror = () => { compMicRef.current = null; setActiveCompMic(null) }
    rec.start()
  }, [])

  const stopCompDictation = useCallback(() => {
    if (compMicTimeoutRef.current) clearTimeout(compMicTimeoutRef.current)
    compMicRef.current?.stop(); compMicRef.current = null; setActiveCompMic(null)
  }, [])

  const toggleCompMic = useCallback((fieldKey: string, onResult: (text: string) => void) => {
    if (activeCompMic === fieldKey) stopCompDictation()
    else startCompDictation(fieldKey, onResult)
  }, [activeCompMic, startCompDictation, stopCompDictation])

  useEffect(() => () => { compMicRef.current?.stop() }, [])

  const prevTranscriptRef = useRef('')
  const pageWordsRef = useRef<string[]>([])

  // ── Load story + resume from saved progress ───────────────────────────────
  useEffect(() => {
    setStoryLoading(true)
    storiesApi.get(storyId!)
      .then(async r => {
        const s = r.data
        setStory(s)
        setStoryLoading(false)
        // Resume from last saved page
        const prog = await progressApi.getProgress(storyId!)
        if (prog && prog.lastPage > 0 && prog.lastPage < s.pages.length) {
          setCurrentPage(prog.lastPage)
        }
      })
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
    setWordStatuses(words.map(() => 'idle'))
    setPhase('reading')
    prevTranscriptRef.current = ''
    accTranscriptRef.current = ''
    wasReadingRef.current = false
    tts.stop()
    mic.stopListening()
    mic.resetTranscript()
    // Block page display until image loads; skip wait if no image on this page
    setImageLoaded(!page.media_url)

    // Safety: force-clear the loading overlay after 3s so it never hangs
    const imgTimeout = setTimeout(() => setImageLoaded(true), 3000)

    // Voice direction — announce page (non-blocking, short delay)
    const timer = setTimeout(() => {
      if (currentPage === 0) {
        tts.speak(`Welcome! We're on page 1. Press the microphone button and read the words out loud. Let's begin!`, 'teacher')
      } else {
        tts.speak(`Great work! Now we're on page ${currentPage + 1}. Press the microphone and keep reading!`, 'teacher')
      }
    }, 800)
    return () => { clearTimeout(timer); clearTimeout(imgTimeout) }
  }, [currentPage, story])  // eslint-disable-line

  // ── BATCH evaluation — runs AFTER the student finishes speaking ───────────
  // We collect the full transcript while mic is active, then evaluate all words
  // at once when they stop. This prevents premature wrong marks mid-reading.
  const wasReadingRef = useRef(false)
  const accTranscriptRef = useRef('') // accumulates the full reading transcript

  // Accumulate transcript while reading
  useEffect(() => {
    if (phase === 'reading' && mic.isListening) {
      accTranscriptRef.current = mic.transcript
    }
  }, [mic.transcript, phase, mic.isListening])

  // ── Live green progress highlighting ─────────────────────────────────────
  // Count words spoken so far (final + interim) and mark that many green.
  // No string comparison — O(1) per update. Fires on interimTranscript for
  // real-time word-by-word highlighting as the student reads.
  useEffect(() => {
    if (phase !== 'reading' || !mic.isListening) return
    const combined = (mic.transcript + ' ' + mic.interimTranscript).trim()
    if (!combined) return

    const spokenCount = combined.split(/\s+/).filter(Boolean).length
    const words = pageWordsRef.current
    setWordStatuses(words.map((_, i) => (i < spokenCount ? 'correct' : 'idle')) as WordStatus[])
  }, [mic.transcript, mic.interimTranscript, phase, mic.isListening])  // eslint-disable-line

  // When mic stops during reading phase → run batch evaluation
  useEffect(() => {
    if (phase !== 'reading') { wasReadingRef.current = false; return }

    if (mic.isListening) {
      wasReadingRef.current = true
    } else if (wasReadingRef.current) {
      wasReadingRef.current = false
      const fullTranscript = accTranscriptRef.current || mic.transcript
      if (!fullTranscript.trim()) return

      const words = pageWordsRef.current
      const statuses = evaluateFullReading(fullTranscript, words)
      setWordStatuses(statuses)

      // Sparkles + sounds for correct words
      const correctCount = statuses.filter(s => s === 'correct').length
      if (correctCount > 0) sfx.playPop()
      statuses.forEach((status, idx) => {
        if (status === 'correct') {
          const el = document.getElementById(`word-${idx}`)
          if (el) {
            const rect = el.getBoundingClientRect()
            const id = Date.now() + Math.random()
            setSparkles(s => [...s, { id, x: rect.x + rect.width / 2, y: rect.y }])
            setTimeout(() => setSparkles(s => s.filter(sp => sp.id !== id)), 1200)
          }
        }
      })
    }
  }, [mic.isListening, phase, sfx])  // eslint-disable-line

  // ── Auto-stop on silence → triggers batch evaluation ─────────────────────
  // Chrome SpeechRecognition with continuous=true never fires onend on its own.
  // We reset a 2.5s timer on every speech event; when it fires the mic stops,
  // which flips isListening false, which triggers the batch evaluation above.
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!mic.isListening || phase !== 'reading') {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      return
    }
    // Reset the timer each time speech arrives
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => {
      mic.stopListening()   // → isListening goes false → batch eval fires
      // Also stop the audio recorder so pendingAudioRef is populated for saving
      if (recorder.isRecording()) {
        recorder.stopRecording().then(result => {
          if (result && result.blob.size >= 100) {
            pendingAudioRef.current = result
          }
        })
      }
    }, 3000)
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    }
  }, [mic.transcript, mic.interimTranscript, phase, mic.isListening, recorder])  // eslint-disable-line

  // ── Review phase — MANUAL mic: TTS speaks word, student presses button to repeat ──
  const reviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track which review words have been spoken by TTS so we don't re-speak on re-renders
  const reviewSpokenRef = useRef<number>(-1)

  // Speak the current word when reviewIdx changes (or review starts)
  useEffect(() => {
    if (phase !== 'review' || !reviewStarted) return
    const currentMissed = missedWords[reviewIdx]
    if (!currentMissed) return
    if (reviewSpokenRef.current === reviewIdx) return  // already spoken this word

    reviewSpokenRef.current = reviewIdx
    mic.stopListening()
    mic.resetTranscript()

    // Strip punctuation for clean TTS pronunciation
    const cleanWord = currentMissed.word.replace(/[^a-zA-Z'-]/g, '')
    const prompt = `Listen carefully: ${cleanWord}. Now you say it!`

    const t = setTimeout(() => tts.speak(prompt, 'word'), 300)
    return () => clearTimeout(t)
  }, [phase, reviewIdx, reviewStarted, missedWords])  // eslint-disable-line

  // Called when student taps the mic button in review phase
  // SYNC - no await before startListening or mobile browsers block the mic
  const handleReviewMicPress = useCallback(() => {
    if (mic.isListening) {
      mic.stopListening()
      return
    }
    tts.stop()
    mic.resetTranscript()
    mic.startListening(storyLang)
  }, [mic, tts])

  // Called when student wants to hear the word again
  const handleReviewHearAgain = useCallback(() => {
    mic.stopListening()
    mic.resetTranscript()
    const currentMissed = missedWords[reviewIdx]
    if (!currentMissed) return
    const cleanWord = currentMissed.word.replace(/[^a-zA-Z'-]/g, '')
    tts.speak(`${cleanWord}`, 'word')
  }, [reviewIdx, missedWords, tts, mic])

  // Match detection — only when mic is actively listening
  useEffect(() => {
    if (phase !== 'review' || !mic.isListening) return

    const combined = (mic.transcript + ' ' + mic.interimTranscript).trim()
    if (!combined) return

    const spoken = combined.toLowerCase().split(/\s+/).filter(Boolean)
    const currentMissed = missedWords[reviewIdx]
    if (!currentMissed) return

    // Strip punctuation from stored word before matching
    const cleanTarget = currentMissed.word.replace(/[^a-zA-Z'-]/g, '')
    const target = normalize(cleanTarget)

    // Check ALL spoken words (not just the last) so the user can say the
    // word anywhere in their utterance (e.g. "Rio" or "I said Rio")
    const matched = spoken.some(w => {
      const norm = normalize(w)
      // For very short words use 1-edit-distance instead of exact-only
      if (target.length <= 3) return norm === target || levenshtein(norm, target) <= 1
      return isClose(norm, target)
    })

    if (matched) {
      if (reviewTimerRef.current) clearTimeout(reviewTimerRef.current)
      mic.stopListening()

      // Mark correct
      setWordStatuses(prev => {
        const next = [...prev]
        next[currentMissed.idx] = 'correct'
        return next
      })
      sfx.playPop()

      // Sparkle effect
      const el = document.querySelector(`.review-word-card:nth-child(${reviewIdx + 1})`)
      if (el) {
        const rect = el.getBoundingClientRect()
        const id = Date.now() + Math.random()
        setSparkles(s => [...s, { id, x: rect.x + rect.width / 2, y: rect.y }])
        setTimeout(() => setSparkles(s => s.filter(sp => sp.id !== id)), 1200)
      }

      // Give positive feedback then advance
      tts.speak('Great job!', 'teacher')
      const nextReview = reviewIdx + 1
      if (nextReview < missedWords.length) {
        reviewSpokenRef.current = -1  // allow next word to be spoken
        setTimeout(() => setReviewIdx(nextReview), 1200)
      } else {
        sfx.playCorrect()
        setTimeout(() => {
          tts.speak("Amazing! You got them all! Now let's see what you remember — quiz time!", 'teacher')
          setTimeout(() => startQuiz(), 2500)
        }, 1200)
      }
    }
  }, [mic.transcript, mic.interimTranscript, phase, mic.isListening, reviewIdx, missedWords])  // eslint-disable-line


  // ── XP toast — shows animation AND persists to the global XP badge ──────
  const showXPToast = (amount: number) => {
    if (amount > 0) {
      const newTotal = getStoredXp() + amount
      emitXpUpdate(newTotal, amount)   // updates badge + localStorage instantly
    }
    setXpToast({ amount, id: Date.now() })
    setTimeout(() => setXpToast(null), 2000)
  }

  // ── Next page → review missed words → quiz → advance ───────────────────
  // Stores the last audio blob captured this page (set by toggleMic → stopRecording)
  const pendingAudioRef = useRef<{ blob: Blob; duration: number } | null>(null)

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
    rewardsApi.recordActivity().catch(() => {})   // ← record streak day
    showXPToast(5 + Math.round((correct / Math.max(words.length, 1)) * 10))

    // ── Save recording to IndexedDB (fire-and-forget) ─────────────────────
    ;(async () => {
      try {
        let audioResult = pendingAudioRef.current
        if (!audioResult && recorder.isRecording()) {
          audioResult = await recorder.stopRecording()
        }
        pendingAudioRef.current = null
        if (!audioResult || audioResult.blob.size < 100) return
        const studentId   = localStorage.getItem('readquest_student_id') || 'guest'
        const studentName = localStorage.getItem('readquest_student_name') || 'Student'
        const accuracy    = words.length > 0 ? Math.round((correct / words.length) * 100) : 0
        await saveRecording({
          studentId,
          studentName,
          bookId: story.id,
          bookTitle: story.title,
          bookCover: story.cover_media_url,
          gradeLevel: story.grade_level,
          pageNumber: page.page_number,
          pageText: page.content,
          transcript: accTranscriptRef.current || mic.transcript,
          wordStatuses: [...wordStatuses],
          accuracy,
          audioBlob: audioResult.blob,
          duration: audioResult.duration,
          createdAt: new Date().toISOString(),
        })
      } catch (err) {
        console.warn('[Recordings] Failed to save recording:', err)
      }
    })()

    // Collect missed words
    const missed = words
      .map((w, i) => ({ word: w, idx: i }))
      .filter((_, i) => wordStatuses[i] === 'wrong')

    if (missed.length > 0) {
      setMissedWords(missed)
      setReviewIdx(0)
      setReviewStarted(false)  // show Start button
      setPhase('review')
      tts.stop()
      setTimeout(() => tts.speak(`Great reading! You missed ${missed.length} word${missed.length > 1 ? 's' : ''}. Press Start to practice them — you can do it!`, 'teacher'), 300)
      return
    }

    // No missed words → skip to quiz
    startQuiz(newScores)
  }, [story, page, wordStatuses, pageScores, currentPage, sfx, tts, mic, recorder])

  // Start the 3-question quiz for the current page
  const startQuiz = useCallback((newScores?: PageScore[]) => {
    if (!story || !page) return
    const pageQs = story.quiz_questions.filter(q => q.story_page_id === page.id)
    if (pageQs.length > 0) {
      setQuizQuestions(pageQs)
      setQuizIdx(0)
      setQuizQ(pageQs[0])
      setPhase('quiz')
      setSelectedAnswer(null)
      setAnswerResult(null)
      tts.speak("Time for a quick quiz! Let's see what you remember from this page.", 'teacher')
    } else {
      advancePage(newScores ?? pageScores)
    }
  }, [story, page, pageScores, tts])

  // Handle finishing the review phase
  const handleFinishReview = useCallback(() => {
    mic.stopListening()
    sfx.playCorrect()
    tts.speak("Great job practicing those words! Now let's do a quick quiz.", 'teacher')
    startQuiz()
  }, [mic, sfx, tts, startQuiz])

  const advancePage = useCallback((newScores: PageScore[]) => {
    if (!story) return
    if (currentPage >= story.pages.length - 1) {
      const totalCorrect = newScores.reduce((a, s) => a + s.correctWords, 0)
      const totalWords   = newScores.reduce((a, s) => a + s.totalWords, 0)
      const quizCorrect  = quizResults.filter(r => r.correct).length
      const quizTotal    = quizResults.length
      const readingPct   = totalWords > 0 ? Math.round((totalCorrect / totalWords) * 100) : 100
      const quizPct      = quizTotal  > 0 ? Math.round((quizCorrect / quizTotal) * 100) : 100
      const overallPct   = Math.round(readingPct * 0.7 + quizPct * 0.3)
      const sess: ReadingSession = {
        scores: newScores,
        totalCorrect,
        totalWords,
        accuracyPct: overallPct,
        quizCorrect,
        quizTotal,
        readingPct,
        quizPct,
      }
      setSession(sess)
      setPhase('comprehension')
      progressApi.markBookComplete(story.id).catch(() => {})
      // Save completed progress
      progressApi.saveProgress(story.id, story.pages.length, story.pages.length).catch(() => {})
      rewardsApi.completeStory(story.id).catch(() => {})   // ← record story completed
      showXPToast(50)
    } else {
      const nextPage = currentPage + 1
      setDirection(1)
      setCurrentPage(nextPage)
      setSelectedAnswer(null)
      setAnswerResult(null)
      // Save progress so student can resume here
      progressApi.saveProgress(story.id, nextPage, story.pages.length).catch(() => {})
    }
  }, [story, currentPage, quizResults])

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

  // ── Quiz — cycle through 3 questions per page ─────────────────────────────
  const handleAnswerSelect = (choice: string) => {
    if (selectedAnswer) return
    sfx.playClick()
    setSelectedAnswer(choice)
    const correct = choice === quizQ?.correct_answer
    setAnswerResult(correct ? 'correct' : 'wrong')
    setQuizResults(prev => [...prev, { pageNum: currentPage + 1, correct }])
    if (correct) { sfx.playCorrect(); showXPToast(10) }
    else { sfx.playError(); showXPToast(3) }
    tts.speak(correct
      ? 'Great job! That is correct! ' + (quizQ?.explanation ?? '')
      : 'Good try! The answer is ' + quizQ?.correct_answer + '. ' + (quizQ?.explanation ?? ''), 'quiz')
  }

  const handleQuizContinue = () => {
    sfx.playClick()
    const nextIdx = quizIdx + 1
    if (nextIdx < quizQuestions.length) {
      // Next question
      setQuizIdx(nextIdx)
      setQuizQ(quizQuestions[nextIdx])
      setSelectedAnswer(null)
      setAnswerResult(null)
    } else {
      // All questions answered → advance
      setPhase('reading')
      advancePage(pageScores)
    }
  }

  // ── Read paragraph (on-demand TTS) ────────────────────────────────────────
  const handleReadParagraph = () => {
    sfx.playClick()
    if (tts.isSpeaking) { tts.stop(); return }
    mic.stopListening()
    if (page) tts.speak(page.content, 'story')
  }

  // ── Mic toggle ────────────────────────────────────────────────────────────
  // SYNC — recognition.start() must be in the direct click handler call stack.
  // Any await before it breaks the browser's user-gesture permission chain on mobile.
  const toggleMic = () => {
    if (mic.isListening) {
      sfx.playClick()
      mic.stopListening()
      // Stop audio recording (non-blocking)
      recorder.stopRecording().then(result => {
        if (result) pendingAudioRef.current = result
      })
    } else {
      tts.stop()
      mic.resetTranscript()
      accTranscriptRef.current = ''
      wasReadingRef.current = false
      pendingAudioRef.current = null
      setWordStatuses(pageWordsRef.current.map(() => 'idle'))

      // ── CRITICAL: startListening() MUST be called FIRST, synchronously,
      // inside the click handler. Any async work before it (getUserMedia .then)
      // breaks the user-gesture permission chain on iOS Safari and Android Chrome.
      mic.startListening(storyLang)
      sfx.playClick()

      // Update micPerm so the banner dismisses after first successful use
      if (micPerm === 'prompt') setMicPerm('granted')

      // Start audio recording in parallel — this can be async, it's not permission-gated
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then(stream => {
          mediaStreamRef.current?.getTracks().forEach(t => t.stop())
          mediaStreamRef.current = stream
          recorder.startRecording(stream)
        })
        .catch(() => { /* mic permission already handled by SpeechRecognition */ })
    }
  }

  // ── Comprehension submit — AI-graded ────────────────────────────────────
  const [compFeedback, setCompFeedback] = useState('')
  const [compLoading, setCompLoading] = useState(false)

  const handleComprehensionSubmit = async () => {
    sfx.playSuccess()
    setCompLoading(true)
    const allText = story?.pages.map(p => p.content).join(' ') ?? ''

    let gradedScore = 50
    let gradedFeedback = 'Great effort reading this story!'
    try {
      const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
      const res = await fetch(`${API}/api/stories/grade-comprehension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story_text: allText,
          summary: summaryText,
          qa_answers: comprehensionAnswers,
        }),
      })
      const data = await res.json()
      gradedScore = data.score ?? 50
      gradedFeedback = data.feedback ?? 'Great job reading!'
    } catch {
      // Fallback to local scoring
      gradedScore = comprehensionScore(summaryText + ' ' + comprehensionAnswers.map(a => a.answer).join(' '), allText)
    }
    setCompScore(gradedScore)
    setCompFeedback(gradedFeedback)
    setCompLoading(false)
    setComprehensionSubmitted(true)

    const readAcc = session?.accuracyPct ?? 0
    const overallAvg = Math.round((readAcc + gradedScore) / 2)
    const passed = overallAvg >= 77
    const xpBase = 50 + Math.round(gradedScore * 0.5)
    const xpAwarded = doublePoints ? xpBase * 2 : xpBase
    showXPToast(xpAwarded)
    // ── Record reading activity (populates streak + weekly_activity) ─────────
    rewardsApi.recordActivity().catch(() => {})

    if (passed) {
      tts.speak('Wonderful! You did an amazing job reading and understanding this story! You should be so proud of yourself!', 'teacher')
    } else {
      tts.speak(`Good effort! You scored ${overallAvg} percent. Try reading again to beat 77 percent and earn double points!`, 'teacher')
    }

    // ── Save to Reading Shelf ─────────────────────────────────────────────
    if (story) {
      const qCorrect = quizResults.filter(r => r.correct).length
      const qTotal = quizResults.length
      const avg = overallAvg
      const stars = avg >= 90 ? 5 : avg >= 75 ? 4 : avg >= 60 ? 3 : avg >= 40 ? 2 : 1
      const coverRaw = story.cover_media_url
      const resolvedCover = coverRaw
        ? (coverRaw.startsWith('/static')
            ? `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}${coverRaw}`
            : coverRaw)
        : undefined
      readingLogsApi.saveLog({
        storyId: story.id,
        storyTitle: story.title,
        gradeLevel: story.grade_level,
        coverUrl: resolvedCover,
        studentName: localStorage.getItem('readquest_student_name') ?? undefined,
        readingAccuracy: readAcc,
        quizScore: qCorrect,
        quizTotal: qTotal,
        comprehensionScore: gradedScore,
        totalXp: 50 + Math.round(gradedScore * 0.5),
        stars,
        feedback: gradedFeedback,
      }).catch(() => {})
    }
  }  // end handleComprehensionSubmit

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
    const readPct  = session?.readingPct  ?? session?.accuracyPct ?? 100
    const qPct     = session?.quizPct     ?? 100
    const qCorrect = session?.quizCorrect ?? 0
    const qTotal   = session?.quizTotal   ?? 0
    // overallAvg is only meaningful after submission (compScore defaults to 0)
    const overallAvg = comprehensionSubmitted
      ? Math.round(((session?.accuracyPct ?? 0) + compScore) / 2)
      : 0
    const passed = overallAvg >= 77
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

                {/* Score summary strip */}
                {session && (
                  <div className="comp-score-strip">
                    <div className="comp-score-pill">
                      <span className="pill-icon">📖</span>
                      <span className="pill-val">{readPct}%</span>
                      <span className="pill-label">Reading</span>
                    </div>
                    {qTotal > 0 && (
                      <div className="comp-score-pill">
                        <span className="pill-icon">🧩</span>
                        <span className="pill-val">{qCorrect}/{qTotal}</span>
                        <span className="pill-label">Quiz</span>
                      </div>
                    )}
                    <div className="comp-score-pill featured">
                      <span className="pill-icon">⭐</span>
                      <span className="pill-val">{session.accuracyPct}%</span>
                      <span className="pill-label">Overall</span>
                    </div>
                    <div className="star-rating">
                      {[1,2,3,4,5].map(i => (
                        <motion.span key={i} className={`star ${i<=getStars(session?.accuracyPct ?? 0)?'lit':''}`}
                          initial={{scale:0}} animate={{scale:1}} transition={{delay:0.1*i,type:'spring',stiffness:300}}>★</motion.span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Words to practice */}
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
                  <div className="comp-label-row">
                    <label className="comp-label">📝 Tell us what the story was about:</label>
                    <button
                      className={`comp-mic-btn${activeCompMic === 'summary' ? ' active' : ''}`}
                      onClick={() => toggleCompMic('summary', (txt) => setSummaryText(txt))}
                      title={activeCompMic === 'summary' ? 'Stop listening' : 'Talk your answer!'}
                      type="button">
                      {activeCompMic === 'summary' ? <><span className="comp-mic-pulse" />🎤</> : '🎤'}
                    </button>
                  </div>
                  {activeCompMic === 'summary' && (
                    <div className="comp-listening-pill">🎙️ Listening — say what you remember about the story!</div>
                  )}
                  <textarea className={`comp-textarea${activeCompMic === 'summary' ? ' comp-textarea-listening' : ''}`}
                    placeholder="Write or say a few sentences about what happened..."
                    value={summaryText} onChange={e => setSummaryText(e.target.value)} rows={4} />
                  <span className="comp-word-count">{summaryText.trim().split(/\s+/).filter(Boolean).length} words</span>
                </div>

                {/* Q&A */}
                <div className="comp-section">
                  <label className="comp-label">🤔 Answer these questions:</label>
                  {comprehensionAnswers.map((qa, i) => (
                    <div key={i} className="comp-qa">
                      <p className="comp-question">{qa.question}</p>
                      <div className="comp-label-row" style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Your answer:</span>
                        <button
                          className={`comp-mic-btn${activeCompMic === `qa-${i}` ? ' active' : ''}`}
                          onClick={() => toggleCompMic(`qa-${i}`, (txt) => {
                            const next = [...comprehensionAnswers]
                            next[i] = { ...next[i], answer: txt }
                            setComprehensionAnswers(next)
                          })}
                          title={activeCompMic === `qa-${i}` ? 'Stop listening' : 'Say your answer!'}
                          type="button">
                          {activeCompMic === `qa-${i}` ? <><span className="comp-mic-pulse" />🎤</> : '🎤'}
                        </button>
                      </div>
                      {activeCompMic === `qa-${i}` && (
                        <div className="comp-listening-pill">🎙️ Listening — say your answer out loud!</div>
                      )}
                      <textarea
                        className={`comp-textarea small${activeCompMic === `qa-${i}` ? ' comp-textarea-listening' : ''}`}
                        placeholder="Type or say your answer..."
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
                  disabled={summaryText.trim().length < 1}>
                  🚀 Submit My Answers!
                </motion.button>
              </>
            ) : (
              <>
                {/* ── Header ── */}
                {passed ? (
                  <div className="comp-header" style={{borderRadius:'28px 28px 0 0'}}>
                    <span className="comp-trophy">🏆</span>
                    <h2>Amazing Work!</h2>
                    <p className="comp-sub">You passed! Here's how you did:</p>
                  </div>
                ) : (
                  <div className="comp-header" style={{background:'linear-gradient(135deg,#7c2d12,#c2410c)',borderRadius:'28px 28px 0 0'}}>
                    <span className="comp-trophy">💪</span>
                    <h2 style={{color:'#ffd709'}}>Keep Going!</h2>
                    <p className="comp-sub">You scored {overallAvg}% — read again to beat 77% &amp; earn double points!</p>
                  </div>
                )}

                {/* Score cards */}
                <div className="comp-results">
                  <div className="result-card">
                    <span className="result-icon">📖</span>
                    <span className="result-val">{readPct}%</span>
                    <span className="result-label">Reading Accuracy</span>
                  </div>
                  {qTotal > 0 && (
                    <div className="result-card">
                      <span className="result-icon">🧩</span>
                      <span className="result-val">{qCorrect}/{qTotal}</span>
                      <span className="result-label">Quiz Score</span>
                    </div>
                  )}
                  <div className="result-card">
                    <span className="result-icon">🧠</span>
                    <span className="result-val">{compScore}%</span>
                    <span className="result-label">Comprehension</span>
                  </div>
                  <div className={`result-card featured${!passed?' result-card-warn':''}`}>
                    <span className="result-icon">⭐</span>
                    <span className="result-val">{overallAvg}%</span>
                    <span className="result-label">Overall Score</span>
                  </div>
                </div>

                {/* AI Feedback */}
                {compFeedback && (
                  <div className="comp-ai-feedback">
                    <strong>📝 Teacher's feedback:</strong> {compFeedback}
                  </div>
                )}

                {/* Stars */}
                <div className="star-rating large" style={{justifyContent:'center',margin:'8px 0'}}>
                  {[1,2,3,4,5].map(i => (
                    <motion.span key={i} className={`star ${i<=getStars(overallAvg)?'lit':''}`}
                      initial={{scale:0,rotate:-30}} animate={{scale:1,rotate:0}}
                      transition={{delay:0.15*i,type:'spring',stiffness:250}}>★</motion.span>
                  ))}
                </div>

                {/* Under 77%: encouragement banner */}
                {!passed && (
                  <div className="retry-banner">
                    <p className="retry-msg">
                      🎯 You need <strong>77%</strong> to complete this story.
                      Read it again — you'll earn <strong>double points</strong>! 🌟
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="finished-actions">
                  {!passed ? (
                    <>
                      <motion.button
                        className="hero-btn double-points-btn"
                        whileHover={{scale:1.05}} whileTap={{scale:0.97}}
                        onClick={() => navigate(`/read/${storyId}`, { state: { doublePoints: true } })}>
                        🔥 Read Again for Double Points!
                      </motion.button>
                      <motion.button className="ghost-btn" whileHover={{scale:1.03}}
                        onClick={() => navigate('/dashboard')}>
                        🏠 Back to Dashboard
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <motion.button className="hero-btn" whileHover={{scale:1.05}} onClick={()=>navigate('/generate')}>✨ Read Another Story</motion.button>
                      <motion.button className="ghost-btn shelf-cta-btn" whileHover={{scale:1.05}} onClick={()=>navigate('/shelf')}
                        style={{background:'#EDE9FE',color:'#6D28D9',border:'2px solid #C4B5FD',fontWeight:800}}>
                        📚 View My Reading Shelf
                      </motion.button>
                      <motion.button className="ghost-btn" whileHover={{scale:1.05}} onClick={()=>navigate('/dashboard')}>🏠 Dashboard</motion.button>
                    </>
                  )}
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
          <span className="reader-page-counter">{currentPage+1} / {story.pages.length}</span>
          {pageScores.length > 0 && (
            <span className="reader-acc-badge">
              ⭐ {Math.round(pageScores.reduce((a,s)=>a+s.correctWords,0)/Math.max(pageScores.reduce((a,s)=>a+s.totalWords,0),1)*100)}%
            </span>
          )}
        </div>
      </div>

      {/* Mic permission banner — shown only until student grants access */}
      <AnimatePresence>
        {mic.isSupported && micPerm === 'prompt' && (
          <motion.button
            className="mic-perm-banner"
            onClick={handleRequestMicPerm}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              background: 'linear-gradient(90deg, rgba(112,42,225,0.35), rgba(67,20,200,0.35))',
              border: 'none', borderBottom: '1px solid rgba(178,140,255,0.25)',
              padding: '10px 16px', cursor: 'pointer', color: '#edd3ff',
              fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600,
              textAlign: 'left', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>🎙️</span>
            <span style={{ flex: 1 }}>Tap here to enable your microphone for reading</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.7, whiteSpace: 'nowrap' }}>Tap →</span>
          </motion.button>
        )}
        {mic.isSupported && micPerm === 'denied' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              background: 'rgba(239,68,68,0.15)', borderBottom: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5', fontSize: '0.82rem', fontFamily: 'var(--font-body)',
            }}
          >
            <span>🔒</span>
            <span>Microphone blocked. Tap the 🔒 in your address bar → Site Settings → Allow Microphone.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status banner */}
      <AnimatePresence>
        {mic.isListening && (
          <motion.div className="phase-banner reading active" initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
            <span className="banner-icon">🎤</span>
            <span>Listening… Read the words out loud!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Book */}
      <div className="reader-book-container">
        <AnimatePresence mode="wait" custom={direction}>
          {phase === 'review' ? (
            <motion.div key="review" className="quiz-panel"
              initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
              exit={{opacity:0}} transition={{duration:0.3}}>
              <div className="quiz-header">
                <h3>📝 Let's Practice Missed Words!</h3>
                <p className="quiz-sub">
                  {reviewStarted
                    ? `Word ${reviewIdx + 1} of ${missedWords.length}`
                    : `You missed ${missedWords.length} word${missedWords.length > 1 ? 's' : ''}. Let's practice them!`
                  }
                </p>
              </div>

              {/* Mini progress grid — all words with status dots */}
              <div className="review-words-grid">
                {missedWords.map((mw, i) => {
                  const status = wordStatuses[mw.idx]
                  const isActive = reviewStarted && i === reviewIdx
                  const cleanWord = mw.word.replace(/[^a-zA-Z'-]/g, '')
                  return (
                    <motion.div key={mw.idx}
                      className={`review-word-card ${status === 'correct' ? 'correct' : isActive ? 'active' : ''}`}
                      initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}}
                      transition={{delay:i*0.05}}>
                      <span className="review-word-text">{cleanWord}</span>
                      {status === 'correct' && <span className="review-check">✅</span>}
                    </motion.div>
                  )
                })}
              </div>

              {!reviewStarted ? (
                /* ── START BUTTON ── */
                <div style={{textAlign:'center', marginTop:24}}>
                  <motion.button className="hero-btn review-start-btn"
                    whileHover={{scale:1.05}} whileTap={{scale:0.97}}
                    onClick={() => { reviewSpokenRef.current = -1; setReviewStarted(true) }}>
                    ▶ Start Practice
                  </motion.button>
                  <div style={{marginTop:12}}>
                    <motion.button className="ghost-btn" whileHover={{scale:1.03}}
                      onClick={handleFinishReview}>
                      Skip → Quiz
                    </motion.button>
                  </div>
                </div>
              ) : (
                /* ── ACTIVE REVIEW — focused one-word-at-a-time card ── */
                <div className="review-active-card">
                  {/* Big word display */}
                  <div className="review-focus-word">
                    {missedWords[reviewIdx]?.word.replace(/[^a-zA-Z'-]/g, '') || ''}
                  </div>

                  {/* State-specific UI */}
                  {mic.isListening ? (
                    /* LISTENING STATE */
                    <div className="review-listening-state">
                      <motion.div className="review-mic-active-ring"
                        animate={{scale:[1, 1.15, 1], opacity:[1, 0.7, 1]}}
                        transition={{repeat:Infinity, duration:1.2}}>
                        🎤
                      </motion.div>
                      <p className="review-mic-hint">Say the word out loud!</p>
                      <button className="review-stop-btn" onClick={() => mic.stopListening()}>
                        ✕ Cancel
                      </button>
                    </div>
                  ) : tts.isSpeaking ? (
                    /* TTS PLAYING STATE */
                    <div className="review-listening-state">
                      <motion.div className="review-tts-icon"
                        animate={{scale:[1, 1.1, 1]}}
                        transition={{repeat:Infinity, duration:0.8}}>
                        🔊
                      </motion.div>
                      <p className="review-mic-hint">Listen carefully...</p>
                    </div>
                  ) : (
                    /* READY STATE — student calls when ready */
                    <div className="review-ready-state">
                      <motion.button
                        className="review-mic-btn-big"
                        whileHover={{scale:1.07}} whileTap={{scale:0.93}}
                        onClick={handleReviewMicPress}>
                        🎤 Tap to Say It!
                      </motion.button>
                      <button className="review-hear-again-btn" onClick={handleReviewHearAgain}>
                        🔊 Hear it again
                      </button>
                    </div>
                  )}

                  <div className="review-controls" style={{marginTop:16}}>
                    <motion.button className="ghost-btn" whileHover={{scale:1.03}}
                      onClick={handleFinishReview}>
                      Skip → Quiz
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : phase === 'quiz' ? (
            <motion.div key="quiz" className="quiz-panel"
              initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
              exit={{opacity:0}} transition={{duration:0.3}}>
              <div className="quiz-header">
                <h3>🧩 Comprehension Check</h3>
                <p className="quiz-sub">Question {quizIdx + 1} of {quizQuestions.length} — Select the best answer.</p>
              </div>
              <p className="quiz-question">{quizQ?.question}</p>
              <div className="quiz-choices">
                {quizQ?.choices.map((c,i)=>{
                  let cls='quiz-choice-btn'
                  if(selectedAnswer){
                    if(c===quizQ.correct_answer) cls+=' selected-correct'
                    else if(c===selectedAnswer) cls+=' selected-wrong'
                  }
                  return (
                    <motion.button key={i} className={cls}
                      whileHover={!selectedAnswer?{x:4}:{}}
                      disabled={!!selectedAnswer}
                      onClick={()=>handleAnswerSelect(c)}>
                      <span className="choice-letter">{String.fromCharCode(65+i)}</span>
                      <span className="choice-text">{c}</span>
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
            /* ── READING phase — Stitch book card ── */
            <motion.div key={`page-${currentPage}`} className="reader-page-card"
              custom={direction}
              variants={{
                enter:(d:number)=>({x:d*30,opacity:0}),
                center:{x:0,opacity:1},
                exit:(d:number)=>({x:d*-30,opacity:0}),
              }}
              initial="enter" animate="center" exit="exit"
              transition={{duration:0.3, ease:'easeInOut'}}>

              {/* Ornate purple/gold header — spans full width */}
              <div className="book-card-header">
                <span className="book-card-title">{story.title}</span>
              </div>

              {/* Side-by-side: image left · text right */}
              <div className="book-card-body">
                {/* Illustration panel — left column */}
                <div className="book-page-image-panel">
                  <AnimatePresence>
                    {!imageLoaded && page?.media_url && (
                      <motion.div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,background:'#f5e2ff',zIndex:2}}
                        initial={{opacity:1}} exit={{opacity:0}}>
                        <div style={{fontSize:'2rem'}}>🦉</div>
                        <div className="reader-loading-dots">
                          {[0,1,2].map(i => <motion.div key={i} className="loading-dot" animate={{y:[0,-8,0]}} transition={{repeat:Infinity,duration:0.6,delay:i*0.15}} />)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {page?.media_url ? (
                    <img
                      key={page.media_url}
                      src={page.media_url.startsWith('/static')
                        ? `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}${page.media_url}`
                        : page.media_url}
                      alt={`Page ${currentPage + 1} illustration`}
                      className="book-page-image"
                      style={{opacity: imageLoaded ? 1 : 0, transition:'opacity 0.4s ease'}}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => setImageLoaded(true)}
                    />
                  ) : (
                    <div className="book-page-image-placeholder">
                      <span>📖</span>
                    </div>
                  )}
                </div>

                {/* Story text — right column */}
                <div className="book-page-text-area">
                  {wordStatuses.some(s => s !== 'idle') && (() => {
                    const correct = wordStatuses.filter(s => s === 'correct').length
                    const total = pageWordsRef.current.length
                    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
                    return (
                      <div style={{height:4,background:'#f5e2ff',borderRadius:4,marginBottom:12,overflow:'hidden'}}>
                        <motion.div style={{height:'100%',background:'linear-gradient(90deg,#702ae1,#22c55e)',borderRadius:4}}
                          animate={{width:`${pct}%`}} transition={{duration:0.3}} />
                      </div>
                    )
                  })()}
                  <p className="book-page-text">
                    {pageWordsRef.current.map((word,i) => (
                      <span key={i} id={`word-${i}`}
                        className={`reader-word ${wordStatuses[i]==='correct'?'correct':wordStatuses[i]==='wrong'?'wrong':wordStatuses[i]==='current'?'current':''}`}>
                        {word}{' '}
                      </span>
                    ))}
                  </p>
                  {phase === 'reading' && !mic.isListening && wordStatuses.some(s => s !== 'idle') && (
                    <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
                      style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',padding:'10px 0',fontSize:'0.82rem',color:'#69537b',fontFamily:'var(--font-body)',fontWeight:600}}>
                      <span style={{color:'#16a34a'}}>✅ {wordStatuses.filter(s=>s==='correct').length} correct</span>
                      {wordStatuses.filter(s=>s==='wrong').length > 0 && (
                        <span style={{color:'#dc2626'}}>· {wordStatuses.filter(s=>s==='wrong').length} to practice</span>
                      )}
                      <button onClick={() => {
                        sfx.playClick(); mic.resetTranscript()
                        accTranscriptRef.current = ''; wasReadingRef.current = false
                        setWordStatuses(pageWordsRef.current.map(() => 'idle'))
                        mic.startListening(storyLang)
                      }} style={{marginLeft:'auto',background:'#f1daff',border:'none',borderRadius:999,padding:'5px 12px',color:'#702ae1',fontWeight:700,cursor:'pointer',fontSize:'0.8rem'}}>
                        🔄 Try Again
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom action bar ── */}
      <div className="reader-action-bar">
        <button className="reader-nav-btn" onClick={handlePrevPage} disabled={currentPage === 0 || phase !== 'reading'}>‹</button>

        <div style={{display:'flex',alignItems:'center',gap:10,flex:1,justifyContent:'center'}}>
          <button className={`reader-tts-btn ${tts.isSpeaking ? 'active' : ''}`} onClick={handleReadParagraph}
            title={tts.isSpeaking ? 'Stop listening' : 'Listen to this page'}>
            {tts.isSpeaking ? '⏹' : '🔊'}
          </button>

          <div className="reader-page-pill">
            <span>📖</span>
            <span>{currentPage + 1} of {story.pages.length}</span>
          </div>

          {mic.isSupported && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <button
                className={`reader-mic-btn ${
                  mic.isListening ? 'listening' :
                  mic.permissionError ? 'mic-error' : ''
                }`}
                onClick={toggleMic}
                title={mic.isListening ? 'Stop reading' : 'Tap to read aloud'}
              >
                {mic.isListening ? (
                  /* Stop square — tap to end this session */
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="2"/>
                  </svg>
                ) : mic.permissionError ? (
                  /* Lock icon — mic blocked */
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 11V7A5 5 0 0 0 7 7v4M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zm7 3v3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                  </svg>
                ) : (
                  /* Microphone SVG */
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="9" y="2" width="6" height="11" rx="3"/>
                    <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="8" y1="22" x2="16" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
              <span style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                color: mic.isListening ? '#fca5a5'
                     : mic.permissionError ? '#f87171'
                     : 'rgba(178,140,255,0.8)',
              }}>
                {mic.isListening ? 'Listening…'
                 : mic.permissionError ? '🔒 Allow mic'
                 : 'Read Aloud'}
              </span>
              {mic.permissionError && (
                <span style={{ fontSize: '9px', color: '#fca5a5', textAlign: 'center', maxWidth: '90px', lineHeight: 1.4, marginTop: 2 }}>
                  {isIOS ? 'Settings → Safari → Mic' : 'Tap 🔒 → Site Settings → Mic'}
                </span>
              )}
              {/* Chrome on iOS — uses server-side STT fallback, works but slightly slower */}
              {isIOSChrome && !mic.isListening && !mic.permissionError && (
                <span style={{ fontSize: '9px', color: '#a7f3d0', textAlign: 'center', maxWidth: '100px', lineHeight: 1.4, marginTop: 2 }}>
                  🎤 Voice ready
                </span>
              )}
            </div>
          )}
        </div>

        {phase === 'reading' ? (
          <button className="reader-next-btn" onClick={handleNextPage}>
            {currentPage >= story.pages.length - 1 ? 'Finish 🎉' : 'Next ›'}
          </button>
        ) : <div style={{width:60}} />}
      </div>

      {/* XP Toast */}
      <AnimatePresence>
        {xpToast && (
          <motion.div key={xpToast.id} className="xp-toast"
            initial={{opacity:0,y:20,x:'-50%'}} animate={{opacity:1,y:0,x:'-50%'}} exit={{opacity:0,y:-30,x:'-50%'}} transition={{duration:0.3}}>
            ⭐ +{xpToast.amount} XP!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

