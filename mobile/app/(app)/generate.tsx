/**
 * Story Generator — React Native (Phase 4)
 * Full 5-step wizard:
 *   1. The Hero      (character gallery + custom input + AI analyze)
 *   2. World         (theme picker with 100 story worlds)
 *   3. Language      (10 languages)
 *   4. Art Style     (6 styles)
 *   5. Generate & Preview
 *
 * Conversions:
 * - useNavigate → router.push/replace
 * - motion.div  → Animated
 * - localStorage → AsyncStorage (storage lib)
 * - Web SpeechRecognition → expo-speech (read-only; mic requires Speech-to-Text plugin in Phase 5)
 * - CSS sidebar → tab nav (handled by layout)
 * - img/video → expo-image
 * - VITE_API_URL → expo-constants
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  Animated, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { googleSpeak, googleStop } from '../../src/lib/tts'

import { supabase } from '../../src/lib/supabase'
import { storage } from '../../src/lib/storage'
import { storiesApi } from '../../src/lib/api'
import { useAuth } from '../_layout'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { onMuteChange } from '../../src/components/MuteButton'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

// ── Types ──────────────────────────────────────────────────────────────────
type Step = 'character' | 'scene' | 'language' | 'artStyle' | 'preview'
interface Child { id: string; name: string; grade_level: number }
interface CharacterData {
  character_name: string; universe: string; description: string
  visual_appearance: string; character_media_url: string | null
}

// ── Constants ──────────────────────────────────────────────────────────────
const LANGUAGES = [
  { id:'english',    label:'English',    emoji:'🇺🇸' },
  { id:'spanish',    label:'Spanish',    emoji:'🇪🇸' },
  { id:'french',     label:'French',     emoji:'🇫🇷' },
  { id:'portuguese', label:'Portuguese', emoji:'🇧🇷' },
  { id:'german',     label:'German',     emoji:'🇩🇪' },
  { id:'japanese',   label:'Japanese',   emoji:'🇯🇵' },
  { id:'arabic',     label:'Arabic',     emoji:'🇸🇦' },
  { id:'mandarin',   label:'Mandarin',   emoji:'🇨🇳' },
  { id:'hindi',      label:'Hindi',      emoji:'🇮🇳' },
  { id:'italian',    label:'Italian',    emoji:'🇮🇹' },
]

const ART_STYLES = [
  { id:'cartoon',  label:'Cartoon',    emoji:'🎨', badge:'⭐ Popular', desc:'Fun 2D illustrated look' },
  { id:'cinematic',label:'Cinematic',  emoji:'🎬', badge:'🔥 Action',  desc:'Ultra-realistic cinematic' },
  { id:'pixar',    label:'Pixar / 3D', emoji:'🦄', badge:'✨ Family',  desc:'Stylized Pixar animation' },
  { id:'real',     label:'Realistic',  emoji:'📸', badge:'💪 Intense', desc:'Gritty photorealistic' },
  { id:'comic',    label:'Comic Book', emoji:'💥', badge:'🦸 Hero',    desc:'Marvel/DC comic art' },
  { id:'epic',     label:'Epic',       emoji:'⚡', badge:'🏆 Epic',    desc:'Blockbuster key art' },
]

interface ThemeOption {
  id: string; label: string; emoji: string; cat: string; bg: string
}

const THEMES: ThemeOption[] = [
  { id:'magical rainbow forest',     label:'Magic Forest',     emoji:'🌲', cat:'Fantasy',   bg:'#134e1b' },
  { id:'fantasy kingdom castle',     label:'Fantasy Castle',   emoji:'🏰', cat:'Fantasy',   bg:'#3b1d6b' },
  { id:'enchanted fairy village',    label:'Fairy Village',    emoji:'🧚', cat:'Fantasy',   bg:'#6b1d5a' },
  { id:'dragon mountain lair',       label:'Dragon Mountain',  emoji:'🐉', cat:'Fantasy',   bg:'#6b1a00' },
  { id:'wizard magic school',        label:'Magic Academy',    emoji:'🧙', cat:'Fantasy',   bg:'#1a1a5c' },
  { id:'unicorn rainbow meadow',     label:'Unicorn Meadow',   emoji:'🦄', cat:'Fantasy',   bg:'#5c1a4a' },
  { id:'outer space adventure',      label:'Space Explorer',   emoji:'🚀', cat:'Space',     bg:'#050014' },
  { id:'alien planet civilization',  label:'Alien Planet',     emoji:'👽', cat:'Space',     bg:'#001a0d' },
  { id:'moon base colony',           label:'Moon Base',        emoji:'🌕', cat:'Space',     bg:'#1c1c2e' },
  { id:'supernova nebula cloud',     label:'Nebula Galaxy',    emoji:'🌌', cat:'Space',     bg:'#2d0050' },
  { id:'under the ocean',            label:'Ocean Deep',       emoji:'🌊', cat:'Ocean',     bg:'#001f3f' },
  { id:'underwater mermaid kingdom', label:'Mermaid Cove',     emoji:'🧜', cat:'Ocean',     bg:'#0a2b4a' },
  { id:'pirate ship ocean battle',   label:'Pirate Ship',      emoji:'⚓', cat:'Ocean',     bg:'#1c1400' },
  { id:'coral reef paradise',        label:'Coral Reef',       emoji:'🐠', cat:'Ocean',     bg:'#0c4a4a' },
  { id:'pirate treasure hunt',       label:'Pirate Quest',     emoji:'🏴‍☠️', cat:'Adventure', bg:'#1a0f00' },
  { id:'safari africa animals',      label:'Safari Trek',      emoji:'🦒', cat:'Adventure', bg:'#4a2800' },
  { id:'superhero city rescue',      label:'Superhero City',   emoji:'🦸', cat:'Adventure', bg:'#0d0030' },
  { id:'ninja training dojo',        label:'Ninja Dojo',       emoji:'🥷', cat:'Adventure', bg:'#0d0d0d' },
  { id:'friendly dinosaur park',     label:'Dino World',       emoji:'🦕', cat:'Nature',    bg:'#0a3300' },
  { id:'volcano island lava',        label:'Volcano Isle',     emoji:'🌋', cat:'Nature',    bg:'#3d0000' },
  { id:'ancient egypt pyramids',     label:'Ancient Egypt',    emoji:'🛕', cat:'Ancient',   bg:'#4a2800' },
  { id:'viking norse mythology',     label:'Viking Saga',      emoji:'🪓', cat:'Ancient',   bg:'#0d1a2a' },
  { id:'samurai feudal japan',       label:'Samurai Japan',    emoji:'⛩️', cat:'Ancient',   bg:'#3d0000' },
  { id:'time travel history',        label:'Time Travel',      emoji:'⏰', cat:'Future',    bg:'#1a0044' },
  { id:'futuristic neon cyber city', label:'Cyber City',       emoji:'🏙️', cat:'Future',    bg:'#001a3d' },
  { id:'robot factory future world', label:'Robot World',      emoji:'🤖', cat:'Future',    bg:'#0d1117' },
  { id:'haunted friendly ghost town',label:'Ghost Town',       emoji:'👻', cat:'Spooky',    bg:'#0d0d0d' },
  { id:'friendly vampire castle',    label:'Vampire Castle',   emoji:'🧛', cat:'Spooky',    bg:'#1a0000' },
  { id:'witch forest potion',        label:'Witch Forest',     emoji:'🧙‍♀️', cat:'Spooky',    bg:'#0d0020' },
  { id:'christmas north pole santa', label:'North Pole',       emoji:'🎅', cat:'Seasonal',  bg:'#001a3d' },
  { id:'summer beach surfing fun',   label:'Summer Beach',     emoji:'🏄', cat:'Seasonal',  bg:'#003d7a' },
]

const THEME_CATS = ['Fantasy','Space','Ocean','Adventure','Nature','Ancient','Future','Spooky','Seasonal']

// Fallback characters shown when Supabase gallery is empty / loading
const FALLBACK_CHARS = [
  { name:'Sparkle',      portrait_url: null },
  { name:'Bindi Bunny',  portrait_url: null },
  { name:'Leo the Lion', portrait_url: null },
  { name:'Jade Dragon',  portrait_url: null },
  { name:'Nova Scout',   portrait_url: null },
  { name:'Athena',       portrait_url: null },
  { name:'Sky Knight',   portrait_url: null },
  { name:'Alice',        portrait_url: null },
  { name:'Luna Star',    portrait_url: null },
  { name:'Sage the Owl', portrait_url: null },
  { name:'Coral Diver',  portrait_url: null },
  { name:'Robin Hood',   portrait_url: null },
]

const QUICK_PICKS = ['Luna', 'Max', 'Zara', 'Leo', 'Mia', 'Rio']

interface GalleryChar { id?: string; name: string; portrait_url: string | null }

// ── Portrait Circle ───────────────────────────────────────────────────────────
function PortraitCircle({ char, selected, onPress }: {
  char: GalleryChar; selected: boolean; onPress: () => void
}) {
  const [failed, setFailed] = useState(false)
  const EMOJI_MAP: Record<string, string> = {
    'Sparkle':'🌟','Bindi Bunny':'🐰','Leo the Lion':'🦁','Jade Dragon':'🐲',
    'Nova Scout':'🚀','Athena':'🦉','Sky Knight':'⚔️','Alice':'🐇',
    'Luna Star':'🌙','Sage the Owl':'🦉','Coral Diver':'🐠','Robin Hood':'🏹',
    'Captain Mia':'💫','Crystal Mage':'🔮','Princess Kira':'👸','Shadow Fox':'🦊',
    'Zoom':'⚡','Merlin':'🧙','Nova Pulse':'✨','Cipher':'🕵️',
    'Sherlock':'🔍','Zap the Robot':'🤖','Wizard Kid':'🧙‍♂️','Marina':'🧜',
  }
  const fallbackEmoji = EMOJI_MAP[char.name] ?? '🧑'
  const hasImage = char.portrait_url && !failed

  return (
    <TouchableOpacity onPress={onPress} style={{ alignItems:'center', width: '20%', marginBottom:16 }}>
      <View style={{
        width:62, height:62, borderRadius:31,
        borderWidth: selected ? 3 : 2,
        borderColor: selected ? '#B28CFF' : '#702AE155',
        overflow:'hidden', backgroundColor:'#1a1a35',
        shadowColor:'#702AE1', shadowOpacity: selected ? 0.7 : 0.2, shadowRadius: selected ? 12 : 4,
      }}>
        {hasImage ? (
          <Image
            source={{ uri: char.portrait_url! }}
            style={{ width:'100%', height:'100%' }}
            contentFit="cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={{ flex:1, alignItems:'center', justifyContent:'center',
            backgroundColor: selected ? '#702AE130' : '#12122a' }}>
            <Text style={{ fontSize:28 }}>{fallbackEmoji}</Text>
          </View>
        )}
        {selected && (
          <View style={{ position:'absolute', bottom:0, right:0, width:18, height:18, borderRadius:9,
            backgroundColor:'#22c55e', alignItems:'center', justifyContent:'center' }}>
            <Text style={{ color:'#fff', fontSize:10, fontWeight:'900' }}>✓</Text>
          </View>
        )}
      </View>
      <Text numberOfLines={2} style={{
        color: selected ? '#fff' : '#8a7aaa', fontSize:9, marginTop:4,
        textAlign:'center', fontWeight: selected ? '700' : '500', width:64,
      }}>{char.name}</Text>
    </TouchableOpacity>
  )
}


const STORY_STEPS = [
  { icon:'✍️', label:'Writing your story…',        sub:'Crafting pages & plot twists' },
  { icon:'🎨', label:'Designing each scene…',       sub:'Painting every moment' },
  { icon:'🖼️', label:'Rendering illustrations…',   sub:'Bringing characters to life' },
  { icon:'🧩', label:'Composing page layouts…',     sub:'Arranging words & art' },
  { icon:'🌟', label:'Adding magic touches…',       sub:'Polishing every detail' },
  { icon:'📖', label:'Finalizing your book…',       sub:'Almost ready — hang tight!' },
]

const PROHIBITED = ['kill','murder','dead','death','blood','gun','shoot','bomb','sex','porn','abuse','violent','violence']

function badContent(text: string): string | null {
  const lower = text.toLowerCase()
  for (const w of PROHIBITED) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(lower))
      return `⚠️ Please keep it kid-friendly! "${w}" isn't allowed.`
  }
  return null
}

// ── Step voice scripts ────────────────────────────────────────────────────
const STEP_SCRIPTS: Record<string, string[]> = {
  character: [
    `Welcome to the Magic Story Workshop! Pick a character from the gallery below, or type any name in the search box and tap Let's Go to kick off an epic reading adventure!`,
    `Hey there, young storyteller! Browse the character gallery and tap your favourite hero — or type any name in the box and hit Let's Go. Your adventure starts with one name!`,
    `Ready to create a super cool story? Pick any character from the gallery below, or type a name in the magic search box and tap Let's Go. The story begins the moment you choose!`,
  ],
  scene: [
    `Great choice! Now let's build your hero's world. Pick a theme from the cards — maybe a magical forest, outer space, or under the ocean. You can also type your own setting below!`,
    `Step two — time to choose your world! Tap one of the adventure themes to set the stage. Feeling creative? Type your own unique setting in the text box, then tap Continue!`,
    `Now it's time to pick the perfect world for your adventure. Tap a theme card, or describe your own setting below. When you're happy, tap Continue to move on!`,
  ],
  language: [
    `Choose the language for your story! Pick English, Spanish, French, or any language you love. Then tap Continue to pick your art style!`,
    `Step three — what language should your story be written in? Tap your choice and hit Continue. You can choose from ten fantastic languages!`,
  ],
  artStyle: [
    `Almost there! Pick the art style for your illustrations. Cartoon is super popular with kids, but every style looks amazing. When you're ready, tap Generate My Story!`,
    `Step four — choose how your story will look! Tap an art style, then hit Generate My Story and we'll build your personalised adventure. It only takes a couple of minutes!`,
  ],
}

function pickScript(step: string): string {
  const arr = STEP_SCRIPTS[step] ?? []
  return arr[Math.floor(Math.random() * arr.length)] ?? ''
}

// ── Step Progress Bar ──────────────────────────────────────────────────────
const STEP_LABELS = ['The Hero','World','Language','Art Style','Preview']
function StepBar({ step }: { step: Step }) {
  const idx = { character:0, scene:1, language:2, artStyle:3, preview:4 }[step]
  return (
    <View style={{ paddingHorizontal:16, paddingVertical:10 }}>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
        {STEP_LABELS.map((label, i) => (
          <View key={i} style={{ alignItems:'center', flex:1 }}>
            <View style={{
              width:28, height:28, borderRadius:14,
              backgroundColor: i <= idx ? '#702AE1' : '#1a1a35',
              alignItems:'center', justifyContent:'center',
              borderWidth:1, borderColor: i <= idx ? '#702AE1' : '#2a2a4a',
            }}>
              <Text style={{ color:'#fff', fontSize:12, fontWeight:'800' }}>
                {i < idx ? '✓' : String(i+1)}
              </Text>
            </View>
            <Text style={{ color: i <= idx ? '#B28CFF' : '#3a3a5a', fontSize:9, marginTop:4, textAlign:'center' }}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={{ height:3, backgroundColor:'#1a1a35', borderRadius:2, marginTop:8 }}>
        <View style={{ height:3, borderRadius:2, backgroundColor:'#702AE1', width:`${(idx/4)*100}%` }} />
      </View>
    </View>
  )
}

// ══════════════════════════════════════════════════════════════════════
export default function GenerateScreen() {
  const { session } = useAuth()
  const insets = useSafeAreaInsets()

  const [children,       setChildren]       = useState<Child[]>([])
  const [selectedChild,  setSelectedChild]  = useState<Child|null>(null)

  const [step,           setStep]           = useState<Step>('character')
  const [charInput,      setCharInput]      = useState('')
  const [charData,       setCharData]       = useState<CharacterData|null>(null)
  const [charLoading,    setCharLoading]    = useState(false)
  const [charError,      setCharError]      = useState('')
  const [selectedGallery,setSelectedGallery]= useState('')
  const [galleryChars,   setGalleryChars]   = useState<GalleryChar[]>(FALLBACK_CHARS)
  const [galleryLoading, setGalleryLoading] = useState(true)

  // Scene
  const [sceneDesc,      setSceneDesc]      = useState('')
  const [isMuted, setIsMuted] = useState(false)

  // Theme / Art / Language / Visibility
  const [selectedTheme,  setSelectedTheme]  = useState<string|null>(null)
  const [selectedArt,    setSelectedArt]    = useState<string|null>(null)
  const [selectedLang,   setSelectedLang]   = useState('en')
  const [isPublic,       setIsPublic]       = useState(false)
  const [themeCat,       setThemeCat]       = useState('Fantasy')
  const [themeSearch,    setThemeSearch]    = useState('')

  // Scene
  const [sceneError,     setSceneError]     = useState('')

  // Generation
  const [isGenerating,   setIsGenerating]   = useState(false)
  const [genStep,        setGenStep]        = useState(0)
  const [genError,       setGenError]       = useState('')
  const [generated,      setGenerated]      = useState<{id:string;title:string}|null>(null)
  const [genTitle,       setGenTitle]       = useState('')
  const genInterval = useRef<ReturnType<typeof setInterval>|null>(null)

  // Voice
  const [isSpeaking,     setIsSpeaking]     = useState(false)

  // Derived: grade from selected child
  const grade = selectedChild?.grade_level ?? 3

  useEffect(() => {
    AsyncStorage.getItem('readquest_muted').then(v => setIsMuted(v === 'true')).catch(() => {})
    const unsub = onMuteChange(muted => {
      setIsMuted(muted)
      if (muted) { void googleStop(); setIsSpeaking(false) }
    })
    return () => { void unsub() }
  }, [])

  // ── Voice instructions — speak on each step change ────────────────────
  useEffect(() => {
    if (step === 'preview') { void googleStop(); setIsSpeaking(false); return }
    const script = pickScript(step)
    if (!script) return
    const timer = setTimeout(() => {
      if (isMuted) return
      setIsSpeaking(true)
      void googleSpeak(script, 'teacher', () => setIsSpeaking(false))
    }, 600)
    return () => {
      clearTimeout(timer)
      void googleStop()
      setIsSpeaking(false)
    }
  }, [step, isMuted]) // eslint-disable-line

  // Stop speech on unmount
  useEffect(() => () => { void googleStop() }, [])


  // ── Load children ──────────────────────────────────────────────────────
  useEffect(() => {
    const user = session?.user
    if (!user) return
    fetch(`${API_URL}/api/students/parent/${user.id}`)
      .then(r => r.json())
      .then(async (data: Child[]) => {
        const list = Array.isArray(data) ? data : []
        setChildren(list)
        const savedId = await storage.getString('readquest_student_id')
        const match = list.find(c => c.id === savedId) ?? (list.length === 1 ? list[0] : null)
        if (match) setSelectedChild(match)
      }).catch(() => {})
  }, [session])

  // ── Load character gallery from Supabase (same as web) ─────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await supabase
          .from('characters')
          .select('id,name,portrait_url')
          .not('portrait_url', 'is', null)
          .limit(27)
        if (data && data.length > 0) setGalleryChars(data as GalleryChar[])
      } catch {}
      finally { setGalleryLoading(false) }
    })()
  }, [])

  // ── Quick gallery select ───────────────────────────────────────────────
  const selectFromGallery = (name: string) => {
    setSelectedGallery(name)
    setCharInput(name)
    setCharData({
      character_name: name, universe: 'Adventure',
      description: `${name} — ready for an epic adventure!`,
      visual_appearance: name, character_media_url: null,
    })
    setSceneDesc(''); setSelectedTheme(null)
    Haptics.selectionAsync()
    setTimeout(() => setStep('scene'), 200)
  }

  // ── Manual analyze character ────────────────────────────────────────────
  const analyzeCharacter = useCallback(async () => {
    const name = charInput.trim()
    if (!name) { setCharError('Enter a character name.'); return }
    if (badContent(name)) { setCharError(badContent(name) ?? ''); return }
    setCharError(''); setCharLoading(true)
    try {
      const res = await storiesApi.analyzeCharacter(name)
      setCharData(res.data)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setStep('scene')
    } catch { setCharError('Could not analyze character. Try a different name.') }
    finally { setCharLoading(false) }
  }, [charInput])

  // ── Scene validation ────────────────────────────────────────────────────
  const proceedScene = () => {
    if (!selectedTheme) { setSceneError('Pick a story world!'); return }
    const err = badContent(sceneDesc)
    if (err) { setSceneError(err); return }
    setSceneError(''); setStep('language')
  }

  // ── Main generation ──────────────────────────────────────────────────────
  const generateStory = useCallback(async () => {
    if (!charData || !selectedTheme || !selectedArt) return
    setIsGenerating(true); setGenStep(0); setGenError(''); setGenerated(null)

    genInterval.current = setInterval(() => {
      setGenStep(prev => {
        const next = prev + 1
        if (next >= STORY_STEPS.length - 1) { clearInterval(genInterval.current!); return prev }
        return next
      })
    }, 22000)

    try {
      await storage.getString('readquest_student_id').then(sid => {
        if (sid) {
          storage.setString('readquest_student_id', sid)
        }
      })
      const sid = await storage.getString('readquest_student_id')
      const res = await storiesApi.generate(
        grade, selectedTheme, charData.character_name,
        selectedLang, selectedArt, isPublic,
      )
      clearInterval(genInterval.current!)
      setGenStep(STORY_STEPS.length - 1)
      setGenerated({ id: (res.data as any).id, title: (res.data as any).title })
      setGenTitle((res.data as any).title ?? '')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (e: any) {
      clearInterval(genInterval.current!)
      setGenError(e?.response?.data?.detail ?? 'Generation failed. Try again.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally { setIsGenerating(false) }
  }, [charData, selectedTheme, selectedArt, selectedLang, isPublic, grade])

  useEffect(() => () => { if (genInterval.current) clearInterval(genInterval.current) }, [])

  const filteredThemes = THEMES.filter(t =>
    t.cat === themeCat &&
    (themeSearch === '' || t.label.toLowerCase().includes(themeSearch.toLowerCase()))
  )

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <View style={{ flex:1, backgroundColor:'#0d0d1f', paddingTop:insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal:20, paddingTop:12, paddingBottom:0, flexDirection:'row', alignItems:'center' }}>
        <View style={{ flex:1 }}>
          <Text style={{ color:'#fff', fontSize:22, fontWeight:'800' }}>✨ Generate Story</Text>
          <Text style={{ color:'#6b5d80', fontSize:12 }}>
            {selectedChild ? `For ${selectedChild.name} · Grade ${selectedChild.grade_level}` : 'Create an AI-powered adventure'}
          </Text>
        </View>
        {/* Child picker */}
        {children.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {children.map((child, i) => (
              <TouchableOpacity key={child.id} onPress={() => setSelectedChild(child)}
                style={{
                  backgroundColor: selectedChild?.id===child.id ? '#702AE1' : '#1a1a35',
                  borderRadius:20, paddingHorizontal:10, paddingVertical:5, marginLeft:6,
                  borderWidth:1, borderColor: selectedChild?.id===child.id ? '#702AE1' : '#2a2a4a',
                }}>
                <Text style={{ color:'#fff', fontSize:11, fontWeight:'700' }}>{child.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <StepBar step={step} />

      {/* Speaking indicator */}
      {isSpeaking && (
        <TouchableOpacity
          onPress={() => { void googleStop(); setIsSpeaking(false) }}
          style={{
            flexDirection:'row', alignItems:'center', justifyContent:'center',
            backgroundColor:'#702AE115', borderTopWidth:1, borderBottomWidth:1,
            borderColor:'#702AE133', paddingVertical:6, gap:8,
          }}>
          <Text style={{ fontSize:16 }}>🔊</Text>
          <Text style={{ color:'#B28CFF', fontSize:12, fontWeight:'600' }}>Playing instructions… (tap to stop)</Text>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1 }}>
        <ScrollView
          style={{ flex:1 }}
          contentContainerStyle={{ padding:16, paddingBottom:120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── STEP 1: CHARACTER ── */}
          {step === 'character' && (
            <View>
              {/* Hero headline */}
              <Text style={{ color:'#fff', fontWeight:'900', fontSize:26, marginBottom:2 }}>Who's{"\n"}<Text style={{ color:'#B28CFF' }}>the Hero?</Text></Text>
              <Text style={{ color:'#8a7aaa', fontSize:13, marginBottom:14 }}>Pick any character — or even yourself!</Text>

              {/* Search input */}
              <View style={{ flexDirection:'row', gap:8, marginBottom:12 }}>
                <TextInput
                  value={charInput}
                  onChangeText={setCharInput}
                  placeholder="e.g. Luna Star, Sky Knight, Jade Dragon…"
                  placeholderTextColor="#3a3a5a"
                  style={{
                    flex:1, backgroundColor:'#1a1a35', borderRadius:12, borderWidth:1,
                    borderColor:'#702AE144', color:'#fff', fontSize:14, padding:12,
                  }}
                  returnKeyType="done"
                  onSubmitEditing={analyzeCharacter}
                />
                <TouchableOpacity
                  onPress={analyzeCharacter}
                  disabled={charLoading || !charInput.trim()}
                  style={{ backgroundColor:'#702AE1', borderRadius:12, paddingHorizontal:16, justifyContent:'center',
                    opacity: charInput.trim() ? 1 : 0.4 }}
                >
                  {charLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={{ color:'#fff', fontWeight:'900', fontSize:14 }}>Let's Go!</Text>
                  }
                </TouchableOpacity>
              </View>

              {/* Quick picks */}
              <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:16, flexWrap:'wrap' }}>
                <Text style={{ color:'#6b5d80', fontSize:12, fontWeight:'600' }}>Quick picks:</Text>
                {QUICK_PICKS.map(name => (
                  <TouchableOpacity key={name} onPress={() => selectFromGallery(name)}
                    style={{ backgroundColor:'#1a1a35', borderRadius:20, paddingHorizontal:12, paddingVertical:5,
                      borderWidth:1, borderColor:'#2a2a4a' }}>
                    <Text style={{ color:'#B28CFF', fontWeight:'700', fontSize:12 }}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Gallery headline */}
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:13, marginBottom:12 }}>Pick your hero — click one to start! ✨</Text>

              {/* Portrait grid */}
              {galleryLoading ? (
                <View style={{ alignItems:'center', paddingVertical:40 }}>
                  <ActivityIndicator size="large" color="#702AE1" />
                  <Text style={{ color:'#6b5d80', fontSize:12, marginTop:8 }}>Loading characters…</Text>
                </View>
              ) : (
                <View style={{ flexDirection:'row', flexWrap:'wrap', justifyContent:'flex-start' }}>
                  {galleryChars.map(char => (
                    <PortraitCircle
                      key={char.name}
                      char={char}
                      selected={selectedGallery === char.name}
                      onPress={() => selectFromGallery(char.name)}
                    />
                  ))}
                </View>
              )}

              {charError ? <Text style={{ color:'#ef4444', fontSize:13, marginTop:8 }}>{charError}</Text> : null}
            </View>
          )}

          {/* ── STEP 2: WORLD ── */}
          {step === 'scene' && (
            <View>
              <TouchableOpacity onPress={() => setStep('character')} style={{ marginBottom:12 }}>
                <Text style={{ color:'#8a7aaa', fontSize:13 }}>← Back</Text>
              </TouchableOpacity>
              <Text style={{ color:'#fff', fontWeight:'800', fontSize:18, marginBottom:4 }}>🌍 Choose Your World</Text>
              <Text style={{ color:'#8a7aaa', fontSize:13, marginBottom:16 }}>
                {charData?.character_name} needs a world to explore!
              </Text>

              {/* Category filter */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:12 }}>
                {THEME_CATS.map(cat => (
                  <TouchableOpacity key={cat} onPress={() => setThemeCat(cat)}
                    style={{
                      backgroundColor: themeCat===cat ? '#702AE1' : '#1a1a35',
                      borderRadius:20, paddingHorizontal:14, paddingVertical:7, marginRight:6,
                      borderWidth:1, borderColor: themeCat===cat ? '#702AE1' : '#2a2a4a',
                    }}>
                    <Text style={{ color: themeCat===cat ? '#fff' : '#8a7aaa', fontWeight:'700', fontSize:12 }}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Search */}
              <TextInput
                value={themeSearch} onChangeText={setThemeSearch}
                placeholder="Search worlds…" placeholderTextColor="#3a3a5a"
                style={{ backgroundColor:'#1a1a35', borderRadius:12, borderWidth:1, borderColor:'#2a2a4a', color:'#fff', fontSize:14, padding:11, marginBottom:12 }}
              />

              {/* Theme grid */}
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                {filteredThemes.map(th => (
                  <TouchableOpacity key={th.id} onPress={() => { setSelectedTheme(th.id); Haptics.selectionAsync() }}
                    style={{
                      backgroundColor: selectedTheme===th.id ? '#702AE1' : th.bg,
                      borderRadius:12, padding:12, width:'30%', alignItems:'center',
                      borderWidth:2, borderColor: selectedTheme===th.id ? '#fff' : 'transparent',
                    }}>
                    <Text style={{ fontSize:26 }}>{th.emoji}</Text>
                    <Text style={{ color:'#fff', fontWeight:'700', fontSize:10, textAlign:'center', marginTop:4 }}>{th.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Scene description */}
              <Text style={{ color:'#fff', fontWeight:'600', fontSize:14, marginBottom:8 }}>Custom description (optional):</Text>
              <TextInput
                value={sceneDesc} onChangeText={setSceneDesc}
                placeholder="Describe the setting or add story details…"
                placeholderTextColor="#3a3a5a" multiline numberOfLines={3}
                style={{ backgroundColor:'#1a1a35', borderRadius:12, borderWidth:1, borderColor:'#2a2a4a',
                  color:'#fff', fontSize:14, padding:12, marginBottom:12, textAlignVertical:'top' }}
              />
              {sceneError ? <Text style={{ color:'#ef4444', fontSize:13, marginBottom:8 }}>{sceneError}</Text> : null}

              <TouchableOpacity onPress={proceedScene}
                style={{ backgroundColor: selectedTheme ? '#702AE1' : '#2a2a4a', borderRadius:14, padding:15, alignItems:'center' }}>
                <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>Continue →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 3: LANGUAGE ── */}
          {step === 'language' && (
            <View>
              <TouchableOpacity onPress={() => setStep('scene')} style={{ marginBottom:12 }}>
                <Text style={{ color:'#8a7aaa', fontSize:13 }}>← Back</Text>
              </TouchableOpacity>
              <Text style={{ color:'#fff', fontWeight:'800', fontSize:18, marginBottom:4 }}>🗺️ Choose Language</Text>
              <Text style={{ color:'#8a7aaa', fontSize:13, marginBottom:16 }}>What language should the story be written in?</Text>
              <View style={{ gap:10 }}>
                {LANGUAGES.map(lang => (
                  <TouchableOpacity key={lang.id} onPress={() => setSelectedLang(lang.id)}
                    style={{
                      backgroundColor: selectedLang===lang.id ? '#702AE1' : '#1a1a35',
                      borderRadius:14, padding:14, flexDirection:'row', alignItems:'center',
                      borderWidth:1, borderColor: selectedLang===lang.id ? '#702AE1' : '#2a2a4a',
                    }}>
                    <Text style={{ fontSize:24, marginRight:12 }}>{lang.emoji}</Text>
                    <Text style={{ color:'#fff', fontWeight:'700', fontSize:15, flex:1 }}>{lang.label}</Text>
                    {selectedLang===lang.id && <Text style={{ color:'#B28CFF', fontSize:16 }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => setStep('artStyle')}
                style={{ backgroundColor:'#702AE1', borderRadius:14, padding:15, alignItems:'center', marginTop:20 }}>
                <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>Continue →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 4: ART STYLE ── */}
          {step === 'artStyle' && (
            <View>
              <TouchableOpacity onPress={() => setStep('language')} style={{ marginBottom:12 }}>
                <Text style={{ color:'#8a7aaa', fontSize:13 }}>← Back</Text>
              </TouchableOpacity>
              <Text style={{ color:'#fff', fontWeight:'800', fontSize:18, marginBottom:4 }}>🎨 Choose Art Style</Text>
              <Text style={{ color:'#8a7aaa', fontSize:13, marginBottom:16 }}>How should the illustrations look?</Text>
              <View style={{ gap:10 }}>
                {ART_STYLES.map(art => (
                  <TouchableOpacity key={art.id} onPress={() => { setSelectedArt(art.id); Haptics.selectionAsync() }}
                    style={{
                      backgroundColor: selectedArt===art.id ? '#702AE115' : '#1a1a35',
                      borderRadius:16, padding:16, flexDirection:'row', alignItems:'center',
                      borderWidth:1.5, borderColor: selectedArt===art.id ? '#702AE1' : '#2a2a4a',
                    }}>
                    <Text style={{ fontSize:30, marginRight:12 }}>{art.emoji}</Text>
                    <View style={{ flex:1 }}>
                      <View style={{ flexDirection:'row', alignItems:'center' }}>
                        <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>{art.label}</Text>
                        <View style={{ backgroundColor:'#702AE130', borderRadius:10, paddingHorizontal:8, paddingVertical:2, marginLeft:8 }}>
                          <Text style={{ color:'#B28CFF', fontSize:10, fontWeight:'700' }}>{art.badge}</Text>
                        </View>
                      </View>
                      <Text style={{ color:'#8a7aaa', fontSize:12, marginTop:2 }}>{art.desc}</Text>
                    </View>
                    {selectedArt===art.id && <Text style={{ color:'#702AE1', fontSize:20 }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Public toggle */}
              <TouchableOpacity onPress={() => setIsPublic(p => !p)}
                style={{
                  flexDirection:'row', alignItems:'center', marginTop:16,
                  backgroundColor:'#1a1a35', borderRadius:14, padding:14,
                  borderWidth:1, borderColor: isPublic ? '#702AE1' : '#2a2a4a',
                }}>
                <View style={{
                  width:24, height:24, borderRadius:12, marginRight:12,
                  backgroundColor: isPublic ? '#702AE1' : '#2a2a4a',
                  alignItems:'center', justifyContent:'center',
                }}>
                  {isPublic && <Text style={{ color:'#fff', fontSize:12 }}>✓</Text>}
                </View>
                <View>
                  <Text style={{ color:'#fff', fontWeight:'700' }}>🌍 Share in Community Gallery</Text>
                  <Text style={{ color:'#6b5d80', fontSize:12 }}>Let other students read this story</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setStep('preview'); generateStory() }}
                disabled={!selectedArt}
                style={{ backgroundColor: selectedArt ? '#702AE1' : '#2a2a4a', borderRadius:14, padding:15, alignItems:'center', marginTop:16 }}>
                <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>✨ Generate My Story!</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 5: PREVIEW / GENERATING ── */}
          {step === 'preview' && (
            <View style={{ alignItems:'center' }}>
              {isGenerating ? (
                <View style={{ alignItems:'center', paddingVertical:32 }}>
                  <Text style={{ fontSize:64 }}>🪄</Text>
                  <Text style={{ color:'#fff', fontWeight:'900', fontSize:22, marginTop:12, textAlign:'center' }}>Creating Your Story…</Text>
                  <Text style={{ color:'#B28CFF', fontWeight:'700', fontSize:15, marginTop:4 }}>
                    {charData?.character_name}'s Adventure
                  </Text>

                  {/* Step indicator */}
                  <View style={{ backgroundColor:'#1a1a35', borderRadius:14, padding:16, marginTop:24, width:'100%' }}>
                    <View style={{ flexDirection:'row', alignItems:'center', marginBottom:10 }}>
                      <ActivityIndicator size="small" color="#702AE1" style={{ marginRight:10 }} />
                      <View>
                        <Text style={{ color:'#fff', fontWeight:'700' }}>{STORY_STEPS[genStep].icon} {STORY_STEPS[genStep].label}</Text>
                        <Text style={{ color:'#8a7aaa', fontSize:12 }}>{STORY_STEPS[genStep].sub}</Text>
                      </View>
                    </View>
                    {/* Progress dots */}
                    <View style={{ flexDirection:'row', gap:6 }}>
                      {STORY_STEPS.map((_, i) => (
                        <View key={i} style={{ flex:1, height:4, borderRadius:2,
                          backgroundColor: i <= genStep ? '#702AE1' : '#1a1a35' }} />
                      ))}
                    </View>
                  </View>

                  <Text style={{ color:'#6b5d80', fontSize:12, marginTop:16, textAlign:'center' }}>
                    This takes 2–3 minutes.{'\n'}AI is painting each page illustration ✨
                  </Text>
                </View>
              ) : generated ? (
                <View style={{ alignItems:'center', paddingVertical:20, width:'100%' }}>
                  <Text style={{ fontSize:72 }}>🎉</Text>
                  <Text style={{ color:'#fff', fontWeight:'900', fontSize:22, textAlign:'center', marginTop:12 }}>
                    Your Story is Ready!
                  </Text>
                  <Text style={{ color:'#B28CFF', fontWeight:'700', fontSize:15, marginTop:4, textAlign:'center' }}>
                    "{generated.title}"
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push(`/(app)/read/${generated.id}` as any)}
                    style={{ backgroundColor:'#702AE1', borderRadius:16, paddingHorizontal:40, paddingVertical:16, marginTop:24, width:'100%' }}
                  >
                    <Text style={{ color:'#fff', fontWeight:'900', fontSize:18, textAlign:'center' }}>📖 Read Now!</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push('/(app)/library' as any)}
                    style={{ backgroundColor:'#1a1a35', borderRadius:16, paddingHorizontal:40, paddingVertical:14, marginTop:10, width:'100%',
                      borderWidth:1, borderColor:'#2a2a4a' }}
                  >
                    <Text style={{ color:'#8a7aaa', fontWeight:'700', fontSize:15, textAlign:'center' }}>📚 View in Library</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    setStep('character'); setCharData(null); setCharInput(''); setSelectedGallery('')
                    setSelectedTheme(null); setSelectedArt(null); setGenerated(null); setGenError('')
                  }} style={{ marginTop:12 }}>
                    <Text style={{ color:'#6b5d80', fontSize:13 }}>✨ Generate Another Story</Text>
                  </TouchableOpacity>
                </View>
              ) : genError ? (
                <View style={{ alignItems:'center', paddingVertical:40 }}>
                  <Text style={{ fontSize:48 }}>⚠️</Text>
                  <Text style={{ color:'#ef4444', fontWeight:'700', fontSize:16, marginTop:12, textAlign:'center' }}>{genError}</Text>
                  <TouchableOpacity
                    onPress={() => { setStep('artStyle'); setGenError('') }}
                    style={{ backgroundColor:'#702AE1', borderRadius:14, paddingHorizontal:28, paddingVertical:13, marginTop:20 }}
                  >
                    <Text style={{ color:'#fff', fontWeight:'800' }}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
