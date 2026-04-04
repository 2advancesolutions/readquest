import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { removeBackground } from '../lib/removeBackground'
import { ALL_CHARACTERS } from '../components/CharacterGallery'
import {
  AssetOption,
  SKIN_TONES, HAIR_COLORS, OUTFIT_COLORS, ACCESSORIES, EFFECTS, EFFECT_OVERLAYS,
  BOY_DEFAULTS, GIRL_DEFAULTS,
  getHairByGender, getOutfitsByGender, getShoesByGender,
  getHatsByGender, getJacketsByGender,
} from '../data/characterAssets'
import '../styles/design-tokens.css'
import '../styles/character-studio.css'

// ── Tabs ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'skin',        label: 'Skin',      emoji: '🎨' },
  { id: 'hair',        label: 'Hair',      emoji: '💇' },
  { id: 'eyes',        label: 'Eyes',      emoji: '👀' },
  { id: 'outfits',     label: 'Outfits',   emoji: '👕' },
  { id: 'shoes',       label: 'Shoes',     emoji: '👟' },
  { id: 'hats',        label: 'Hats',      emoji: '🎩' },
  { id: 'jackets',     label: 'Jackets',   emoji: '🧥' },
  { id: 'accessories', label: 'Extras',    emoji: '✨' },
  { id: 'effects',     label: 'Effects',   emoji: '🌟' },
]

const BODY_TYPES = [
  { id: 'boy',     label: 'Boy',   emoji: '🦸‍♂️' },
  { id: 'girl',    label: 'Girl',  emoji: '🦸‍♀️' },
  { id: 'neutral', label: 'Hero',  emoji: '🥷' },
]

const EYE_STYLES: AssetOption[] = [
  { id: 'round',     label: 'Round',      emoji: '👁️' },
  { id: 'almond',    label: 'Almond',     emoji: '🌙' },
  { id: 'big_anime', label: 'Big & Shiny',emoji: '✨' },
  { id: 'narrow',    label: 'Narrow',     emoji: '😏' },
  { id: 'sparkle',   label: 'Starry',     emoji: '🌟' },
  { id: 'sleepy',    label: 'Sleepy',     emoji: '😴', xpRequired: 500 },
]
const EYE_COLORS = ['#4A90D9','#2D7A3D','#8B4513','#1A1A1A','#9B59B6','#E74C3C','#F39C12']

const GEN_MSGS = [
  '🎨 Painting your character…',
  '✨ Adding magic details…',
  '🦸 Powering up!',
  '🌟 Almost ready…',
]

// ── Build AI prompt from character config ──────────────────────────────────
function buildPrompt(cfg: {
  name: string; bodyType: string; skinTone: string
  hairStyle: string; hairColor: string
  eyeStyle: string; eyeColor: string
  outfit: string; outfitColor: string
  shoes: string; hat: string | null; jacket: string | null
  accessory: string | null; effect: string | null
}): string {
  const parts = [
    `${cfg.name}, a ${cfg.bodyType === 'girl' ? 'heroic girl' : cfg.bodyType === 'boy' ? 'heroic boy' : 'hero'} character`,
    `${cfg.hairStyle.replace(/_/g,' ')} hair in ${cfg.hairColor} color`,
    `${cfg.eyeStyle.replace(/_/g,' ')} eyes`,
    `wearing ${cfg.outfit.replace(/_/g,' ')} in ${cfg.outfitColor}`,
    cfg.hat && cfg.hat !== 'none' ? `${cfg.hat.replace(/_/g,' ')} hat` : '',
    cfg.jacket && cfg.jacket !== 'none' ? `${cfg.jacket.replace(/_/g,' ')}` : '',
    cfg.accessory && cfg.accessory !== 'none' ? `holding ${cfg.accessory.replace(/_/g,' ')}` : '',
    cfg.effect && cfg.effect !== 'none' ? `surrounded by ${cfg.effect.replace(/_/g,' ')} aura` : '',
    'Roblox-style cartoon superhero, full body, white background, vibrant colors, kid-friendly, fun and bold',
  ].filter(Boolean)
  return parts.join(', ')
}

// Category gradient palettes
const CAT_GRADIENTS: Record<string, string> = {
  hair:      'linear-gradient(145deg,#4a0e8f,#7c3aed)',
  eyes:      'linear-gradient(145deg,#0e3a6f,#2563eb)',
  outfits:   'linear-gradient(145deg,#0a3d25,#059669)',
  shoes:     'linear-gradient(145deg,#4a1a00,#d97706)',
  hats:      'linear-gradient(145deg,#2d1a60,#6d28d9)',
  jackets:   'linear-gradient(145deg,#1a0050,#4f46e5)',
  accessories:'linear-gradient(145deg,#4a0030,#db2777)',
  effects:   'linear-gradient(145deg,#3d1800,#f59e0b)',
  skin:      'linear-gradient(145deg,#3d1800,#92400e)',
}

