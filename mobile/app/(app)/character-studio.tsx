/**
 * Character Studio — React Native (Phase 6)
 * Route: /character-studio (hidden tab)
 *
 * Conversions:
 * - framer-motion → Animated + spring
 * - CSS classes → StyleSheet + inline styles
 * - motion.button → TouchableOpacity
 * - <input type="color"> → color swatch grid (no native color picker)
 * - supabase direct → supabase import
 * - localStorage → storage lib
 *
 * Key architecture maintained:
 * - lastChangedFieldRef (not state) to prevent stale closure in generation
 * - Debounced auto-gen 2.5s after last change
 * - Image-to-image Kontext branch → text-to-image fallback
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Animated, ActivityIndicator, Modal, Alert, FlatList,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import Constants from 'expo-constants'
import { supabase } from '../../src/lib/supabase'
import { storage } from '../../src/lib/storage'
import {
  SKIN_TONES, HAIR_COLORS, OUTFIT_COLORS, ACCESSORIES, EFFECTS, EFFECT_OVERLAYS,
  BOY_DEFAULTS, GIRL_DEFAULTS,
  getHairByGender, getOutfitsByGender, getShoesByGender,
  getHatsByGender, getJacketsByGender,
  AssetOption,
} from '../../src/data/characterAssets'

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

// ── Types & Constants ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'skin',        label: 'Skin',    emoji: '🎨' },
  { id: 'hair',        label: 'Hair',    emoji: '💇' },
  { id: 'eyes',        label: 'Eyes',    emoji: '👀' },
  { id: 'outfits',     label: 'Outfit',  emoji: '👕' },
  { id: 'shoes',       label: 'Shoes',   emoji: '👟' },
  { id: 'hats',        label: 'Hats',    emoji: '🎩' },
  { id: 'jackets',     label: 'Jacket',  emoji: '🧥' },
  { id: 'accessories', label: 'Extras',  emoji: '✨' },
  { id: 'effects',     label: 'Effects', emoji: '🌟' },
]

const BODY_TYPES = [
  { id: 'boy',     label: 'Boy',  emoji: '🦸‍♂️' },
  { id: 'girl',    label: 'Girl', emoji: '🦸‍♀️' },
  { id: 'neutral', label: 'Hero', emoji: '🥷'  },
]

const EYE_STYLES: AssetOption[] = [
  { id: 'round',     label: 'Round',       emoji: '👁️' },
  { id: 'almond',    label: 'Almond',      emoji: '🌙' },
  { id: 'big_anime', label: 'Big & Shiny', emoji: '✨' },
  { id: 'narrow',    label: 'Narrow',      emoji: '😏' },
  { id: 'sparkle',   label: 'Starry',      emoji: '🌟' },
  { id: 'sleepy',    label: 'Sleepy',      emoji: '😴', xpRequired: 500 },
]
const EYE_COLORS = ['#4A90D9','#2D7A3D','#8B4513','#1A1A1A','#9B59B6','#E74C3C','#F39C12']

const GEN_MSGS = [
  '🎨 Painting your character…',
  '✨ Adding magic details…',
  '🦸 Powering up!',
  '🌟 Almost ready…',
]

const CAT_COLORS: Record<string,string> = {
  hair:'#7c3aed', eyes:'#2563eb', outfits:'#059669', shoes:'#d97706',
  hats:'#6d28d9', jackets:'#4f46e5', accessories:'#db2777', effects:'#f59e0b', skin:'#92400e',
}

// ── Build prompt ──────────────────────────────────────────────────────────────
function buildPrompt(cfg: {
  name: string; bodyType: string; skinTone: string; hairStyle: string; hairColor: string
  eyeStyle: string; eyeColor: string; outfit: string; outfitColor: string
  shoes: string; hat: string|null; jacket: string|null; accessory: string|null; effect: string|null
}): string {
  return [
    `${cfg.name}, a ${cfg.bodyType==='girl'?'heroic girl':cfg.bodyType==='boy'?'heroic boy':'hero'} character`,
    `${cfg.hairStyle.replace(/_/g,' ')} hair in ${cfg.hairColor} color`,
    `${cfg.eyeStyle.replace(/_/g,' ')} eyes`,
    `wearing ${cfg.outfit.replace(/_/g,' ')} in ${cfg.outfitColor}`,
    cfg.hat&&cfg.hat!=='none' ? `${cfg.hat.replace(/_/g,' ')} hat` : '',
    cfg.jacket&&cfg.jacket!=='none' ? cfg.jacket.replace(/_/g,' ') : '',
    cfg.accessory&&cfg.accessory!=='none' ? `holding ${cfg.accessory.replace(/_/g,' ')}` : '',
    cfg.effect&&cfg.effect!=='none' ? `surrounded by ${cfg.effect.replace(/_/g,' ')} aura` : '',
    'Roblox-style cartoon superhero, full body, white background, vibrant colors, kid-friendly, fun and bold',
  ].filter(Boolean).join(', ')
}

// ── Asset Card ────────────────────────────────────────────────────────────────
function AssetCard({ item, selected, userXP, onSelect, generating, category = 'hair' }: {
  item: AssetOption; selected: boolean; userXP: number; category?: string
  onSelect:(id:string)=>void; generating: boolean
}) {
  const locked = (item.xpRequired ?? 0) > userXP
  const color  = CAT_COLORS[category] ?? '#7c3aed'
  const scaleAnim = useRef(new Animated.Value(1)).current

  const onPress = () => {
    if (locked) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return }
    Haptics.selectionAsync()
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start()
    onSelect(item.id)
  }

  return (
    <Animated.View style={{ transform:[{ scale: scaleAnim }], margin: 4 }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}
        style={{ width: 80, alignItems:'center', opacity: locked ? 0.5 : 1 }}>
        <View style={{ width:68, height:68, borderRadius:14, backgroundColor:`${color}33`,
          alignItems:'center', justifyContent:'center', borderWidth:2,
          borderColor: selected ? color : 'transparent',
          shadowColor: selected ? color : 'transparent',
          shadowOpacity: 0.6, shadowRadius: 8, shadowOffset:{width:0,height:0} }}>
          <Text style={{ fontSize: item.id==='none' ? 24 : 36, lineHeight:44 }}>{item.emoji}</Text>
          {generating && selected && (
            <View style={{ position:'absolute', inset:0, backgroundColor:'rgba(8,4,24,0.8)',
              borderRadius:12, alignItems:'center', justifyContent:'center' }}>
              <ActivityIndicator color="#c084fc" size="small" />
            </View>
          )}
          {locked && <View style={{ position:'absolute', top:4, right:4 }}>
            <Text style={{ fontSize:12 }}>🔒</Text>
          </View>}
        </View>
        <Text style={{ color: selected ? '#B28CFF' : '#8a7aaa', fontSize:10, marginTop:4, textAlign:'center' }}
          numberOfLines={1}>{item.label}</Text>
        {item.xpRequired && <Text style={{ color:'#f59e0b', fontSize:8 }}>⭐{item.xpRequired}</Text>}
      </TouchableOpacity>
    </Animated.View>
  )
}

// ── Color Swatch Row ──────────────────────────────────────────────────────────
function ColorRow({ label, colors, selected, onSelect }: {
  label: string; colors: string[]; selected: string; onSelect:(c:string)=>void
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color:'#B28CFF', fontSize:11, fontWeight:'700', marginBottom:6 }}>{label}:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection:'row', gap:8 }}>
          {colors.map(c => (
            <TouchableOpacity key={c} onPress={() => { Haptics.selectionAsync(); onSelect(c) }}
              style={{ width:32, height:32, borderRadius:16, backgroundColor:c,
                borderWidth: selected===c ? 3 : 1.5, borderColor: selected===c ? '#fff' : 'rgba(255,255,255,0.2)',
                shadowColor: selected===c ? '#fff' : 'transparent', shadowOpacity:0.6, shadowRadius:4 }} />
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, visible }: { msg:string; visible:boolean }) {
  const fade = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(fade, { toValue: visible ? 1 : 0, duration: 200, useNativeDriver: true }).start()
  }, [visible])
  return (
    <Animated.View style={{ position:'absolute', bottom:100, left:20, right:20, opacity:fade,
      backgroundColor:'#1a1a35', borderRadius:14, padding:14, borderWidth:1, borderColor:'#702AE144',
      shadowColor:'#702AE1', shadowOpacity:0.4, shadowRadius:12, zIndex:999 }}>
      <Text style={{ color:'#fff', fontWeight:'700', textAlign:'center' }}>{msg}</Text>
    </Animated.View>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export default function CharacterStudioScreen() {
  const insets    = useSafeAreaInsets()

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
  const [hat,         setHat]         = useState<string|null>(null)
  const [jacket,      setJacket]      = useState<string|null>(null)
  const [accessory,   setAccessory]   = useState<string|null>(null)
  const [effect,      setEffect]      = useState<string|null>(null)
  const [portraitUrl, setPortraitUrl] = useState<string|null>(null)

  // UI state
  const [activeTab,     setActiveTab]     = useState('hair')
  const [studentId,     setStudentId]     = useState<string|null>(null)
  const [userXP,        setUserXP]        = useState(0)
  const [savedChars,    setSavedChars]    = useState<any[]>([])
  const [editingCharId, setEditingCharId] = useState<string|null>(null)
  const [generating,    setGenerating]    = useState(false)
  const [genMsg,        setGenMsg]        = useState(GEN_MSGS[0])
  const [saving,        setSaving]        = useState(false)
  const [toastMsg,      setToastMsg]      = useState('')
  const [showToast,     setShowToast]     = useState(false)
  const [pendingGen,    setPendingGen]    = useState(false)
  const [showSaved,     setShowSaved]     = useState(false)

  // CRITICAL: ref (not state) to avoid stale closure in debounced gen
  const lastChangedFieldRef = useRef('')
  const lastPortraitRef     = useRef<string|null>(null)
  const genTimerRef         = useRef<ReturnType<typeof setTimeout>|null>(null)
  const msgTimerRef         = useRef<ReturnType<typeof setInterval>|null>(null)
  const toastTimerRef       = useRef<ReturnType<typeof setTimeout>|null>(null)

  // Derived gender-specific lists
  const hairList    = getHairByGender(bodyType)
  const outfitList  = getOutfitsByGender(bodyType)
  const shoesList   = getShoesByGender(bodyType)
  const hatsList    = getHatsByGender(bodyType)
  const jacketsList = getJacketsByGender(bodyType)
  const effectOverlay = effect && effect !== 'none' ? EFFECT_OVERLAYS[effect] : null

  // Derived meta
  const hairMeta   = hairList.find(h => h.id === hairStyle)
  const outfitMeta = outfitList.find(o => o.id === outfit)
  const effectMeta = effect && effect!=='none' ? EFFECTS.find(e => e.id === effect) : null
  const skinMeta   = SKIN_TONES.find(s => s.hex === skinTone)

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    storage.getString('readquest_student_id').then(sid => {
      setStudentId(sid)
      if (sid) {
        fetch(`${API}/api/rewards/xp`, { headers:{ 'X-Student-ID': sid } })
          .then(r => r.ok ? r.json() : null).then(d => { if (d?.total_xp) setUserXP(d.total_xp) }).catch(()=>{})
        loadSavedChars(sid)
      }
    })

    // Random starting character
    const gender = Math.random() > 0.5 ? 'boy' : 'girl'
    setBodyType(gender as 'boy'|'girl')
    const defaults = gender === 'boy' ? BOY_DEFAULTS : GIRL_DEFAULTS
    const pick = defaults[Math.floor(Math.random() * defaults.length)]
    const skin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)]
    setHairStyle(pick.hairStyle); setOutfit(pick.outfit); setShoes(pick.shoes); setSkinTone(skin.hex)
    setTimeout(() => triggerGenNow({
      name:'My Hero', bodyType:gender, skinTone:skin.hex,
      hairStyle:pick.hairStyle, hairColor:'#3B2507',
      eyeStyle:'round', eyeColor:'#4A90D9',
      outfit:pick.outfit, outfitColor:'#7C3AED',
      shoes:pick.shoes, hat:null, jacket:null, accessory:null, effect:null,
    }), 500)
  }, []) // eslint-disable-line

  const loadSavedChars = async (sid: string) => {
    const { data } = await supabase.from('custom_characters')
      .select('*').eq('student_id', sid).order('created_at',{ascending:false}).limit(10)
    if (data) setSavedChars(data)
  }

  // ── Core generation ───────────────────────────────────────────────────────
  const triggerGenNow = useCallback(async (cfg?: any) => {
    if (genTimerRef.current) clearTimeout(genTimerRef.current)
    if (msgTimerRef.current) clearInterval(msgTimerRef.current)
    setPendingGen(false)
    setGenerating(true)

    let msgIdx = 0
    setGenMsg(GEN_MSGS[0])
    msgTimerRef.current = setInterval(() => { msgIdx=(msgIdx+1)%GEN_MSGS.length; setGenMsg(GEN_MSGS[msgIdx]) }, 2000)

    const c = {
      name:charName, bodyType, skinTone, hairStyle, hairColor,
      eyeStyle, eyeColor, outfit, outfitColor, shoes,
      hat, jacket, accessory, effect, ...(cfg??{})
    }
    const desc = buildPrompt(c)
    const existingPortrait = lastPortraitRef.current
    const changedField     = lastChangedFieldRef.current

    try {
      let newUrl: string|null = null

      // Branch A: image-to-image edit via Kontext
      if (existingPortrait && changedField) {
        try {
          const res = await fetch(`${API}/api/stories/edit-character`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              image_url: existingPortrait,
              prompt: `Change ONLY the ${changedField.toLowerCase()}. New: ${desc}. Keep exact same face, body, skin tone, pose.`,
              character_description: desc,
            }),
          })
          const data = await res.json()
          if (res.ok && data.portrait_url) newUrl = data.portrait_url
        } catch { /* fall through */ }
      }

      // Branch B: full text-to-image
      if (!newUrl) {
        setPortraitUrl(null)
        const res = await fetch(`${API}/api/stories/generate-background`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            theme:'magical colorful superhero world',
            character_name: c.name,
            character_description: desc,
            scene_description: `${c.name} standing heroically, full body portrait, transparent background, Roblox cartoon superhero style, vibrant colors`,
            art_style:'cartoon',
          }),
        })
        const data = await res.json()
        if (res.ok) newUrl = data.portrait_url ?? data.background_url ?? null
        else showToastFn(`⚠️ ${(data.detail??'Generation failed').includes('balance')?'AI credits exhausted':data.detail??'Generation failed'}`)
      }

      if (newUrl) {
        setPortraitUrl(newUrl)
        lastPortraitRef.current = newUrl
      }
    } catch { showToastFn('⚠️ Portrait generation failed — check connection') }
    finally {
      if (msgTimerRef.current) clearInterval(msgTimerRef.current)
      setGenerating(false)
    }
  }, [charName, bodyType, skinTone, hairStyle, hairColor, eyeStyle, eyeColor, outfit, outfitColor, shoes, hat, jacket, accessory, effect]) // eslint-disable-line

  const scheduleGen = useCallback((fieldLabel: string) => {
    lastChangedFieldRef.current = fieldLabel  // sync ref write — no stale closure
    setPendingGen(true)
    if (genTimerRef.current) clearTimeout(genTimerRef.current)
    genTimerRef.current = setTimeout(() => triggerGenNow(), 2500)
  }, [triggerGenNow])

  // ── Asset pickers ─────────────────────────────────────────────────────────
  const pickHair    = (id:string) => { setHairStyle(id);    scheduleGen('Hair Style') }
  const pickEye     = (id:string) => { setEyeStyle(id);     scheduleGen('Eye Style') }
  const pickOutfit  = (id:string) => { setOutfit(id);       scheduleGen('Outfit') }
  const pickShoes   = (id:string) => { setShoes(id);        scheduleGen('Shoes') }
  const pickHat     = (id:string) => { setHat(id==='none'?null:id); scheduleGen('Hat') }
  const pickJacket  = (id:string) => { setJacket(id==='none'?null:id); scheduleGen('Jacket') }
  const pickAccess  = (id:string) => { setAccessory(id==='none'?null:id); scheduleGen('Accessory') }
  const pickEffect  = (id:string) => { setEffect(id==='none'?null:id); scheduleGen('Effect') }
  const pickSkin    = (hex:string) => { setSkinTone(hex); scheduleGen('Skin Tone') }
  const pickHairCol = (c:string)   => { setHairColor(c); scheduleGen('Hair Color') }

  const changeGender = useCallback((g:'boy'|'girl'|'neutral') => {
    if (genTimerRef.current) clearTimeout(genTimerRef.current)
    const defaults = g==='girl' ? GIRL_DEFAULTS : BOY_DEFAULTS
    const pick = defaults[Math.floor(Math.random()*defaults.length)]
    setBodyType(g); setHairStyle(pick.hairStyle); setOutfit(pick.outfit); setShoes(pick.shoes)
    setHat(null); setJacket(null); setPendingGen(false)
    triggerGenNow({ bodyType:g, hairStyle:pick.hairStyle, outfit:pick.outfit, shoes:pick.shoes, hat:null, jacket:null })
  }, [triggerGenNow])

  // ── Save / Load character ──────────────────────────────────────────────────
  const saveCharacter = async () => {
    if (!studentId) { showToastFn('⚠️ No student selected'); return }
    setSaving(true)
    const payload = {
      student_id:studentId, name:charName.trim()||'My Hero', body_type:bodyType,
      skin_tone:skinTone, hair_style:hairStyle, hair_color:hairColor,
      eye_style:eyeStyle, eye_color:eyeColor, outfit, outfit_color:outfitColor,
      shoes, hat:hat==='none'?null:hat, jacket:jacket==='none'?null:jacket,
      accessory:accessory==='none'?null:accessory, effect:effect==='none'?null:effect,
      portrait_url:portraitUrl,
      visual_description:buildPrompt({name:charName,bodyType,skinTone,hairStyle,hairColor,eyeStyle,eyeColor,outfit,outfitColor,shoes,hat,jacket,accessory,effect}),
      updated_at:new Date().toISOString(),
    }
    try {
      if (editingCharId) {
        await supabase.from('custom_characters').update(payload).eq('id', editingCharId)
      } else {
        const { data } = await supabase.from('custom_characters').insert(payload).select().single()
        if (data) setEditingCharId(data.id)
      }
      if (studentId) await loadSavedChars(studentId)
      showToastFn('✨ Character saved! Appears in Generate Story')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch { showToastFn('⚠️ Save failed') }
    finally { setSaving(false) }
  }

  const loadCharacter = (c: any) => {
    setCharName(c.name); setBodyType(c.body_type); setSkinTone(c.skin_tone)
    setHairStyle(c.hair_style); setHairColor(c.hair_color)
    setEyeStyle(c.eye_style); setEyeColor(c.eye_color)
    setOutfit(c.outfit); setOutfitColor(c.outfit_color)
    setShoes(c.shoes); setHat(c.hat); setJacket(c.jacket)
    setAccessory(c.accessory); setEffect(c.effect); setEditingCharId(c.id)
    if (c.portrait_url) {
      setPortraitUrl(c.portrait_url)
      lastPortraitRef.current = c.portrait_url
      lastChangedFieldRef.current = ''
    } else {
      lastPortraitRef.current = null; lastChangedFieldRef.current = ''
      triggerGenNow({ name:c.name, bodyType:c.body_type, skinTone:c.skin_tone, hairStyle:c.hair_style, hairColor:c.hair_color, eyeStyle:c.eye_style, eyeColor:c.eye_color, outfit:c.outfit, outfitColor:c.outfit_color, shoes:c.shoes, hat:c.hat, jacket:c.jacket, accessory:c.accessory, effect:c.effect })
    }
    setShowSaved(false)
  }

  const showToastFn = (msg: string) => {
    setToastMsg(msg); setShowToast(true)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setShowToast(false), 3500)
  }

  // ── Render asset grid for active tab ─────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case 'skin':
        return (
          <>
            <Text style={S.sectionTitle}>🎨 Skin Tone</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:12 }}>
              {SKIN_TONES.map(st => (
                <TouchableOpacity key={st.hex} onPress={() => pickSkin(st.hex)}
                  style={{ alignItems:'center', width:56 }}>
                  <View style={{ width:44, height:44, borderRadius:22, backgroundColor:st.hex,
                    borderWidth: skinTone===st.hex?3:1.5, borderColor:skinTone===st.hex?'#fff':'rgba(255,255,255,0.2)' }} />
                  <Text style={{ color:'#8a7aaa', fontSize:9, marginTop:3, textAlign:'center' }}>{st.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )
      case 'hair':
        return (
          <>
            <Text style={S.sectionTitle}>💇 Hair Style</Text>
            <ColorRow label="Color" colors={HAIR_COLORS} selected={hairColor} onSelect={pickHairCol} />
            <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
              {hairList.map(item => <AssetCard key={item.id} item={item} selected={hairStyle===item.id} userXP={userXP} onSelect={pickHair} generating={generating&&hairStyle===item.id} category="hair" />)}
            </View>
          </>
        )
      case 'eyes':
        return (
          <>
            <Text style={S.sectionTitle}>👀 Eye Style</Text>
            <ColorRow label="Color" colors={EYE_COLORS} selected={eyeColor} onSelect={c=>{setEyeColor(c);scheduleGen('Eye Color')}} />
            <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
              {EYE_STYLES.map(item => <AssetCard key={item.id} item={item} selected={eyeStyle===item.id} userXP={userXP} onSelect={pickEye} generating={generating&&eyeStyle===item.id} category="eyes" />)}
            </View>
          </>
        )
      case 'outfits':
        return (
          <>
            <Text style={S.sectionTitle}>👕 Outfits</Text>
            <ColorRow label="Color" colors={OUTFIT_COLORS} selected={outfitColor} onSelect={c=>{setOutfitColor(c);scheduleGen('Outfit Color')}} />
            <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
              {outfitList.map(item => <AssetCard key={item.id} item={item} selected={outfit===item.id} userXP={userXP} onSelect={pickOutfit} generating={generating&&outfit===item.id} category="outfits" />)}
            </View>
          </>
        )
      case 'shoes':
        return (
          <>
            <Text style={S.sectionTitle}>👟 Shoes</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
              {shoesList.map(item => <AssetCard key={item.id} item={item} selected={shoes===item.id} userXP={userXP} onSelect={pickShoes} generating={generating&&shoes===item.id} category="shoes" />)}
            </View>
          </>
        )
      case 'hats':
        return (
          <>
            <Text style={S.sectionTitle}>🎩 Hats</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
              {hatsList.map(item => <AssetCard key={item.id} item={item} selected={hat===item.id||(item.id==='none'&&!hat)} userXP={userXP} onSelect={pickHat} generating={generating&&hat===item.id} category="hats" />)}
            </View>
          </>
        )
      case 'jackets':
        return (
          <>
            <Text style={S.sectionTitle}>🧥 Jackets</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
              {jacketsList.map(item => <AssetCard key={item.id} item={item} selected={jacket===item.id||(item.id==='none'&&!jacket)} userXP={userXP} onSelect={pickJacket} generating={generating&&jacket===item.id} category="jackets" />)}
            </View>
          </>
        )
      case 'accessories':
        return (
          <>
            <Text style={S.sectionTitle}>✨ Accessories</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
              {ACCESSORIES.map(item => <AssetCard key={item.id} item={item} selected={accessory===item.id||(item.id==='none'&&!accessory)} userXP={userXP} onSelect={pickAccess} generating={generating&&accessory===item.id} category="accessories" />)}
            </View>
          </>
        )
      case 'effects':
        return (
          <>
            <Text style={S.sectionTitle}>🌟 Effects</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
              {EFFECTS.map(item => <AssetCard key={item.id} item={item} selected={effect===item.id||(item.id==='none'&&!effect)} userXP={userXP} onSelect={pickEffect} generating={generating&&effect===item.id} category="effects" />)}
            </View>
          </>
        )
      default: return null
    }
  }

  const bodyEmoji = bodyType==='girl'?'🦸‍♀️':bodyType==='boy'?'🦸‍♂️':'🥷'

  return (
    <View style={{ flex:1, backgroundColor:'#0d0d1f', paddingTop:insets.top }}>

      {/* ── Header ── */}
      <View style={{ paddingHorizontal:16, paddingVertical:10, flexDirection:'row', alignItems:'center',
        borderBottomWidth:1, borderBottomColor:'#702AE122' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight:10 }}>
          <Text style={{ color:'#8a7aaa', fontSize:13 }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex:1 }}>
          <Text style={{ color:'#fff', fontWeight:'900', fontSize:15 }}>🎨 Character Studio</Text>
          {pendingGen&&!generating&&(
            <Text style={{ color:'#f59e0b', fontSize:10, marginTop:1 }}>⏳ Updating {lastChangedFieldRef.current}…</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowSaved(true)} style={{ marginRight:10,
          backgroundColor:'#1a1a35', borderRadius:10, paddingHorizontal:10, paddingVertical:6,
          borderWidth:1, borderColor:'#2a2a4a' }}>
          <Text style={{ color:'#B28CFF', fontSize:12, fontWeight:'700' }}>📁 Saved</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={saveCharacter} disabled={saving||generating}
          style={{ backgroundColor:'#702AE1', borderRadius:10, paddingHorizontal:12, paddingVertical:7,
            opacity:saving||generating?0.6:1 }}>
          <Text style={{ color:'#fff', fontSize:12, fontWeight:'800' }}>{saving?'⏳ Saving…':'💾 Save'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex:1, flexDirection:'row' }}>

        {/* ── Portrait panel (left / top on phone) ── */}
        <View style={{ width:140, backgroundColor:'#0a0a1e', borderRightWidth:1, borderRightColor:'#702AE122',
          alignItems:'center', paddingVertical:12, paddingHorizontal:8 }}>

          {/* Name input */}
          <TextInput value={charName} onChangeText={setCharName} maxLength={20} returnKeyType="done"
            style={{ backgroundColor:'#1a1a35', borderRadius:10, padding:8, color:'#fff',
              fontSize:11, fontWeight:'700', width:'100%', textAlign:'center', marginBottom:10,
              borderWidth:1, borderColor:'#702AE130' }}
            placeholder="Name…" placeholderTextColor="#3a3a5a" />

          {/* Portrait / placeholder */}
          <View style={{ width:120, height:160, borderRadius:16, backgroundColor:'#1a1a35',
            alignItems:'center', justifyContent:'center', overflow:'hidden',
            borderWidth:1, borderColor:'#702AE122', marginBottom:10,
            shadowColor:'#702AE1', shadowOpacity:0.3, shadowRadius:10 }}>
            {portraitUrl ? (
              <Image source={{ uri:portraitUrl }} style={{ width:120, height:160 }} contentFit="contain" />
            ) : (
              <Text style={{ fontSize:64 }}>{bodyEmoji}</Text>
            )}
            {generating && (
              <View style={{ position:'absolute', inset:0, backgroundColor:'rgba(8,4,24,0.8)',
                alignItems:'center', justifyContent:'center', gap:8 }}>
                <ActivityIndicator color="#c084fc" size="large" />
                <Text style={{ color:'#B28CFF', fontSize:10, textAlign:'center', paddingHorizontal:4 }}>{genMsg}</Text>
              </View>
            )}
          </View>

          {/* Regen button */}
          <TouchableOpacity onPress={() => { lastChangedFieldRef.current=''; triggerGenNow() }}
            disabled={generating||saving}
            style={{ backgroundColor:'#702AE1', borderRadius:12, padding:10, width:'100%',
              alignItems:'center', opacity:generating||saving?0.6:1, marginBottom:10 }}>
            <Text style={{ color:'#fff', fontSize:11, fontWeight:'800' }}>
              {generating ? '🪄 Generating…' : '🔄 Regenerate'}
            </Text>
          </TouchableOpacity>

          {/* Summary chips */}
          <View style={{ gap:5, width:'100%' }}>
            {[
              { e:'👕', v:outfitMeta?.label??outfit },
              { e:'💇', v:hairMeta?.label??hairStyle },
              { e:'🎨', v:skinMeta?.name??'Custom' },
            ].map(c => (
              <View key={c.e} style={{ flexDirection:'row', alignItems:'center', gap:4,
                backgroundColor:'#1a1a35', borderRadius:8, paddingHorizontal:6, paddingVertical:4 }}>
                <Text style={{ fontSize:12 }}>{c.e}</Text>
                <Text style={{ color:'#8a7aaa', fontSize:10, flex:1 }} numberOfLines={1}>{c.v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Editor panel (right / bottom on phone) ── */}
        <View style={{ flex:1 }}>
          {/* Gender selector */}
          <View style={{ flexDirection:'row', paddingHorizontal:8, paddingVertical:8,
            borderBottomWidth:1, borderBottomColor:'#702AE122', gap:6 }}>
            {BODY_TYPES.map(bt => (
              <TouchableOpacity key={bt.id} onPress={() => changeGender(bt.id as any)}
                style={{ flex:1, borderRadius:10, paddingVertical:7, alignItems:'center',
                  backgroundColor: bodyType===bt.id ? '#702AE1' : '#1a1a35',
                  borderWidth:1, borderColor: bodyType===bt.id?'#702AE1':'#2a2a4a' }}>
                <Text style={{ fontSize:14 }}>{bt.emoji}</Text>
                <Text style={{ color: bodyType===bt.id?'#fff':'#6b5d80', fontSize:10, fontWeight:'700', marginTop:2 }}>{bt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ maxHeight:52, borderBottomWidth:1, borderBottomColor:'#702AE122' }}
            contentContainerStyle={{ paddingHorizontal:8, gap:4, paddingVertical:8 }}>
            {TABS.map(tab => (
              <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)}
                style={{ paddingHorizontal:10, paddingVertical:5, borderRadius:10,
                  backgroundColor: activeTab===tab.id ? '#702AE1' : '#1a1a35',
                  borderWidth:1, borderColor: activeTab===tab.id?'#702AE1':'#2a2a4a',
                  flexDirection:'row', alignItems:'center', gap:4 }}>
                <Text style={{ fontSize:12 }}>{tab.emoji}</Text>
                <Text style={{ color: activeTab===tab.id?'#fff':'#8a7aaa', fontSize:11, fontWeight:'700' }}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Tab content */}
          <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding:12, paddingBottom:60 }}>
            {renderTabContent()}
          </ScrollView>
        </View>
      </View>

      {/* ── Saved Characters Modal ── */}
      <Modal visible={showSaved} transparent animationType="slide" onRequestClose={() => setShowSaved(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.85)', justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:'#12122a', borderTopLeftRadius:24, borderTopRightRadius:24, padding:20,
            maxHeight:'60%', borderTopWidth:1, borderTopColor:'#702AE122' }}>
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <Text style={{ color:'#fff', fontWeight:'800', fontSize:16 }}>📁 Saved Characters</Text>
              <TouchableOpacity onPress={() => setShowSaved(false)}
                style={{ backgroundColor:'#2a2a4a', borderRadius:8, padding:6 }}>
                <Text style={{ color:'#8a7aaa', fontWeight:'700' }}>✕</Text>
              </TouchableOpacity>
            </View>
            {savedChars.length === 0 ? (
              <Text style={{ color:'#4a4a6a', textAlign:'center', padding:20 }}>No saved characters yet.</Text>
            ) : (
              <FlatList data={savedChars} keyExtractor={i=>i.id} renderItem={({item}) => (
                <TouchableOpacity onPress={() => loadCharacter(item)}
                  style={{ flexDirection:'row', alignItems:'center', backgroundColor:'#1a1a35',
                    borderRadius:12, padding:12, marginBottom:8, borderWidth:1, borderColor:'#2a2a4a' }}>
                  {item.portrait_url
                    ? <Image source={{uri:item.portrait_url}} style={{width:44,height:44,borderRadius:10,marginRight:12}} contentFit="contain" />
                    : <Text style={{fontSize:36,marginRight:12}}>{item.body_type==='girl'?'🦸‍♀️':item.body_type==='neutral'?'🥷':'🦸‍♂️'}</Text>
                  }
                  <View style={{flex:1}}>
                    <Text style={{color:'#fff',fontWeight:'800',fontSize:14}}>{item.name}</Text>
                    <Text style={{color:'#6b5d80',fontSize:11,marginTop:2}}>{item.body_type} · {item.hair_style?.replace(/_/g,' ')}</Text>
                  </View>
                  <Text style={{color:'#B28CFF',fontWeight:'700'}}>Load →</Text>
                </TouchableOpacity>
              )} showsVerticalScrollIndicator={false} />
            )}
          </View>
        </View>
      </Modal>

      {/* ── Toast ── */}
      <Toast msg={toastMsg} visible={showToast} />
    </View>
  )
}

const S = {
  sectionTitle: { color:'#fff', fontWeight:'800' as const, fontSize:14, marginBottom:12 },
}
