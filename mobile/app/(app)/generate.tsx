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
  ActivityIndicator, KeyboardAvoidingView, Platform, Animated,
} from 'react-native'
import type { ImageSourcePropType } from 'react-native'
import { Image } from 'expo-image'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { googleSpeak, googleStop } from '../../src/lib/tts'

import { storage } from '../../src/lib/storage'
import { storiesApi } from '../../src/lib/api'
import { useAuth } from '../_layout'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { onMuteChange } from '../../src/components/MuteButton'
import { CHAR_ICONS } from '../../src/data/characterAssets'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

// ── Types ──────────────────────────────────────────────────────────────────
type Step = 'character' | 'scene' | 'language' | 'artStyle' | 'preview'
interface Child { id: string; name: string; grade_level: number }
interface CharacterData {
  character_name: string; universe: string; description: string
  visual_appearance: string; character_media_url: string | null
  character_image_url?: string | null   // backend field — mapped to character_media_url
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

// Fallback quick-pick names (used when user types manually)
const QUICK_PICKS = ['Luna', 'Max', 'Zara', 'Leo', 'Mia', 'Rio']

interface StaticChar { name: string; emoji: string; img: ImageSourcePropType }

// ── Static character roster — bundled local images (same as web) ──────────────
const ALL_CHARACTERS: StaticChar[] = [
  { name: 'Sea Prince',     emoji: '🌊', img: CHAR_ICONS.disney_seaprince },
  { name: 'Snow Queen',     emoji: '❄️', img: CHAR_ICONS.disney_snowqueen },
  { name: 'Sun Prince',     emoji: '☀️', img: CHAR_ICONS.disney_sunprince },
  { name: 'Adventure Girl', emoji: '🏔️', img: CHAR_ICONS.disney_adventuregirl },
  { name: 'Forest Girl',    emoji: '🌲', img: CHAR_ICONS.disney_forestgirl },
  { name: 'Marine Boy',     emoji: '🐬', img: CHAR_ICONS.disney_marineboy },
  { name: 'Star Gazer',     emoji: '⭐', img: CHAR_ICONS.disney_stargazer },
  { name: 'Dragon Rider',   emoji: '🐲', img: CHAR_ICONS.disney_dragonrider },
  { name: 'Music Girl',     emoji: '🎵', img: CHAR_ICONS.disney_musicgirl },
  { name: 'Tinker Boy',     emoji: '🔧', img: CHAR_ICONS.disney_tinkerboy },
  { name: 'Witch Girl',     emoji: '🧹', img: CHAR_ICONS.disney_witchgirl },
  { name: 'Farm Boy',       emoji: '🌾', img: CHAR_ICONS.disney_farmboy },
  { name: 'Ice Girl',       emoji: '🧧', img: CHAR_ICONS.disney_icegirl },
  { name: 'Blaze',          emoji: '🔥', img: CHAR_ICONS.hero_blaze },
  { name: 'Storm Wing',     emoji: '🌩️', img: CHAR_ICONS.hero_stormwing },
  { name: 'Titan Fist',     emoji: '💪', img: CHAR_ICONS.hero_titanfist },
  { name: 'Shadow Claw',    emoji: '🐾', img: CHAR_ICONS.hero_shadowclaw },
  { name: 'Aqua Rush',      emoji: '💧', img: CHAR_ICONS.hero_aquarush },
  { name: 'Gear Bolt',      emoji: '⚙️', img: CHAR_ICONS.hero_gearbolt },
  { name: 'Terra Vine',     emoji: '🌿', img: CHAR_ICONS.hero_terravine },
  { name: 'Moon Shield',    emoji: '🌙', img: CHAR_ICONS.hero_moonshield },
  { name: 'Thunder Strike', emoji: '⚡', img: CHAR_ICONS.hero_thunderstrike },
  { name: 'Iron Veil',      emoji: '🛡️', img: CHAR_ICONS.hero_ironveil },
  { name: 'Galaxy Brave',   emoji: '🌌', img: CHAR_ICONS.hero_galaxybrave },
  { name: 'Wind Runner',    emoji: '💨', img: CHAR_ICONS.hero_windrunner },
  { name: 'Prism Queen',    emoji: '🌈', img: CHAR_ICONS.hero_prismqueen },
  { name: 'Stone Guard',    emoji: '🪨', img: CHAR_ICONS.hero_stoneguard },
]

interface SavedChar { name: string; imageUrl: string; emoji: string }
const SAVED_CHARS_KEY = 'readquest_saved_characters'


// ── Portrait Circle ───────────────────────────────────────────────────────────
function PortraitCircle({ char, selected, onPress }: {
  char: StaticChar; selected: boolean; onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{ alignItems: 'center', width: '20%', marginBottom: 18, paddingHorizontal: 2 }}
    >
      <View style={{
        width: 64, height: 64, borderRadius: 32,
        borderWidth: selected ? 3 : 2,
        borderColor: selected ? '#B28CFF' : 'rgba(112,42,225,0.35)',
        overflow: 'hidden',
        backgroundColor: '#120d2e',
        shadowColor: '#702AE1',
        shadowOpacity: selected ? 0.9 : 0.25,
        shadowRadius: selected ? 16 : 6,
        shadowOffset: { width: 0, height: 4 },
        elevation: selected ? 12 : 4,
      }}>
        <Image
          source={char.img as any}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          contentPosition={{ top: '10%' }}
        />
        {selected && (
          <View style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 18, height: 18, borderRadius: 9,
            backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center',
            borderWidth: 1.5, borderColor: '#fff',
          }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>✓</Text>
          </View>
        )}
      </View>
      <Text numberOfLines={2} style={{
        color: selected ? '#d2bbff' : '#7a6a9a',
        fontSize: 9, marginTop: 5,
        textAlign: 'center',
        fontWeight: selected ? '800' : '600',
        width: 68,
      }}>{char.name}</Text>
    </TouchableOpacity>
  )
}