// ── Asset Card ─────────────────────────────────────────────────────────────
function AssetCard({ item, selected, userXP, onSelect, generating, category = 'hair' }: {
  item: AssetOption; selected: boolean; userXP: number
  onSelect: (id: string) => void; generating: boolean
  category?: string
}) {
  const locked = (item.xpRequired ?? 0) > userXP
  const grad = CAT_GRADIENTS[category] ?? CAT_GRADIENTS.hair
  return (
    <motion.button
      className={`cs-asset-card ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}`}
      onClick={() => !locked && onSelect(item.id)}
      whileHover={!locked ? { y: -5, scale: 1.05 } : {}}
      whileTap={!locked ? { scale: 0.93 } : {}}
      title={locked ? `Unlock at ${item.xpRequired} XP` : item.label}
    >
      <div style={{
        width: 68, height: 68, borderRadius: 14, flexShrink: 0,
        background: grad,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: item.id === 'none' ? '1.6rem' : '2.4rem',
        boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.12), 0 4px 12px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.08)',
        lineHeight: 1,
      }}>
        {item.emoji}
      </div>
      <span className="cs-asset-name">{item.label}</span>
      {item.xpRequired && <span className="cs-asset-xp-tag">⭐ {item.xpRequired} XP</span>}
      {selected && generating && (
        <div style={{
          position:'absolute',inset:0,background:'rgba(8,4,24,0.75)',
          borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',
        }}>
          <div style={{width:20,height:20,border:'2.5px solid rgba(192,132,252,0.3)',
            borderTopColor:'#c084fc',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
        </div>
      )}
    </motion.button>
  )
}


