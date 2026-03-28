import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { storiesApi } from '../services/api'
import { supabase } from '../lib/supabase'
import api from '../services/api'
import CharacterGallery from '../components/CharacterGallery'
import HeroCharDisplay from '../components/HeroCharDisplay'
import WelcomeVoice, { STEP2_SCRIPTS } from '../components/WelcomeVoice'
import { ALL_CHARACTERS } from '../components/CharacterGallery'
import '../styles/generator.css'
import '../styles/imm-steps.css'

/* ── Wizard Fill Loader — outline fills with color from the bottom up ── */
const HAT_CONE  = 'M75,3 L46,46 L104,46 Z'
const HAT_BRIM  = 'M38,46 L112,46 Q112,56 75,58 Q38,56 38,46 Z'
const BODY      = 'M56,92 C40,100 25,122 21,158 L17,206 L133,206 L129,158 C125,122 110,100 94,92 Z'
const ARM_L     = 'M56,106 L20,136 L26,148 L60,120 Z'
const ARM_R     = 'M94,106 L128,84 L134,94 L98,120 Z'
const LEGS      = 'M50,200 L46,215 L59,215 L75,204 L91,215 L104,215 L100,200 Z'
const STAR_PTS  = '147,28 149.4,35.6 157.4,35.6 151,40.4 153.4,48 147,43.2 140.6,48 143,40.4 136.6,35.6 144.6,35.6'

function WizardFillLoader() {
  return (
    <div className="wiz-loader-wrap">
      {/* Layer 1: gradient fill revealed from bottom */}
      <div className="wiz-fill-reveal">
        <svg viewBox="0 0 160 215" className="wiz-fill-svg" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="wiz-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#f0abfc" />
              <stop offset="40%"  stopColor="#a855f7" />
              <stop offset="100%" stopColor="#3b0764" />
            </linearGradient>
          </defs>
          <g fill="url(#wiz-grad)" stroke="none">
            <polygon points={HAT_CONE} />
            <path d={HAT_BRIM} />
            <circle cx="75" cy="72" r="22" />
            <path d={BODY} />
            <path d={ARM_L} />
            <rect x="4" y="134" width="30" height="22" rx="2" />
            <path d={ARM_R} />
            <line x1="127" y1="58" x2="147" y2="38" strokeWidth="3" strokeLinecap="round" stroke="url(#wiz-grad)" />
            <polygon points={STAR_PTS} />
            <path d={LEGS} />
          </g>
        </svg>
        <div className="wiz-surface-line" />
      </div>

      {/* Layer 2: outline always on top */}
      <svg viewBox="0 0 160 215" className="wiz-outline-svg" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" stroke="rgba(192,132,252,0.45)" strokeWidth="1.8"
           strokeLinejoin="round" strokeLinecap="round">
          <polygon points={HAT_CONE} />
          <path d={HAT_BRIM} />
          <circle cx="75" cy="72" r="22" />
          <path d={BODY} />
          <path d={ARM_L} />
          <rect x="4" y="134" width="30" height="22" rx="2" />
          <path d={ARM_R} />
          <path d={LEGS} />
          {/* face */}
          <circle cx="67" cy="70" r="3" fill="rgba(192,132,252,0.3)" stroke="rgba(192,132,252,0.5)" strokeWidth="1" />
          <circle cx="83" cy="70" r="3" fill="rgba(192,132,252,0.3)" stroke="rgba(192,132,252,0.5)" strokeWidth="1" />
          <path d="M67,80 Q75,87 83,80" strokeWidth="1.5" />
          {/* robe center dash */}
          <path d="M75,92 L75,206" strokeDasharray="3 5" strokeOpacity="0.2" strokeWidth="1" />
          {/* book spine */}
          <line x1="19" y1="134" x2="19" y2="156" strokeWidth="1" />
          {/* wand + star gold */}
          <line x1="127" y1="58" x2="147" y2="38" stroke="rgba(251,191,36,0.75)" strokeWidth="2.5" />
          <polygon points={STAR_PTS} stroke="rgba(251,191,36,0.85)" strokeWidth="1.3" />
        </g>
      </svg>

      {/* Sparkles */}
      <span className="wiz-spark wsp1">✦</span>
      <span className="wiz-spark wsp2">✦</span>
      <span className="wiz-spark wsp3">★</span>
      <span className="wiz-spark wsp4">✦</span>
    </div>
  )
}

type Child = { id: string; name: string; grade_level: number }

const LANGUAGES = [
  { id: 'english',    label: 'English',    emoji: '🇺🇸', desc: 'Read in English' },
  { id: 'spanish',    label: 'Spanish',    emoji: '🇪🇸', desc: 'Lee en Español' },
  { id: 'french',     label: 'French',     emoji: '🇫🇷', desc: 'Lire en Français' },
  { id: 'portuguese', label: 'Portuguese', emoji: '🇧🇷', desc: 'Ler em Português' },
  { id: 'german',     label: 'German',     emoji: '🇩🇪', desc: 'Auf Deutsch lesen' },
  { id: 'japanese',   label: 'Japanese',   emoji: '🇯🇵', desc: '日本語で読む' },
  { id: 'arabic',     label: 'Arabic',     emoji: '🇸🇦', desc: 'اقرأ بالعربية' },
  { id: 'mandarin',   label: 'Mandarin',   emoji: '🇨🇳', desc: '用中文阅读' },
  { id: 'hindi',      label: 'Hindi',      emoji: '🇮🇳', desc: 'हिंदी में पढ़ें' },
  { id: 'italian',    label: 'Italian',    emoji: '🇮🇹', desc: 'Leggi in Italiano' },
]

const ART_STYLES = [
  { id: 'cartoon',    label: 'Cartoon',     emoji: '🎨', desc: 'Fun 2D illustrated look' },
  { id: 'pixar',      label: 'Pixar 3D',    emoji: '🦄', desc: 'Cinematic 3D animation' },
  { id: 'real',       label: 'Realistic',   emoji: '📸', desc: 'Lifelike photos & scenes' },
  { id: 'watercolor', label: 'Watercolor',  emoji: '🖌️', desc: 'Soft painted brushstrokes' },
  { id: 'manga',      label: 'Manga/Anime', emoji: '⚡', desc: 'Japanese anime style' },
  { id: 'sketch',     label: 'Sketch',      emoji: '✏️', desc: 'Hand-drawn pencil art' },
  { id: 'storybook',  label: 'Classic Book',emoji: '📖', desc: 'Golden-age storybook feel' },
  { id: 'neon',       label: 'Neon Glow',   emoji: '✨', desc: 'Electric glow & dark magic' },
]

const THEME_OPTIONS = [
  { id: 'magical rainbow forest',          label: 'Magic Forest',      emoji: '🌲' },
  { id: 'outer space adventure',           label: 'Space Explorer',    emoji: '🚀' },
  { id: 'under the ocean',                 label: 'Ocean Deep',        emoji: '🌊' },
  { id: 'friendly dinosaur park',          label: 'Dino World',        emoji: '🦕' },
  { id: 'fantasy kingdom castle',          label: 'Fantasy Castle',    emoji: '🏰' },
  { id: 'jungle with wild animals',        label: 'Wild Jungle',       emoji: '🦁' },
  { id: 'pirate treasure hunt',            label: 'Pirate Quest',      emoji: '🏴‍☠️' },
  { id: 'superhero city rescue',           label: 'Superhero City',    emoji: '🦸' },
  { id: 'enchanted candy land',            label: 'Candy Kingdom',     emoji: '🍭' },
  { id: 'icy arctic polar bears',          label: 'Arctic Ice',        emoji: '🐻‍❄️' },
  { id: 'time travel history adventure',   label: 'Time Travel',       emoji: '⏰' },
  { id: 'robot factory future world',      label: 'Robot World',       emoji: '🤖' },
  { id: 'underwater mermaid kingdom',     label: 'Mermaid Cove',      emoji: '🧜' },
  { id: 'haunted friendly ghost town',     label: 'Ghost Town',        emoji: '👻' },
  { id: 'safari africa animals',           label: 'Safari Trek',       emoji: '🦒' },
  { id: 'cloud kingdom sky adventure',     label: 'Sky Kingdom',       emoji: '☁️' },
  { id: 'racing cars championship',        label: 'Race Day',          emoji: '🏎️' },
  { id: 'fairy garden magic flowers',      label: 'Fairy Garden',      emoji: '🧚' },
  { id: 'underwater treasure cave',        label: 'Treasure Dive',     emoji: '💎' },
  { id: 'volcano island lava adventure',   label: 'Volcano Isle',      emoji: '🌋' },
]

