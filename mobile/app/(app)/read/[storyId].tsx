/**
 * BookReader — React Native (Phase 5)
 * Route: /read/[storyId]
 *
 * Phases: reading → quiz → comprehension → summary
 * Conversions:
 * - useSpeechSynthesis → expo-speech
 * - useSpeechRecognition → expo-speech (read-aloud only; STT removed per RN limitation)
 * - framer-motion → Animated
 * - localStorage → AsyncStorage (storage lib)
 * - router.useParams → useLocalSearchParams
 * - Word highlighting via React Native Text spans
 * - Quiz / comprehension fully ported
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Animated, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
// expo-speech removed: using Google Cloud TTS via tts.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { storiesApi, progressApi, rewardsApi, readingLogsApi } from '../../../src/lib/api'
import { storage } from '../../../src/lib/storage'
import { emitXpUpdate } from '../../../src/components/XpBadge'
import { onMuteChange } from '../../../src/components/MuteButton'
import { useDeviceLayout } from '../../../src/hooks/useDeviceLayout'
import { Audio } from 'expo-av'
import { googleSpeak, googleStop, unlockWebAudio } from '../../../src/lib/tts'
import { playCorrectSound, playWrongSound } from '../../../src/lib/sounds'

// @react-native-voice/voice requires a native build — not available in Expo Go.
// We load it lazily so the app doesn't crash in Expo Go.
type SpeechResultsEvent = { value?: string[] }
let Voice: any = null
try {
  Voice = require('@react-native-voice/voice').default
} catch {
  // Running in Expo Go or web — native STT unavailable, word tracking will be skipped on native
  console.log('[ReadAloud] @react-native-voice/voice not available (Expo Go or web)')
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

// ── Types ─────────────────────────────────────────────────────────────────────
interface StoryPage { id: string; page_number: number; content: string; media_url?: string }
interface QuizQuestion { id: string; story_page_id: string; question: string; choices: string[]; correct_answer: string; explanation?: string }
interface Story {
  id: string; title: string; grade_level: number; language: string
  pages: StoryPage[]; quiz_questions: QuizQuestion[]; cover_media_url?: string
}

// ── Shimmer placeholder for pending page images ───────────────────────────────
function ShimmerBox({ height, style }: { height: number; style?: any }) {
  const shimmer = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.65] })
  return (
    <Animated.View style={[{
      width: '100%', height, borderRadius: 16, overflow: 'hidden',
      backgroundColor: '#1a1a35', opacity,
    }, style]}>
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <Text style={{ fontSize: 28 }}>🎨</Text>
        <Text style={{ color: '#4a3a6a', fontSize: 12, fontWeight: '600' }}>Painting your scene…</Text>
      </View>
    </Animated.View>
  )
}

type Phase = 'loading' | 'reading' | 'quiz' | 'comprehension' | 'summary'

const COMP_MC = [
  {
    question: 'Who was the main character in the story?',
    choices: [
      'A brave hero or adventurer',
      'A curious child learning something new',
      'An animal with a special journey',
      'A young person solving a problem',
    ],
  },
  {
    question: 'What problem did the main character face?',
    choices: [
      'They had to be brave in a scary situation',
      'They needed to make a hard decision',
      'They faced something new and unfamiliar',
      'They had to work with others to succeed',
    ],
  },
  {
    question: 'How did the story end?',
    choices: [
      'The character solved the problem and felt proud',
      'Everyone worked together and things got better',
      'The character learned something important',
      'There was a happy and surprising ending',
    ],
  },
]

const LANG_MAP: Record<string, string> = {
  english: 'en-US', spanish: 'es-ES', french: 'fr-FR',
  portuguese: 'pt-BR', german: 'de-DE', italian: 'it-IT',
  mandarin: 'zh-CN', japanese: 'ja-JP', arabic: 'ar-SA',
}

// ── Mute state (synced with global MuteButton) ──────────────────────────────
let _isMuted = false
AsyncStorage.getItem('readquest_muted').then(v => { _isMuted = v === 'true' }).catch(() => { })

function tts(text: string, _lang = 'en-US') {
  if (_isMuted) return
  void googleSpeak(text, 'teacher')
}

// ── Quiz feedback voice — friendly male (Journey-D / Wavenet-B) ──────────────
function ttsQuiz(text: string) {
  if (_isMuted) return
  void googleSpeak(text, 'quiz')
}

// ── Quiz question voice — upbeat female (Journey-F / Wavenet-C, 1.05x speed) ─
function ttsQuizQuestion(text: string) {
  if (_isMuted) return
  void googleSpeak(text, 'quiz-q')
}

function getStars(pct: number) {
  if (pct >= 90) return 5; if (pct >= 75) return 4
  if (pct >= 60) return 3; if (pct >= 40) return 2; return 1
}

function resolveCover(url?: string): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${API_URL}${url}`
}

// ── Word Highlight Colours ────────────────────────────────────────────────────
const WORD_COLORS: Record<string, string> = {
  unread: '#8a7aaa',
  correct: '#22c55e',
  wrong: '#ef4444',
}

// ══════════════════════════════════════════════════════════════════════════════
export default function BookReaderScreen() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>()
  const insets = useSafeAreaInsets()
  const { isTablet } = useDeviceLayout()

  // ── Story State ───────────────────────────────────────────────────────────
  const [story, setStory] = useState<Story | null>(null)
  const [loadErr, setLoadErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')

  // ── Reading State ─────────────────────────────────────────────────────────
  const [wordStates, setWordStates] = useState<Record<number, 'correct' | 'wrong' | 'unread'>>({})
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [activeWordIdx, setActiveWordIdx] = useState<number>(-1) // karaoke highlight

  // ── Mic / fluency reading state ───────────────────────────────────────────────────
  type MicState = 'idle' | 'recording' | 'analyzing'
  const [micState, setMicState] = useState<MicState>('idle')
  const [micFeedback, setMicFeedback] = useState('')
  const [micAccuracy, setMicAccuracy] = useState<number | null>(null)
  const [liveWordIdx, setLiveWordIdx] = useState<number>(-1) // speech-recognition-driven highlight
  const recordingRef = useRef<Audio.Recording | null>(null)
  const recStartRef = useRef<number>(0)
  const liveWordCountRef = useRef<number>(0)

  // ── Web-only recording refs ───────────────────────────────────────────────
  const webMediaRecorderRef = useRef<MediaRecorder | null>(null)
  const webAudioChunksRef = useRef<Blob[]>([])
  const webStreamRef = useRef<MediaStream | null>(null)
  const webSpeechRecRef = useRef<any>(null)  // Web Speech API SpeechRecognition
  const voiceResultRef = useRef<string>('')  // Latest interim transcript

  // ── Silence detection refs ────────────────────────────────────────────────
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)  // 3s silence countdown
  const silenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null) // level polling
  const webAnalyserRef = useRef<AnalyserNode | null>(null)  // Web AudioContext analyser

  // ── Analyzing loader animation (3 bouncing dots) ──────────────────────────
  const loaderDot1 = useRef(new Animated.Value(0)).current
  const loaderDot2 = useRef(new Animated.Value(0)).current
  const loaderDot3 = useRef(new Animated.Value(0)).current

  // ── Quiz State ────────────────────────────────────────────────────────────
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quizIdx, setQuizIdx] = useState(0)
  const [selectedAns, setSelectedAns] = useState<string | null>(null)
  const [ansResult, setAnsResult] = useState<'correct' | 'wrong' | null>(null)
  const [quizResults, setQuizResults] = useState<{ correct: boolean }[]>([])
  const coinAnim = useRef(new Animated.Value(0)).current  // quiz coin pop
  const [showCoin, setShowCoin] = useState(false)
  const readCoinAnim = useRef(new Animated.Value(0)).current  // reading XP coin pop
  const [showReadCoin, setShowReadCoin] = useState(false)
  const [readCoinXp, setReadCoinXp] = useState(0)

  // ── Comprehension State ───────────────────────────────────────────────────
  const [compAnswers, setCompAnswers] = useState<string[]>(['', '', ''])
  const [summaryText, setSummaryText] = useState('')
  const [compLoading, setCompLoading] = useState(false)
  const [compScore, setCompScore] = useState(0)
  const [compFeedback, setCompFeedback] = useState('')
  const [compSubmitted, setCompSubmitted] = useState(false)

  // ── Summary State ─────────────────────────────────────────────────────────
  const [readingAcc, setReadingAcc] = useState(100)
  const [totalXP, setTotalXP] = useState(0)
  const [sessionStars, setSessionStars] = useState(3)

  // ── Page score accumulation ────────────────────────────────────────────────
  const pageScoresRef = useRef<{ correct: number; total: number }[]>([])
  const xpRef = useRef(0)
  const pageScrollRef = useRef<any>(null)

  // ── Progress animations ───────────────────────────────────────────────────
  const progressAnim = useRef(new Animated.Value(0)).current

  // ── Progressive image state (Phase 2 polling) ────────────────────────────
  // pageImageUrls mirrors story.pages[].media_url but updates live as Phase 2 completes.
  // null = still generating (show shimmer), string = ready (show image).
  const [pageImageUrls, setPageImageUrls] = useState<(string | null)[]>([])
  const [imagesAllReady, setImagesAllReady] = useState(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Fade-in Animated values per page — one per page, populated when story loads
  const imageFadeAnims = useRef<Animated.Value[]>([])

  const lang = LANG_MAP[(story?.language ?? 'english').toLowerCase()] ?? 'en-US'
  const page = story?.pages[currentPage]
  const words = page?.content.split(/\s+/).filter(Boolean) ?? []
  const progress = story ? ((currentPage + 1) / story.pages.length) * 100 : 0

  // ── Subscribe to mute changes so _isMuted stays live ──────────────────
  const [muteState, setMuteState] = useState(_isMuted)
  useEffect(() => {
    const unsub = onMuteChange(muted => {
      _isMuted = muted
      setMuteState(muted)
      if (muted) { void googleStop(); setIsSpeaking(false) }
    })
    return () => { unsub() }
  }, [])

  // ── Load Story ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!storyId) return
    storiesApi.get(storyId)
      .then(async r => {
        const s = r.data as Story
        setStory(s)

        // Seed progressive image state from what the API already returned
        const initialUrls = s.pages.map(p => p.media_url ?? null)
        setPageImageUrls(initialUrls)

        // Pre-build one Animated.Value per page for fade-in
        imageFadeAnims.current = s.pages.map((p, i) =>
          new Animated.Value(initialUrls[i] ? 1 : 0)
        )

        const prog = await progressApi.getProgress(storyId)
        // Restore page position: lastPage is 1-indexed from saveProgress,
        // convert back to 0-indexed. Only restore if partially read (not at start or end).
        if (prog && prog.lastPage > 1 && prog.lastPage < s.pages.length) {
          // lastPage=3 means "saw up to page 3" → 0-indexed = page 2
          setCurrentPage(prog.lastPage - 1)
        }
        setLoading(false)
        setPhase('reading')
      })
      .catch(() => { setLoadErr('Could not load story. Please go back and try again.'); setLoading(false) })
  }, [storyId])

  // ── Phase 2 polling — stop once all images are ready ─────────────────────
  useEffect(() => {
    if (!storyId || imagesAllReady || !story) return

    // If all pages already have images (e.g. viewed after full completion), skip polling
    const allAlreadyReady = pageImageUrls.length > 0 && pageImageUrls.every(Boolean)
    if (allAlreadyReady) { setImagesAllReady(true); return }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await storiesApi.getStatus(storyId)
        const status = res.data
        if (!status) return

        // Fetch fresh page data if any new images are ready
        const hasNewImages = status.pages.some((ready: boolean, i: number) => ready && !pageImageUrls[i])
        if (hasNewImages) {
          const freshRes = await storiesApi.get(storyId)
          const fresh = freshRes.data as Story
          const newUrls = fresh.pages.map((p: StoryPage) => p.media_url ?? null)
          setPageImageUrls(prev => {
            newUrls.forEach((url, i) => {
              if (url && !prev[i]) {
                // Trigger fade-in for newly arrived image
                const anim = imageFadeAnims.current[i]
                if (anim) Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }).start()
              }
            })
            return newUrls
          })
          // Also update pages in story for cover display
          setStory(fresh)
        }

        if (status.all_ready) {
          setImagesAllReady(true)
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          console.log('[Polling] ✓ All page images ready')
        }
      } catch (e) {
        console.warn('[Polling] Status check failed:', e)
      }
    }, 3000)

    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current) }
  }, [storyId, story, imagesAllReady])

  // ── Progress bar animation ────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(progressAnim, { toValue: progress, duration: 400, useNativeDriver: false }).start()
  }, [progress])

  // ── Auto-save progress on page change & unmount ──────────────────────────
  // Use refs so the cleanup closure always has the latest values
  const currentPageRef = useRef(currentPage)
  const storyRef = useRef(story)
  currentPageRef.current = currentPage
  storyRef.current = story
  useEffect(() => {
    if (!story) return
    // Don't save on initial mount (page 0) — only save when user actually advances
    if (currentPage === 0) return
    const pageNum = currentPage + 1          // 1-indexed "I've seen up to page N"
    const total = story.pages.length
    progressApi.saveProgress(story.id, pageNum, total).catch(() => { })

    // On unmount: save final position (only if past page 0)
    return () => {
      const s = storyRef.current
      const p = currentPageRef.current
      if (s && p > 0) {
        progressApi.saveProgress(s.id, p + 1, s.pages.length).catch(() => { })
      }
    }
  }, [currentPage, story?.id])

  // ── Scroll to top on every page change ───────────────────────────────────
  useEffect(() => {
    setTimeout(() => pageScrollRef.current?.scrollTo({ y: 0, animated: false }), 50)
  }, [currentPage])

  // ── TTS for page turn ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'reading' || !page || loading) return
    setWordStates({})
    setIsSpeaking(false)
    setMicState('idle')
    setMicAccuracy(null)
    setMicFeedback('')
    setLiveWordIdx(-1)
    liveWordCountRef.current = 0
    stopSpeechTracking()
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => { })
      recordingRef.current = null
      Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true }).catch(() => { })
    }
  }, [currentPage, phase]) // eslint-disable-line

  const handleReadAloud = () => {
    // Unlock browser AudioContext synchronously (must be in user gesture)
    unlockWebAudio()

    if (muteState) {
      Alert.alert('Sound is off', 'Tap the 🔊 button in the header to unmute.')
      return
    }
    if (isSpeaking) {
      void googleStop()
      setIsSpeaking(false)
      setActiveWordIdx(-1)
      return
    }
    setIsSpeaking(true)
    setActiveWordIdx(0)
    void googleSpeak(
      page?.content ?? '',
      'story',
      () => { setIsSpeaking(false); setActiveWordIdx(-1) },
      words.length,
      (idx) => setActiveWordIdx(idx),
    )
  }

  const toggleWord = (idx: number) => {
    Haptics.selectionAsync()
    setWordStates(prev => ({
      ...prev,
      [idx]: prev[idx] === 'correct' ? 'wrong' : prev[idx] === 'wrong' ? 'unread' : 'correct',
    }))
  }

  // ── Speech recognition word tracking (replaces dB metering) ─────────────
  // Fuzzy match: normalize both strings, count how many source words appear in transcript
  const matchSpokenWords = useCallback((transcript: string, sourceWords: string[]): number => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
    const spoken = normalize(transcript).split(/\s+/).filter(Boolean)
    if (spoken.length === 0) return 0

    // Find the rightmost source word that appears in the spoken transcript
    let matchedUpTo = 0
    let spokenIdx = 0
    for (let i = 0; i < sourceWords.length && spokenIdx < spoken.length; i++) {
      const src = normalize(sourceWords[i])
      if (src === spoken[spokenIdx] || (src.length > 2 && spoken[spokenIdx].includes(src)) || (spoken[spokenIdx].length > 2 && src.includes(spoken[spokenIdx]))) {
        matchedUpTo = i + 1
        spokenIdx++
      }
    }
    return matchedUpTo
  }, [])

  // Start real-time speech recognition for word tracking
  const startSpeechTracking = useCallback(() => {
    liveWordCountRef.current = 0
    voiceResultRef.current = ''
    setLiveWordIdx(-1)

    if (Platform.OS === 'web') {
      // ── Web: use browser SpeechRecognition ────────────────────────────
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRec) {
        console.warn('[ReadAloud] SpeechRecognition not supported in this browser')
        return
      }
      const recognition = new SpeechRec()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = lang

      recognition.onresult = (event: any) => {
        let transcript = ''
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' '
        }
        transcript = transcript.trim()
        voiceResultRef.current = transcript

        // Match spoken words to source text
        const matched = matchSpokenWords(transcript, words)
        if (matched > liveWordCountRef.current) {
          liveWordCountRef.current = matched
          setLiveWordIdx(matched - 1)
        }
      }

      recognition.onerror = (e: any) => {
        console.warn('[ReadAloud] SpeechRecognition error:', e.error)
      }

      recognition.start()
      webSpeechRecRef.current = recognition
      console.log('[ReadAloud] Web SpeechRecognition started')

    } else {
      // ── Native: use @react-native-voice/voice ───────────────────────
      if (Voice) {
        Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
          const transcript = (e.value ?? [])[0] ?? ''
          voiceResultRef.current = transcript
          const matched = matchSpokenWords(transcript, words)
          if (matched > liveWordCountRef.current) {
            liveWordCountRef.current = matched
            setLiveWordIdx(matched - 1)
          }
        }

        Voice.onSpeechResults = (e: SpeechResultsEvent) => {
          const transcript = (e.value ?? [])[0] ?? ''
          voiceResultRef.current = transcript
          const matched = matchSpokenWords(transcript, words)
          if (matched > liveWordCountRef.current) {
            liveWordCountRef.current = matched
            setLiveWordIdx(matched - 1)
          }
        }

        Voice.onSpeechError = (e: any) => {
          console.warn('[ReadAloud] Voice error:', e)
        }

        Voice.start(lang).catch((err: any) => {
          console.warn('[ReadAloud] Voice.start failed:', err)
        })
        console.log('[ReadAloud] Native Voice recognition started')
      } else {
        console.log('[ReadAloud] Native STT not available (Expo Go) — skipping word tracking')
      }
    }
  }, [words, lang, matchSpokenWords])

  // Stop speech recognition tracking
  const stopSpeechTracking = useCallback(() => {
    if (Platform.OS === 'web') {
      try { webSpeechRecRef.current?.stop() } catch {}
      webSpeechRecRef.current = null
    } else if (Voice) {
      Voice.stop().catch(() => {})
      Voice.destroy().catch(() => {})
    }
  }, [])
  // ── Loader dot animation helpers ─────────────────────────────────────────
  const startLoaderAnim = () => {
    const bounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -10, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,   duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start()
    loaderDot1.setValue(0); loaderDot2.setValue(0); loaderDot3.setValue(0)
    bounce(loaderDot1, 0)
    bounce(loaderDot2, 150)
    bounce(loaderDot3, 300)
  }
  const stopLoaderAnim = () => {
    loaderDot1.stopAnimation(); loaderDot2.stopAnimation(); loaderDot3.stopAnimation()
  }

  // ── Silence: clear timers ─────────────────────────────────────────────────
  const clearSilenceTracking = () => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    if (silenceIntervalRef.current) { clearInterval(silenceIntervalRef.current); silenceIntervalRef.current = null }
  }

  const startMicReading = async () => {
    try {
      void googleStop(); setIsSpeaking(false)
      setMicFeedback(''); setMicAccuracy(null)
      setLiveWordIdx(-1)
      liveWordCountRef.current = 0
      clearSilenceTracking()

      const resetSilenceTimer = (autoStop: () => void) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = setTimeout(() => {
          console.log('[Silence] 3s silence — auto stopping')
          clearSilenceTracking()
          autoStop()
        }, 3000)
      }

      // ── Web path ─────────────────────────────────────────────────────
      if (Platform.OS === 'web') {
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch {
          Alert.alert('Microphone Access Needed', 'Please allow microphone access in your browser to use Read Aloud.')
          return
        }
        webStreamRef.current = stream
        webAudioChunksRef.current = []

        // Silence detection via AnalyserNode
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
          const source = audioCtx.createMediaStreamSource(stream)
          const analyser = audioCtx.createAnalyser()
          analyser.fftSize = 512
          source.connect(analyser)
          webAnalyserRef.current = analyser
          const buf = new Uint8Array(analyser.frequencyBinCount)
          resetSilenceTimer(() => void stopMicReading())
          silenceIntervalRef.current = setInterval(() => {
            if (!webAnalyserRef.current) return
            webAnalyserRef.current.getByteTimeDomainData(buf)
            const rms = Math.sqrt(buf.reduce((s, v) => s + (v - 128) ** 2, 0) / buf.length)
            if (rms > 5) resetSilenceTimer(() => void stopMicReading())
          }, 200)
        } catch (e) { console.warn('[Silence] AnalyserNode error:', e) }

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus' : 'audio/webm'
        const recorder = new MediaRecorder(stream, { mimeType })
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) webAudioChunksRef.current.push(e.data)
        }
        recorder.start(100)
        webMediaRecorderRef.current = recorder
        recStartRef.current = Date.now()
        setMicState('recording')
        startSpeechTracking()
        return
      }

      // ── Native path ─────────────────────────────────────────────────────
      const { granted } = await Audio.requestPermissionsAsync()
      if (!granted) {
        Alert.alert('Microphone Access Needed', 'Please allow microphone access in your device settings to use Read Aloud.')
        return
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      })
      recordingRef.current = recording
      recStartRef.current = Date.now()
      setMicState('recording')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      startSpeechTracking()
      // Silence detection via metering (-40 dB threshold)
      resetSilenceTimer(() => void stopMicReading())
      silenceIntervalRef.current = setInterval(async () => {
        try {
          const status = await recording.getStatusAsync()
          if (!status.isRecording) { clearSilenceTracking(); return }
          if ((status.metering ?? -160) > -40) resetSilenceTimer(() => void stopMicReading())
        } catch { clearSilenceTracking() }
      }, 200)
    } catch (e) {
      Alert.alert('Could not start microphone', 'Please try again.')
    }
  }

  // ── Mic: stop + analyze ────────────────────────────────────────────────
  const stopMicReading = async () => {
    stopSpeechTracking()
    setLiveWordIdx(-1)
    clearSilenceTracking()  // cancel any pending silence auto-stop
    webAnalyserRef.current = null
    startLoaderAnim()       // start the bouncing dots while analyzing

    // ── Web path ──────────────────────────────────────────────────────────
    if (Platform.OS === 'web') {
      const recorder = webMediaRecorderRef.current
      if (!recorder) return
      webMediaRecorderRef.current = null
      setMicState('analyzing')

      const duration = (Date.now() - recStartRef.current) / 1000

      if (duration < 1) {
        Alert.alert('Too short', 'Please read for at least a second before tapping Stop & Check.')
        stopLoaderAnim(); setMicState('idle')
        return
      }

      // Stop stream tracks
      webStreamRef.current?.getTracks().forEach(t => t.stop())
      webStreamRef.current = null


      // Wait for recorder to finish flushing chunks
      await new Promise<void>(resolve => {
        recorder.onstop = () => resolve()
        if (recorder.state !== 'inactive') recorder.stop()
        else resolve()
      })

      try {
        const mimeType = webAudioChunksRef.current[0]?.type || 'audio/webm'
        const blob = new Blob(webAudioChunksRef.current, { type: mimeType })
        webAudioChunksRef.current = []

        const studentId = await storage.getString('readquest_student_id') ?? 'unknown'

        // Step 1: STT transcription
        const sttForm = new FormData()
        sttForm.append('audio', blob, 'reading.webm')
        sttForm.append('lang', lang)
        console.log('[STT] Sending web audio to backend:', { size: blob.size, duration, lang })

        const sttRes = await fetch(`${API_URL}/api/stt/transcribe`, { method: 'POST', body: sttForm })
        if (!sttRes.ok) throw new Error(`STT failed: ${sttRes.status}`)

        const sttData = await sttRes.json()
        const transcript = (sttData.text ?? '').trim()
        console.log('[STT] Transcript:', transcript)

        if (!transcript) {
          Alert.alert("Couldn't hear you", "We didn't catch any speech. Make sure your microphone is working and try again.")
          return
        }

        // Step 2: Fluency analysis
        const res = await fetch(`${API_URL}/api/fluency/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-student-id': studentId },
          body: JSON.stringify({
            story_id: storyId,
            page_number: page?.page_number ?? currentPage + 1,
            transcript,
            source_text: page?.content ?? '',
            duration_secs: duration,
          }),
        })
        if (!res.ok) throw new Error(`Fluency HTTP ${res.status}`)
        const result = await res.json()

        const errorSet = new Set<number>((result.word_errors ?? []).map((e: any) => e.word_index))
        const newStates: Record<number, 'correct' | 'wrong' | 'unread'> = {}
        words.forEach((_, i) => { newStates[i] = errorSet.has(i) ? 'wrong' : 'correct' })
        setWordStates(newStates)
        setMicAccuracy(result.accuracy_pct ?? null)
        setMicFeedback(result.feedback ?? '')
        // Award tiered XP based on reading accuracy
        const acc = result.accuracy_pct ?? 0
        const readXp = getReadingXp(acc)
        if (readXp > 0) {
          storage.get<number>('readquest_xp').then(v => {
            const newTotal = (v ?? 0) + readXp
            storage.set('readquest_xp', newTotal)
            emitXpUpdate(newTotal, readXp)
          })
          showReadingCoinPop(readXp)
        }
        if (!_isMuted && result.feedback) {
          setTimeout(() => void googleSpeak(result.feedback, 'teacher'), 300)
        }
      } catch (err) {
        console.error('[ReadAloud] Web analysis error:', err)
        Alert.alert('Analysis failed', 'Could not analyze your reading. Please check your connection and try again.')
      } finally {
        stopLoaderAnim(); setMicState('idle')
      }
      return
    }

    // ── Native path (unchanged) ────────────────────────────────────────────
    const rec = recordingRef.current
    if (!rec) return
    recordingRef.current = null
    setMicState('analyzing')
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      await rec.stopAndUnloadAsync()
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true })

      const uri = rec.getURI()
      if (!uri) throw new Error('no uri')

      const duration = (Date.now() - recStartRef.current) / 1000

      if (duration < 1) {
        Alert.alert('Too short', 'Please read for at least a second before tapping Stop & Check.')
        return
      }

      const studentId = await storage.getString('readquest_student_id') ?? 'unknown'

      const sttForm = new FormData()
      sttForm.append('audio', { uri, type: 'audio/m4a', name: 'reading.m4a' } as any)
      sttForm.append('lang', lang)

      console.log('[STT] Sending audio to backend:', { uri, duration, lang })

      const sttRes = await fetch(`${API_URL}/api/stt/transcribe`, { method: 'POST', body: sttForm })
      if (!sttRes.ok) {
        const errText = await sttRes.text().catch(() => sttRes.status.toString())
        console.error('[STT] Failed:', sttRes.status, errText)
        throw new Error(`STT failed: ${sttRes.status}`)
      }

      const sttData = await sttRes.json()
      const transcript = (sttData.text ?? '').trim()
      console.log('[STT] Transcript:', transcript)

      if (!transcript) {
        Alert.alert("Couldn't hear you", "We didn't catch any speech. Make sure your microphone is working and try again.")
        return
      }

      const res = await fetch(`${API_URL}/api/fluency/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-student-id': studentId },
        body: JSON.stringify({
          story_id: storyId,
          page_number: page?.page_number ?? currentPage + 1,
          transcript,
          source_text: page?.content ?? '',
          duration_secs: duration,
        }),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => res.status.toString())
        console.error('[Fluency] Failed:', res.status, errText)
        throw new Error(`Fluency HTTP ${res.status}`)
      }
      const result = await res.json()

      const errorSet = new Set<number>((result.word_errors ?? []).map((e: any) => e.word_index))
      const newStates: Record<number, 'correct' | 'wrong' | 'unread'> = {}
      words.forEach((_, i) => { newStates[i] = errorSet.has(i) ? 'wrong' : 'correct' })
      setWordStates(newStates)
      setMicAccuracy(result.accuracy_pct ?? null)
      setMicFeedback(result.feedback ?? '')
      // Award tiered XP based on reading accuracy
      const acc = result.accuracy_pct ?? 0
      const readXp = getReadingXp(acc)
      Haptics.notificationAsync(
        acc >= 77
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      )
      if (readXp > 0) {
        storage.get<number>('readquest_xp').then(v => {
          const newTotal = (v ?? 0) + readXp
          storage.set('readquest_xp', newTotal)
          emitXpUpdate(newTotal, readXp)
        })
        showReadingCoinPop(readXp)
        void playCorrectSound()
      }
      if (!_isMuted && result.feedback) {
        setTimeout(() => void googleSpeak(result.feedback, 'teacher'), 300)
      }
    } catch (err) {
      console.error('[ReadAloud] Analysis error:', err)
      Alert.alert('Analysis failed', 'Could not analyze your reading. Please check your connection and try again.')
    } finally {
      stopLoaderAnim(); setMicState('idle')
    }
  }

  // ── XP tiers based on reading accuracy (Read Aloud) ─────────────────────────
  function getReadingXp(accuracy: number): number {
    if (accuracy >= 96) return 100
    if (accuracy >= 90) return 75
    if (accuracy >= 80) return 50
    if (accuracy >= 75) return 25
    return 0  // below 75% = no XP
  }

  function showReadingCoinPop(xp: number) {
    setReadCoinXp(xp)
    setShowReadCoin(true)
    readCoinAnim.setValue(0)
    Animated.sequence([
      Animated.timing(readCoinAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(readCoinAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setShowReadCoin(false))
  }

  // ── Advance page → quiz → comprehension ──────────────────────────────────
  const handleNextPage = useCallback(() => {
    if (!story || !page) return
    void googleStop()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    // Compute page score from tap-marked words
    const correct = Object.values(wordStates).filter(v => v === 'correct').length
    const total = words.length
    pageScoresRef.current.push({ correct, total })
    progressApi.markPageRead(story.id, page.page_number).catch(() => { })
    rewardsApi.recordActivity().catch(() => { })

    const xp = 5 + Math.round((correct / Math.max(total, 1)) * 10)
    xpRef.current += xp
    storage.get<number>('readquest_xp').then(v => {
      const newTotal = (v ?? 0) + xp
      storage.set('readquest_xp', newTotal)
      emitXpUpdate(newTotal, xp)
    })

    // Check for quiz questions on this page
    const pageQs = story.quiz_questions.filter(q => q.story_page_id === page.id)
    if (pageQs.length > 0) {
      setQuizQuestions(pageQs)
      setQuizIdx(0)
      setSelectedAns(null)
      setAnsResult(null)
      setPhase('quiz')
      // Play intro FIRST, then read Q1 only after it fully finishes (onDone chain)
      // This prevents the question from cutting off the intro mid-sentence
      setTimeout(() => {
        if (!_isMuted) {
          void googleSpeak(
            "Time for a quick quiz! Let's see what you remember.",
            'quiz',
            () => {
              // onDone: intro finished — now read Q1 after a short breath
              const q1 = pageQs[0]
              if (q1) setTimeout(() => ttsQuizQuestion(q1.question), 400)
            },
          )
        }
      }, 300)
      return
    }
    advancePage()
  }, [story, page, wordStates, words.length])

  const advancePage = useCallback(() => {
    if (!story) return
    if (currentPage >= story.pages.length - 1) {
      // Book complete
      finishBook()
    } else {
      const next = currentPage + 1
      setCurrentPage(next)
      setPhase('reading')
      progressApi.saveProgress(story.id, next, story.pages.length).catch(() => { })
    }
  }, [story, currentPage])

  const finishBook = useCallback(() => {
    if (!story) return
    progressApi.markBookComplete(story.id).catch(() => { })
    progressApi.saveProgress(story.id, story.pages.length, story.pages.length).catch(() => { })
    rewardsApi.completeStory(story.id).catch(() => { })
    // Compute reading accuracy from page scores
    const allCorrect = pageScoresRef.current.reduce((a, s) => a + s.correct, 0)
    const allTotal = pageScoresRef.current.reduce((a, s) => a + s.total, 0)
    const readAcc = allTotal > 0 ? Math.round((allCorrect / allTotal) * 100) : 100
    setReadingAcc(readAcc)
    setPhase('comprehension')
    setTimeout(() => tts("Amazing! You finished the book! Now let's answer a few questions.", lang), 300)
  }, [story])

  // ── Quiz logic ─────────────────────────────────────────────────────────────
  const handleAnswer = (choice: string) => {
    if (selectedAns) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setSelectedAns(choice)
    const correct = choice === quizQuestions[quizIdx]?.correct_answer
    setAnsResult(correct ? 'correct' : 'wrong')
    setQuizResults(prev => [...prev, { correct }])
    if (correct) {
      // ✅ Correct: ding + coin pop animation + +25 XP + male feedback voice
      void playCorrectSound()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      // +25 XP — show animated coin badge
      storage.get<number>('readquest_xp').then(v => {
        const newTotal = (v ?? 0) + 25
        storage.set('readquest_xp', newTotal)
        emitXpUpdate(newTotal, 25)  // triggers global XpBadge +25 delta animation
      })
      // Local coin pop: float up + fade in quiz card
      setShowCoin(true)
      coinAnim.setValue(0)
      Animated.sequence([
        Animated.timing(coinAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(700),
        Animated.timing(coinAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => setShowCoin(false))
      ttsQuiz(`Great job! That's correct! ${quizQuestions[quizIdx]?.explanation ?? ''}`)
    } else {
      // ❌ Wrong: buzz + male feedback voice (no XP)
      void playWrongSound()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      ttsQuiz(`Good try! The answer is ${quizQuestions[quizIdx]?.correct_answer}. ${quizQuestions[quizIdx]?.explanation ?? ''}`)
    }
  }

  const handleQuizContinue = () => {
    const next = quizIdx + 1
    if (next < quizQuestions.length) {
      setQuizIdx(next)
      setSelectedAns(null)
      setAnsResult(null)
    } else {
      setPhase('reading')
      advancePage()
    }
  }

  // ── Auto-read Q2+ questions after answer feedback finishes ──────────────────
  // Q1 is handled via the intro onDone chain (intro → 400ms → Q1 question).
  // This effect only fires for Q2, Q3, etc. — 1.2s after the student taps Next.
  useEffect(() => {
    if (phase !== 'quiz' || quizQuestions.length === 0 || quizIdx === 0) return
    const q = quizQuestions[quizIdx]
    if (!q) return
    console.log(`[Quiz] Will read Q${quizIdx + 1} in 1200ms`)
    const timer = setTimeout(() => {
      ttsQuizQuestion(q.question)
    }, 1200)
    return () => clearTimeout(timer)
  }, [phase, quizIdx, quizQuestions])

  // ── Comprehension submit ───────────────────────────────────────────────────
  const handleCompSubmit = async () => {
    setCompLoading(true)
    void googleStop()
    const allText = story?.pages.map(p => p.content).join(' ') ?? ''
    let score = 50; let feedback = 'Great effort reading this story!'
    try {
      const res = await fetch(`${API_URL}/api/stories/grade-comprehension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story_text: allText,
          qa_answers: COMP_MC.map((q, i) => ({ question: q.question, answer: compAnswers[i] ?? '' })),
        }),
      })
      const data = await res.json()
      score = data.score ?? 50
      feedback = data.feedback ?? 'Great job reading!'
    } catch {
      // Local fallback
      const ansText = compAnswers.join(' ')
      const kw = allText.toLowerCase().split(/\W+/).filter(w => w.length > 4)
      const ansSet = new Set(ansText.toLowerCase().split(/\W+/))
      score = Math.min(100, Math.round((kw.filter(k => ansSet.has(k)).length / Math.max(kw.length * 0.15, 1)) * 100))
    }

    setCompScore(score)
    setCompFeedback(feedback)
    setCompSubmitted(true)
    setCompLoading(false)

    const readAcc = readingAcc
    const overallPct = Math.round(readAcc * 0.7 + score * 0.3)
    const xpBase = 50 + Math.round(score * 0.5)
    xpRef.current += xpBase

    const qCorrect = quizResults.filter(r => r.correct).length
    const qTotal = quizResults.length
    const stars = getStars(overallPct)
    setSessionStars(stars)
    setTotalXP(xpRef.current)

    storage.get<number>('readquest_xp').then(v => {
      const newTotal = (v ?? 0) + xpBase
      storage.set('readquest_xp', newTotal)
      emitXpUpdate(newTotal, xpBase)
    })

    if (story) {
      const coverUrl = resolveCover(story.cover_media_url) ?? undefined
      storage.getString('readquest_student_name').then(name => {
        readingLogsApi.saveLog({
          storyId: story.id, storyTitle: story.title, gradeLevel: story.grade_level,
          coverUrl, studentName: name ?? undefined,
          readingAccuracy: readAcc, quizScore: qCorrect, quizTotal: qTotal,
          comprehensionScore: score, totalXp: xpBase, stars, feedback,
        }).catch(() => { })
      })
    }

    setTimeout(() => setPhase('summary'), 1500)
    rewardsApi.recordActivity().catch(() => { })
    if (overallPct >= 77) {
      tts('Wonderful! You did an amazing job! You should be so proud of yourself!', lang)
    } else {
      tts(`Good effort! You scored ${overallPct} percent. Try reading again to beat 77 percent!`, lang)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#0d0d1f', alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
      <ActivityIndicator size="large" color="#702AE1" />
      <Text style={{ color: '#8a7aaa', marginTop: 12 }}>Loading story…</Text>
    </View>
  )

  if (loadErr) return (
    <View style={{ flex: 1, backgroundColor: '#0d0d1f', alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: insets.top }}>
      <Text style={{ fontSize: 48 }}>📖</Text>
      <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>{loadErr}</Text>
      <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#702AE1', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13, marginTop: 20 }}>
        <Text style={{ color: '#fff', fontWeight: '800' }}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  )

  // ── READING PHASE ─────────────────────────────────────────────────────────
  if (phase === 'reading' && page) {
    const coverUrl = resolveCover(story?.cover_media_url)

    return (
      <View style={{ flex: 1, backgroundColor: '#0d0d1f', paddingTop: insets.top }}>
        {/* Progress bar */}
        <View style={{ height: 4, backgroundColor: '#1a1a35' }}>
          <Animated.View style={{
            height: 4, backgroundColor: '#702AE1',
            width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] })
          }} />
        </View>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
          borderBottomWidth: 1, borderBottomColor: '#702AE122'
        }}>
          <TouchableOpacity onPress={() => { void googleStop(); router.back() }} style={{ marginRight: 10 }}>
            <Text style={{ color: '#8a7aaa', fontSize: 13 }}>← Library</Text>
          </TouchableOpacity>
          <Text style={{ color: '#B28CFF', fontWeight: '800', fontSize: 13, flex: 1 }} numberOfLines={1}>{story?.title}</Text>
          <Text style={{ color: '#6b5d80', fontSize: 11 }}>p.{currentPage + 1}/{story?.pages.length}</Text>
        </View>

        <ScrollView ref={pageScrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

          {/* Page illustration — full image visible with page number badge */}
          {(() => {
            const imageHeight = isTablet ? 380 : 280
            const liveUrl = pageImageUrls[currentPage] ?? page.media_url ?? null
            const coverFallback = resolveCover(story?.cover_media_url)
            const fadeAnim = imageFadeAnims.current[currentPage] ?? new Animated.Value(liveUrl ? 1 : 0)
            const displayUrl = liveUrl
              ? (liveUrl.startsWith('http') ? liveUrl : `${API_URL}${liveUrl}`)
              : coverFallback

            return (
              <View style={{ width: '100%', height: imageHeight, borderRadius: 16, marginBottom: 16, overflow: 'hidden', backgroundColor: '#0d0820' }}>
                {displayUrl ? (
                  <Animated.View style={{ width: '100%', height: '100%', opacity: liveUrl ? fadeAnim : 1 }}>
                    <Image
                      source={{ uri: displayUrl }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="contain"
                      contentPosition="center"
                    />
                    {/* Subtle overlay when showing cover as placeholder */}
                    {!liveUrl && (
                      <View style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(8,4,24,0.35)',
                        alignItems: 'center', justifyContent: 'flex-end',
                        paddingBottom: 12,
                      }}>
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 6,
                          backgroundColor: 'rgba(20,10,50,0.85)',
                          borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
                          borderWidth: 1, borderColor: 'rgba(178,140,255,0.3)',
                        }}>
                          <ActivityIndicator size="small" color="#B28CFF" />
                          <Text style={{ color: '#B28CFF', fontSize: 11, fontWeight: '700' }}>Painting your scene…</Text>
                        </View>
                      </View>
                    )}
                  </Animated.View>
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#702AE1" />
                    <Text style={{ color: '#4a3a6a', fontSize: 12, marginTop: 8 }}>Loading…</Text>
                  </View>
                )}

                {/* Page number badge — always visible bottom-right */}
                <View style={{
                  position: 'absolute', bottom: 10, right: 10,
                  backgroundColor: 'rgba(10,6,30,0.82)',
                  borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
                  borderWidth: 1, borderColor: 'rgba(178,140,255,0.25)',
                }}>
                  <Text style={{ color: '#B28CFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                    Page {currentPage + 1} of {story?.pages.length}
                  </Text>
                </View>
              </View>
            )
          })()}

          {/* Page content with tappable words */}
          <View style={{ marginBottom: 24 }}>
            {/* Legend */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
              <Text style={{ color: '#6b5d80', fontSize: 11, fontWeight: '600' }}>Tap words as you read:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ backgroundColor: '#22c55e33', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#22c55e88' }}>
                  <Text style={{ color: '#22c55e', fontSize: 10, fontWeight: '700' }}>✓ Read it</Text>
                </View>
                <View style={{ backgroundColor: '#ef444433', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#ef444488' }}>
                  <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700' }}>✗ Needs work</Text>
                </View>
              </View>
            </View>

            {/* Words */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {words.map((word, idx) => {
                const state = wordStates[idx] ?? 'unread'
                const isCorrect = state === 'correct'
                const isWrong = state === 'wrong'
                return (
                  <TouchableOpacity
                    key={`${idx}-${state}`}
                    onPress={() => toggleWord(idx)}
                    activeOpacity={0.65}
                    style={{
                      backgroundColor: isCorrect
                        ? 'rgba(34,197,94,0.20)'
                        : isWrong
                          ? 'rgba(239,68,68,0.20)'
                          : 'transparent',
                      borderRadius: 6,
                      borderWidth: isCorrect || isWrong ? 1.5 : 0,
                      borderColor: isCorrect ? '#22c55e' : isWrong ? '#ef4444' : 'transparent',
                      paddingHorizontal: 3,
                      paddingVertical: 2,
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{
                      color: isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#e0d8f0',
                      fontSize: isTablet ? 22 : 18,
                      lineHeight: isTablet ? 34 : 28,
                      fontWeight: isCorrect || isWrong ? '700' : '400',
                      textDecorationLine: isWrong ? 'underline' : 'none',
                    }}>{word}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Mic result card — shows after analysis */}
          {micAccuracy !== null && (
            <View style={{ position: 'relative' }}>
              <View style={{
                backgroundColor: micAccuracy >= 77 ? '#22c55e15' : '#f59e0b15',
                borderRadius: 14, padding: 14, marginBottom: 10,
                borderWidth: 1, borderColor: micAccuracy >= 77 ? '#22c55e44' : '#f59e0b44',
              }}>
                <Text style={{ color: micAccuracy >= 77 ? '#22c55e' : '#f59e0b', fontWeight: '800', fontSize: 15, marginBottom: 4 }}>
                  {micAccuracy >= 96 ? '🏆 Perfect Reading!' : micAccuracy >= 90 ? '⭐ Excellent Reading!' : micAccuracy >= 80 ? '🌟 Great Reading!' : micAccuracy >= 75 ? '👍 Good Job!' : '💪 Keep Practicing!'} {micAccuracy}% accuracy
                </Text>
                {getReadingXp(micAccuracy) > 0 && (
                  <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 13, marginBottom: 4 }}>
                    ⚡ +{getReadingXp(micAccuracy)} XP earned!
                  </Text>
                )}
                {!!micFeedback && (
                  <Text style={{ color: '#ccc4e0', fontSize: 13, lineHeight: 20 }}>{micFeedback}</Text>
                )}
                <Text style={{ color: '#6b5d80', fontSize: 11, marginTop: 6 }}>
                  🟢 Green = read correctly · 🔴 Red = needs more practice
                </Text>
              </View>

              {/* Reading XP coin pop animation */}
              {showReadCoin && (
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: -10,
                    alignSelf: 'center',
                    zIndex: 999,
                    opacity: readCoinAnim,
                    transform: [{
                      translateY: readCoinAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -65] }),
                    }, {
                      scale: readCoinAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.5, 1.3, 1] }),
                    }],
                  }}
                >
                  <View style={{
                    backgroundColor: '#1a0f00',
                    borderColor: '#FFD700',
                    borderWidth: 2,
                    borderRadius: 30,
                    paddingHorizontal: 18,
                    paddingVertical: 9,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    shadowColor: '#FFD700',
                    shadowOpacity: 0.9,
                    shadowRadius: 14,
                    elevation: 12,
                  }}>
                    <Text style={{ fontSize: 20 }}>⚡</Text>
                    <Text style={{ color: '#FFD700', fontSize: 20, fontWeight: '900', letterSpacing: 1 }}>+{readCoinXp} XP</Text>
                  </View>
                </Animated.View>
              )}
            </View>
          )}

          {/* Controls */}
          <View style={{ gap: 10 }}>

            {/* Row: AI Listen + Read Aloud mic */}
            <View style={{ flexDirection: 'row', gap: 10 }}>

            {/* ▶ AI Listen — modern play icon */}
              <TouchableOpacity
                onPress={handleReadAloud}
                disabled={micState !== 'idle'}
                style={{
                  flex: 1,
                  backgroundColor: isSpeaking ? '#702AE130' : '#1a1a35',
                  borderRadius: 16, padding: 14,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: isSpeaking ? '#702AE1' : '#2a2a4a',
                  opacity: micState !== 'idle' ? 0.4 : 1,
                  gap: 4,
                }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: isSpeaking ? '#702AE1' : '#2a2a4a',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 16, color: '#fff', marginLeft: isSpeaking ? 0 : 2 }}>
                    {isSpeaking ? '◼' : '▶'}
                  </Text>
                </View>
                <Text style={{ color: isSpeaking ? '#B28CFF' : '#8a7aaa', fontSize: 11, fontWeight: '700' }}>
                  {isSpeaking ? 'Stop' : 'Listen'}
                </Text>
              </TouchableOpacity>

              {/* ◉ Read Aloud — modern mic icon */}
              <TouchableOpacity
                onPress={micState === 'idle' ? startMicReading : micState === 'recording' ? stopMicReading : undefined}
                disabled={micState === 'analyzing' || isSpeaking}
                style={{
                  flex: 1,
                  backgroundColor: micState === 'recording'
                    ? 'rgba(239,68,68,0.18)'
                    : micState === 'analyzing'
                      ? '#702AE120'
                      : '#1a1a35',
                  borderRadius: 16, padding: 14,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: micState === 'recording'
                    ? '#ef4444'
                    : micState === 'analyzing'
                      ? '#702AE188'
                      : '#2a2a4a',
                  opacity: isSpeaking ? 0.4 : 1,
                  gap: 4,
                }}>
                {micState === 'analyzing' ? (
                  // Bouncing dot loader
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, justifyContent: 'center' }}>
                    {[loaderDot1, loaderDot2, loaderDot3].map((dot, i) => (
                      <Animated.View key={i} style={{
                        width: 10, height: 10, borderRadius: 5,
                        backgroundColor: '#B28CFF',
                        transform: [{ translateY: dot }],
                      }} />
                    ))}
                  </View>
                ) : (
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: micState === 'recording' ? '#ef4444' : '#2a2a4a',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 16, color: '#fff' }}>
                      {micState === 'recording' ? '◼' : '◉'}
                    </Text>
                  </View>
                )}
                <Text style={{
                  color: micState === 'recording' ? '#ef4444'
                    : micState === 'analyzing' ? '#B28CFF'
                    : '#8a7aaa',
                  fontSize: 11, fontWeight: '700',
                }}>
                  {micState === 'recording' ? 'Stop & Check' : micState === 'analyzing' ? 'Analyzing…' : 'Read Aloud'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Recording pulse label */}
            {micState === 'recording' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
                <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700' }}>
                  Recording… tap ⏹ Stop & Check when done
                </Text>
              </View>
            )}

            <TouchableOpacity onPress={handleNextPage}
              disabled={micState !== 'idle'}
              style={{ backgroundColor: '#702AE1', borderRadius: 14, padding: 16, alignItems: 'center', opacity: micState !== 'idle' ? 0.5 : 1 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                {currentPage >= (story?.pages.length ?? 1) - 1 ? '🏁 Finish Book' : 'Next Page →'}
              </Text>
            </TouchableOpacity>

            {currentPage > 0 && (
              <TouchableOpacity onPress={() => { void googleStop(); setCurrentPage(p => p - 1); setPhase('reading') }}
                style={{
                  backgroundColor: '#1a1a35', borderRadius: 14, padding: 13, alignItems: 'center',
                  borderWidth: 1, borderColor: '#2a2a4a'
                }}>
                <Text style={{ color: '#8a7aaa', fontSize: 14 }}>← Previous Page</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    )
  }

  // ── QUIZ PHASE ─────────────────────────────────────────────────────────────
  if (phase === 'quiz' && quizQuestions.length > 0) {
    const q = quizQuestions[quizIdx]
    const LETTERS = ['A', 'B', 'C', 'D', 'E']
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0d1f', paddingTop: insets.top }}>
        {/* Header */}
        <View style={{
          paddingHorizontal: 20, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: '#702AE133',
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <View>
            <Text style={{ color: '#B28CFF', fontWeight: '800', fontSize: 16 }}>📝 Quick Quiz</Text>
            <Text style={{ color: '#6b5d80', fontSize: 12, marginTop: 2 }}>
              Question {quizIdx + 1} of {quizQuestions.length}
            </Text>
          </View>
          {/* Progress dots */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {quizQuestions.map((_, i) => (
              <View key={i} style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: i < quizIdx
                  ? '#22c55e'
                  : i === quizIdx ? '#702AE1' : '#2a2a4a',
              }} />
            ))}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Question card */}
          <View style={{
            backgroundColor: '#16163a',
            borderRadius: 18,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#702AE144',
          }}>
            <Text style={{ color: '#9b7eff', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
              QUESTION {quizIdx + 1}
            </Text>
            <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700', lineHeight: 28 }}>
              {q.question}
            </Text>
          </View>

          {/* +25 XP coin pop animation — floats up when correct */}
          {showCoin && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 80,
                alignSelf: 'center',
                zIndex: 999,
                opacity: coinAnim,
                transform: [{
                  translateY: coinAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }),
                }, {
                  scale: coinAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.5, 1.3, 1] }),
                }],
              }}
            >
              <View style={{
                backgroundColor: '#1a0f00',
                borderColor: '#FFD700',
                borderWidth: 2,
                borderRadius: 30,
                paddingHorizontal: 20,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                shadowColor: '#FFD700',
                shadowOpacity: 0.8,
                shadowRadius: 12,
                elevation: 10,
              }}>
                <Text style={{ fontSize: 22 }}>⚡</Text>
                <Text style={{ color: '#FFD700', fontSize: 22, fontWeight: '900', letterSpacing: 1 }}>+25 XP</Text>
              </View>
            </Animated.View>
          )}

          {/* Answer choices */}
          <View style={{ gap: 10, marginBottom: 20 }}>
            {q.choices.map((choice, i) => {
              const letter = LETTERS[i] ?? String(i + 1)
              // Strip leading "A. " / "A) " if backend already prefixes them
              const choiceText = /^[A-Ea-e][.)]\s/.test(choice) ? choice.slice(2).trim() : choice
              const isSelected = selectedAns === choice
              const isCorrect  = choice === q.correct_answer

              let bg = '#1a1a35'
              let border = '#2a2a4a'
              let textColor = '#e0d8f0'
              let letterBg = '#702AE130'
              let letterColor = '#B28CFF'

              if (selectedAns) {
                if (isCorrect) {
                  bg = '#22c55e18'; border = '#22c55e55'; textColor = '#4ade80'
                  letterBg = '#22c55e30'; letterColor = '#4ade80'
                } else if (isSelected && !isCorrect) {
                  bg = '#ef444418'; border = '#ef444455'; textColor = '#f87171'
                  letterBg = '#ef444430'; letterColor = '#f87171'
                }
              } else if (isSelected) {
                bg = '#702AE120'; border = '#702AE166'
              }

              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleAnswer(choice)}
                  disabled={!!selectedAns}
                  activeOpacity={0.75}
                  style={{
                    backgroundColor: bg, borderRadius: 14, padding: 14,
                    flexDirection: 'row', alignItems: 'center',
                    borderWidth: 1.5, borderColor: border,
                  }}
                >
                  {/* Letter badge */}
                  <View style={{
                    width: 30, height: 30, borderRadius: 15,
                    backgroundColor: letterBg,
                    alignItems: 'center', justifyContent: 'center',
                    marginRight: 12, flexShrink: 0,
                  }}>
                    <Text style={{ color: letterColor, fontWeight: '800', fontSize: 14 }}>{letter}</Text>
                  </View>
                  <Text style={{ color: textColor, fontSize: 15, flex: 1, lineHeight: 22 }}>
                    {choiceText}
                  </Text>
                  {selectedAns && isCorrect && <Text style={{ fontSize: 18, marginLeft: 8 }}>✅</Text>}
                  {selectedAns && isSelected && !isCorrect && <Text style={{ fontSize: 18, marginLeft: 8 }}>❌</Text>}
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Explanation + Continue */}
          {selectedAns && (
            <View>
              {q.explanation && (
                <View style={{
                  backgroundColor: '#1a1a35', borderRadius: 14, padding: 14, marginBottom: 12,
                  borderWidth: 1, borderColor: '#702AE133', flexDirection: 'row', gap: 8,
                }}>
                  <Text style={{ fontSize: 16 }}>💡</Text>
                  <Text style={{ color: '#a89bbe', fontSize: 13, lineHeight: 20, flex: 1 }}>
                    {q.explanation}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={handleQuizContinue}
                style={{ backgroundColor: '#702AE1', borderRadius: 14, padding: 16, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                  {quizIdx + 1 < quizQuestions.length ? 'Next Question →' : 'Continue Reading →'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    )
  }

  // ── COMPREHENSION PHASE ────────────────────────────────────────────────────
  if (phase === 'comprehension') {
    const allAnswered = compAnswers.every(a => a.trim() !== '')
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: '#0d0d1f' }}
        contentContainerStyle={{ paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#702AE122' }}>
          <Text style={{ color: '#B28CFF', fontWeight: '900', fontSize: 18 }}>🧠 Comprehension Check</Text>
          <Text style={{ color: '#6b5d80', fontSize: 13, marginTop: 2 }}>Choose the best answer for each question</Text>
        </View>

        <View style={{ padding: 20, gap: 24 }}>
          {COMP_MC.map((item, qi) => (
            <View key={qi}>
              {/* Question card */}
              <View style={{
                backgroundColor: '#16163a', borderRadius: 18, padding: 18, marginBottom: 12,
                borderWidth: 1, borderColor: '#702AE133',
              }}>
                <Text style={{ color: '#9b7eff', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
                  QUESTION {qi + 1} OF {COMP_MC.length}
                </Text>
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700', lineHeight: 24 }}>
                  {item.question}
                </Text>
              </View>

              {/* Choice buttons */}
              <View style={{ gap: 10 }}>
                {item.choices.map((choice, ci) => {
                  const letter = ['A', 'B', 'C', 'D'][ci]
                  const isSelected = compAnswers[qi] === choice
                  return (
                    <TouchableOpacity
                      key={ci}
                      disabled={compSubmitted}
                      onPress={() => {
                        if (!compSubmitted) {
                          setCompAnswers(prev => { const a = [...prev]; a[qi] = choice; return a })
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        }
                      }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        backgroundColor: isSelected ? '#702AE1' : '#16163a',
                        borderRadius: 14, padding: 14,
                        borderWidth: 2,
                        borderColor: isSelected ? '#9b7eff' : '#2a2a4a',
                      }}
                    >
                      <View style={{
                        width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.18)' : '#1a1a35',
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#fff' : '#3a3a5a',
                        flexShrink: 0,
                      }}>
                        <Text style={{ color: isSelected ? '#fff' : '#8a7aaa', fontWeight: '800', fontSize: 13 }}>{letter}</Text>
                      </View>
                      <Text style={{ color: isSelected ? '#ffffff' : '#ccc4e0', fontSize: 14, fontWeight: isSelected ? '700' : '400', flex: 1, lineHeight: 20 }}>
                        {choice}
                      </Text>
                      {isSelected && <Text style={{ fontSize: 18 }}>✓</Text>}
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          ))}

          {/* Submit button */}
          {!compSubmitted && (
            <TouchableOpacity
              onPress={handleCompSubmit}
              disabled={compLoading || !allAnswered}
              style={{
                backgroundColor: allAnswered ? '#702AE1' : '#1a1a35',
                borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8,
                borderWidth: 1.5,
                borderColor: allAnswered ? '#9b7eff' : '#2a2a4a',
                opacity: compLoading ? 0.7 : 1,
              }}
            >
              {compLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: allAnswered ? '#fff' : '#6b5d80', fontWeight: '800', fontSize: 16 }}>Submit Answers 🎯</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    )
  }


  // ── SUMMARY PHASE ──────────────────────────────────────────────────────────
  if (phase === 'summary') {
    const passed = Math.round(readingAcc * 0.7 + compScore * 0.3) >= 77
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#0d0d1f' }}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 100 }}>
        {/* Hero */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 72 }}>{passed ? '🏆' : '📖'}</Text>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 24, marginTop: 12, textAlign: 'center' }}>
            {passed ? "Amazing Work!" : "Good Effort!"}
          </Text>
          <Text style={{ color: '#B28CFF', fontWeight: '700', fontSize: 15, marginTop: 4, textAlign: 'center' }}>{story?.title}</Text>

          {/* Stars */}
          <View style={{ flexDirection: 'row', marginTop: 14, gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Text key={i} style={{ fontSize: 28, opacity: i < sessionStars ? 1 : 0.2 }}>⭐</Text>
            ))}
          </View>
        </View>

        {/* Score cards */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Reading', val: `${readingAcc}%`, icon: '📖', color: '#4FACFE' },
            { label: 'Quiz', val: `${quizResults.filter(r => r.correct).length}/${quizResults.length}`, icon: '📝', color: '#43E97B' },
            { label: 'Comprehension', val: `${compScore}%`, icon: '🧠', color: '#B28CFF' },
            { label: 'XP Earned', val: `+${totalXP}`, icon: '⚡', color: '#f59e0b' },
          ].map(s => (
            <View key={s.label} style={{
              flex: 1, backgroundColor: '#1a1a35', borderRadius: 12, padding: 10, alignItems: 'center',
              borderWidth: 1, borderColor: '#2a2a4a'
            }}>
              <Text style={{ fontSize: 20 }}>{s.icon}</Text>
              <Text style={{ color: s.color, fontWeight: '900', fontSize: 15, marginTop: 3 }}>{s.val}</Text>
              <Text style={{ color: '#6b5d80', fontSize: 9, textAlign: 'center', marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* AI feedback */}
        {compFeedback && (
          <View style={{
            backgroundColor: '#702AE110', borderRadius: 14, padding: 14, marginBottom: 20,
            borderWidth: 1, borderColor: '#702AE122'
          }}>
            <Text style={{ color: '#B28CFF', fontWeight: '700', marginBottom: 4 }}>✨ AI Feedback</Text>
            <Text style={{ color: '#e0d8f0', fontSize: 14, lineHeight: 21 }}>{compFeedback}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={{ gap: 10 }}>
          <TouchableOpacity onPress={() => router.push('/(app)/library' as any)}
            style={{ backgroundColor: '#702AE1', borderRadius: 14, padding: 15, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>📚 Back to Library</Text>
          </TouchableOpacity>
          {!passed && (
            <TouchableOpacity onPress={() => {
              setCurrentPage(0); setPhase('reading'); setWordStates({}); setQuizResults([])
              setCompAnswers(['', '', '', '']); setSummaryText(''); setCompSubmitted(false); setCompScore(0); xpRef.current = 0
            }}
              style={{
                backgroundColor: '#1a1a35', borderRadius: 14, padding: 14, alignItems: 'center',
                borderWidth: 1, borderColor: '#2a2a4a'
              }}>
              <Text style={{ color: '#8a7aaa', fontWeight: '700' }}>🔁 Read Again (Double XP!)</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.push('/(app)/dashboard' as any)}
            style={{
              backgroundColor: '#1a1a35', borderRadius: 14, padding: 13, alignItems: 'center',
              borderWidth: 1, borderColor: '#2a2a4a'
            }}>
            <Text style={{ color: '#6b5d80', fontSize: 14 }}>🏠 Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
  }

  return null
}