// ── URL-based Portrait Circle (for AI-generated saved characters) ──────────────
function PortraitCircleUrl({ char, selected, onPress, onLongPress }: {
  char: SavedChar; selected: boolean; onPress: () => void; onLongPress?: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
      style={{ alignItems: 'center', width: '20%', marginBottom: 18, paddingHorizontal: 2 }}
    >
      <View style={{
        width: 64, height: 64, borderRadius: 32,
        borderWidth: selected ? 3 : 2,
        borderColor: selected ? '#f59e0b' : 'rgba(245,158,11,0.35)',
        overflow: 'hidden',
        backgroundColor: '#1a1000',
        shadowColor: '#f59e0b',
        shadowOpacity: selected ? 0.9 : 0.3,
        shadowRadius: selected ? 16 : 6,
        shadowOffset: { width: 0, height: 4 },
        elevation: selected ? 12 : 4,
      }}>
        <Image
          source={{ uri: char.imageUrl }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
        {/* AI badge */}
        <View style={{
          position: 'absolute', top: 0, left: 0,
          width: 18, height: 18, borderRadius: 9,
          backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 9 }}>✨</Text>
        </View>
        {selected && (
          <View style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 18, height: 18, borderRadius: 9,
            backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center',
            borderWidth: 1.5, borderColor: '#fff',
          }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>✓</Text>
          </View>
        )}
      </View>
      <Text numberOfLines={2} style={{
        color: selected ? '#fcd34d' : '#9a8060',
        fontSize: 9, marginTop: 5,
        textAlign: 'center',
        fontWeight: selected ? '800' : '600',
        width: 68,
      }}>{char.name}</Text>
    </TouchableOpacity>
  )
}


