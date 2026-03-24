import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { storiesApi } from '../services/api'
import '../styles/generator.css'

const LANGUAGES = [
  { id: 'english', label: 'English', emoji: '🇺🇸', desc: 'Read in English' },
  { id: 'spanish', label: 'Spanish', emoji: '🇪🇸', desc: 'Lee en Español' },
]

const ART_STYLES = [
  { id: 'cartoon',    label: 'Cartoon',    emoji: '🎨', desc: 'Fun illustrated look',      color: '#A78BFA', bg: '#F5F3FF' },
  { id: 'real',       label: 'Realistic',  emoji: '📸', desc: 'Lifelike photos & scenes',  color: '#38BDF8', bg: '#F0F9FF' },
  { id: 'watercolor', label: 'Watercolor', emoji: '🖌️', desc: 'Soft painted brushstrokes', color: '#F9A8D4', bg: '#FFF1F2' },
  { id: 'pixar',      label: 'Pixar 3D',   emoji: '🦄', desc: 'Cinematic 3D animation',    color: '#4ADE80', bg: '#F0FDF4' },
]

const CHAR_LOADING_MSGS = [
  '🔍 Searching for your character...',
  '📚 Looking up their universe...',
  '🎨 Generating character portrait...',
  '✨ Nano Banana 2 is painting...',
  '🖼️ Almost ready...',
  '🌟 Character generation, please wait...',
]

const WRITING_TIPS = [
  '✍️ Writing your story...', '🎨 Creating illustrations...', '🧠 Crafting quiz questions...',
  '✨ Adding finishing touches...', '📖 Binding your book...', '🖼️ Painting illustrations...',
]

type Step = 'character' | 'scene' | 'language' | 'artStyle' | 'generating' | 'preview'

interface CharacterData {
  character_name: string
  universe: string
  description: string
  character_image_url: string | null
  scenes: { id: string; label: string; emoji: string; description: string; color: string }[]
}

const STEP_NUMS: Record<Step, number> = {
  character: 1, scene: 2, language: 3, artStyle: 4, generating: 5, preview: 5,
}