// ── Color Row ──────────────────────────────────────────────────────────────
function ColorRow({ label, colors, selected, onSelect }: {
  label: string; colors: string[]; selected: string; onSelect: (c: string) => void
}) {
  return (
    <div className="cs-color-row">
      <span className="cs-color-label">{label}:</span>
      {colors.map(c => (
        <button key={c} className={`cs-color-swatch ${selected === c ? 'selected' : ''}`}
          style={{ background: c }} onClick={() => onSelect(c)} />
      ))}
      <div className="cs-custom-color-btn" title="Custom color">
        <input type="color" value={selected} onChange={e => onSelect(e.target.value)} />
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function CharacterStudio() {
  const navigate = useNavigate()
  const API = import.meta.env.VITE_API_URL ?? ''

  // Character config
  const [charName,    setCharName]    = useState('My Hero')
  const [bodyType,    setBodyType]    = useState<'boy'|'girl'|'neutral'>('boy')
  const [skinTone,    setSkinTone]    = useState('#E8B480')
  const [hairStyle,   setHairStyle]   = useState('fade_cut')
  const [hairColor,   setHairColor]   = useState('#3B2507')
  const [eyeStyle,    setEyeStyle]    = useState('round')
  const [eyeColor,    setEyeColor]    = useState('#4A90D9')
  const [outfit,      setOutfit]      = useState('tshirt_jeans')
  const [outfitColor, setOutfitColor] = useState('#7C3AED')
  const [shoes,       setShoes]       = useState('sneakers')
  const [shoesColor,  setShoesColor]  = useState('#333333')
  const [hat,         setHat]         = useState<string|null>(null)
  const [hatColor,    setHatColor]    = useState('#3B2507')
  const [jacket,      setJacket]      = useState<string|null>(null)
  const [jacketColor, setJacketColor] = useState('#2563EB')
  const [accessory,   setAccessory]   = useState<string|null>(null)
  const [effect,      setEffect]      = useState<string|null>(null)
  const [portraitUrl, setPortraitUrl] = useState<string|null>(null)

  // UI state
  const [activeTab,       setActiveTab]       = useState('hair')
  const [studentId,       setStudentId]       = useState<string|null>(null)
  const [userXP,          setUserXP]          = useState(0)
  const [savedChars,      setSavedChars]      = useState<any[]>([])
  const [editingCharId,   setEditingCharId]   = useState<string|null>(null)
  const [generating,      setGenerating]      = useState(false)
  const [genMsg,          setGenMsg]          = useState(GEN_MSGS[0])
  const [saving,          setSaving]          = useState(false)
  const [showToast,       setShowToast]       = useState(false)
  const [toastMsg,        setToastMsg]        = useState('')
  const [pendingGen,      setPendingGen]      = useState(false)
  // NOTE: ref (not state) so setTimeout closes over the live value — no stale closure
  const lastChangedFieldRef = useRef<string>('')
  const [accordionOpen,   setAccordionOpen]   = useState(true)

  const genTimerRef   = useRef<ReturnType<typeof setTimeout>|null>(null)
  const msgTimerRef   = useRef<ReturnType<typeof setInterval>|null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null)

  // Derived gender-specific lists
  const hairList    = getHairByGender(bodyType)
  const outfitList  = getOutfitsByGender(bodyType)
  const shoesList   = getShoesByGender(bodyType)
  const hatsList    = getHatsByGender(bodyType)
  const jacketsList = getJacketsByGender(bodyType)
  const effectOverlay = effect && effect !== 'none' ? EFFECT_OVERLAYS[effect] : null

  // ── Init: random character on first load ───────────────────────────────
  useEffect(() => {
    const sid = localStorage.getItem('readquest_student_id')
    setStudentId(sid)

    // Random gender
    const gender = Math.random() > 0.5 ? 'boy' : 'girl'
    setBodyType(gender as any)
    const defaults = gender === 'boy' ? BOY_DEFAULTS : GIRL_DEFAULTS
    const pick = defaults[Math.floor(Math.random() * defaults.length)]
    setHairStyle(pick.hairStyle)
    setOutfit(pick.outfit)
    setShoes(pick.shoes)
    const skin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)]
    setSkinTone(skin.hex)

    if (sid) {
      fetch(`${API}/api/rewards/xp`, { headers: { 'X-Student-ID': sid } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.total_xp) setUserXP(d.total_xp) })
        .catch(() => {})
      loadSavedChars(sid)
    }

    // Auto-generate initial portrait after short delay
    setTimeout(() => triggerGenNow({
      name: 'My Hero', bodyType: gender, skinTone: skin.hex,
      hairStyle: pick.hairStyle, hairColor: '#3B2507',
      eyeStyle: 'round', eyeColor: '#4A90D9',
      outfit: pick.outfit, outfitColor: '#7C3AED',
      shoes: pick.shoes, hat: null, jacket: null, accessory: null, effect: null,
    }), 300)
  }, []) // eslint-disable-line

  const loadSavedChars = async (sid: string) => {
    const { data } = await supabase.from('custom_characters')
      .select('*').eq('student_id', sid)
      .order('created_at', { ascending: false }).limit(10)
    if (data) setSavedChars(data)
  }

  // ── Core generate function ─────────────────────────────────────────────
  // lastPortraitRef: tracks the current portrait for image-to-image edits
  // IMPORTANT: both refs are read inside the callback so there is no stale closure
  const lastPortraitRef = useRef<string | null>(null)

  const triggerGenNow = useCallback(async (cfg?: any) => {
    if (genTimerRef.current) clearTimeout(genTimerRef.current)
    if (msgTimerRef.current) clearInterval(msgTimerRef.current)
    setPendingGen(false)
    setGenerating(true)

    let msgIdx = 0
    setGenMsg(GEN_MSGS[0])
    msgTimerRef.current = setInterval(() => {
      msgIdx = (msgIdx + 1) % GEN_MSGS.length
      setGenMsg(GEN_MSGS[msgIdx])
    }, 2000)

    // Merge caller overrides with current state
    const c = {
      name: charName, bodyType, skinTone, hairStyle, hairColor,
      eyeStyle, eyeColor, outfit, outfitColor, shoes,
      hat, jacket, accessory, effect,
      ...(cfg ?? {}),
    }
    const desc = buildPrompt(c)

    // ── Read REFS directly (never stale, unlike state inside useCallback) ──
    const existingPortrait = lastPortraitRef.current
    const changedField     = lastChangedFieldRef.current   // FIX 1: ref not state

    try {
      let newPortraitUrl: string | null = null

      // ── Branch A: image-to-image edit via Kontext ──────────────────────
      if (existingPortrait && changedField) {
        const editPrompt =
          `This is a cartoon superhero character portrait. ` +
          `Change ONLY the ${changedField.toLowerCase()}. ` +
          `New ${changedField.toLowerCase()}: ${desc}. ` +
          `Keep the exact same character face, body, skin tone, and pose. Do not change anything else.`

        setGenMsg('🎨 Editing your character…')
        try {
          const res = await fetch(`${API}/api/stories/edit-character`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: existingPortrait,
              prompt: editPrompt,
              character_description: desc,
            }),
          })
          const data = await res.json()
          if (res.ok && data.portrait_url) {
            newPortraitUrl = data.portrait_url
          } else {
            // FIX 3: Kontext failed → fall through to text-to-image below
            console.warn('[gen] Kontext edit failed:', data.detail ?? 'no url')
          }
        } catch (editErr) {
          console.warn('[gen] Kontext fetch error:', editErr)
          // Fall through to text-to-image
        }
      }

      // ── Branch B: full text-to-image (first gen OR Kontext fallback) ────
      if (!newPortraitUrl) {
        setPortraitUrl(null)   // clear old portrait while generating
        setGenMsg(changedField ? '✨ Regenerating with new style…' : GEN_MSGS[0])
        const res = await fetch(`${API}/api/stories/generate-background`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            theme: 'magical colorful superhero world',
            character_name: c.name,
            character_description: desc,
            scene_description:
              `${c.name} standing heroically, full body portrait, ` +
              `transparent background, Roblox cartoon superhero style, vibrant colors`,
            art_style: 'cartoon',
          }),
        })
        const data = await res.json()
        if (res.ok) {
          newPortraitUrl = data.portrait_url ?? data.background_url ?? null
        } else {
          // FIX 2: surface error to user as a toast
          const errMsg = data.detail ?? 'Generation failed'
          showToastMsg(`⚠️ ${errMsg.includes('balance') ? 'AI credits exhausted — top up at fal.ai/dashboard' : errMsg}`)
        }
      }

      if (newPortraitUrl) {
        const transparent = await removeBackground(newPortraitUrl).catch(() => newPortraitUrl)
        const finalUrl = transparent ?? newPortraitUrl
        setPortraitUrl(finalUrl)
        lastPortraitRef.current = finalUrl   // update ref for next edit
      }
    } catch (e: any) {
      console.error('[gen]', e)
      showToastMsg('⚠️ Portrait generation failed — check your connection')
    } finally {
      if (msgTimerRef.current) clearInterval(msgTimerRef.current)
      setGenerating(false)
    }
  }, [charName, bodyType, skinTone, hairStyle, hairColor, eyeStyle, eyeColor,
      outfit, outfitColor, shoes, hat, jacket, accessory, effect, API]) // eslint-disable-line

  // ── Debounced auto-gen: fires 2.5s after last change ──────────────────
  // FIX 1: Write to ref SYNCHRONOUSLY before setTimeout, so the callback
  //         always reads the correct field name (eliminates stale closure).
  const scheduleGen = useCallback((fieldLabel: string) => {
    lastChangedFieldRef.current = fieldLabel   // ← sync write to ref
    setPendingGen(true)
    if (genTimerRef.current) clearTimeout(genTimerRef.current)
    genTimerRef.current = setTimeout(() => triggerGenNow(), 2500)
  }, [triggerGenNow])

  // ── Asset selection helpers that auto-schedule generation ──────────────
  const pickHair    = (id: string) => { setHairStyle(id);    scheduleGen('Hair Style') }
  const pickEye     = (id: string) => { setEyeStyle(id);     scheduleGen('Eye Style') }
  const pickOutfit  = (id: string) => { setOutfit(id);       scheduleGen('Outfit') }
  const pickShoes   = (id: string) => { setShoes(id);        scheduleGen('Shoes') }
  const pickHat     = (id: string) => { setHat(id === 'none' ? null : id); scheduleGen('Hat') }
  const pickJacket  = (id: string) => { setJacket(id === 'none' ? null : id); scheduleGen('Jacket') }
  const pickAccess  = (id: string) => { setAccessory(id === 'none' ? null : id); scheduleGen('Accessory') }
  const pickEffect  = (id: string) => { setEffect(id === 'none' ? null : id); scheduleGen('Effect') }
  const pickSkin    = (hex: string) => { setSkinTone(hex);   scheduleGen('Skin Tone') }
  const pickHairCol = (c: string)   => { setHairColor(c);    scheduleGen('Hair Color') }

  // Changing gender: reset assets + immediately generate (no debounce)
  const changeGender = useCallback((g: 'boy'|'girl'|'neutral') => {
    if (genTimerRef.current) clearTimeout(genTimerRef.current)
    const defaults = g === 'girl' ? GIRL_DEFAULTS : BOY_DEFAULTS
    const pick = defaults[Math.floor(Math.random() * defaults.length)]
    // Update state
    setBodyType(g)
    setHairStyle(pick.hairStyle)
    setOutfit(pick.outfit)
    setShoes(pick.shoes)
    setHat(null); setJacket(null)
    setPendingGen(false)
    // Trigger immediately with new values (bypass stale closure)
    triggerGenNow({
      bodyType: g,
      hairStyle: pick.hairStyle,
      outfit: pick.outfit,
      shoes: pick.shoes,
      hat: null, jacket: null,
    } as any)
  }, [triggerGenNow]) // eslint-disable-line

  // ── Save character ─────────────────────────────────────────────────────
  const saveCharacter = async () => {
    if (!studentId) { showToastMsg('⚠️ No student selected'); return }
    setSaving(true)
    const payload = {
      student_id: studentId,
      name: charName.trim() || 'My Hero',
      body_type: bodyType, skin_tone: skinTone,
      hair_style: hairStyle, hair_color: hairColor,
      eye_style: eyeStyle, eye_color: eyeColor,
      outfit, outfit_color: outfitColor,
      shoes, shoes_color: shoesColor,
      hat: hat === 'none' ? null : hat, hat_color: hatColor,
      jacket: jacket === 'none' ? null : jacket, jacket_color: jacketColor,
      accessory: accessory === 'none' ? null : accessory,
      effect: effect === 'none' ? null : effect,
      portrait_url: portraitUrl,
      visual_description: buildPrompt({ name: charName, bodyType, skinTone, hairStyle, hairColor, eyeStyle, eyeColor, outfit, outfitColor, shoes, hat, jacket, accessory, effect }),
      updated_at: new Date().toISOString(),
    }
    try {
      if (editingCharId) {
        await supabase.from('custom_characters').update(payload).eq('id', editingCharId)
      } else {
        const { data } = await supabase.from('custom_characters').insert(payload).select().single()
        if (data) setEditingCharId(data.id)
      }
      if (studentId) await loadSavedChars(studentId)
      showToastMsg('✨ Character saved! Appears in Generate Story')
    } catch (e) {
      console.error(e); showToastMsg('⚠️ Save failed')
    } finally { setSaving(false) }
  }

  const loadCharacter = (c: any) => {
    setCharName(c.name); setBodyType(c.body_type); setSkinTone(c.skin_tone)
    setHairStyle(c.hair_style); setHairColor(c.hair_color)
    setEyeStyle(c.eye_style); setEyeColor(c.eye_color)
    setOutfit(c.outfit); setOutfitColor(c.outfit_color)
    setShoes(c.shoes); setShoesColor(c.shoes_color)
    setHat(c.hat); setHatColor(c.hat_color ?? '#3B2507')
    setJacket(c.jacket); setJacketColor(c.jacket_color ?? '#2563EB')
    setAccessory(c.accessory); setEffect(c.effect)
    setEditingCharId(c.id)
    if (c.portrait_url) {
      setPortraitUrl(c.portrait_url)
      lastPortraitRef.current   = c.portrait_url  // enable image-to-image edits
      lastChangedFieldRef.current = ''             // FIX: clear ref so next pick uses Kontext correctly
    } else {
      // No saved portrait — do a fresh text-to-image generation
      lastPortraitRef.current   = null  // ensure Branch B runs (no Kontext on fresh gen)
      lastChangedFieldRef.current = ''
      triggerGenNow({
        name: c.name, bodyType: c.body_type, skinTone: c.skin_tone,
        hairStyle: c.hair_style, hairColor: c.hair_color,
        eyeStyle: c.eye_style, eyeColor: c.eye_color,
        outfit: c.outfit, outfitColor: c.outfit_color,
        shoes: c.shoes, hat: c.hat, jacket: c.jacket,
        accessory: c.accessory, effect: c.effect,
      })
    }
    setAccordionOpen(false)
  }

  const resetEditor = () => {
    const gender = Math.random() > 0.5 ? 'boy' : 'girl'
    changeGender(gender as 'boy'|'girl')
    setCharName('My Hero'); setPortraitUrl(null); setEditingCharId(null)
  }

  const showToastMsg = (msg: string) => {
    setToastMsg(msg); setShowToast(true)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setShowToast(false), 3500)
  }

  // ── Preview emoji layers ───────────────────────────────────────────────
  const bodyEmoji   = bodyType === 'girl' ? '🦸‍♀️' : bodyType === 'boy' ? '🦸‍♂️' : '🥷'
  const hairMeta    = hairList.find(h => h.id === hairStyle)
  const outfitMeta  = outfitList.find(o => o.id === outfit)
  const hatMeta     = hat && hat !== 'none' ? hatsList.find(h => h.id === hat) : null
  const effectMeta  = effect && effect !== 'none' ? EFFECTS.find(e => e.id === effect) : null

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="cs-root">
      {/* Stars */}
      <div className="cs-stars" aria-hidden>
        {[...Array(22)].map((_,i) => (
          <div key={i} className="cs-star" style={{
            left:`${(i*19+5)%97}%`, top:`${(i*23+7)%91}%`,
            animationDelay:`${(i*0.4)%3}s`,
            width:`${(i%3)+1}px`, height:`${(i%3)+1}px`,
          }} />
        ))}
      </div>

      {/* Header */}
      <header className="cs-header">
        <motion.button className="cs-back-btn" onClick={() => navigate('/dashboard')}
          whileHover={{ x: -2 }} whileTap={{ scale: 0.96 }} id="cs-back">
          ← Back
        </motion.button>
        <div className="cs-header-title">
          <div>
            <h1>🎨 Character Studio</h1>
            <div className="cs-header-subtitle">Build your hero — Roblox meets Superhero!</div>
          </div>
          {pendingGen && !generating && (
            <div style={{ display:'flex', alignItems:'center', gap:6,
              background:'rgba(251,191,36,0.15)', border:'1px solid rgba(251,191,36,0.4)',
              borderRadius:999, padding:'5px 12px', fontSize:'0.72rem', fontWeight:700, color:'#fbbf24' }}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#fbbf24',
                animation:'csAuraPulse 1s ease-in-out infinite'}} />
              Updating {lastChangedFieldRef.current}…
            </div>
          )}
        </div>
        <motion.button className="cs-save-btn" onClick={saveCharacter}
          disabled={saving || generating} id="cs-save"
          whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}>
          {saving ? '⏳ Saving…' : '💾 Save Character'}
        </motion.button>
      </header>

      <div className="cs-body">
        {/* ═══ LEFT: Preview ═══ */}
        <aside className="cs-preview-panel">
          {/* Name input */}
          <div className="cs-char-name-wrap">
            <span className="cs-char-name-icon">✏️</span>
            <input className="cs-char-name-input" value={charName}
              onChange={e => setCharName(e.target.value)}
              placeholder="Name your character…" maxLength={24} id="cs-char-name" />
          </div>


          {/* Canvas */}
          <div className="cs-canvas-wrap">
            <div className="cs-canvas-bg" style={{
              background: effectOverlay?.gradient ?? 'linear-gradient(160deg,#1a0a40 0%,#2d1060 50%,#0d0520 100%)',
            }} />

            {/* Particles */}
            <div className="cs-canvas-particles">
              {[...Array(6)].map((_,i) => (
                <div key={i} className="cs-canvas-particle" style={{
                  left:`${(i*16+8)%88}%`, top:`${(i*19+12)%75}%`,
                  animationDelay:`${(i*0.5)%3}s`,
                  width:`${(i%3)+3}px`, height:`${(i%3)+3}px`,
                  background: i%2===0 ? 'rgba(192,132,252,0.5)' : 'rgba(236,72,153,0.4)',
                }} />
              ))}
            </div>

            {/* Effect sparks */}
            {effectOverlay && effectOverlay.emoji.map((em,i) => (
              <span key={i} className="cs-canvas-sparkle"
                style={{ left:`${15+i*30}%`, top:`${10+(i%2)*15}%`, animationDelay:`${i*0.8}s` }}>
                {em}
              </span>
            ))}

            {/* Character display */}
            <div className="cs-figure-wrap">
              {portraitUrl ? (
                <motion.img key={portraitUrl} src={portraitUrl} alt={charName}
                  className="cs-portrait-img"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }} />
              ) : !generating ? (
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center', gap:12 }}>

                  {/* Clean single-character SVG placeholder */}
                  <motion.div
                    animate={{ y:[0,-10,0] }}
                    transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }}
                    style={{ position:'relative', textAlign:'center' }}
                  >
                    {/* Glow halo behind character */}
                    <div style={{
                      position:'absolute', top:'30%', left:'50%',
                      transform:'translate(-50%,-50%)',
                      width:160, height:160, borderRadius:'50%',
                      background:`radial-gradient(circle, ${bodyType==='girl' ? 'rgba(255,110,128,0.22)' : bodyType==='neutral' ? 'rgba(255,191,36,0.2)' : 'rgba(160,57,255,0.22)'} 0%, transparent 70%)`,
                      filter:'blur(12px)', pointerEvents:'none',
                    }} />

                    {/* Main character emoji — large, single, no stacking */}
                    <div style={{
                      fontSize:'9rem', lineHeight:1,
                      filter:`drop-shadow(0 12px 32px ${bodyType==='girl' ? 'rgba(255,110,128,0.5)' : bodyType==='neutral' ? 'rgba(255,191,36,0.45)' : 'rgba(160,57,255,0.55)'})`,
                      position:'relative', zIndex:2,
                    }}>
                      {bodyType === 'girl' ? '🦸‍♀️' : bodyType === 'neutral' ? '🦹' : '🦸‍♂️'}
                    </div>

                    {/* Hat floating above - small badge only */}
                    {hatMeta && hatMeta.id !== 'none' && (
                      <motion.div
                        animate={{ rotate:[-4,4,-4] }}
                        transition={{ duration:2, repeat:Infinity }}
                        style={{ position:'absolute', top:-14, right:-8, fontSize:'1.8rem', zIndex:4 }}
                      >
                        {hatMeta.emoji}
                      </motion.div>
                    )}

                    {/* Effect badge */}
                    {effectMeta && effectMeta.id !== 'none' && (
                      <motion.div
                        animate={{ scale:[1,1.2,1], opacity:[0.7,1,0.7] }}
                        transition={{ duration:1.8, repeat:Infinity }}
                        style={{ position:'absolute', bottom:0, left:-10, fontSize:'1.6rem', zIndex:4 }}
                      >
                        {effectMeta.emoji}
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Info row */}
                  <div style={{
                    display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', justifyContent:'center',
                    fontSize:'0.68rem', fontWeight:700, color:'rgba(203,151,255,0.55)',
                    padding:'0 16px',
                  }}>
                    {hairMeta && <span>{hairMeta.emoji} {hairMeta.label}</span>}
                    {hairMeta && outfitMeta && <span style={{ opacity:0.35 }}>·</span>}
                    {outfitMeta && <span>{outfitMeta.emoji} {outfitMeta.label}</span>}
                  </div>

                  <motion.button
                    onClick={() => triggerGenNow()}
                    whileHover={{ scale:1.05, y:-2 }} whileTap={{ scale:0.96 }}
                    style={{ display:'flex', alignItems:'center', gap:7,
                      padding:'10px 22px', borderRadius:999,
                      background:'linear-gradient(135deg,#7C2AE1,#A039FF)',
                      border:'none', color:'white', fontFamily:'var(--font-ui)',
                      fontSize:'0.82rem', fontWeight:800, cursor:'pointer',
                      boxShadow:'0 4px 20px rgba(160,57,255,0.55)' }}>
                    ✨ Generate Portrait
                  </motion.button>
                </div>
              ) : null}
            </div>

            {/* Generating overlay */}
            <AnimatePresence>
              {generating && (
                <motion.div className="cs-canvas-generating"
                  initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                  <div className="cs-gen-spinner" />
                  <div className="cs-gen-label">{genMsg}</div>
                  <div className="cs-gen-steps">
                    {[0,1,2].map(i => <div key={i} className="cs-gen-dot" style={{ animationDelay:`${i*0.2}s` }} />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Badges */}
            {!generating && (
              <>
                <div className="cs-canvas-badge cs-canvas-badge-left">
                  <span>{SKIN_TONES.find(s=>s.hex===skinTone)?.name ?? 'Custom'} Skin</span>
                </div>
                {hairMeta && (
                  <div className="cs-canvas-badge cs-canvas-badge-right">
                    <span>{hairMeta.emoji}</span>
                    <span>{hairMeta.label}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Regenerate button */}
          <motion.button onClick={() => triggerGenNow()} disabled={generating || saving}
            whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
            style={{ width:'100%', padding:12, borderRadius:14,
              background:'linear-gradient(135deg,rgba(112,42,225,0.8),rgba(147,51,234,0.7))',
              border:'1px solid rgba(192,132,252,0.35)', color:'white',
              fontFamily:'var(--font-body)', fontSize:'0.88rem', fontWeight:800,
              cursor: generating ? 'default' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow:'0 4px 18px rgba(112,42,225,0.4)', opacity: generating ? 0.6 : 1 }}
            id="cs-regen">
            {generating ? '🪄 Generating…' : '🔄 Regenerate Portrait'}
          </motion.button>

          {/* Summary chips */}
          <div className="cs-summary-grid">
            {[
              { emoji:'👕', label:'Outfit', value: outfitMeta?.label ?? outfit },
              { emoji:'💇', label:'Hair',   value: hairMeta?.label ?? hairStyle },
              { emoji: hatMeta?.emoji ?? '🚫', label:'Hat', value: hatMeta?.label ?? 'None' },
              { emoji: effectMeta?.emoji ?? '🚫', label:'Effect', value: effectMeta?.label ?? 'None' },
            ].map(item => (
              <div key={item.label} className="cs-summary-chip">
                <span className="sc-emoji">{item.emoji}</span>
                <div>
                  <span className="sc-label">{item.label}</span>
                  <span className="sc-value">{item.value}</span>
                </div>
              </div>
            ))}
          </div>

        </aside>

        {/* ═══ RIGHT: Editor ═══ */}
        <main className="cs-editor-panel">
          {/* Gender selector — always at top */}
          <div className="cs-editor-gender-row">
            {BODY_TYPES.map(bt => (
              <button key={bt.id}
                className={`cs-body-type-btn ${bodyType === bt.id ? 'active' : ''}`}
                onClick={() => changeGender(bt.id as any)}>
                <span className="bt-emoji">{bt.emoji}</span>
                <span className="bt-label">{bt.label}</span>
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="cs-tabs" role="tablist" id="cs-tabs">
            {TABS.map(tab => (
              <button key={tab.id}
                className={`cs-tab ${activeTab===tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                role="tab" aria-selected={activeTab===tab.id} id={`cs-tab-${tab.id}`}>
                <span className="cs-tab-emoji">{tab.emoji}</span>
                <span className="cs-tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="cs-editor-content">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab}
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-6 }} transition={{ duration:0.16 }}
                style={{ display:'flex', flexDirection:'column', gap:20 }}>

                {/* SKIN */}
                {activeTab==='skin' && (<>
                  <div className="cs-section-heading">
                    <span className="cs-section-title">🎨 Skin Tone</span>
                  </div>
                  <div className="cs-skin-grid">
                    {SKIN_TONES.map(st => (
                      <button key={st.hex} className={`cs-skin-swatch ${skinTone===st.hex?'selected':''}`}
                        onClick={() => pickSkin(st.hex)}>
                        <div className="cs-skin-circle" style={{ background:st.hex }} />
                        <span className="cs-skin-name">{st.name}</span>
                      </button>
                    ))}
                    <div className="cs-skin-swatch">
                      <div className="cs-custom-color-btn" style={{ width:50,height:50,borderRadius:'50%' }}>
                        <input type="color" value={skinTone} onChange={e => pickSkin(e.target.value)} />
                      </div>
                      <span className="cs-skin-name">Custom</span>
                    </div>
                  </div>
                </>)}

                {/* HAIR */}
                {activeTab==='hair' && (<>
                  <div className="cs-section-heading">
                    <span className="cs-section-title">💇 Hair Style</span>
                    <span className="cs-section-sub">{bodyType === 'girl' ? 'Girl' : bodyType === 'boy' ? 'Boy' : 'Hero'} styles</span>
                  </div>
                  <ColorRow label="Color" colors={HAIR_COLORS} selected={hairColor} onSelect={pickHairCol} />
                  <div className="cs-asset-grid">
                    {hairList.map(item => (
                      <AssetCard key={item.id} item={item} selected={hairStyle===item.id}
                        userXP={userXP} onSelect={pickHair} generating={generating && hairStyle===item.id}
                        category="hair" />
                    ))}
                  </div>
                </>)}

                {/* EYES */}
                {activeTab==='eyes' && (<>
                  <div className="cs-section-heading">
                    <span className="cs-section-title">👀 Eye Style</span>
                  </div>
                  <ColorRow label="Color" colors={EYE_COLORS} selected={eyeColor} onSelect={c => { setEyeColor(c); scheduleGen('Eye Color') }} />
                  <div className="cs-asset-grid">
                    {EYE_STYLES.map(item => (
                      <AssetCard key={item.id} item={item} selected={eyeStyle===item.id}
                        userXP={userXP} onSelect={pickEye} generating={generating && eyeStyle===item.id}
                        category="eyes" />
                    ))}
                  </div>
                </>)}

                {/* OUTFITS */}
                {activeTab==='outfits' && (<>
                  <div className="cs-section-heading">
                    <span className="cs-section-title">👕 Outfits</span>
                    <span className="cs-section-sub">{bodyType === 'girl' ? 'Girl' : bodyType === 'boy' ? 'Boy' : 'Hero'} looks</span>
                  </div>
                  <ColorRow label="Color" colors={OUTFIT_COLORS} selected={outfitColor} onSelect={c => { setOutfitColor(c); scheduleGen('Outfit Color') }} />
                  <div className="cs-asset-grid">
                    {outfitList.map(item => (
                      <AssetCard key={item.id} item={item} selected={outfit===item.id}
                        userXP={userXP} onSelect={pickOutfit} generating={generating && outfit===item.id}
                        category="outfits" />
                    ))}
                  </div>
                </>)}

                {/* SHOES */}
                {activeTab==='shoes' && (<>
                  <div className="cs-section-heading">
                    <span className="cs-section-title">👟 Shoes</span>
                  </div>
                  <ColorRow label="Color" colors={OUTFIT_COLORS} selected={shoesColor} onSelect={c => { setShoesColor(c); scheduleGen('Shoe Color') }} />
                  <div className="cs-asset-grid">
                    {shoesList.map(item => (
                      <AssetCard key={item.id} item={item} selected={shoes===item.id}
                        userXP={userXP} onSelect={pickShoes} generating={generating && shoes===item.id}
                        category="shoes" />
                    ))}
                  </div>
                </>)}

                {/* HATS */}
                {activeTab==='hats' && (<>
                  <div className="cs-section-heading">
                    <span className="cs-section-title">🎩 Hats</span>
                  </div>
                  {hat && hat!=='none' && (
                    <ColorRow label="Color" colors={HAIR_COLORS} selected={hatColor} onSelect={c => setHatColor(c)} />
                  )}
                  <div className="cs-asset-grid">
                    {hatsList.map(item => (
                      <AssetCard key={item.id} item={item} selected={(hat??'none')===item.id}
                        userXP={userXP} onSelect={pickHat} generating={generating && (hat??'none')===item.id}
                        category="hats" />
                    ))}
                  </div>
                </>)}

                {/* JACKETS */}
                {activeTab==='jackets' && (<>
                  <div className="cs-section-heading">
                    <span className="cs-section-title">🧥 Jackets & Capes</span>
                  </div>
                  {jacket && jacket!=='none' && (
                    <ColorRow label="Color" colors={OUTFIT_COLORS} selected={jacketColor} onSelect={c => setJacketColor(c)} />
                  )}
                  <div className="cs-asset-grid">
                    {jacketsList.map(item => (
                      <AssetCard key={item.id} item={item} selected={(jacket??'none')===item.id}
                        userXP={userXP} onSelect={pickJacket} generating={generating && (jacket??'none')===item.id}
                        category="jackets" />
                    ))}
                  </div>
                </>)}

                {/* ACCESSORIES */}
                {activeTab==='accessories' && (<>
                  <div className="cs-section-heading">
                    <span className="cs-section-title">✨ Accessories</span>
                  </div>
                  <div className="cs-asset-grid">
                    {ACCESSORIES.map(item => (
                      <AssetCard key={item.id} item={item} selected={(accessory??'none')===item.id}
                        userXP={userXP} onSelect={pickAccess} generating={generating && (accessory??'none')===item.id}
                        category="accessories" />
                    ))}
                  </div>
                </>)}

                {/* EFFECTS */}
                {activeTab==='effects' && (<>
                  <div className="cs-section-heading">
                    <span className="cs-section-title">🌟 Magic Effects</span>
                  </div>
                  <div className="cs-asset-grid">
                    {EFFECTS.map(item => (
                      <AssetCard key={item.id} item={item} selected={(effect??'none')===item.id}
                        userXP={userXP} onSelect={pickEffect} generating={generating && (effect??'none')===item.id}
                        category="effects" />
                    ))}
                  </div>
                </>)}

              </motion.div>
            </AnimatePresence>

            {/* ── My Characters Accordion — inside scrollable content ── */}
            <div className="cs-accordion">
              <button
                className={`cs-accordion-header ${accordionOpen ? 'open' : ''}`}
                onClick={() => setAccordionOpen(o => !o)}
              >
                <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span>🎭</span>
                  <span>My Characters</span>
                  {savedChars.length > 0 && (
                    <span style={{
                      background:'rgba(192,132,252,0.25)', color:'#c084fc',
                      borderRadius:999, padding:'1px 8px', fontSize:'0.7rem',
                      fontWeight:900, lineHeight:'1.6'
                    }}>{savedChars.length}</span>
                  )}
                </span>
                <motion.span
                  animate={{ rotate: accordionOpen ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ fontSize:'0.9rem', opacity:0.7 }}
                >▼</motion.span>
              </button>

              <AnimatePresence initial={false}>
                {accordionOpen && (
                  <motion.div
                    key="editor-accordion"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: 'easeInOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="cs-accordion-body">
                      <button className="cs-accordion-new-btn"
                        onClick={() => { resetEditor(); setAccordionOpen(false) }}>
                        <div className="cs-accordion-avatar" style={{
                          background:'linear-gradient(145deg,#1a0a40,#4a1a80)',
                          fontSize:'1.5rem', display:'flex', alignItems:'center', justifyContent:'center'
                        }}>➕</div>
                        <span className="cs-accordion-name">New Character</span>
                      </button>

                      {savedChars.length === 0 ? (
                        <div style={{ padding:'10px', textAlign:'center',
                          color:'rgba(192,132,252,0.45)', fontSize:'0.7rem', fontWeight:600, fontStyle:'italic' }}>
                          No custom saves yet — hit 💾 Save Character!
                        </div>
                      ) : savedChars.map(c => (
                        <button key={c.id}
                          className={`cs-accordion-char-btn ${editingCharId===c.id ? 'active' : ''}`}
                          onClick={() => loadCharacter(c)}>
                          <div className="cs-accordion-avatar">
                            {c.portrait_url
                              ? <img src={c.portrait_url} alt={c.name}
                                  style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:10 }} />
                              : <span style={{ fontSize:'1.6rem' }}>{c.body_type==='girl' ? '🦸‍♀️' : '🦸‍♂️'}</span>
                            }
                          </div>
                          <div className="cs-accordion-info">
                            <span className="cs-accordion-name">{c.name}</span>
                            <span className="cs-accordion-sub">{c.hair_style?.replace(/_/g,' ')} · {c.outfit?.replace(/_/g,' ')}</span>
                          </div>
                          {editingCharId===c.id && <span style={{ marginLeft:'auto', color:'#c084fc', fontSize:'0.75rem', fontWeight:900 }}>✓</span>}
                        </button>
                      ))}

                      <div style={{ display:'flex', alignItems:'center', gap:8, margin:'10px 4px 6px' }}>
                        <div style={{ flex:1, height:1, background:'rgba(150,110,255,0.18)' }} />
                        <span style={{ fontSize:'0.65rem', fontWeight:800, color:'rgba(192,132,252,0.5)',
                          letterSpacing:'0.06em', textTransform:'uppercase', whiteSpace:'nowrap' }}>✨ Story Characters</span>
                        <div style={{ flex:1, height:1, background:'rgba(150,110,255,0.18)' }} />
                      </div>

                      <div className="cs-accordion-preset-grid">
                        {ALL_CHARACTERS.map(char => (
                          <button key={char.name} className="cs-accordion-preset-btn"
                            onClick={() => { setCharName(char.name); setPortraitUrl(char.img); setEditingCharId(null); setAccordionOpen(false) }}
                            title={char.name}>
                            <div className="cs-accordion-preset-avatar">
                              <img src={char.img} alt={char.name}
                                style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:999 }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} />
                              <span className="cs-accordion-preset-fallback">{char.emoji}</span>
                            </div>
                            <span className="cs-accordion-preset-name">{char.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      {/* Toast */}
      <div className={`cs-success-toast ${showToast ? 'show' : ''}`}>{toastMsg}</div>
    </div>
  )
}
