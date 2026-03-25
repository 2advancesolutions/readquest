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
  character_media_url: string | null
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
        character_media_url: null,
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
        <div className="gen-progress-header">
          <div className="gen-stepper">
            {[
              { num: 1, key: 'character', label: 'Character' },
              { num: 2, key: 'scene', label: 'Scene' },
              { num: 3, key: 'language', label: 'Language' },
              { num: 4, key: 'artStyle', label: 'Style' }
            ].map((s, i, arr) => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center' }}>
                <div className={`stepper-item ${s.num <= currentNum ? 'active' : ''}`}>
                  <div className="stepper-circle">
                    {s.num < currentNum ? '✓' : s.num}
                  </div>
                  <div className="stepper-label">{s.label}</div>
                  {i < arr.length - 1 && (
                    <div className="stepper-line" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="gen-center">
        <AnimatePresence mode="wait">

          {/* ── Step 1: Character ── */}
          {step === 'character' && (
            <motion.div key="character" className="gen-card"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <div className="gen-card-header">
                <h2 className="gen-title">Character Configuration</h2>
                <p className="gen-sub">Define the protagonist for your generated content.</p>
              </div>

              <div className="input-group">
                <label className="input-label">Character Prompt</label>
                <input
                  className="gen-input"
                  placeholder="e.g. Spider-Man, Mario, my dog Buster..."
                  value={characterInput}
                  onChange={e => setCharacterInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAnalyzeCharacter()}
                  autoFocus
                />
                {analyzeError && <p className="gen-error">{analyzeError}</p>}
              </div>

              <div className="char-chips">
                {['Sonic', 'Elsa', 'Pikachu', 'Batman'].map(c => (
                  <motion.button key={c} className="char-chip"
                    whileHover={{ y: -1 }}
                    onClick={() => { setCharacterInput(c); setAnalyzeError('') }}>
                    {c}
                  </motion.button>
                ))}
              </div>

              <div className="gen-btn-row" style={{ marginTop: 32 }}>
                <motion.button className="gen-btn"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleAnalyzeCharacter}>
                  Generate Profile
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Scene ── */}
          {step === 'scene' && (
            <motion.div key="scene" className="gen-card wide-card"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>

              <div className="scene-split">
                {/* Left: Character preview */}
                <div className="scene-char-side">
                  <div className="scene-portrait-wrap">
                    {charLoading ? (
                      <div className="scene-portrait-placeholder pulse">
                        <svg className="loader-ring" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      </div>
                    ) : characterData?.character_media_url ? (
                      characterData.character_media_url.endsWith('.mp4') || characterData.character_media_url.endsWith('.webm') ? (
                        <video
                          src={characterData.character_media_url.startsWith('http') ? characterData.character_media_url : `http://localhost:8000${characterData.character_media_url}`}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="scene-portrait-img"
                          style={{objectFit: 'cover'}}
                        />
                      ) : (
                        <motion.img
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          src={characterData.character_media_url.startsWith('http') ? characterData.character_media_url : `http://localhost:8000${characterData.character_media_url}`}
                          alt={characterData.character_name}
                          className="scene-portrait-img"
                        />
                      )
                    ) : (
                      <div className="scene-portrait-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                    )}
                  </div>

                  {charLoading ? (
                    <>
                      <h3 className="scene-char-name loading-text">Synthesizing...</h3>
                      <AnimatePresence mode="wait">
                        <motion.p className="scene-char-desc loading-sub"
                          initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                          Retrieving data...
                        </motion.p>
                      </AnimatePresence>
                    </>
                  ) : characterData ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <h3 className="scene-char-name">{characterData.character_name}</h3>
                      <p className="scene-char-desc">{characterData.description}</p>
                    </motion.div>
                  ) : (
                    <p className="scene-char-desc">Failed to load profile.</p>
                  )}
                </div>

                {/* Right: Scene input */}
                <div className="scene-input-side">
                  <div className="input-group">
                    <label className="input-label">Setting Prompt</label>
                    <textarea
                      className="gen-textarea"
                      placeholder="e.g. Exploring a spooky haunted house, discovering a secret base on Mars..."
                      value={sceneDescription}
                      onChange={e => setSceneDescription(e.target.value)}
                      rows={5}
                      autoFocus
                    />
                  </div>

                  <div className="scene-chips-row">
                    {['A magical forest', 'Outer space', 'Under the ocean', 'A futuristic city'].map(s => (
                      <motion.button key={s} className="char-chip"
                        whileHover={{ y: -1 }}
                        onClick={() => setSceneDescription(s)}>
                        {s}
                      </motion.button>
                    ))}
                  </div>

                  <div className="gen-btn-row">
                    <button className="gen-btn-ghost" onClick={() => setStep('character')}>Back</button>
                    <motion.button className="gen-btn" style={{ flex: 1 }}
                      disabled={!sceneDescription.trim() || charLoading}
                      whileHover={sceneDescription.trim() && !charLoading ? { scale: 1.02 } : {}}
                      onClick={() => setStep('language')}>
                      Continue
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Language ── */}
          {step === 'language' && (
            <motion.div key="language" className="gen-card"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <div className="gen-card-header">
                <h2 className="gen-title">Localization</h2>
                <p className="gen-sub">Select the output language for the generated text.</p>
              </div>
              <div className="lang-grid">
                {LANGUAGES.map(l => (
                  <motion.button key={l.id}
                    className={`lang-card ${selectedLanguage === l.id ? 'selected' : ''}`}
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedLanguage(l.id)}>
                    <div className="lang-header">
                      <span className="lang-label">{l.label}</span>
                      {selectedLanguage === l.id && (
                        <span className="lang-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></span>
                      )}
                    </div>
                    <span className="lang-desc">{l.desc}</span>
                  </motion.button>
                ))}
              </div>
              <div className="gen-btn-row" style={{ marginTop: 32 }}>
                <button className="gen-btn-ghost" onClick={() => setStep('scene')}>Back</button>
                <motion.button className="gen-btn" style={{ flex: 1 }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setStep('artStyle')}>
                  Continue
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Art Style ── */}
          {step === 'artStyle' && (
            <motion.div key="artStyle" className="gen-card wide-card"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <div className="gen-card-header">
                <h2 className="gen-title">Aesthetic Selection</h2>
                <p className="gen-sub">Choose a visual style for the generated illustrations.</p>
              </div>
              <div className="art-grid">
                {ART_STYLES.map(a => (
                  <motion.button key={a.id}
                    className={`art-card ${selectedArtStyle === a.id ? 'selected' : ''}`}
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedArtStyle(a.id); setGenerateError('') }}>
                    <div className="art-header">
                      <div className="art-label">{a.label}</div>
                      {selectedArtStyle === a.id && (
                        <span className="art-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></span>
                      )}
                    </div>
                    <div className="art-desc">{a.desc}</div>
                  </motion.button>
                ))}
              </div>
              {generateError && (
                <p className="gen-error" style={{ textAlign: 'center', marginTop: 16 }}>{generateError}</p>
              )}
              <div className="gen-btn-row" style={{ marginTop: 32 }}>
                <button className="gen-btn-ghost" onClick={() => setStep('language')}>Back</button>
                <motion.button className="gen-btn" style={{ flex: 1 }} disabled={!selectedArtStyle}
                  whileHover={selectedArtStyle ? { scale: 1.02 } : {}} whileTap={{ scale: 0.98 }}
                  onClick={handleGenerate}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 18, height: 18, marginRight: 8 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Execute Generation
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Generating ── */}
          {step === 'generating' && (
            <motion.div key="generating" className="gen-card generating-card"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div className="generating-loader">
                <svg className="loader-ring" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </div>
              <h2 className="gen-title">Processing Content...</h2>
              <div className="gen-summary-list">
                <div className="summary-item">
                  <span className="summary-key">Subject</span>
                  <span className="summary-val">{characterInput}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-key">Setting</span>
                  <span className="summary-val">{sceneDescription.slice(0, 30)}...</span>
                </div>
                <div className="summary-item">
                  <span className="summary-key">Locale</span>
                  <span className="summary-val">{selectedLanguage}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-key">Style</span>
                  <span className="summary-val">{ART_STYLES.find(a => a.id === selectedArtStyle)?.label}</span>
                </div>
              </div>
              <AnimatePresence mode="wait">
                <motion.p className="gen-tip"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
                  Writing your story...
                </motion.p>
              </AnimatePresence>
              <div className="generating-bar-wrap">
                <div className="generating-bar" />
              </div>
            </motion.div>
          )}

          {/* ── Preview ── */}
          {step === 'preview' && generatedStory && (
            <motion.div key="preview" className="gen-card preview-card"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}>
              <div className="preview-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Generation Complete
              </div>

              <div className="preview-cover-large">
                <h3 className="preview-title">{generatedStory.title}</h3>
                <div className="preview-tags">
                  <span className="preview-tag">Grade {grade}</span>
                  <span className="preview-tag">{selectedLanguage}</span>
                  <span className="preview-tag">{ART_STYLES.find(a => a.id === selectedArtStyle)?.label}</span>
                </div>
              </div>

              <div className="gen-btn-row">
                <motion.button className="gen-btn" style={{ flex: 1, padding: '16px' }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/read/${generatedStory.id}`)}>
                  View Content
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 16, height: 16, marginLeft: 8 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
