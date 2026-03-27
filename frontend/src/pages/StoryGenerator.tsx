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

type Child = { id: string; name: string; grade_level: number }

const LANGUAGES = [
  { id: 'english', label: 'English', emoji: '🇺🇸', desc: 'Read in English' },
  { id: 'spanish', label: 'Spanish', emoji: '🇪🇸', desc: 'Lee en Español' },
]

const ART_STYLES = [
  { id: 'cartoon',    label: 'Cartoon',    emoji: '🎨', desc: 'Fun illustrated look' },
  { id: 'real',       label: 'Realistic',  emoji: '📸', desc: 'Lifelike photos & scenes' },
  { id: 'watercolor', label: 'Watercolor', emoji: '🖌️', desc: 'Soft painted brushstrokes' },
  { id: 'pixar',      label: 'Pixar 3D',   emoji: '🦄', desc: 'Cinematic 3D animation' },
]

const THEME_OPTIONS = [
  { id: 'magical rainbow forest', label: 'Magical Forest',    emoji: '🌲' },
  { id: 'outer space adventure',  label: 'Space Explorer',    emoji: '🚀' },
  { id: 'under the ocean',        label: 'Ocean Adventure',   emoji: '🌊' },
  { id: 'friendly dinosaur park', label: 'Dino Park',         emoji: '🦕' },
  { id: 'fantasy kingdom castle', label: 'Fantasy Kingdom',   emoji: '🏰' },
  { id: 'jungle with lions',      label: 'Jungle Friends',    emoji: '🦁' },
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

const WRITING_TIPS = [
  '✍️ Writing your story...', '🎨 Creating illustrations...', '🧠 Crafting quiz questions...',
  '✨ Adding finishing touches...', '📖 Binding your book...', '🖼️ Painting illustrations...',
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
        <div className="portrait-img-shimmer">
          <div className="shimmer-spinner">
            <div className="portrait-spinner-ring" />
            <span className="portrait-spinner-emoji">🎨</span>
          </div>
          <p className="shimmer-label">Painting your character… ✨</p>
        </div>
      )}
      <img src={src} alt={alt} className="scene-portrait-img"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.5s ease' }}
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
  const [selectedLanguage, setSelectedLanguage] = useState('english')
  const [selectedArtStyle, setSelectedArtStyle] = useState<string | null>(null)
  const [tipIndex, setTipIndex] = useState(0)
  const [generatedStory, setGeneratedStory] = useState<{ id: string; title: string } | null>(null)
  const [generateError, setGenerateError] = useState('')

  // Hero character — one random pick on mount (name + img); never auto-rotates
  const [heroChar, setHeroChar] = useState(
    () => ALL_CHARACTERS[Math.floor(Math.random() * ALL_CHARACTERS.length)]
  )
  const [hoveredHeroSrc, setHoveredHeroSrc] = useState<string | null>(null)
  // Stable random Step 2 script — picked once on mount
  const [step2VoiceText] = useState<string>(
    () => STEP2_SCRIPTS[Math.floor(Math.random() * STEP2_SCRIPTS.length)]
  )

  const [isDictating, setIsDictating] = useState(false)
  const [dictationStatus, setDictationStatus] = useState('')
  const dictRecognitionRef = useRef<SpeechRecognition | null>(null)
  const dictationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startDictation = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Voice input is not supported in this browser. Try Chrome!'); return }
    const rec: SpeechRecognition = new SR()
    rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true
    dictRecognitionRef.current = rec
    let finalText = ''
    const resetTimeout = () => {
      if (dictationTimeoutRef.current) clearTimeout(dictationTimeoutRef.current)
      dictationTimeoutRef.current = setTimeout(() => setDictationStatus('Analyzing... ⏳'), 2500)
    }
    rec.onstart = () => { setIsDictating(true); setDictationStatus('Listening…'); resetTimeout() }
    rec.onresult = (e: SpeechRecognitionEvent) => {
      resetTimeout()
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' '
        else interim = e.results[i][0].transcript
      }
      setDictationStatus(interim || '🎵 Listening…')
    }
    rec.onerror = () => stopDictation(finalText)
    rec.onend = () => stopDictation(finalText)
    rec.start()
  }, []) // eslint-disable-line

  const stopDictation = useCallback((finalText?: string) => {
    if (dictationTimeoutRef.current) clearTimeout(dictationTimeoutRef.current)
    dictRecognitionRef.current?.stop()
    dictRecognitionRef.current = null
    setIsDictating(false); setDictationStatus('')
    if (finalText?.trim()) {
      setSceneDescription(prev => { const sep = prev.trim() ? ' ' : ''; return (prev + sep + finalText.trim()).trimStart() })
    }
  }, [])

  const toggleDictation = useCallback(() => {
    if (isDictating) stopDictation(); else startDictation()
  }, [isDictating, startDictation, stopDictation])

  useEffect(() => () => { dictRecognitionRef.current?.stop() }, [])

  const charMsgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const handleSceneContinue = () => {
    const effectiveScene = selectedTheme ?? sceneDescription
    const blocked = validateContent(effectiveScene)
    if (blocked) { setSceneError(blocked); return }
    if (!effectiveScene.trim()) { setSceneError('Pick a theme or describe a scene!'); return }
    setSceneError(''); setStep('language')
  }

  const handleGenerate = async () => {
    setStep('generating'); setGenerateError('')
    let idx = 0
    const tipInterval = setInterval(() => { idx = (idx + 1) % WRITING_TIPS.length; setTipIndex(idx) }, 2000)
    try {
      const theme = (selectedTheme ?? sceneDescription).trim() || 'exciting adventure'
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
                    <div className={`step1-portal-bar ${analyzeError ? 'step1-portal-error' : ''}`}>
                      <input
                        className="step1-portal-input"
                        placeholder="e.g. Luna, Spiderman, Dora, Pikachu..."
                        value={characterInput}
                        onChange={e => { setCharacterInput(e.target.value); if (analyzeError) setAnalyzeError('') }}
                        onKeyDown={e => e.key === 'Enter' && handleAnalyzeCharacter()}
                        autoFocus
                      />
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
                  onSelect={(name) => {
                    setCharacterInput(name)
                    setAnalyzeError('')
                    // Lock hero image on tap/click (works on mobile where hover never fires)
                    const found = ALL_CHARACTERS.find(c => c.name === name)
                    if (found) { setHeroChar(found); setHoveredHeroSrc(null) }
                  }}
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
                exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>

                {/* ── Ambient background glow ── */}
                <div className="scene2-bg-glow" />
                <div className="scene2-bg-stars">
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
                  <div className="scene2-panel-title">🌍 Choose Your Theme</div>
                  {/* Theme Picker — circular icon bubbles, 3 per row */}
                  <div className="scene2-theme-circles">
                    {THEME_OPTIONS.map(t => (
                      <motion.button key={t.id}
                        className={`scene2-theme-circle ${selectedTheme === t.id ? 'selected' : ''}`}
                        whileHover={{ scale: 1.1, y: -3 }} whileTap={{ scale: 0.92 }}
                        onClick={() => { setSelectedTheme(t.id); setSceneDescription(''); setSceneError('') }}>
                        <span className="scene2-circle-emoji">{t.emoji}</span>
                        <span className="scene2-circle-label">{t.label}</span>
                      </motion.button>
                    ))}
                  </div>

                  <div className="scene2-divider-label">✍️ Or describe your own...</div>
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
                        placeholder="e.g. A castle made of candy clouds..."
                        value={sceneDescription}
                        onChange={e => { setSceneDescription(e.target.value); setSelectedTheme(null); if (sceneError) setSceneError('') }}
                        rows={3}
                      />
                    </div>
                    <motion.button className={`scene2-mic-btn ${isDictating ? 'dictating' : ''}`}
                      onClick={toggleDictation} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }} type="button">
                      {isDictating ? <><span className="dictation-pulse" /><span>🎤</span></> : <span>🎤</span>}
                    </motion.button>
                  </div>
                  {sceneError && (
                    <motion.p className="input-error-msg" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                      {sceneError}
                    </motion.p>
                  )}
                </div>

                {/* ── CENTER: Character Stage ── */}
                <div className="scene2-center-stage">
                  {/* Glow ring behind portrait */}
                  <div className="scene2-glow-ring" />
                  <div className="scene2-glow-ring scene2-glow-ring-2" />

                  {/* Portrait frame */}
                  <div className="scene2-portrait-frame">
                    {charLoading ? (
                      <div className="scene2-portrait-loading">
                        <div className="portrait-spinner-ring" />
                        <span className="scene2-load-emoji">🎨</span>
                        <p className="scene2-load-msg">{charLoadingMsg}</p>
                      </div>
                    ) : characterData?.character_media_url ? (
                      <PortraitImage
                        src={characterData.character_media_url.startsWith('http')
                          ? characterData.character_media_url
                          : `${import.meta.env.VITE_API_URL}${characterData.character_media_url}`}
                        alt={characterData.character_name}
                      />
                    ) : (
                      <div className="scene2-portrait-placeholder">
                        <span style={{ fontSize: '5rem', filter: 'drop-shadow(0 0 20px rgba(192,156,255,0.6))' }}>🦸</span>
                      </div>
                    )}
                  </div>

                  {/* Character info below portrait */}
                  <AnimatePresence mode="wait">
                    {charLoading ? (
                      <motion.div key="loading-name" className="scene2-char-info"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="scene2-char-name loading-text">✨ Drawing your character…</div>
                        <div className="scene2-char-badge">🎨 AI is working its magic...</div>
                      </motion.div>
                    ) : characterData ? (
                      <motion.div key="char-name" className="scene2-char-info"
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <div className="scene2-char-name">{characterData.character_name}</div>
                        <div className="scene2-char-badge">
                          🌟 {characterData.character_name} · {characterData.universe}
                        </div>
                        {/* Regenerate portrait button */}
                        <motion.button
                          className="scene2-regen-btn"
                          onClick={handleRegeneratePortrait}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          title="Generate a different portrait"
                        >
                          <span>🎨</span> Regenerate Portrait
                        </motion.button>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                {/* ── RIGHT floating glass panel: Story Settings ── */}
                <div className="scene2-right-panel">
                  <div className="scene2-panel-title">
                    Story Settings
                    <span className="scene2-live-dot" />
                  </div>

                  {/* Active pills */}
                  <div className="scene2-pills-row">
                    {characterData && <span className="scene2-pill scene2-pill-purple">{characterData.character_name}</span>}
                    {selectedTheme && <span className="scene2-pill scene2-pill-gold">{THEME_OPTIONS.find(t => t.id === selectedTheme)?.label}</span>}
                    {selectedChild && <span className="scene2-pill scene2-pill-teal">Grade {selectedChild.grade_level}</span>}
                  </div>

                  {/* Story preview mini-card */}
                  <div className="scene2-preview-card">
                    <div className="scene2-preview-label">PREVIEW</div>
                    <div className="scene2-preview-title">
                      {characterData?.character_name ? `${characterData.character_name}'s Adventure` : "Your Adventure"}
                    </div>
                    <div className="scene2-preview-sub">
                      {selectedTheme
                        ? THEME_OPTIONS.find(t => t.id === selectedTheme)?.label
                        : sceneDescription
                          ? sceneDescription.slice(0, 40) + '...'
                          : 'Choose a theme on the left...'}
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
                    {ART_STYLES.map(a => (
                      <motion.button key={a.id}
                        className={`imm-circle-btn imm-circle-art ${selectedArtStyle === a.id ? 'selected' : ''}`}
                        whileHover={{ scale: 1.08, y: -4 }} whileTap={{ scale: 0.94 }}
                        onClick={() => { setSelectedArtStyle(a.id); setGenerateError('') }}>
                        <span className="imm-circle-icon">{a.emoji}</span>
                        <span className="imm-circle-name">{a.label}</span>
                        <span className="imm-circle-desc">{a.desc}</span>
                        {selectedArtStyle === a.id && <span className="imm-circle-check">✓</span>}
                      </motion.button>
                    ))}
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

                  {/* ── Cycling character portraits ── */}
                  <div className="gscreen-char-row">
                    {[-2,-1,0,1,2].map(offset => {
                      const idx = (tipIndex + offset + ALL_CHARACTERS.length * 5) % ALL_CHARACTERS.length
                      const char = ALL_CHARACTERS[idx]
                      const isCenter = offset === 0
                      return (
                        <motion.div key={`${char.name}-${tipIndex}`}
                          className={`gscreen-char-bubble ${isCenter ? 'center' : ''}`}
                          style={{ opacity: 1 - Math.abs(offset) * 0.3, scale: 1 - Math.abs(offset) * 0.15 }}
                          animate={{ opacity: 1 - Math.abs(offset) * 0.3 }}
                        >
                          <img src={char.img} alt={char.name}
                            className="gscreen-char-img"
                            loading="eager"
                            onError={e => { (e.target as HTMLImageElement).style.display='none' }}
                          />
                          {/* Fallback shown behind img when it fails to load */}
                          <span className="gscreen-char-fallback">⭐</span>
                          {isCenter && (
                            <div className="gscreen-char-glow" />
                          )}
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* ── Main heading ── */}
                  <div className="gscreen-title-row">
                    <AnimatePresence mode="wait">
                      <motion.h1 key={tipIndex} className="gscreen-title"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.5 }}>
                        {WRITING_TIPS[tipIndex % WRITING_TIPS.length]}
                      </motion.h1>
                    </AnimatePresence>
                    <p className="gscreen-sub">Crafting <strong>{characterData?.character_name || characterInput}'s</strong> adventure…</p>
                  </div>

                  {/* ── Progress steps ── */}
                  <div className="gscreen-steps">
                    {[
                      { label: 'Writing story', emoji: '✍️' },
                      { label: 'Creating illustrations', emoji: '🎨' },
                      { label: 'Crafting quiz', emoji: '🧠' },
                    ].map((s, i) => {
                      const prog = tipIndex % WRITING_TIPS.length
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
            {step === 'preview' && generatedStory && (
              <motion.div key="preview" style={{ display: 'flex', justifyContent: 'center' }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="gen-preview-card">
                  <div className="preview-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Generation Complete!
                  </div>
                  <div style={{ fontSize: '4rem', lineHeight: 1 }}>📖</div>
                  <h3 className="preview-title">{generatedStory.title}</h3>
                  <div className="preview-tags">
                    <span className="preview-tag">Grade {grade}</span>
                    <span className="preview-tag">{LANGUAGES.find(l => l.id === selectedLanguage)?.label}</span>
                    <span className="preview-tag">{ART_STYLES.find(a => a.id === selectedArtStyle)?.label}</span>
                  </div>
                  <motion.button className="gen-btn" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(`/read/${generatedStory.id}`)}>
                    Start Reading! 📖
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </motion.button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ══ RIGHT PREVIEW PANEL ══ */}
        {step !== 'generating' && step !== 'preview' && step !== 'scene' && step !== 'character' && (
          <aside className="gen-preview-panel">
            <div className="gen-preview-panel-title">
              <span className="gen-preview-dot" />
              Live Preview
            </div>
            <div className="gen-preview-card-inner">
              <div className="gen-preview-card-cover">
                {previewEmoji}
              </div>
              <div className="gen-preview-card-body">
                <div className="gen-preview-card-title">
                  {previewChar ? `${previewChar}'s Adventure` : 'Your Story Title'}
                </div>
                <div className="gen-preview-card-desc">
                  {previewTheme
                    ? `Your story will take place: ${previewTheme.slice(0, 60)}${previewTheme.length > 60 ? '...' : ''}`
                    : 'Fill in the details to see your story preview here.'}
                </div>
                {selectedChild && <span className="gen-preview-tag">For {selectedChild.name}</span>}
                {selectedLanguage !== 'english' && <span className="gen-preview-tag">{LANGUAGES.find(l => l.id === selectedLanguage)?.label}</span>}
                {selectedArtStyle && <span className="gen-preview-tag">{ART_STYLES.find(a => a.id === selectedArtStyle)?.label}</span>}
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