const CHILD_COLORS = ['#702AE1','#F59E0B','#10B981','#3B82F6','#EC4899','#F97316']

const CHAR_LOADING_MSGS = [
  '🔍 Recognizing your character...',
  '🧠 Looking up their story...',
  '🎨 Gemini is painting your character...',
  '✨ Almost there, this takes ~30 seconds...',
  '🖌️ Adding the final details...',
  '🌟 Nearly ready!',
]

// Dynamic tips — personalized to the selected character
const getCharacterTips = (charName: string) => [
  `✍️ Writing ${charName}'s story...`,
  `🎨 Painting ${charName}'s world...`,
  `🧠 Crafting a quiz just for you...`,
  `✨ ${charName} is getting ready for an adventure!`,
  `📖 Binding your book...`,
  `🌟 Did you know? ${charName} loves going on adventures!`,
  `🚀 ${charName} is excited to meet you on every page!`,
  `🎉 Almost done — your story is going to be amazing!`,
  `🦁 Every great reader started with one book. This is yours!`,
  `💫 Keep reading — the more you read, the smarter you get!`,
  `🌈 ${charName}'s adventure is almost ready — get excited!`,
  `📚 Great readers become great dreamers. You've got this!`,
]

const MAGIC_EMOJIS = ['🪄', '✨', '🧙‍♂️', '🐉', '🏰', '🦄', '🌈', '🚀', '🐱', '🤖']

type Step = 'character' | 'scene' | 'language' | 'artStyle' | 'generating' | 'preview'

interface CharacterData {
  character_name: string
  universe: string
  description: string
  character_media_url: string | null
  scenes: { id: string; label: string; emoji: string; description: string; color: string }[]
}

const STEP_NUMS: Record<Step, number> = {
  character: 1, scene: 2, language: 3, artStyle: 4, generating: 5, preview: 5,
}

const STEP_LABELS = [
  { key: 'character', label: 'The Hero',        emoji: '🧙' },
  { key: 'scene',     label: 'World Building',  emoji: '🌍' },
  { key: 'language',  label: 'Language',        emoji: '🗺️' },
  { key: 'artStyle',  label: 'Art Style',       emoji: '🎨' },
  { key: 'preview',   label: 'Final Story',     emoji: '📖' },
]

const PROHIBITED_WORDS = [
  'kill','murder','dead','death','blood','gore','gun','shoot','shot','bomb','explode','explosion',
  'attack','fight','war','weapon','knife','stab','punch','violent','violence','hate','terror',
  'terrorist','drug','alcohol','naked','sex','adult','porn','suicide','abuse','villain','evil',
  'devil','demon','hell','racist',
]

function validateContent(text: string): string | null {
  const lower = text.toLowerCase()
  for (const word of PROHIBITED_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    if (regex.test(lower)) {
      return `⚠️ Please keep the story kid-friendly! The word "${word}" isn't allowed.`
    }
  }
  return null
}

function PortraitImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => { const t = setTimeout(() => { if (!loaded) setFailed(true) }, 20_000); return () => clearTimeout(t) }, [loaded])
  if (failed) return <div className="scene-portrait-placeholder"><span style={{ fontSize: '4rem' }}>🦸</span></div>
  return (
    <div className="portrait-img-wrap">
      {!loaded && (
        <div className="pov-overlay">
          {/* ambient glow */}
          <div className="pov-glow" />
          {/* scattered sparkle dots */}
          {[
            { x:'12%', y:'18%', s:6,  c:'rgba(255,255,255,0.7)', d:'0s'   },
            { x:'80%', y:'12%', s:4,  c:'rgba(236,72,153,0.8)',  d:'0.4s' },
            { x:'88%', y:'55%', s:5,  c:'rgba(255,255,255,0.5)', d:'1s'   },
            { x:'6%',  y:'65%', s:4,  c:'rgba(192,132,252,0.7)', d:'0.7s' },
            { x:'75%', y:'80%', s:6,  c:'rgba(255,255,255,0.4)', d:'1.3s' },
            { x:'22%', y:'76%', s:3,  c:'rgba(236,72,153,0.6)',  d:'0.2s' },
            { x:'55%', y:'8%',  s:5,  c:'rgba(192,132,252,0.5)', d:'0.9s' },
            { x:'40%', y:'88%', s:4,  c:'rgba(255,255,255,0.4)', d:'1.6s' },
          ].map((p, i) => (
            <span key={i} className="pov-star" style={{
              left: p.x, top: p.y, width: p.s, height: p.s,
              background: p.c, animationDelay: p.d,
            }} />
          ))}

          {/* ── Wizard graduate character outline ── */}
          <svg viewBox="0 0 200 230" className="pov-char-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* platform / monitor base */}
            <rect x="62" y="192" width="76" height="12" rx="6"
              stroke="rgba(167,139,250,0.6)" strokeWidth="2" />
            <rect x="82" y="204" width="36" height="8" rx="4"
              stroke="rgba(167,139,250,0.6)" strokeWidth="2" />

            {/* grad hat */}
            <rect x="60" y="52" width="80" height="8" rx="2"
              stroke="rgba(167,139,250,0.85)" strokeWidth="2" />
            <polygon points="100,20 60,60 140,60"
              stroke="rgba(167,139,250,0.85)" strokeWidth="2" strokeLinejoin="round" />
            {/* hat tassel */}
            <line x1="140" y1="56" x2="150" y2="76" stroke="rgba(251,191,36,0.7)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="150" cy="78" r="3" fill="rgba(251,191,36,0.7)" />

            {/* head */}
            <circle cx="100" cy="85" r="24"
              stroke="rgba(167,139,250,0.75)" strokeWidth="2" />
            {/* smile */}
            <path d="M90,92 Q100,100 110,92" stroke="rgba(167,139,250,0.6)" strokeWidth="1.8" strokeLinecap="round" />
            {/* eyes */}
            <circle cx="91" cy="83" r="3" fill="rgba(167,139,250,0.35)" stroke="rgba(167,139,250,0.6)" strokeWidth="1.5" />
            <circle cx="109" cy="83" r="3" fill="rgba(167,139,250,0.35)" stroke="rgba(167,139,250,0.6)" strokeWidth="1.5" />

            {/* body / robe */}
            <path d="M74,109 C60,116 50,138 48,165 L48,192 L152,192 L152,165 C150,138 140,116 126,109 Z"
              stroke="rgba(167,139,250,0.7)" strokeWidth="2" strokeLinejoin="round" />

            {/* left arm — holding book */}
            <path d="M74,120 L42,148 L48,158 L78,134 Z"
              stroke="rgba(167,139,250,0.65)" strokeWidth="2" strokeLinejoin="round" />
            <rect x="24" y="143" width="30" height="22" rx="3"
              stroke="rgba(167,139,250,0.7)" strokeWidth="2" />
            <line x1="39" y1="143" x2="39" y2="165" stroke="rgba(167,139,250,0.4)" strokeWidth="1" />

            {/* right arm — holding wand */}
            <path d="M126,120 L158,98 L164,108 L136,132 Z"
              stroke="rgba(167,139,250,0.65)" strokeWidth="2" strokeLinejoin="round" />
            {/* wand */}
            <line x1="158" y1="98" x2="178" y2="72"
              stroke="rgba(251,191,36,0.8)" strokeWidth="2.5" strokeLinecap="round" />
            {/* star at wand tip */}
            <polygon points="178,60 180.4,67.6 188.4,67.6 182,72.4 184.4,80 178,75.2 171.6,80 174,72.4 167.6,67.6 175.6,67.6"
              stroke="rgba(251,191,36,0.9)" strokeWidth="1.5" fill="rgba(251,191,36,0.15)" />
          </svg>

          {/* text block */}
          <div className="pov-text">
            <h2 className="pov-heading">✦ Painting your character…</h2>
            <p className="pov-sub">Crafting <strong>{alt}'s</strong> portrait…</p>
          </div>
        </div>
      )}
      <img src={src} alt={alt} className="scene-portrait-img"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.6s ease' }}
        onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
    </div>
  )
}