const STORY_STEPS = [
  { icon: '✍️', label: 'Writing your story…',          sub: 'Crafting pages & plot twists' },
  { icon: '🗺️', label: 'Building the world…',          sub: 'Setting the scene & characters' },
  { icon: '🎨', label: 'Painting scene 1…',             sub: 'Bringing page 1 to life' },
  { icon: '🖼️', label: 'Painting scene 2…',            sub: 'Illustrating page 2' },
  { icon: '🌟', label: 'Painting scene 3…',             sub: 'Illustrating page 3' },
  { icon: '🧩', label: 'Painting scene 4…',             sub: 'Illustrating page 4' },
  { icon: '📖', label: 'Finishing touches…',            sub: 'Scene 5 — almost ready!' },
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
  // Accordion open state for hero sections
  const [createdOpen, setCreatedOpen] = useState(true)
  const [starterOpen, setStarterOpen] = useState(true)
  const createdAnim = useRef(new Animated.Value(1)).current
  const starterAnim = useRef(new Animated.Value(1)).current
  const createdChevron = useRef(new Animated.Value(1)).current
  const starterChevron = useRef(new Animated.Value(1)).current
  const toggleCreated = () => {
    const next = !createdOpen
    setCreatedOpen(next)
    Animated.parallel([
      Animated.spring(createdAnim, { toValue: next ? 1 : 0, useNativeDriver: false, tension: 60, friction: 9 }),
      Animated.spring(createdChevron, { toValue: next ? 1 : 0, useNativeDriver: true, tension: 60, friction: 9 }),
    ]).start()
  }
  const toggleStarter = () => {
    const next = !starterOpen
    setStarterOpen(next)
    Animated.parallel([
      Animated.spring(starterAnim, { toValue: next ? 1 : 0, useNativeDriver: false, tension: 60, friction: 9 }),
      Animated.spring(starterChevron, { toValue: next ? 1 : 0, useNativeDriver: true, tension: 60, friction: 9 }),
    ]).start()
  }
  const [stepOneArt,     setStepOneArt]     = useState('cartoon')  // art style selected on step 1
  const [savedCharacters,setSavedCharacters] = useState<SavedChar[]>([])

  // Scene / Background
  const [sceneDesc,      setSceneDesc]      = useState('')
  const [shortStory,     setShortStory]     = useState('')
  const [shortStoryMode, setShortStoryMode] = useState(false)
  const [shortStoryExpanding, setShortStoryExpanding] = useState(false)
  const [isMuted,        setIsMuted]        = useState(false)

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
  const scrollRef   = useRef<any>(null)

  // Progressive image slots — fills as each of 5 page images arrives
  const [pageImageSlots, setPageImageSlots] = useState<(string|null)[]>([null,null,null,null,null])
  const [imagesComplete, setImagesComplete] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null)

  // Voice
  const [isSpeaking,     setIsSpeaking]     = useState(false)

  // Spinning animation for generation loader
  const spinAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  // Smooth continuous progress bar (0→1 over 120s while generating)
  const genProgressAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (step === 'preview') {
      // Always spin on this screen
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ).start()
      // Pulse glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start()
      if (isGenerating) {
        // Smooth progress: 0 → 0.95 over 90s (phase1 ~25s + 5 images ~8s each)
        genProgressAnim.setValue(0)
        Animated.timing(genProgressAnim, { toValue: 0.95, duration: 90000, useNativeDriver: false }).start()
      }
    } else {
      spinAnim.stopAnimation(); pulseAnim.stopAnimation()
      spinAnim.setValue(0); pulseAnim.setValue(1)
      genProgressAnim.stopAnimation(); genProgressAnim.setValue(0)
    }
  }, [step, isGenerating])

  // Derived: grade from selected child
  const grade = selectedChild?.grade_level ?? 3

  useEffect(() => {
    AsyncStorage.getItem('readquest_muted').then(v => setIsMuted(v === 'true')).catch(() => {})
    // Load saved AI-generated characters
    AsyncStorage.getItem(SAVED_CHARS_KEY).then(raw => {
      if (raw) { try { setSavedCharacters(JSON.parse(raw)) } catch {} }
    }).catch(() => {})
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


  // ── Quick gallery select ───────────────────────────────────────────────
  const selectFromGallery = (name: string) => {
    setSelectedGallery(name)
    setCharInput(name)
    setCharData({
      character_name: name, universe: 'Adventure',
      description: `${name} — ready for an epic adventure!`,
      visual_appearance: name, character_media_url: null,
    })
    // Clear ALL step 2 state so it always starts fresh
    setSceneDesc('')
    setShortStory('')
    setShortStoryMode(false)
    setShortStoryExpanding(false)
    setSelectedTheme(null)
    setSelectedArt(null)
    setSelectedLang('en')
    setIsPublic(false)
    setThemeCat('Fantasy')
    setThemeSearch('')
    setSceneError('')
    setGenError('')
    setGenerated(null)
    setGenStep(0)
    setGenTitle('')
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
      // Pass the art style selected in Step 1 — backend uses Recraft V3 with this style
      const res = await storiesApi.analyzeCharacter(name, stepOneArt)
      const data = res.data as any
      // Map character_image_url (backend field) → character_media_url (app field)
      const newChar: CharacterData = {
        character_name: data.character_name ?? name,
        universe:       data.universe ?? 'Adventure',
        description:    data.description ?? '',
        visual_appearance: data.visual_appearance ?? name,
        character_media_url: data.character_image_url ?? data.character_media_url ?? null,
      }
      setCharData(newChar)
      // ── Save to persistent gallery so it shows up next time ─────────────────────────
      if (newChar.character_media_url) {
        const saved: SavedChar = {
          name: newChar.character_name,
          imageUrl: newChar.character_media_url,
          emoji: '✨',
        }
        setSavedCharacters(prev => {
          // Deduplicate by name
          const filtered = prev.filter(c => c.name.toLowerCase() !== saved.name.toLowerCase())
          const updated = [saved, ...filtered]  // newest first
          AsyncStorage.setItem(SAVED_CHARS_KEY, JSON.stringify(updated)).catch(() => {})
          return updated
        })
      }
      // Lock in the art style from Step 1 so Step 4 is pre-selected
      setSelectedArt(stepOneArt)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setStep('scene')
    } catch { setCharError('Could not analyze character. Try a different name.') }
    finally { setCharLoading(false) }
  }, [charInput, stepOneArt])

  // ── Theme select — just pick, no AI background generation ────────────────
  const handleThemeSelect = useCallback((themeId: string) => {
    setSelectedTheme(themeId)
    setSceneError('')
    Haptics.selectionAsync()
  }, [])

  // ── Expand short story seed using Gemini ─────────────────────────────────
  const expandShortStory = useCallback(async () => {
    const seed = shortStory.trim()
    if (!seed) return
    if (badContent(seed)) { setSceneError(badContent(seed) ?? ''); return }
    const charName = charData?.character_name ?? charInput.trim() ?? 'the hero'
    setShortStoryExpanding(true)
    setSceneError('')
    try {
      const res = await storiesApi.expandStory(seed, charName, grade)
      setShortStory((res.data as any).story ?? seed)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (e: any) {
      setSceneError(e?.response?.data?.detail ?? 'Could not generate story. Try again.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally { setShortStoryExpanding(false) }
  }, [shortStory, charData, charInput, grade])

  // ── Scene validation ─────────────────────────────────────────────────────
  // Button enabled when: theme text ≥ 25 chars, OR shortStoryMode with ≥ 25 chars
  const sceneReady = shortStoryMode
    ? shortStory.trim().length >= 25
    : sceneDesc.trim().length >= 25

  const proceedScene = () => {
    if (!sceneReady) {
      setSceneError('Add at least 25 characters, or tap "AI Create Story" for help!')
      return
    }
    const err = badContent(sceneDesc) || badContent(shortStory)
    if (err) { setSceneError(err); return }
    setSceneError(''); setStep('language')
  }

  // ── Main generation (full pipeline — all images ready before result card) ──
  const generateStory = useCallback(async () => {
    const effectiveArt = selectedArt ?? stepOneArt ?? 'cartoon'
    if (!charData) return
    setIsGenerating(true); setGenStep(0); setGenError(''); setGenerated(null)

    // Cycle step labels every 10s — 7 steps covers ~70s of the ~90s generation
    genInterval.current = setInterval(() => {
      setGenStep(prev => Math.min(prev + 1, STORY_STEPS.length - 2))
    }, 10000)

    try {
      await storage.getString('readquest_student_id').then(sid => {
        if (sid) { storage.setString('readquest_student_id', sid) }
      })
      // Priority: short story paste > custom typed text > selected world card
      const effectiveTheme = shortStoryMode && shortStory.trim()
        ? shortStory.trim()
        : sceneDesc.trim() || selectedTheme || 'exciting adventure'
      const res = await storiesApi.generate(
        grade, effectiveTheme, charData.character_name,
        selectedLang, effectiveArt, isPublic,
        charData.character_media_url ?? undefined,
      )
      clearInterval(genInterval.current!)
      setGenStep(STORY_STEPS.length - 1)
      // Snap progress bar to 100% on completion
      Animated.timing(genProgressAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start()
      setGenerated({ id: (res.data as any).id, title: (res.data as any).title })
      setGenTitle((res.data as any).title ?? '')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (e: any) {
      clearInterval(genInterval.current!)
      setGenError(e?.response?.data?.detail ?? 'Generation failed. Try again.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally { setIsGenerating(false) }
  }, [charData, selectedTheme, selectedArt, stepOneArt, selectedLang, isPublic, grade, shortStoryMode, shortStory, sceneDesc, genProgressAnim])

  useEffect(() => () => { if (genInterval.current) clearInterval(genInterval.current) }, [])

  // ── Full reset — clears all state and returns to step 1 ─────────────────────
  const resetAll = useCallback(() => {
    setStep('character')
    setCharData(null)
    setCharInput('')
    setSelectedGallery('')
    setStepOneArt('cartoon')
    setSceneDesc('')
    setShortStory('')
    setShortStoryMode(false)
    setShortStoryExpanding(false)
    setSelectedTheme(null)
    setSelectedArt(null)
    setSelectedLang('en')
    setIsPublic(false)
    setThemeCat('Fantasy')
    setThemeSearch('')
    setSceneError('')
    setCharError('')
    setGenError('')
    setGenerated(null)
    setGenStep(0)
    setGenTitle('')
    setIsGenerating(false)
    setPageImageSlots([null, null, null, null, null])
    setImagesComplete(false)
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    scrollRef.current?.scrollTo({ y: 0, animated: false })
    Haptics.selectionAsync()
  }, [])

  // ── Reset every time the screen is focused — always start at step 1 ─────────
  useFocusEffect(useCallback(() => { resetAll() }, [resetAll]))

  // ── Poll for page images every 2s after story API returns ────────────────────
  // As each page's media_url is saved by the background task, it pops into its slot.
  useEffect(() => {
    if (!generated?.id || imagesComplete) return
    const storyId = generated.id
    const poll = async () => {
      try {
        // Use direct fetch (no dedup cache) so every poll gets fresh data
        const { data: { session: s } } = await (await import('../../src/lib/supabase')).supabase.auth.getSession()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (s?.user?.id) headers['X-Student-ID'] = s.user.id
        const res = await fetch(`${API_URL}/api/stories/${storyId}`, { headers })
        if (!res.ok) return
        const json = await res.json()
        const pages: any[] = json?.pages ?? []
        const slots = [...pages]
          .sort((a: any, b: any) => a.page_number - b.page_number)
          .slice(0, 5)
          .map((p: any) => {
            const url = p.media_url ?? null
            if (!url) return null
            return url.startsWith('http') ? url : `${API_URL}${url}`
          })
        while (slots.length < 5) slots.push(null)
        setPageImageSlots(slots as (string|null)[])
        // Complete when all 5 pages exist AND all available images are loaded
        // If a page has no image (null) but all 5 pages are present, still complete
        const allPagesPresent = pages.length >= 5
        const allImagesLoaded = slots.every(Boolean)
        if (allImagesLoaded || (allPagesPresent && slots.filter(Boolean).length >= 4)) {
          setImagesComplete(true)
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        }
      } catch { /* keep polling */ }
    }
    poll()
    pollRef.current = setInterval(poll, 2000)
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }, [generated?.id, imagesComplete])

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
        {/* 🗑 Clear button — visible when user has any progress */}
        {(step !== 'character' || !!charData || charInput.trim().length > 0) && (
          <TouchableOpacity
            onPress={resetAll}
            activeOpacity={0.75}
            style={{
              flexDirection:'row', alignItems:'center', gap:5,
              backgroundColor:'rgba(239,68,68,0.12)',
              borderRadius:20, paddingHorizontal:12, paddingVertical:7,
              borderWidth:1, borderColor:'rgba(239,68,68,0.3)',
              marginLeft:10,
            }}
          >
            <Text style={{ fontSize:12 }}>🗑️</Text>
            <Text style={{ color:'#ef4444', fontSize:12, fontWeight:'700' }}>Clear</Text>
          </TouchableOpacity>
        )}
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
          ref={scrollRef}
          style={{ flex:1 }}
          contentContainerStyle={{ padding:16, paddingBottom:120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── STEP 1: CHARACTER ── */}
          {step === 'character' && (
            <View>
              {/* Hero headline */}
              <Text style={{ color:'#fff', fontWeight:'900', fontSize:26, marginBottom:2 }}>Who's <Text style={{ color:'#B28CFF' }}>the Hero?</Text></Text>
              <Text style={{ color:'#8a7aaa', fontSize:13, marginBottom:14 }}>Pick any character — or even yourself!</Text>

              {/* Search input */}
              <View style={{ flexDirection:'row', gap:8, marginBottom:10 }}>
                <TextInput
                  value={charInput}
                  onChangeText={text => {
                    setCharInput(text)
                    // Clear stale portrait so old character doesn't show while user types
                    if (charData) { setCharData(null); setSelectedGallery('') }
                  }}
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

              {/* ── Art Style picker (Step 1) ── */}
              <Text style={{ color:'#6b5d80', fontSize:11, fontWeight:'700', marginBottom:8, letterSpacing:0.5 }}>
                🎨 ILLUSTRATION STYLE
              </Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:14 }}>
                {ART_STYLES.map(style => {
                  const isSelected = stepOneArt === style.id
                  return (
                    <TouchableOpacity
                      key={style.id}
                      onPress={() => { setStepOneArt(style.id); Haptics.selectionAsync() }}
                      style={{
                        flexDirection:'row', alignItems:'center', gap:6,
                        paddingHorizontal:12, paddingVertical:8, borderRadius:20,
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? '#B28CFF' : '#2a2a4a',
                        backgroundColor: isSelected ? 'rgba(178,140,255,0.15)' : '#1a1a35',
                      }}
                    >
                      <Text style={{ fontSize:16 }}>{style.emoji}</Text>
                      <Text style={{
                        color: isSelected ? '#B28CFF' : '#7a6a9a',
                        fontSize:12, fontWeight: isSelected ? '800' : '600',
                      }}>{style.label}</Text>
                    </TouchableOpacity>
                  )
                })}
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

              {/* ── Saved AI-generated characters — Accordion ── */}
              {savedCharacters.length > 0 && (
                <View style={{ marginBottom: 4 }}>
                  {/* Accordion header */}
                  <TouchableOpacity
                    onPress={toggleCreated}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                      backgroundColor: 'rgba(245,158,11,0.08)',
                      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
                      borderWidth: 1, borderColor: 'rgba(245,158,11,0.22)',
                      marginBottom: 2,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>✨</Text>
                    <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '800', letterSpacing: 0.5, flex: 1 }}>
                      YOUR CREATED HEROES
                    </Text>
                    <Text style={{ color: '#6b5d50', fontSize: 10, marginRight: 4 }}>long press to remove</Text>
                    <Animated.Text style={{
                      color: '#f59e0b', fontSize: 13, fontWeight: '700',
                      transform: [{ rotate: createdChevron.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) }],
                    }}>▾</Animated.Text>
                  </TouchableOpacity>

                  {/* Collapsible content */}
                  <Animated.View style={{
                    opacity: createdAnim,
                    overflow: 'hidden',
                    maxHeight: createdAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 2000] }),
                  }}>
                    <View style={{
                      flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start',
                      paddingTop: 8, paddingBottom: 4,
                    }}>
                      {savedCharacters.map(sc => (
                        <PortraitCircleUrl
                          key={sc.name}
                          char={sc}
                          selected={selectedGallery === sc.name}
                          onPress={() => {
                            setSelectedGallery(sc.name)
                            setCharInput(sc.name)
                            setCharData({
                              character_name: sc.name, universe: 'Original',
                              description: `${sc.name} — your created hero!`,
                              visual_appearance: sc.name,
                              character_media_url: sc.imageUrl,
                            })
                            setSelectedArt(stepOneArt)
                            setSceneDesc(''); setShortStory(''); setShortStoryMode(false)
                            setShortStoryExpanding(false); setSelectedTheme(null)
                            setSelectedLang('en'); setIsPublic(false); setThemeCat('Fantasy')
                            setThemeSearch(''); setSceneError(''); setGenError(''); setGenerated(null)
                            setGenStep(0); setGenTitle('')
                            Haptics.selectionAsync()
                            setTimeout(() => setStep('scene'), 200)
                          }}
                          onLongPress={() => {
                            setSavedCharacters(prev => {
                              const updated = prev.filter(c => c.name !== sc.name)
                              AsyncStorage.setItem(SAVED_CHARS_KEY, JSON.stringify(updated)).catch(() => {})
                              return updated
                            })
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
                          }}
                        />
                      ))}
                    </View>
                  </Animated.View>
                </View>
              )}

              {/* ── Starter Heroes — Accordion ── */}
              <View style={{ marginBottom: 4 }}>
                {/* Accordion header */}
                <TouchableOpacity
                  onPress={toggleStarter}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: 'rgba(112,42,225,0.08)',
                    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
                    borderWidth: 1, borderColor: 'rgba(112,42,225,0.2)',
                    marginBottom: 2,
                  }}
                >
                  <Text style={{ fontSize: 14 }}>🌟</Text>
                  <Text style={{ color: '#B28CFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.5, flex: 1 }}>
                    STARTER HEROES
                  </Text>
                  <Text style={{ color: '#6b5d80', fontSize: 10, marginRight: 4 }}>{ALL_CHARACTERS.length} heroes</Text>
                  <Animated.Text style={{
                    color: '#B28CFF', fontSize: 13, fontWeight: '700',
                    transform: [{ rotate: starterChevron.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) }],
                  }}>▾</Animated.Text>
                </TouchableOpacity>

                {/* Collapsible content */}
                <Animated.View style={{
                  opacity: starterAnim,
                  overflow: 'hidden',
                  maxHeight: starterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4000] }),
                }}>
                  <View style={{
                    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start',
                    paddingTop: 8,
                  }}>
                    {ALL_CHARACTERS.map(char => (
                      <PortraitCircle
                        key={char.name}
                        char={char}
                        selected={selectedGallery === char.name}
                        onPress={() => selectFromGallery(char.name)}
                      />
                    ))}
                  </View>
                </Animated.View>
              </View>

              {charError ? <Text style={{ color:'#ef4444', fontSize:13, marginTop:8 }}>{charError}</Text> : null}
            </View>
          )}

          {/* ── STEP 2: WORLD — Cinematic layout matching web design ── */}
          {step === 'scene' && (
            <View style={{ flex: 1 }}>

              {/* ── Character preview card (replaces AI background hero) ── */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                backgroundColor: selectedTheme
                  ? (THEMES.find(t => t.id === selectedTheme)?.bg ?? '#1a1a35') + 'cc'
                  : '#120d2e',
                borderRadius: 20, padding: 14, marginBottom: 14,
                borderWidth: 1, borderColor: 'rgba(178,140,255,0.25)',
              }}>
                {/* Character portrait */}
                <View style={{ width: 80, height: 80, borderRadius: 40, overflow: 'hidden', borderWidth: 2, borderColor: '#702AE1' }}>
                  <Image
                    source={(() => {
                      const sc = ALL_CHARACTERS.find(c => c.name === charData?.character_name)
                      if (sc) return sc.img as any
                      if (charData?.character_media_url) return { uri: charData.character_media_url }
                      return ALL_CHARACTERS[0].img as any
                    })()}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    contentPosition={{ top: '10%' }}
                  />
                </View>
                {/* Name + theme */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 17 }}>
                    {charData?.character_name ?? 'Your Hero'}
                  </Text>
                  {selectedTheme ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Text style={{ fontSize: 13 }}>{THEMES.find(t => t.id === selectedTheme)?.emoji}</Text>
                      <Text style={{ color: '#B28CFF', fontSize: 12, fontWeight: '700' }}>
                        {THEMES.find(t => t.id === selectedTheme)?.label}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ color: '#4a3a6a', fontSize: 12, marginTop: 4 }}>Pick a world below 👇</Text>
                  )}
                  {selectedChild && (
                    <Text style={{ color: '#6b5d80', fontSize: 11, marginTop: 2 }}>Grade {grade} · {selectedChild.name}</Text>
                  )}
                </View>
                {/* AI badge */}
                <View style={{ backgroundColor: 'rgba(112,42,225,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(112,42,225,0.4)' }}>
                  <Text style={{ color: '#B28CFF', fontSize: 10, fontWeight: '800' }}>🤖 AI</Text>
                </View>
              </View>


              {/* ── Theme / Story Input ── */}
              <View style={{ backgroundColor: 'rgba(15,10,35,0.95)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(112,42,225,0.2)' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, marginBottom: 4 }}>✏️ What's the story about?</Text>
                <Text style={{ color: '#6b5d80', fontSize: 12, marginBottom: 12 }}>Type any theme — the AI will build a full illustrated story around it.</Text>

                <TextInput
                  value={sceneDesc} onChangeText={setSceneDesc}
                  placeholder='e.g. "A dragon guarding a lost city…"'
                  placeholderTextColor="#3a3a5a"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={{
                    backgroundColor: '#1a1a35', borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: sceneDesc.trim().length >= 25 ? '#702AE1' : sceneDesc.trim() ? '#f59e0b' : '#2a2a4a',
                    color: '#fff', fontSize: 14, padding: 12,
                    minHeight: 80, lineHeight: 20, marginBottom: 6,
                  }}
                />
                {/* Char count + AI button row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{
                    fontSize: 11,
                    color: sceneDesc.trim().length >= 25 ? '#22c55e' : sceneDesc.trim().length > 0 ? '#f59e0b' : '#3a3a5a',
                  }}>
                    {sceneDesc.trim().length > 0
                      ? sceneDesc.trim().length >= 25
                        ? `✓ ${sceneDesc.trim().length} chars — ready!`
                        : `${sceneDesc.trim().length}/25 chars needed`
                      : '25 characters minimum'}
                  </Text>
                  {/* ✨ AI Create Story — available as soon as user has typed anything */}
                  {!shortStoryMode && (
                    <TouchableOpacity
                      onPress={async () => {
                        const seed = sceneDesc.trim() || 'a magical adventure'
                        const charName = charData?.character_name ?? 'the hero'
                        setShortStoryExpanding(true)
                        setSceneError('')
                        try {
                          const res = await storiesApi.expandStory(seed, charName, grade)
                          const expanded = (res.data as any).story ?? seed
                          setSceneDesc(expanded)
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                        } catch (e: any) {
                          setSceneError(e?.response?.data?.detail ?? 'Could not expand. Try again.')
                        } finally { setShortStoryExpanding(false) }
                      }}
                      disabled={shortStoryExpanding}
                      activeOpacity={0.85}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 5,
                        backgroundColor: shortStoryExpanding ? '#2a1a4a' : 'rgba(112,42,225,0.85)',
                        borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
                        borderWidth: 1, borderColor: '#9d6ee8',
                      }}
                    >
                      {shortStoryExpanding
                        ? <ActivityIndicator size="small" color="#B28CFF" />
                        : <Text style={{ fontSize: 12 }}>✨</Text>}
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>
                        {shortStoryExpanding ? 'Creating…' : 'AI Create Story'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {/* ── Paste Your Own Story ── */}
                <View style={{
                  marginTop: 18, borderTopWidth: 1, borderTopColor: '#2a2a4a', paddingTop: 16,
                }}>
                  {/* Toggle header */}
                  <TouchableOpacity
                    onPress={() => { setShortStoryMode(prev => !prev); setShortStory(''); setSceneError('') }}
                    activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                  >
                    <View style={{
                      width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                      borderColor: shortStoryMode ? '#702AE1' : '#3a3a5a',
                      backgroundColor: shortStoryMode ? '#702AE1' : 'transparent',
                      alignItems: 'center', justifyContent: 'center', marginRight: 8,
                    }}>
                      {shortStoryMode && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>✓</Text>}
                    </View>
                    <Text style={{ color: shortStoryMode ? '#B28CFF' : '#6b5d80', fontSize: 13, fontWeight: '700' }}>
                      📖 Use my own story instead
                    </Text>
                  </TouchableOpacity>

                  {shortStoryMode && (
                    <View>
                      <Text style={{ color: '#6b5d80', fontSize: 11, marginBottom: 8, lineHeight: 16 }}>
                        Paste or type your story below. The AI will adapt it into 5 illustrated pages starring your chosen character.
                      </Text>
                      <TextInput
                        value={shortStory}
                        onChangeText={setShortStory}
                        placeholder="Once upon a time, in a land far away…"
                        placeholderTextColor="#3a3a5a"
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                        style={{
                          backgroundColor: '#0f0f28',
                          borderRadius: 12,
                          borderWidth: 1.5,
                          borderColor: shortStory.trim().length > 20 ? '#702AE1' : '#2a2a4a',
                          color: '#fff',
                          fontSize: 13,
                          padding: 13,
                          minHeight: 130,
                          lineHeight: 20,
                        }}
                      />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <Text style={{ color: shortStory.trim().length > 20 ? '#22c55e' : '#3a3a5a', fontSize: 11 }}>
                          {shortStory.trim().length > 0 ? `${shortStory.trim().length} characters` : 'Minimum 20 characters'}
                        </Text>
                        {shortStory.trim().length > 0 && (
                          <TouchableOpacity onPress={() => setShortStory('')}>
                            <Text style={{ color: '#6b5d80', fontSize: 11 }}>Clear ✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* ✨ AI Write It For Me button */}
                      <TouchableOpacity
                        onPress={expandShortStory}
                        activeOpacity={0.85}
                        disabled={shortStoryExpanding || shortStory.trim().length < 3}
                        style={{
                          marginTop: 12,
                          borderRadius: 12,
                          overflow: 'hidden',
                          opacity: shortStory.trim().length < 3 ? 0.4 : 1,
                        }}
                      >
                        <View style={{
                          backgroundColor: shortStoryExpanding ? '#2a1a4a' : '#702AE1',
                          borderRadius: 12,
                          padding: 13,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: '#9d6ee8',
                        }}>
                          {shortStoryExpanding ? (
                            <>
                              <ActivityIndicator size="small" color="#B28CFF" style={{ marginRight: 8 }} />
                              <Text style={{ color: '#B28CFF', fontWeight: '700', fontSize: 14 }}>Writing your story…</Text>
                            </>
                          ) : (
                            <>
                              <Text style={{ fontSize: 16, marginRight: 8 }}>✨</Text>
                              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                                {shortStory.trim().length > 100 ? 'Rewrite with AI' : 'AI Write It For Me'}
                              </Text>
                            </>
                          )}
                        </View>
                      </TouchableOpacity>
                      {shortStory.trim().length >= 3 && shortStory.trim().length < 100 && !shortStoryExpanding && (
                        <Text style={{ color: '#4a3a6a', fontSize: 10, marginTop: 5, textAlign: 'center' }}>
                          Type a short idea above, tap to let AI write the full story ✨
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {sceneError ? <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{sceneError}</Text> : null}
              </View>

              {/* CTA — disabled until 25 chars typed or AI created */}
              <TouchableOpacity
                onPress={sceneReady ? proceedScene : () => setSceneError('Type at least 25 characters about your story, or tap \"AI Create Story\"!')}
                activeOpacity={sceneReady ? 0.85 : 1}
                style={{
                  backgroundColor: sceneReady ? '#702AE1' : '#1a1a35',
                  borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 14,
                  borderWidth: 1.5,
                  borderColor: sceneReady ? '#9d6ee8' : '#2a2a4a',
                  opacity: sceneReady ? 1 : 0.55,
                }}
              >
                <Text style={{ color: sceneReady ? '#fff' : '#4a3a6a', fontWeight: '900', fontSize: 16 }}>
                  {sceneReady ? 'Next: Language →' : 'Write your story to continue ✏️'}
                </Text>
              </TouchableOpacity>

              {/* Back */}
              <TouchableOpacity onPress={() => setStep('character')} style={{ alignItems: 'center', paddingVertical: 12 }}>
                <Text style={{ color: '#6b5d80', fontSize: 13 }}>← Back</Text>
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
              <TouchableOpacity
                onPress={() => {
                  // Use the art style already picked in Step 1 (or default to cartoon)
                  const art = selectedArt ?? stepOneArt ?? 'cartoon'
                  setSelectedArt(art)
                  setIsGenerating(true)
                  setGenStep(0)
                  setGenError('')
                  setGenerated(null)
                  setStep('preview')
                  setTimeout(() => generateStory(), 80)
                }}
                style={{ backgroundColor:'#702AE1', borderRadius:14, padding:15, alignItems:'center', marginTop:20 }}
              >
                <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>✨ Create My Story!</Text>
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
                onPress={() => {
                  // Set generating FIRST so the preview step opens with the spinner visible
                  setIsGenerating(true)
                  setGenStep(0)
                  setGenError('')
                  setGenerated(null)
                  setStep('preview')
                  generateStory()
                }}
                disabled={!selectedArt}
                style={{ backgroundColor: selectedArt ? '#702AE1' : '#2a2a4a', borderRadius:14, padding:15, alignItems:'center', marginTop:16 }}>
                <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>✨ Generate My Story!</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 5: PREVIEW / GENERATING ── */}
          {step === 'preview' && (
            <View style={{ alignItems: 'center' }}>
              {(isGenerating || (generated && !imagesComplete)) ? (
                // ── Cinematic loader with live image reveal ────────────────
                <View style={{ width: '100%', minHeight: 540, justifyContent: 'center' }}>

                  {/* Dark bg */}
                  <View style={{ position: 'absolute', top: -20, left: -20, right: -20, bottom: -20, backgroundColor: '#07041a' }} />

                  {/* ── Character + title ── */}
                  <View style={{ alignItems: 'center', marginBottom: 16 }}>
                    <Animated.View style={{
                      position: 'absolute', width: 170, height: 170, borderRadius: 85,
                      backgroundColor: '#702AE1', opacity: 0.12,
                      transform: [{ scale: pulseAnim }],
                    }} />
                    <Animated.View style={{
                      width: 154, height: 154, borderRadius: 77, position: 'absolute',
                      borderWidth: 2.5,
                      borderTopColor: '#a855f7', borderRightColor: '#702AE1',
                      borderBottomColor: 'transparent', borderLeftColor: 'transparent',
                      transform: [{ rotate: spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
                    }} />
                    <View style={{ width: 130, height: 130, alignItems: 'center', justifyContent: 'center' }}>
                      <Image
                        source={(() => {
                          const sc = ALL_CHARACTERS.find(c => c.name === charData?.character_name)
                          if (sc) return sc.img as any
                          if (charData?.character_media_url) return { uri: charData.character_media_url }
                          return ALL_CHARACTERS[0].img as any
                        })()}
                        style={{ width: 130, height: 130 }}
                        contentFit="contain"
                      />
                    </View>
                  </View>

                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 20, textAlign: 'center', marginBottom: 2, fontStyle: 'italic' }}>
                    {genTitle || `${charData?.character_name}'s Adventure`}
                  </Text>
                  <Text style={{ color: '#6040a0', fontSize: 10, fontWeight: '800', textAlign: 'center', letterSpacing: 2, marginBottom: 20, textTransform: 'uppercase' }}>
                    ✦ PAINTING YOUR STORY
                  </Text>

                  {/* ── 5 live image boxes ── */}
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                    {pageImageSlots.map((url, i) => {
                      const isActive = !url && pageImageSlots.slice(0, i).every(Boolean)
                      return (
                        <View
                          key={i}
                          style={{
                            width: 58, height: 72, borderRadius: 12, overflow: 'hidden',
                            backgroundColor: url ? '#000' : isActive ? 'rgba(112,42,225,0.2)' : 'rgba(255,255,255,0.04)',
                            borderWidth: 2,
                            borderColor: url ? '#a855f7' : isActive ? '#702AE1' : '#1e1a3a',
                          }}
                        >
                          {url ? (
                            <Image
                              source={{ uri: url }}
                              style={{ width: '100%', height: '100%' }}
                              contentFit="cover"
                            />
                          ) : isActive ? (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                              <ActivityIndicator size="small" color="#B28CFF" />
                              <Text style={{ color: '#6040a0', fontSize: 8, marginTop: 4 }}>p.{i+1}</Text>
                            </View>
                          ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ color: '#2a2050', fontSize: 13 }}>○</Text>
                              <Text style={{ color: '#2a2050', fontSize: 8, marginTop: 2 }}>p.{i+1}</Text>
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>

                  {/* Image counter */}
                  <Text style={{ color: '#4a3a6a', fontSize: 11, textAlign: 'center', marginBottom: 18 }}>
                    {(() => {
                      const done = pageImageSlots.filter(Boolean).length
                      if (isGenerating && done === 0) return 'Writing story…'
                      if (done === 5) return '✓ All 5 scenes painted!'
                      return `Painting scene ${done + 1} of 5…`
                    })()}
                  </Text>

                  {/* ── Segmented progress bar — 5 blocks ── */}
                  <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>
                    {[0,1,2,3,4].map(i => {
                      const filled = pageImageSlots[i] != null
                      const active = !filled && pageImageSlots.slice(0, i).every(Boolean)
                      return (
                        <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          {filled ? (
                            <View style={{ flex: 1, backgroundColor: '#7c3aed', borderRadius: 4 }} />
                          ) : active ? (
                            <Animated.View style={{
                              flex: 1, borderRadius: 4, backgroundColor: 'rgba(112,42,225,0.45)',
                            }}>
                              {/* Shimmer sweep on active block */}
                              <Animated.View style={{
                                position: 'absolute', top: 0, bottom: 0, width: 30,
                                backgroundColor: 'rgba(196,148,255,0.6)',
                                transform: [{ translateX: spinAnim.interpolate({ inputRange: [0,1], outputRange: [-30, 80] }) }],
                              }} />
                            </Animated.View>
                          ) : null}
                        </View>
                      )
                    })}
                  </View>
                  <Text style={{ color: '#2a1a50', fontSize: 10, textAlign: 'center' }}>
                    {pageImageSlots.filter(Boolean).length}/5 scenes complete
                  </Text>
                </View>
              ) : generated ? (
                <View style={{ width: '100%', minHeight: 480, borderRadius: 20, overflow: 'hidden', marginVertical: 8 }}>

                  {/* Solid dark cinematic background */}
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1a0a3c' }} />

                  {/* Dark cinematic vignette overlay */}
                  <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(8,4,24,0.45)',
                  }} />

                  {/* Layout: character left + glass card right */}
                  <View style={{ flexDirection: 'row', minHeight: 480, alignItems: 'flex-end' }}>

                    {/* LEFT — character transparent, overflows card top */}
                    <View style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingBottom: 0,
                      overflow: 'visible',
                      // Extend above card so character stands tall
                      marginTop: -80,
                    }}>
                      <Image
                        source={(() => {
                          const sc = ALL_CHARACTERS.find(c => c.name === charData?.character_name)
                          if (sc) return sc.img as any
                          if (charData?.character_media_url) return { uri: charData.character_media_url }
                          return ALL_CHARACTERS[0].img as any
                        })()}
                        style={{ width: 200, height: 400 }}
                        contentFit="contain"
                      />
                      {/* Name plate */}
                      <Text style={{
                        color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '800',
                        letterSpacing: 2, textTransform: 'uppercase',
                        textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 8,
                        marginBottom: 12, marginTop: 4,
                      }}>
                        {charData?.character_name}
                      </Text>
                    </View>

                    {/* RIGHT — frosted glass card */}
                    <View style={{
                      flex: 1.1, margin: 14, marginLeft: 0,
                      backgroundColor: 'rgba(20,12,45,0.82)',
                      borderRadius: 20,
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                      padding: 18,
                      shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20,
                      shadowOffset: { width: 0, height: 8 }, elevation: 16,
                    }}>

                      {/* Dynamic badge — shows gen progress vs ready state */}
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        backgroundColor: imagesComplete ? 'rgba(34,197,94,0.2)' : 'rgba(112,42,225,0.2)',
                        borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                        alignSelf: 'flex-start', marginBottom: 12,
                        borderWidth: 1, borderColor: imagesComplete ? 'rgba(34,197,94,0.4)' : 'rgba(168,85,247,0.4)',
                      }}>
                        {!imagesComplete && <ActivityIndicator size="small" color="#B28CFF" style={{ marginRight: 2 }} />}
                        {imagesComplete && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' }} />}
                        <Text style={{ color: imagesComplete ? '#22c55e' : '#B28CFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>
                          {imagesComplete ? 'STORY READY!' : `PAINTING SCENES… ${pageImageSlots.filter(Boolean).length}/5`}
                        </Text>
                      </View>

                      {/* 5-image strip — taller so you can actually see the illustrations */}
                      <View style={{ flexDirection: 'row', gap: 5, marginBottom: 14 }}>
                        {pageImageSlots.map((url, i) => (
                          <View key={i} style={{
                            flex: 1, height: 90, borderRadius: 10, overflow: 'hidden',
                            backgroundColor: url ? 'rgba(20,10,40,0.8)' : 'rgba(255,255,255,0.05)',
                            borderWidth: 1, borderColor: url ? 'rgba(168,85,247,0.6)' : '#2a2050',
                          }}>
                            {url
                              ? <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                              : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                  {imagesComplete
                                    ? <Text style={{ fontSize: 20 }}>🖼️</Text>
                                    : <ActivityIndicator size="small" color="#3a2060" />
                                  }
                                </View>
                            }
                          </View>
                        ))}
                      </View>

                      {/* Story title */}
                      <Text style={{
                        color: '#fff', fontWeight: '900', fontSize: 22,
                        lineHeight: 28, marginBottom: 12,
                      }}>
                        {generated.title}
                      </Text>

                      {/* Tags row */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>📚 Grade {grade}</Text>
                        </View>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
                            🌐 {LANGUAGES.find(l => l.id === selectedLang)?.label ?? 'English'}
                          </Text>
                        </View>
                        {selectedArt && (
                          <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
                              {ART_STYLES.find(a => a.id === selectedArt)?.emoji} {ART_STYLES.find(a => a.id === selectedArt)?.label}
                            </Text>
                          </View>
                        )}
                        {selectedChild && (
                          <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>👤 {selectedChild.name}</Text>
                          </View>
                        )}
                      </View>

                      {/* Start Reading CTA — only unlocks when all images are ready */}
                      <TouchableOpacity
                        onPress={() => router.push(`/(app)/read/${generated.id}` as any)}
                        disabled={!imagesComplete}
                        activeOpacity={0.85}
                        style={{
                          backgroundColor: imagesComplete ? '#fff' : 'rgba(255,255,255,0.25)',
                          borderRadius: 14, paddingVertical: 13,
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                          gap: 6, marginBottom: 10,
                        }}
                      >
                        <Text style={{ color: '#0d0d1f', fontWeight: '900', fontSize: 15 }}>
                          {imagesComplete ? 'Start Reading!' : `Painting scenes… ${pageImageSlots.filter(Boolean).length}/5`}
                        </Text>
                        <Text style={{ color: '#0d0d1f', fontSize: 15, fontWeight: '900' }}>{imagesComplete ? '→' : '⏳'}</Text>
                      </TouchableOpacity>

                      {/* Back to Dashboard — ghost pill */}
                      <TouchableOpacity
                        onPress={() => router.push('/(app)/dashboard' as any)}
                        style={{
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                          gap: 6, paddingVertical: 12, paddingHorizontal: 20,
                          borderRadius: 50,
                          borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          marginBottom: 10,
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>←</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13, fontWeight: '600', letterSpacing: 0.3 }}>
                          Back to Dashboard
                        </Text>
                      </TouchableOpacity>

                      {/* Generate Another Story — glowing purple gradient pill */}
                      <TouchableOpacity
                        onPress={() => {
                          resetAll()
                          setGenTitle('')
                          // Scroll back to top so Step 1 is immediately visible
                          setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50)
                        }}
                        style={{
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                          gap: 7, paddingVertical: 12, paddingHorizontal: 22,
                          borderRadius: 50,
                          backgroundColor: 'rgba(112,42,225,0.22)',
                          borderWidth: 1, borderColor: 'rgba(168,85,247,0.5)',
                          shadowColor: '#a855f7',
                          shadowOpacity: 0.45,
                          shadowRadius: 12,
                          shadowOffset: { width: 0, height: 4 },
                          elevation: 8,
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={{ fontSize: 14 }}>✨</Text>
                        <Text style={{ color: '#d8b4fe', fontSize: 13, fontWeight: '700', letterSpacing: 0.4 }}>
                          Generate Another Story
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
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
              ) : (
                // Fallback: spinner shown immediately to avoid blank screen
                <View style={{ width: '100%', alignItems: 'center', paddingVertical: 60 }}>
                  <View style={{ alignItems: 'center', marginBottom: 28 }}>
                    <Animated.View style={{
                      width: 96, height: 96, borderRadius: 48,
                      borderWidth: 4,
                      borderTopColor: '#a855f7',
                      borderRightColor: '#702AE1',
                      borderBottomColor: 'transparent',
                      borderLeftColor: 'transparent',
                      transform: [{ rotate: spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
                    }} />
                  </View>
                  <Text style={{ color: '#a855f7', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>✦ STARTING…</Text>
                  <Text style={{ color: '#6b5d80', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                    Warming up the story engine…
                  </Text>
                </View>
              )}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