export default function StoryGenerator() {
  const navigate = useNavigate()
  const grade = Number(localStorage.getItem('readquest_grade') || 2)

  const [step, setStep] = useState<Step>('character')
  const [characterInput, setCharacterInput] = useState('')
  const [characterData, setCharacterData] = useState<CharacterData | null>(null)
  const [analyzeError, setAnalyzeError] = useState('')
  const [charLoadingMsg, setCharLoadingMsg] = useState(CHAR_LOADING_MSGS[0])
  const [charLoading, setCharLoading] = useState(false)

  const [sceneDescription, setSceneDescription] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('english')
  const [selectedArtStyle, setSelectedArtStyle] = useState<string | null>(null)
  const [tipIndex, setTipIndex] = useState(0)
  const [generatedStory, setGeneratedStory] = useState<{ id: string; title: string } | null>(null)
  const [generateError, setGenerateError] = useState('')

  const charMsgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Step 1 submit: start LLM, transition to step 2 immediately ────────────
  const handleAnalyzeCharacter = async () => {
    if (!characterInput.trim()) { setAnalyzeError('Tell us your favorite character! 😊'); return }
    setAnalyzeError('')
    setCharLoading(true)
    setCharacterData(null)
    setSceneDescription('')
    setStep('scene') // move right away — loader shown on step 2

    let msgIdx = 0
    charMsgIntervalRef.current = setInterval(() => {
      msgIdx = (msgIdx + 1) % CHAR_LOADING_MSGS.length
      setCharLoadingMsg(CHAR_LOADING_MSGS[msgIdx])
    }, 1400)

    try {
      const res = await storiesApi.analyzeCharacter(characterInput.trim())
      setCharacterData(res.data)
    } catch {
      setCharacterData({
        character_name: characterInput.trim(),
        universe: 'Original Story',
        description: `The amazing ${characterInput.trim()} — ready for a great adventure!`,
        character_image_url: null,
        scenes: [],
      })
    } finally {
      if (charMsgIntervalRef.current) clearInterval(charMsgIntervalRef.current)
      setCharLoading(false)
    }
  }

  useEffect(() => () => { if (charMsgIntervalRef.current) clearInterval(charMsgIntervalRef.current) }, [])

  // ── Generate story ────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setStep('generating')
    setGenerateError('')
    let idx = 0
    const tipInterval = setInterval(() => { idx = (idx + 1) % WRITING_TIPS.length; setTipIndex(idx) }, 2000)
    try {
      const theme = sceneDescription.trim() || 'exciting adventure'
      const res = await storiesApi.generate(
        grade, theme,
        characterData?.character_name ?? characterInput,
        selectedLanguage,
        selectedArtStyle ?? 'cartoon',
      )
      clearInterval(tipInterval)
      setGeneratedStory(res.data)
      setStep('preview')
    } catch (err: unknown) {
      clearInterval(tipInterval)
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Story generation failed. Please try again.'
      setGenerateError(msg)
      setStep('artStyle') // go back so they can retry
    }
  }

  const currentNum = Math.min(STEP_NUMS[step], 4)

  return (
    <div className="gen-root">
      <div className="gen-header">
        <button className="reader-back-btn gen-back" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        <h1 className="gen-header-title">✨ Story Creator</h1>
        <div />
      </div>

      {step !== 'generating' && step !== 'preview' && (
        <div className="gen-stepper">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className={`gen-step-dot ${n <= currentNum ? 'active' : ''}`}>
              {n < currentNum ? '✓' : n}
            </div>
          ))}
          <div className="gen-step-label">
            {step === 'character' && 'Choose Character'}
            {step === 'scene' && (charLoading ? 'Finding Character...' : 'Set the Scene')}
            {step === 'language' && 'Language'}
            {step === 'artStyle' && 'Art Style'}
          </div>
        </div>
      )}

      <div className="gen-center">
        <AnimatePresence mode="wait">

          {/* ── Step 1: Character input ── */}
          {step === 'character' && (
            <motion.div key="character" className="gen-card"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="gen-mascot" style={{ fontSize: '3.5rem' }}>🦸</div>
              <h2 className="gen-title">Who's your favorite character?</h2>
              <p className="gen-sub">
                Type a character name — like <em>Spider-Man</em>, <em>Mickey Mouse</em>, or <em>Moana</em>!
              </p>
              <div className="gen-name-area">
                <input
                  className="gen-input big-input"
                  type="text"
                  placeholder="e.g. Spider-Man, Mickey Mouse..."
                  value={characterInput}
                  onChange={e => { setCharacterInput(e.target.value); setAnalyzeError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleAnalyzeCharacter()}
                  autoFocus
                />
                {analyzeError && <p className="gen-error">{analyzeError}</p>}
              </div>
              <motion.button
                className="gen-btn"
                disabled={!characterInput.trim()}
                whileHover={characterInput.trim() ? { scale: 1.04 } : {}}
                whileTap={{ scale: 0.97 }}
                onClick={handleAnalyzeCharacter}>
                🔍 Find My Character →
              </motion.button>
              {/* Quick-pick chips */}
              <div className="char-suggestions">
                {['Mickey Mouse', 'Spider-Man', 'Moana', 'Batman', 'Elsa', 'Sonic'].map(c => (
                  <motion.button key={c} className="char-chip"
                    whileHover={{ scale: 1.06, y: -2 }}
                    onClick={() => { setCharacterInput(c); setAnalyzeError('') }}>
                    {c}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Loading → Character reveal + scene textarea ── */}
          {step === 'scene' && (
            <motion.div key="scene" className="gen-card"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>

              {/* Loading animation */}
              {charLoading && (
                <motion.div className="char-loading-area" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="char-loading-spinner">
                    {['🦁', '🦸', '🧙', '🦄', '⭐'].map((e, i) => (
                      <motion.span key={i} className="char-load-emoji"
                        animate={{ rotate: [0, 360], scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.2, ease: 'easeInOut' }}>
                        {e}
                      </motion.span>
                    ))}
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p key={charLoadingMsg} className="char-loading-msg"
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
                      {charLoadingMsg}
                    </motion.p>
                  </AnimatePresence>
                  <div className="char-loading-bar">
                    <motion.div className="char-loading-fill"
                      animate={{ width: ['15%', '88%'] }}
                      transition={{ duration: 7, ease: 'easeInOut' }} />
                  </div>
                </motion.div>
              )}

              {/* Character revealed + scene input */}
              {!charLoading && characterData && (
                <motion.div className="scene-step-content"
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}>

                  {/* Character portrait card */}
                  <div className="char-portrait-card">
                    <div className="char-portrait-bg" />
                    {characterData.character_image_url ? (
                      <motion.img
                        src={`http://localhost:8000${characterData.character_image_url}`}
                        alt={characterData.character_name}
                        className="char-portrait-img"
                        initial={{ opacity: 0, scale: 0.85, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 180, damping: 20, delay: 0.1 }}
                      />
                    ) : (
                      <motion.div className="char-big-emoji"
                        animate={{ y: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}>
                        🦸
                      </motion.div>
                    )}
                    <div className="char-portrait-info">
                      <div className="char-universe-badge">{characterData.universe}</div>
                      <h2 className="char-card-name">{characterData.character_name}</h2>
                      <p className="char-card-desc">{characterData.description}</p>
                    </div>
                  </div>

                  {/* Scene description textarea */}
                  <div className="scene-input-section">
                    <label className="scene-input-label">🌍 Where should the story take place?</label>
                    <p className="scene-input-hint">Describe the setting in your own words — get creative!</p>
                    <textarea
                      className="scene-textarea"
                      placeholder={`e.g. "A rainy night in New York City where ${characterData.character_name} discovers a hidden door in Central Park..."`}
                      value={sceneDescription}
                      onChange={e => setSceneDescription(e.target.value)}
                      rows={4}
                      autoFocus
                    />
                    {/* Quick setting chips */}
                    <div className="scene-chips-row">
                      {[
                        'In outer space 🚀',
                        'Deep underwater 🌊',
                        'A magical forest 🌲',
                        'A big city 🏙️',
                        'A haunted castle 👻',
                      ].map(s => (
                        <motion.button key={s} className="char-chip"
                          whileHover={{ scale: 1.05 }}
                          onClick={() => setSceneDescription(s)}>
                          {s}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="gen-btn-row">
                    <button className="landing-btn-ghost" onClick={() => setStep('character')}>← Back</button>
                    <motion.button className="gen-btn" style={{ flex: 1 }}
                      disabled={!sceneDescription.trim()}
                      whileHover={sceneDescription.trim() ? { scale: 1.04 } : {}}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setStep('language')}>
                      Next: Language →
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Step 3: Language ── */}
          {step === 'language' && (
            <motion.div key="language" className="gen-card"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
              <div className="gen-mascot">🌍</div>
              <h2 className="gen-title">What language?</h2>
              <p className="gen-sub">Pick the language for your story text.</p>
              <div className="lang-grid">
                {LANGUAGES.map(l => (
                  <motion.button key={l.id}
                    className={`lang-card ${selectedLanguage === l.id ? 'selected' : ''}`}
                    whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedLanguage(l.id)}>
                    <span className="lang-flag">{l.emoji}</span>
                    <span className="lang-label">{l.label}</span>
                    <span className="lang-desc">{l.desc}</span>
                    {selectedLanguage === l.id && <div className="scene-check">✓</div>}
                  </motion.button>
                ))}
              </div>
              <div className="gen-btn-row">
                <button className="landing-btn-ghost" onClick={() => setStep('scene')}>← Back</button>
                <motion.button className="gen-btn" style={{ flex: 1 }}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setStep('artStyle')}>
                  Next: Art Style →
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Art Style ── */}
          {step === 'artStyle' && (
            <motion.div key="artStyle" className="gen-card wide-card"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
              <div className="gen-mascot">🎨</div>
              <h2 className="gen-title">Pick an art style!</h2>
              <p className="gen-sub">How should your illustrations look?</p>
              {/* Art style grid */}
              <div className="art-grid">
                {ART_STYLES.map(a => (
                  <motion.button key={a.id}
                    className={`art-card ${selectedArtStyle === a.id ? 'selected' : ''}`}
                    style={{ '--ac': a.color, '--ab': a.bg } as React.CSSProperties}
                    whileHover={{ scale: 1.06, y: -4 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { setSelectedArtStyle(a.id); setGenerateError('') }}>
                    <div className="art-emoji">{a.emoji}</div>
                    <div className="art-label">{a.label}</div>
                    <div className="art-desc">{a.desc}</div>
                    {selectedArtStyle === a.id && <div className="scene-check">✓</div>}
                  </motion.button>
                ))}
              </div>
              {generateError && (
                <p className="gen-error" style={{ textAlign: 'center' }}>⚠️ {generateError}</p>
              )}
              <div className="gen-btn-row">
                <button className="landing-btn-ghost" onClick={() => setStep('language')}>← Back</button>
                <motion.button className="gen-btn" style={{ flex: 1 }} disabled={!selectedArtStyle}
                  whileHover={selectedArtStyle ? { scale: 1.04 } : {}} whileTap={{ scale: 0.97 }}
                  onClick={handleGenerate}>
                  ✨ Create My Story!
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Generating ── */}
          {step === 'generating' && (
            <motion.div key="generating" className="gen-card generating-card"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="gen-writing-owl">
                <div className="owl-body">🦉</div>
                <div className="quill-pen">✒️</div>
              </div>
              <h2 className="gen-title">Creating your story...</h2>
              <div className="gen-summary-chips">
                <span className="summary-chip">🦸 {characterData?.character_name}</span>
                <span className="summary-chip">🌍 {sceneDescription.slice(0, 28)}{sceneDescription.length > 28 ? '…' : ''}</span>
                <span className="summary-chip">{selectedLanguage === 'spanish' ? '🇪🇸' : '🇺🇸'} {selectedLanguage}</span>
                <span className="summary-chip">🎨 {ART_STYLES.find(a => a.id === selectedArtStyle)?.label}</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.p key={tipIndex} className="gen-tip"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
                  {WRITING_TIPS[tipIndex]}
                </motion.p>
              </AnimatePresence>
              <div className="generating-dots">
                {[0, 1, 2].map(i => <div key={i} className="gen-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
              </div>
            </motion.div>
          )}

          {/* ── Preview ── */}
          {step === 'preview' && generatedStory && (
            <motion.div key="preview" className="gen-card preview-card"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}>
              <motion.div className="preview-confetti" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 2, duration: 1 }}>
                {['🎉', '⭐', '✨', '🎊', '🌟'].map((e, i) => (
                  <span key={i} className="confetti-piece" style={{ '--ci': i } as React.CSSProperties}>{e}</span>
                ))}
              </motion.div>
              <div className="preview-badge">📚 Your Story is Ready!</div>
              <div className="preview-cover">
                <div className="preview-cover-inner">
                  {characterData?.character_image_url ? (
                    <img
                      src={`http://localhost:8000${characterData.character_image_url}`}
                      alt={characterData.character_name}
                      className="preview-portrait-img"
                    />
                  ) : (
                    <div className="preview-emoji">🦸</div>
                  )}
                  <h3 className="preview-title">{generatedStory.title}</h3>
                  <div className="preview-tags">
                    <span className="preview-tag">Grade {grade}</span>
                    <span className="preview-tag">{selectedLanguage === 'spanish' ? '🇪🇸 Español' : '🇺🇸 English'}</span>
                    <span className="preview-tag">
                      {ART_STYLES.find(a => a.id === selectedArtStyle)?.emoji} {ART_STYLES.find(a => a.id === selectedArtStyle)?.label}
                    </span>
                  </div>
                </div>
              </div>
              <div className="preview-xp-badge">+50 XP for completing! ⭐</div>
              <div className="gen-btn-row">
                <motion.button className="gen-btn" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/read/${generatedStory.id}`)}>
                  📖 Start Reading!
                </motion.button>
                <button className="landing-btn-ghost"
                  onClick={() => {
                    setStep('character')
                    setCharacterInput('')
                    setCharacterData(null)
                    setSceneDescription('')
                    setSelectedArtStyle(null)
                  }}>
                  Create Another
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