export default function StoryGenerator() {
  const navigate = useNavigate()

  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [childrenLoaded, setChildrenLoaded] = useState(false)
  const grade = selectedChild?.grade_level ?? Number(localStorage.getItem('readquest_grade') || 2)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { setChildrenLoaded(true); return }
      fetch(`${import.meta.env.VITE_API_URL}/api/students/parent/${session.user.id}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          const kids: Child[] = Array.isArray(data) ? data : []
          setChildren(kids)
          // Auto-select from localStorage or first child
          const savedId = localStorage.getItem('readquest_student_id')
          const match = kids.find(c => c.id === savedId) ?? (kids.length === 1 ? kids[0] : null)
          if (match) setSelectedChild(match)
        })
        .catch(() => {})
        .finally(() => setChildrenLoaded(true))
    })
  }, [])

  const [step, setStep] = useState<Step>('character')
  const [characterInput, setCharacterInput] = useState('')
  const [characterData, setCharacterData] = useState<CharacterData | null>(null)
  const [analyzeError, setAnalyzeError] = useState('')
  const [charLoadingMsg, setCharLoadingMsg] = useState(CHAR_LOADING_MSGS[0])
  const [charLoading, setCharLoading] = useState(false)
  const [sceneDescription, setSceneDescription] = useState('')
  const [sceneError, setSceneError] = useState('')
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [customTheme, setCustomTheme] = useState('')
  const customThemeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const charDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState('english')
  const [selectedArtStyle, setSelectedArtStyle] = useState<string | null>(null)
  const [tipIndex, setTipIndex] = useState(0)
  const [generatedStory, setGeneratedStory] = useState<{ id: string; title: string } | null>(null)
  const [generateError, setGenerateError] = useState('')

  // ── Theme Background — AI-generated live background for Step 2 ────────────
  const [themeBackground, setThemeBackground] = useState<string | null>(null)
  const [bgLoading, setBgLoading] = useState(false)   // background landscape generating
  const [portraitLoading, setPortraitLoading] = useState(false) // character scene portrait generating
  const bgAbortRef = useRef<AbortController | null>(null)
  const portraitAbortRef = useRef<AbortController | null>(null)

  // Hero character — pick from a small curated seed pool of reliable images on mount
  // (Gallery hover or onVerified will update this dynamically)
  const RELIABLE_SEEDS = ['SpongeBob', 'Mickey Mouse', 'Pikachu', 'Mario', 'Stitch', 'Elsa', 'Simba']
  const [heroChar, setHeroChar] = useState(() => {
    const seed = RELIABLE_SEEDS[Math.floor(Math.random() * RELIABLE_SEEDS.length)]
    return ALL_CHARACTERS.find(c => c.name === seed) ?? ALL_CHARACTERS[0]
  })
  const [hoveredHeroSrc, setHoveredHeroSrc] = useState<string | null>(null)
  // Stable random Step 2 script — picked once on mount
  const [step2VoiceText] = useState<string>(
    () => STEP2_SCRIPTS[Math.floor(Math.random() * STEP2_SCRIPTS.length)]
  )

  const [isDictating, setIsDictating] = useState(false)
  const [dictationStatus, setDictationStatus] = useState('')
  const [dictError, setDictError] = useState('')
  const dictRecognitionRef = useRef<any>(null)
  const dictationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dictFinalTextRef = useRef('')

  // Detect iOS Safari — it doesn't support continuous:true so we auto-restart instead
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const isMobileWebkit = isIOS || isSafari

  const startDictation = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setDictError('Voice input needs Chrome or Safari on iOS. Try those!')
      return
    }
    // HTTPS required for mic on deployed apps
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setDictError('Voice input requires a secure (HTTPS) connection.')
      return
    }
    setDictError('')
    dictFinalTextRef.current = ''
    const rec = new SR()
    rec.lang = 'en-US'
    // iOS Safari doesn't support continuous mode — we restart on `onend` instead
    rec.continuous = !isMobileWebkit
    rec.interimResults = !isMobileWebkit // interim results unstable on iOS
    rec.maxAlternatives = 1
    dictRecognitionRef.current = rec

    rec.onstart = () => {
      setIsDictating(true)
      setDictationStatus('Listening…')
    }

    rec.onresult = (e: any) => {
      if (dictationTimeoutRef.current) clearTimeout(dictationTimeoutRef.current)
      let interimLabel = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          dictFinalTextRef.current += e.results[i][0].transcript + ' '
        } else {
          interimLabel = e.results[i][0].transcript
        }
      }
      setDictationStatus(interimLabel || '🎵 Listening…')
      // Auto-stop if silent for 3s (desktop only; iOS handles this itself)
      if (!isMobileWebkit) {
        dictationTimeoutRef.current = setTimeout(() => stopDictation(), 3000)
      }
    }

    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setDictError('Microphone access denied. Please allow microphone in your browser settings.')
        setIsDictating(false)
      } else if (e.error === 'network') {
        setDictError('No internet connection for voice. Type your idea instead!')
        setIsDictating(false)
      } else if (e.error !== 'no-speech') {
        // no-speech is fine to ignore
        stopDictation()
      }
    }

    rec.onend = () => {
      // On iOS, auto-restart if user hasn't tapped Done
      if (isMobileWebkit && dictRecognitionRef.current) {
        try { dictRecognitionRef.current.start() } catch { stopDictation() }
      } else {
        stopDictation()
      }
    }

    try {
      rec.start()
    } catch (err) {
      setDictError('Could not start microphone. Please try again.')
    }
  }, [isMobileWebkit]) // eslint-disable-line

  const stopDictation = useCallback((explicitText?: string) => {
    if (dictationTimeoutRef.current) clearTimeout(dictationTimeoutRef.current)
    // Null out ref FIRST so onend doesn't trigger another restart
    const rec = dictRecognitionRef.current
    dictRecognitionRef.current = null
    try { rec?.stop() } catch { /* ignore */ }
    setIsDictating(false); setDictationStatus('')
    const finalText = explicitText ?? dictFinalTextRef.current
    if (finalText.trim()) {
      setSceneDescription(prev => {
        const sep = prev.trim() ? ' ' : ''
        return (prev + sep + finalText.trim()).trimStart()
      })
    }
    dictFinalTextRef.current = ''
  }, [])

  const toggleDictation = useCallback(() => {
    if (isDictating) stopDictation(); else startDictation()
  }, [isDictating, startDictation, stopDictation])

  useEffect(() => () => { dictRecognitionRef.current?.stop() }, [])

  const charMsgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Gallery quick-select: no LLM call, instant navigation ────────────────
  const handleGallerySelect = useCallback((name: string) => {
    const found = ALL_CHARACTERS.find(c => c.name === name)
    setCharacterInput(name)
    setAnalyzeError('')
    // Immediately populate characterData from gallery without hitting the LLM
    setCharacterData({
      character_name: name,
      universe: 'Adventure',
      description: `${name} — ready for an epic adventure!`,
      character_media_url: found?.img ?? null,
      scenes: [],
    })
    if (found) { setHeroChar(found); setHoveredHeroSrc(null) }
    setSceneDescription('')
    setSelectedTheme(null)
    setThemeBackground(null)
    setStep('scene')
  }, [])

  const handleAnalyzeCharacter = async () => {
    if (!characterInput.trim()) { setAnalyzeError('Tell us your favorite character! 😊'); return }
    const blocked = validateContent(characterInput)
    if (blocked) { setAnalyzeError(blocked); return }
    setAnalyzeError(''); setCharLoading(true); setCharacterData(null)
    setSceneDescription(''); setStep('scene')
    let msgIdx = 0
    charMsgIntervalRef.current = setInterval(() => { msgIdx = (msgIdx + 1) % CHAR_LOADING_MSGS.length; setCharLoadingMsg(CHAR_LOADING_MSGS[msgIdx]) }, 5000)
    try {
      const res = await storiesApi.analyzeCharacter(characterInput.trim())
      const d = res.data
      setCharacterData({
        character_name: d.character_name ?? characterInput.trim(),
        universe: d.universe ?? 'Original Story',
        description: d.description ?? `The amazing ${characterInput.trim()}!`,
        character_media_url: d.character_image_url ?? d.character_media_url ?? null,
        scenes: d.scenes ?? [],
      })
    } catch {
      setCharacterData({
        character_name: characterInput.trim(),
        universe: 'Original Story',
        description: `The amazing ${characterInput.trim()} — ready for a great adventure!`,
        character_media_url: null,
        scenes: [],
      })
    } finally {
      if (charMsgIntervalRef.current) clearInterval(charMsgIntervalRef.current)
      setCharLoading(false)
    }
  }

  // ── Regenerate portrait only (keeps char name/universe/description) ────────
  const handleRegeneratePortrait = async () => {
    if (!characterData || charLoading) return
    setCharLoading(true)
    setCharacterData(prev => prev ? { ...prev, character_media_url: null } : prev)
    let msgIdx = 0
    charMsgIntervalRef.current = setInterval(() => {
      msgIdx = (msgIdx + 1) % CHAR_LOADING_MSGS.length
      setCharLoadingMsg(CHAR_LOADING_MSGS[msgIdx])
    }, 5000)
    try {
      const res = await storiesApi.analyzeCharacter(characterData.character_name)
      const d = res.data
      setCharacterData(prev => prev ? {
        ...prev,
        character_media_url: d.character_image_url ?? d.character_media_url ?? null,
      } : prev)
    } catch {
      // Keep existing data, just clear the image
    } finally {
      if (charMsgIntervalRef.current) clearInterval(charMsgIntervalRef.current)
      setCharLoading(false)
    }
  }

  useEffect(() => () => { if (charMsgIntervalRef.current) clearInterval(charMsgIntervalRef.current) }, [])
  // Cleanup: abort any pending requests on unmount
  useEffect(() => () => { bgAbortRef.current?.abort() }, [])
  useEffect(() => () => { portraitAbortRef.current?.abort() }, [])


  // ── Theme select: generate background ONLY (no portrait yet) ─────────────────
  const handleThemeSelect = useCallback((themeId: string) => {
    // On mobile a second tap on the same tile should NOT deselect — it's confusing.
    // Only switch if a different theme is chosen.
    setSelectedTheme(themeId)
    setSceneError('')

    // Cancel any in-flight background request
    bgAbortRef.current?.abort()
    const ctrl = new AbortController()
    bgAbortRef.current = ctrl
    setBgLoading(true)
    setThemeBackground(null)

    const theme = THEME_OPTIONS.find(t => t.id === themeId)
    const label = theme?.label ?? themeId

    storiesApi.generateBackground(label)
      .then(res => {
        if (!ctrl.signal.aborted) setThemeBackground(res.data?.background_url ?? null)
      })
      .catch((err) => {
        // Don't clear the selection on error — just leave background null.
        // The user can still proceed; the story generator will generate its own bg.
        if (!ctrl.signal.aborted) {
          console.warn('[theme bg] background generation failed (non-fatal):', err?.message)
          setThemeBackground(null)
        }
      })
      .finally(() => { if (!ctrl.signal.aborted) setBgLoading(false) })
  }, [])

  // ── Custom theme input: debounced 3s API call ─────────────────────────────────
  const handleCustomThemeChange = useCallback((value: string) => {
    setCustomTheme(value)
    // Clear any previous debounce
    if (customThemeDebounceRef.current) clearTimeout(customThemeDebounceRef.current)
    if (!value.trim()) {
      // If cleared, revert to no custom background unless a preset is selected
      if (selectedTheme === '__custom__') {
        setSelectedTheme(null)
        setThemeBackground(null)
        setBgLoading(false)
      }
      return
    }
    customThemeDebounceRef.current = setTimeout(() => {
      const blocked = validateContent(value)
      if (blocked) return
      // Deselect any preset tile
      setSelectedTheme('__custom__')
      bgAbortRef.current?.abort()
      const ctrl = new AbortController()
      bgAbortRef.current = ctrl
      setBgLoading(true)
      setThemeBackground(null)
      storiesApi.generateBackground(value.trim())
        .then(res => {
          if (!ctrl.signal.aborted) setThemeBackground(res.data?.background_url ?? null)
        })
        .catch(() => {})
        .finally(() => { if (!ctrl.signal.aborted) setBgLoading(false) })
    }, 3000)
  }, [selectedTheme])

  // ── Generate Scene: fires when user clicks the button ───────────────────────
  // Only requires a theme — scene description is optional bonus detail.
  const handleGenerateScene = useCallback(() => {
    if (!selectedTheme) { setSceneError('Pick a theme first!'); return }
    const blocked = sceneDescription.trim() ? validateContent(sceneDescription) : null
    if (blocked) { setSceneError(blocked); return }
    setSceneError('')
    // Cancel any previous portrait request
    portraitAbortRef.current?.abort()
    const ctrl = new AbortController()
    portraitAbortRef.current = ctrl
    setPortraitLoading(true)
    // Clear existing portrait so loader appears
    setCharacterData(prev => prev ? { ...prev, character_media_url: null } : prev)
    const theme = THEME_OPTIONS.find(t => t.id === selectedTheme)
    const label = theme?.label ?? selectedTheme
    const charName = (characterData?.character_name ?? characterInput.trim()) || undefined
    // Use sceneDescription if filled, otherwise just the theme label drives the scene
    const sceneDetail = sceneDescription.trim() || undefined
    storiesApi.generateBackground(label, charName, sceneDetail)
      .then(res => {
        if (!ctrl.signal.aborted) {
          if (res.data?.background_url) setThemeBackground(res.data.background_url)
          if (res.data?.portrait_url) {
            setCharacterData(prev => prev
              ? { ...prev, character_media_url: res.data.portrait_url }
              : prev
            )
          }
        }
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) console.warn('[generate scene] failed (non-fatal):', err?.message)
      })
      .finally(() => { if (!ctrl.signal.aborted) setPortraitLoading(false) })
  }, [selectedTheme, sceneDescription, characterData, characterInput])

  // Build the effective theme by combining preset + custom description
  const getEffectiveTheme = () => {
    const baseTheme = selectedTheme === '__custom__' ? customTheme : selectedTheme
    if (baseTheme && sceneDescription.trim()) {
      return `${baseTheme} — ${sceneDescription.trim()}`
    }
    return baseTheme ?? sceneDescription
  }

  const handleSceneContinue = () => {
    const effectiveScene = getEffectiveTheme()
    const blocked = validateContent(effectiveScene)
    if (blocked) { setSceneError(blocked); return }
    if (!effectiveScene.trim()) { setSceneError('Pick a theme or describe a scene!'); return }
    setSceneError(''); setStep('language')
  }

  const handleGenerate = async () => {
    setStep('generating'); setGenerateError('')
    const charName = characterData?.character_name || characterInput.trim() || 'Your Hero'
    const tips = getCharacterTips(charName)
    let idx = 0
    const tipInterval = setInterval(() => { idx = (idx + 1) % tips.length; setTipIndex(idx) }, 2200)
    try {
      const theme = getEffectiveTheme().trim() || 'exciting adventure'
      const headers: Record<string, string> = {}
      if (selectedChild) headers['X-Student-ID'] = selectedChild.id
      const res = await api.post('/stories/generate',
        { grade, theme, character_name: characterData?.character_name ?? characterInput, language: selectedLanguage, art_style: selectedArtStyle ?? 'cartoon' },
        { timeout: 300000, headers },
      )
      clearInterval(tipInterval); setGeneratedStory(res.data); setStep('preview')
    } catch (err: unknown) {
      clearInterval(tipInterval)
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Story generation failed. Please try again.'
      setGenerateError(msg); setStep('artStyle')
    }
  }

  const currentNum = Math.min(STEP_NUMS[step], 4)

  // Right panel preview content
  const previewTheme = selectedTheme ?? (sceneDescription ? sceneDescription.slice(0, 30) : null)
  const previewChar = characterData?.character_name ?? characterInput
  const previewEmoji = THEME_OPTIONS.find(t => t.id === selectedTheme)?.emoji ?? '📖'

  return (
    <div className="gen-root">

      {/* ── Top Header ── */}
      <header className={`gen-header${['character','scene','language','artStyle','generating'].includes(step) ? ' gen-header-dark' : ''}`}>
        <div>
          <div className="gen-header-logo">ReadQuest ✨</div>
          <div className="gen-header-subtitle">Story Creator</div>
        </div>
        <div className="gen-header-title">
          {step !== 'generating' && step !== 'preview'
            ? `Step ${currentNum} of 4`
            : step === 'generating' ? '✨ Generating...' : '🎉 Done!'}
        </div>
        <button className="gen-back-btn" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
      </header>

      {/* ── Body ── */}
      <div className="gen-body">

        {/* ══ LEFT STEP NAV — hidden on all 4 immersive steps ══ */}
        {step !== 'generating' && step !== 'preview' && !['character','scene','language','artStyle'].includes(step) && (
          <aside className="gen-step-nav">
            <div className="gen-step-nav-title">Story Wizard</div>
            {STEP_LABELS.slice(0, 4).map((s, i) => {
              const num = i + 1
              const isDone = num < currentNum
              const isActive = num === currentNum
              return (
                <div key={s.key} className={`gen-step-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                  <div className="gen-step-dot">
                    {isDone ? '✓' : s.emoji}
                  </div>
                  <span className="gen-step-item-label">{s.label}</span>
                </div>
              )
            })}

            {/* Child selector in sidebar */}
            {childrenLoaded && children.length > 0 && (
              <div className="gen-child-selector">
                <div className="gen-child-selector-label">Story is for</div>
                {children.map((child, i) => (
                  <button
                    key={child.id}
                    className={`gen-child-btn ${selectedChild?.id === child.id ? 'active' : ''}`}
                    onClick={() => setSelectedChild(child)}
                  >
                    <div className="gen-child-avatar" style={{ background: CHILD_COLORS[i % CHILD_COLORS.length] }}>
                      {child.name.charAt(0)}
                    </div>
                    <div className="gen-child-info">
                      <div className="gen-child-name">{child.name}</div>
                      <div className="gen-child-grade">Grade {child.grade_level}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </aside>
        )}

        {/* ══ CENTER CONTENT ══ */}
        <div className={`gen-center${['character','scene','language','artStyle','generating'].includes(step) ? ' gen-center-immersive' : ''}`}>
          <AnimatePresence mode="wait">

            {/* ── Step 1: Character — AI Art Generator Canvas ── */}
            {step === 'character' && (
              <motion.div key="character" className="step1-canvas"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>

                {/* Ambient bg glow */}
                <div className="step1-bg-glow" />
                <div className="step1-bg-glow step1-bg-glow-2" />
                {/* Stars */}
                <div className="step1-stars" aria-hidden>
                  {[...Array(24)].map((_, i) => (
                    <div key={i} className="step1-star" style={{
                      left: `${(i * 17 + 7) % 97}%`,
                      top: `${(i * 23 + 3) % 91}%`,
                      animationDelay: `${(i * 0.37) % 3}s`,
                      width: `${(i % 3) + 1}px`, height: `${(i % 3) + 1}px`,
                    }} />
                  ))}
                </div>

                {/* ══ TWO-COLUMN SPLIT ══ */}
                <div className="step1-split">

                  {/* ── LEFT: hero image + headline ── */}
                  <div className="step1-left">
                    <div className="step1-badge">Magic Story Workshop</div>
                    {/* Hero photo — static on load, changes ONLY on gallery hover */}
                    <HeroCharDisplay
                      src={hoveredHeroSrc ?? heroChar.img}
                      size={96}
                    />
                    <h1 className="step1-headline">
                      <span className="step1-headline-line1">Who's</span>
                      <span className="step1-headline-line2">the Hero?</span>
                    </h1>
                    <p className="step1-sub">Pick any character — or even yourself!</p>
                  </div>

                  {/* ── RIGHT: search + picks + child selector ── */}
                  <div className="step1-right">

                    {/* Label */}
                    <span className="step1-right-label">Type a character name</span>

                    {/* Magic portal input */}
                    <div className={`step1-portal-bar ${analyzeError ? 'step1-portal-error' : ''} ${charLoading ? 'step1-portal-loading' : ''}`}>
                      <input
                        className="step1-portal-input"
                        placeholder="e.g. Luna, Spiderman, Dora, Pikachu..."
                        value={characterInput}
                        onChange={e => {
                          const val = e.target.value
                          setCharacterInput(val)
                          if (analyzeError) setAnalyzeError('')
                          // Clear any pending debounce
                          if (charDebounceRef.current) clearTimeout(charDebounceRef.current)
                          // Auto-call API 1.2s after user stops typing (≥2 chars)
                          if (val.trim().length >= 2) {
                            charDebounceRef.current = setTimeout(() => {
                              handleAnalyzeCharacter()
                            }, 1200)
                          }
                        }}
                        onKeyDown={e => e.key === 'Enter' && handleAnalyzeCharacter()}
                        autoFocus
                      />
                      {charLoading && (
                        <span className="step1-portal-spinner" title="Creating your character…">⏳</span>
                      )}
                      <motion.button
                        className="step1-portal-btn"
                        disabled={children.length > 0 && !selectedChild}
                        whileHover={(children.length === 0 || selectedChild) ? { scale: 1.04 } : {}}
                        whileTap={{ scale: 0.96 }}
                        onClick={handleAnalyzeCharacter}>
                        Let's Go!
                      </motion.button>
                    </div>

                    {analyzeError && (
                      <motion.p className="step1-error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                        {analyzeError}
                      </motion.p>
                    )}
                    {children.length > 0 && !selectedChild && (
                      <motion.p className="step1-error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                        Select a child below first!
                      </motion.p>
                    )}

                    {/* Quick picks */}
                    <div className="step1-picks-section">
                      <span className="step1-picks-label">Quick picks:</span>
                      <div className="step1-chips">
                        {['Luna', 'Max', 'Zara', 'Leo', 'Mia', 'Rio'].map(c => (
                          <motion.button key={c} className="step1-chip"
                            whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.95 }}
                            onClick={() => { setCharacterInput(c); setAnalyzeError('') }}>
                            {c}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Child selector */}
                    {childrenLoaded && children.length > 1 && (
                      <div className="step1-child-row">
                        <span className="step1-picks-label">Story for:</span>
                        <div className="step1-chips">
                          {children.map((child, i) => (
                            <motion.button key={child.id}
                              className={`step1-child-chip ${selectedChild?.id === child.id ? 'active' : ''}`}
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => setSelectedChild(child)}>
                              <span className="step1-child-avatar" style={{ background: CHILD_COLORS[i % CHILD_COLORS.length] }}>
                                {child.name.charAt(0)}
                              </span>
                              {child.name} · Gr {child.grade_level}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── GALLERY — full width below split ── */}
                <CharacterGallery
                  onSelect={handleGallerySelect}
                  onHoverChar={(img) => setHoveredHeroSrc(img)}
                  onHoverLeave={() => setHoveredHeroSrc(null)}
                  onVerified={(chars) => { if (chars[0]) setHeroChar(chars[0]) }}
                />

                {/* Welcome voice — plays once on load, references the hero's name */}
                <WelcomeVoice charName={heroChar.name} />

              </motion.div>
            )}


            {/* ── Step 2: Scene / Theme — PicGen Canvas Layout ── */}
            {step === 'scene' && (
              <motion.div key="scene" className="scene2-canvas"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
                style={themeBackground ? {
                  backgroundImage: `url(${themeBackground})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                } : {}}>

                {/* ── AI theme background overlay — dims the image for readability ── */}
                <div className={`scene2-theme-overlay ${themeBackground ? 'scene2-theme-overlay-active' : ''}`} />

                {/* ── Background loading shimmer ring ── */}
                {bgLoading && (
                  <div className="scene2-bg-loading">
                    <div className="scene2-bg-ring" />
                    <div className="scene2-bg-ring scene2-bg-ring-2" />
                    <span className="scene2-bg-loading-text">🎨 AI painting your world…</span>
                  </div>
                )}

                {/* ── Ambient background glow (hidden when bg image loaded) ── */}
                {!themeBackground && <div className="scene2-bg-glow" />}
                <div className="scene2-bg-stars" style={{ opacity: themeBackground ? 0 : 1, transition: 'opacity 1s ease' }}>
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="scene2-star" style={{
                      left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`, opacity: Math.random() * 0.6 + 0.2,
                      width: `${Math.random() * 3 + 1}px`, height: `${Math.random() * 3 + 1}px`,
                    }} />
                  ))}
                </div>

                {/* ── LEFT floating glass panel: Theme Picker ── */}
                <div className="scene2-left-panel">
                  <div className="scene2-panel-title">✨ Choose Your Theme</div>

                  {/* Theme Picker — compact 4-column scrollable grid */}
                  <div className="scene2-theme-grid">
                    {THEME_OPTIONS.map(t => (
                      <motion.button key={t.id}
                        className={`scene2-theme-tile ${selectedTheme === t.id ? 'selected' : ''} ${bgLoading && selectedTheme === t.id ? 'scene2-theme-tile-loading' : ''}`}
                        whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.92 }}
                        onClick={() => handleThemeSelect(t.id)}>
                        <span className="scene2-tile-emoji">{t.emoji}</span>
                        <span className="scene2-tile-label">{t.label}</span>
                        {selectedTheme === t.id && !bgLoading && <span className="scene2-tile-check">✓</span>}
                        {selectedTheme === t.id && bgLoading && <span className="scene2-tile-check scene2-tile-spinner">⏳</span>}
                      </motion.button>
                    ))}
                  </div>

                  {/* ── Custom theme input: type anything, auto-fires after 3s ── */}
                  <div className="scene2-custom-theme-wrap">
                    <label className="scene2-custom-theme-label">
                      ✏️ Or type your own theme
                      {bgLoading && selectedTheme === '__custom__' && (
                        <span className="scene2-custom-theme-loading">AI painting…</span>
                      )}
                    </label>
                    <div className={`scene2-custom-theme-bar ${selectedTheme === '__custom__' ? 'active' : ''}`}>
                      <input
                        className="scene2-custom-theme-input"
                        placeholder='e.g. "Underwater volcano kingdom"…'
                        value={customTheme}
                        onChange={e => { handleCustomThemeChange(e.target.value); setSceneError('') }}
                      />
                      {customTheme.trim() && selectedTheme !== '__custom__' && (
                        <span className="scene2-custom-theme-countdown">⏱ 3s</span>
                      )}
                      {selectedTheme === '__custom__' && !bgLoading && (
                        <span className="scene2-custom-theme-check">✓</span>
                      )}
                    </div>
                  </div>


                  {/* Scene description — required before Generate button ↓ */}
                  <div className="scene2-divider-label">
                    ✍️ Describe the scene <span style={{ color: 'rgba(248,113,113,0.9)', fontSize: '0.7rem' }}>* required</span>
                  </div>
                  <div className="scene2-dictation-row">
                    <div style={{ position: 'relative', flex: 1 }}>
                      <AnimatePresence>
                        {isDictating && (
                          <motion.div className="dictation-status-pill"
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                            <span className="dictation-dot" />
                            {dictationStatus || 'Listening…'}
                            <button className="dictation-stop-btn" onClick={() => stopDictation()}>Done ✓</button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <textarea
                        className={`scene2-textarea ${sceneError ? 'input-error' : ''} ${isDictating ? 'textarea-dictating' : ''}`}
                        placeholder={selectedTheme
                          ? `e.g. "${characterData?.character_name ?? 'the hero'} running from a T-Rex"…`
                          : 'e.g. "running through a magical forest"…'}
                        value={sceneDescription}
                        onChange={e => { setSceneDescription(e.target.value); if (sceneError) setSceneError('') }}
                        rows={3}
                      />
                    </div>
                    <motion.button
                      className={`scene2-mic-btn ${isDictating ? 'dictating' : ''}`}
                      onClick={toggleDictation}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.92 }}
                      type="button"
                      title={isDictating ? 'Stop recording' : 'Speak your idea'}
                    >
                      {isDictating && <span className="dictation-pulse" />}
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mic-svg-icon">
                        <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" opacity="0.9" />
                        <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        {isDictating && (
                          <>
                            <circle cx="12" cy="8" r="1.5" fill="white" opacity="0.6">
                              <animate attributeName="r" values="1.5;2.5;1.5" dur="0.8s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.6;1;0.6" dur="0.8s" repeatCount="indefinite" />
                            </circle>
                          </>
                        )}
                      </svg>
                    </motion.button>
                  </div>

                  {/* Error messages */}
                  {dictError && !isDictating && (
                    <motion.p
                      className="input-error-msg"
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      style={{ marginTop: 6, fontSize: '0.75rem' }}
                    >
                      🎤 {dictError}
                    </motion.p>
                  )}
                  {sceneError && (
                    <motion.p className="input-error-msg" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                      {sceneError}
                    </motion.p>
                  )}

                  {/* ✨ Generate Scene button — fires the combined portrait call */}
                  <motion.button
                    className={`scene2-generate-btn ${
                      !selectedTheme || portraitLoading ? 'scene2-generate-btn-disabled' : ''
                    }`}
                    onClick={handleGenerateScene}
                    whileHover={selectedTheme && !portraitLoading ? { scale: 1.03, y: -2 } : {}}
                    whileTap={selectedTheme && !portraitLoading ? { scale: 0.97 } : {}}
                    type="button"
                    disabled={!selectedTheme || portraitLoading}
                  >
                    {portraitLoading ? (
                      <><span className="scene2-generate-spinner" />Generating…</>
                    ) : (
                      <>✨ Generate Scene</>
                    )}
                  </motion.button>
                </div>

                {/* ── CENTER: Character Stage — invite prompt until Generate is clicked ── */}
                <AnimatePresence>
                  {portraitLoading ? (
                    // Portrait is generating — show loader in center stage
                    <motion.div key="char-stage-loading" className="scene2-center-stage"
                      initial={{ opacity: 0, scale: 0.85, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: 20 }}
                      transition={{ duration: 0.4 }}>
                      <div className="scene2-portrait-frame">
                        <div className="scene2-char-inline-loader">
                          <div className="scene2-char-loader-ring" />
                          <div className="scene2-char-loader-ring scene2-char-loader-ring-2" />
                          <div className="scene2-char-loader-core" />
                          <div className="scene2-char-loader-text">
                            <span className="scene2-char-loader-label">✦ Painting your scene…</span>
                            <span className="scene2-char-loader-sub">
                              {characterData?.character_name} · {THEME_OPTIONS.find(t => t.id === selectedTheme)?.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : characterData?.character_media_url ? (
                    // Portrait ready — show it blended into background
                    <motion.div key="char-stage" className="scene2-center-stage"
                      initial={{ opacity: 0, scale: 0.85, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: 20 }}
                      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}>
                      <div className="scene2-portrait-frame">
                        <PortraitImage
                          src={characterData.character_media_url.startsWith('http')
                            ? characterData.character_media_url
                            : `${import.meta.env.VITE_API_URL}${characterData.character_media_url}`}
                          alt={characterData.character_name}
                        />
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.div key="char-name" className="scene2-char-info"
                          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                          <div className="scene2-char-name">{characterData.character_name}</div>
                          <div className="scene2-char-badge">
                            🌟 {characterData.character_name} · {THEME_OPTIONS.find(t => t.id === selectedTheme)?.label ?? 'Adventure'}
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    // Invite: character in orb, cue to pick theme + describe
                    <motion.div key="invite" className="scene2-invite"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
                      <div className="scene2-invite-orb">
                        {characterData?.character_media_url ? (
                          <img src={characterData.character_media_url} alt={characterData.character_name}
                            className="scene2-invite-char-img" />
                        ) : (
                          <span className="scene2-invite-emoji">🌍</span>
                        )}
                      </div>
                      <div className="scene2-invite-text">
                        <span className="scene2-invite-hero">{characterData?.character_name ?? 'Your Hero'}</span>
                        <span className="scene2-invite-cue">
                          {selectedTheme
                            ? '✍️ Now describe your scene →'
                            : '← Pick a theme to begin'}
                        </span>
                      </div>
                      {!selectedTheme && (
                        <div className="scene2-invite-arrows">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="scene2-invite-arrow" style={{ animationDelay: `${i * 0.2}s` }}>❮</div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── RIGHT floating glass panel: Story Settings ── */}
                <div className="scene2-right-panel">
                  <div className="scene2-panel-title">
                    Story Settings
                    <span className="scene2-live-dot" />
                  </div>

                  {/* Active pills */}
                  <div className="scene2-pills-row">
                    {characterData && <span className="scene2-pill scene2-pill-purple">{characterData.character_name}</span>}
                    {selectedTheme && <span className="scene2-pill scene2-pill-gold">{THEME_OPTIONS.find(t => t.id === selectedTheme)?.emoji} {THEME_OPTIONS.find(t => t.id === selectedTheme)?.label}</span>}
                    {selectedChild && <span className="scene2-pill scene2-pill-teal">Grade {selectedChild.grade_level}</span>}
                  </div>

                  {/* Story preview mini-card */}
                  <div className="scene2-preview-card">
                    <div className="scene2-preview-label">PREVIEW</div>
                    <div className="scene2-preview-title">
                      {characterData?.character_name ? `${characterData.character_name}'s Adventure` : "Your Adventure"}
                    </div>
                    <div className="scene2-preview-sub">
                      {selectedTheme && sceneDescription.trim()
                        ? `${THEME_OPTIONS.find(t => t.id === selectedTheme)?.label} + ${sceneDescription.trim().slice(0, 25)}…`
                        : selectedTheme
                        ? THEME_OPTIONS.find(t => t.id === selectedTheme)?.label
                        : sceneDescription
                          ? sceneDescription.slice(0, 40) + '…'
                          : 'Choose a theme on the left…'}
                    </div>
                    {selectedChild && (
                      <div className="scene2-for-badge">For {selectedChild.name}</div>
                    )}
                  </div>

                  {/* AI Enhancement */}
                  <div className="scene2-ai-badge">
                    <span>🤖</span>
                    <div>
                      <div className="scene2-ai-badge-title">AI Enhancement Active</div>
                      <div className="scene2-ai-badge-sub">Reading Grade {grade} optimized theme</div>
                    </div>
                  </div>
                </div>
                 {/* Step 2 voice instructions — Aoede narrates theme picker */}
                 <WelcomeVoice text={step2VoiceText} delayMs={600} />


              </motion.div>
            )}


            {/* ── Step 3: Language ── */}
            {step === 'language' && (
              <motion.div key="language" className="imm-canvas"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                <div className="imm-bg-glow" />
                <div className="imm-content">
                  <div className="imm-eyebrow">🗺️ Step 3 of 4</div>
                  <h1 className="imm-title">What Language?</h1>
                  <p className="imm-sub">Which language should the story be written in?</p>
                  <div className="imm-circle-grid">
                    {LANGUAGES.map(l => (
                      <motion.button key={l.id}
                        className={`imm-circle-btn ${selectedLanguage === l.id ? 'selected' : ''}`}
                        whileHover={{ scale: 1.08, y: -4 }} whileTap={{ scale: 0.94 }}
                        onClick={() => setSelectedLanguage(l.id)}>
                        <span className="imm-circle-icon">{l.emoji}</span>
                        <span className="imm-circle-name">{l.label}</span>
                        {selectedLanguage === l.id && <span className="imm-circle-check">✓</span>}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 4: Art Style ── */}
            {step === 'artStyle' && (
              <motion.div key="artStyle" className="imm-canvas"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                <div className="imm-bg-glow imm-bg-glow-teal" />
                <div className="imm-content">
                  <div className="imm-eyebrow">🎨 Step 4 of 4</div>
                  <h1 className="imm-title">Pick an Art Style!</h1>
                  <p className="imm-sub">How should the pictures in your story look?</p>
                  <div className="imm-circle-grid">
                    {ART_STYLES.map(a => {
                      const isLive = a.id === 'cartoon'
                      return (
                        <motion.button key={a.id}
                          className={`imm-circle-btn imm-circle-art ${selectedArtStyle === a.id ? 'selected' : ''} ${!isLive ? 'imm-circle-disabled' : ''}`}
                          whileHover={isLive ? { scale: 1.08, y: -4 } : {}}
                          whileTap={isLive ? { scale: 0.94 } : {}}
                          disabled={!isLive}
                          onClick={() => { if (isLive) { setSelectedArtStyle(a.id); setGenerateError('') } }}>
                          <span className="imm-circle-icon">{a.emoji}</span>
                          <span className="imm-circle-name">{a.label}</span>
                          <span className="imm-circle-desc">{a.desc}</span>
                          {isLive && selectedArtStyle === a.id && <span className="imm-circle-check">✓</span>}
                          {!isLive && <span className="imm-coming-soon">Coming Soon</span>}
                        </motion.button>
                      )
                    })}
                  </div>
                  {generateError && <p className="gen-error" style={{ marginTop: 16, textAlign: 'center' }}>{generateError}</p>}
                </div>
              </motion.div>
            )}

            {/* ── Generating screen ── */}
            {step === 'generating' && (
              <motion.div key="generating" className="gscreen-canvas"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>

                {/* Ambient glow */}
                <div className="gscreen-glow" />
                {/* Twinkling stars */}
                <div className="step1-stars" aria-hidden>
                  {[...Array(30)].map((_, i) => (
                    <div key={i} className="step1-star" style={{
                      left: `${(i * 13 + 5) % 97}%`, top: `${(i * 19 + 7) % 91}%`,
                      animationDelay: `${(i * 0.28) % 3}s`,
                      width: `${(i % 3) + 1}px`, height: `${(i % 3) + 1}px`,
                    }} />
                  ))}
                </div>

                <div className="gscreen-content">

                  {/* ── Wizard Fill Loader ── */}
                  <WizardFillLoader />

                  <div className="gscreen-title-row">
                    <AnimatePresence mode="wait">
                      <motion.h1 key={tipIndex} className="gscreen-title"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5 }}>
                        {getCharacterTips(characterData?.character_name || characterInput || 'Your Hero')[tipIndex % getCharacterTips(characterData?.character_name || characterInput || 'Your Hero').length]}
                      </motion.h1>
                    </AnimatePresence>
                    <p className="gscreen-sub">🌟 Keep reading — every page is a new adventure for <strong>{characterData?.character_name || characterInput || 'your hero'}</strong>!</p>
                  </div>

                  {/* ── Progress steps ── */}
                  <div className="gscreen-steps">
                    {[
                      { label: 'Writing story',         emoji: '✍️' },
                      { label: 'Creating illustrations', emoji: '🎨' },
                      { label: 'Crafting quiz',          emoji: '🧠' },
                    ].map((s, i) => {
                      const charTips = getCharacterTips(characterData?.character_name || characterInput || 'Your Hero')
                      const prog = tipIndex % charTips.length
                      const done = prog > i * 2
                      const active = !done && prog >= i * 2
                      return (
                        <div key={s.label} className={`gscreen-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                          <span className="gscreen-step-icon">{done ? '✓' : s.emoji}</span>
                          <span className="gscreen-step-label">{s.label}</span>
                          {active && <span className="gscreen-step-pulse" />}
                        </div>
                      )
                    })}
                  </div>

                  {/* ── Sweeping progress bar ── */}
                  <div className="gscreen-bar-wrap">
                    <motion.div className="gscreen-bar"
                      animate={{ width: ['5%', '90%'] }}
                      transition={{ duration: 45, ease: 'easeOut' }}
                    />
                  </div>

                </div>
              </motion.div>
            )}

            {/* ── Preview ── */}
            {step === 'preview' && generatedStory && (() => {
              const theme = THEME_OPTIONS.find(t => t.id === selectedTheme)
              const artStyle = ART_STYLES.find(a => a.id === selectedArtStyle)
              const lang = LANGUAGES.find(l => l.id === selectedLanguage)
              return (
                <motion.div key="preview" className="prev-canvas"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>

                  {/* Blurred theme-emoji background tiles */}
                  <div className="prev-bg-tiles" aria-hidden>
                    {theme && [...Array(12)].map((_, i) => (
                      <span key={i} className="prev-bg-emoji" style={{
                        left: `${(i * 17 + 5) % 95}%`,
                        top:  `${(i * 23 + 10) % 90}%`,
                        fontSize: `${3 + (i % 3)}rem`,
                        animationDelay: `${(i * 0.3) % 2.5}s`,
                        opacity: 0.06 + (i % 4) * 0.02,
                      }}>{theme.emoji}</span>
                    ))}
                  </div>

                  {/* Dark gradient overlay */}
                  <div className="prev-gradient-overlay" />

                  {/* Confetti stars */}
                  <div className="step1-stars" aria-hidden>
                    {[...Array(24)].map((_, i) => (
                      <div key={i} className="step1-star" style={{
                        left: `${(i * 13 + 5) % 97}%`, top: `${(i * 19 + 7) % 91}%`,
                        animationDelay: `${(i * 0.22) % 3}s`,
                        width: `${(i % 3) + 1}px`, height: `${(i % 3) + 1}px`,
                      }} />
                    ))}
                  </div>

                  {/* ── Main content row ── */}
                  <div className="prev-content">

                    {/* Left: character portrait */}
                    {characterData?.character_media_url && (
                      <motion.div className="prev-portrait-wrap"
                        initial={{ opacity: 0, x: -40, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ duration: 0.7, delay: 0.15, type: 'spring', stiffness: 100 }}>
                        <div className="prev-portrait-ring" />
                        <div className="prev-portrait-glow" />
                        <img src={characterData.character_media_url}
                          alt={characterData.character_name}
                          className="prev-portrait-img" />
                        <div className="prev-portrait-name">{characterData.character_name}</div>
                      </motion.div>
                    )}

                    {/* Right: story info */}
                    <motion.div className="prev-info"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.3 }}>

                      {/* Done badge */}
                      <div className="prev-done-badge">
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                        Story Ready!
                      </div>

                      {/* Theme label */}
                      {theme && (
                        <div className="prev-theme-pill">
                          {theme.emoji} {theme.label}
                        </div>
                      )}

                      {/* Title */}
                      <h1 className="prev-story-title">{generatedStory.title}</h1>

                      {/* Tags */}
                      <div className="prev-tags-row">
                        <span className="prev-tag">📚 Grade {grade}</span>
                        {lang && <span className="prev-tag">🌐 {lang.label}</span>}
                        {artStyle && <span className="prev-tag">{artStyle.emoji} {artStyle.label}</span>}
                        {selectedChild && <span className="prev-tag">👤 {selectedChild.name}</span>}
                      </div>

                      {/* CTA */}
                      <motion.button className="prev-cta-btn"
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                        onClick={() => navigate(`/read/${generatedStory.id}`)}>
                        <span>Start Reading!</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </motion.button>

                      <button className="prev-dash-link" onClick={() => navigate('/dashboard')}>
                        ← Back to Dashboard
                      </button>
                    </motion.div>

                  </div>
                </motion.div>
              )
            })()}

          </AnimatePresence>
        </div>

        {/* ══ RIGHT PREVIEW PANEL ══ */}
        {step !== 'generating' && step !== 'preview' && step !== 'scene' && step !== 'character' && (
          <aside className="gen-preview-panel">
            <div className="gen-preview-panel-title">
              <span className="gen-preview-dot" />
              Story Preview
            </div>

            {/* ── Cinematic scene card ── */}
            <div className="gpv-scene-card">
              {/* Background */}
              <div
                className="gpv-scene-bg"
                style={themeBackground ? { backgroundImage: `url(${themeBackground})` } : {}}
              >
                {!themeBackground && <div className="gpv-scene-bg-default" />}
                <div className="gpv-scene-overlay" />
              </div>

              {/* Character portrait floating over bg */}
              {characterData?.character_media_url ? (
                <img
                  className="gpv-char-img"
                  src={characterData.character_media_url.startsWith('http')
                    ? characterData.character_media_url
                    : `${import.meta.env.VITE_API_URL}${characterData.character_media_url}`}
                  alt={characterData.character_name}
                />
              ) : (
                <div className="gpv-char-placeholder">
                  <span>{previewEmoji}</span>
                </div>
              )}

              {/* Character name badge */}
              {characterData?.character_name && (
                <div className="gpv-char-badge">{characterData.character_name}</div>
              )}
            </div>

            {/* ── Story info ── */}
            <div className="gpv-info">
              <div className="gpv-title">
                {previewChar ? `${previewChar}'s Adventure` : 'Your Story'}
              </div>
              {previewTheme && (
                <div className="gpv-theme-line">
                  🌍 {previewTheme.slice(0, 50)}{previewTheme.length > 50 ? '…' : ''}
                </div>
              )}
              <div className="gpv-tags">
                {selectedChild && <span className="gpv-tag">👤 {selectedChild.name}</span>}
                <span className="gpv-tag">
                  {LANGUAGES.find(l => l.id === selectedLanguage)?.emoji} {LANGUAGES.find(l => l.id === selectedLanguage)?.label}
                </span>
                {selectedArtStyle && (
                  <span className="gpv-tag">{ART_STYLES.find(a => a.id === selectedArtStyle)?.emoji} {ART_STYLES.find(a => a.id === selectedArtStyle)?.label}</span>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ══ BOTTOM ACTION BAR ══ */}
      {step !== 'generating' && step !== 'preview' && step !== 'character' && (
        <div className={`gen-bottom-bar${['scene','language','artStyle'].includes(step) ? ' gen-bottom-bar-dark' : ''}`}>
          <div className="gen-bottom-bar-left">
            <button className="gen-btn-ghost" onClick={() => {
              if (step === 'scene') setStep('character')
              else if (step === 'language') setStep('scene')
              else if (step === 'artStyle') setStep('language')
            }}>
              ← Back
            </button>
            <div className="gen-bottom-summary">
              {previewChar && <><strong>{previewChar}</strong>{previewTheme ? ` · ${previewTheme.slice(0, 20)}` : ''}</>}
            </div>
          </div>

          {step === 'scene' && (
            <motion.button className="gen-btn"
              disabled={charLoading || (!selectedTheme && !sceneDescription.trim())}
              style={{ opacity: (charLoading || (!selectedTheme && !sceneDescription.trim())) ? 0.55 : 1 }}
              whileHover={(!charLoading && (selectedTheme || sceneDescription.trim())) ? { scale: 1.02 } : {}}
              whileTap={{ scale: 0.98 }}
              onClick={handleSceneContinue}>
              {charLoading ? '⏳ Generating character…' : 'Next: Language →'}
              {!charLoading && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
            </motion.button>
          )}

          {step === 'language' && (
            <motion.button className="gen-btn" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setStep('artStyle')}>
              Next: Art Style →
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </motion.button>
          )}

          {step === 'artStyle' && (
            <motion.button className="gen-btn" disabled={!selectedArtStyle}
              style={{ opacity: !selectedArtStyle ? 0.55 : 1 }}
              whileHover={selectedArtStyle ? { scale: 1.02 } : {}} whileTap={{ scale: 0.98 }}
              onClick={handleGenerate}>
              🚀 Generate My Story!
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </motion.button>
          )}
        </div>
      )}

    </div>
  )
}
