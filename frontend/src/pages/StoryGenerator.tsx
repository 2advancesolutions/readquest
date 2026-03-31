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
import { removeBackground } from '../lib/removeBackground'
import StudentDropdown from '../components/StudentDropdown'
import '../styles/generator.css'
import '../styles/imm-steps.css'

/**
 * Resolves a character portrait URL to a renderable src string.
 * Handles 4 cases in priority order:
 *  1. data: URLs   — result of removeBackground() canvas processing, use as-is
 *  2. http(s): URLs — remote AI-generated/Supabase images, use as-is
 *  3. /char_icons/ — Vite public-folder local assets, use as-is
 *  4. /static/...  — backend-served paths, prepend VITE_API_URL
 */
function resolvePortraitSrc(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('data:'))         return url   // Canvas data URL from removeBackground
  if (url.startsWith('http'))          return url   // Remote URL (Supabase, fal.ai, etc.)
  if (url.startsWith('/char_icons/'))  return url   // Vite public folder asset
  return `${import.meta.env.VITE_API_URL}${url}`    // Backend /static/ path
}


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
  {
    id: 'cartoon',
    label: 'Cartoon',
    emoji: '🎨',
    img: '/icon_cartoon.webp',
    desc: 'Fun 2D illustrated look',
    flavor: 'Bright colors, bold outlines, playful & wholesome',
    badge: '⭐ Most Popular',
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    emoji: '🎬',
    img: '/icon_cinematic.webp',
    desc: 'Ultra-realistic cinematic action',
    flavor: 'Dramatic lighting, slow-motion moments, movie-quality',
    badge: '🔥 Action',
  },
  {
    id: 'pixar',
    label: 'Pixar / Animated',
    emoji: '🦄',
    img: '/icon_pixar.webp',
    desc: 'Stylized Pixar 3D animation',
    flavor: 'Heart + humor + emotion, exaggerated expressive motion',
    badge: '✨ Family',
  },
  {
    id: 'real',
    label: 'Realistic',
    emoji: '📸',
    img: '/icon_realistic.webp',
    desc: 'Gritty, photorealistic live-action',
    flavor: 'Rain, sparks, real stakes — every win is earned',
    badge: '💪 Intense',
  },
  {
    id: 'comic',
    label: 'Comic Book Style',
    emoji: '💥',
    img: '/icon_comic.webp',
    desc: 'Bold Marvel/DC comic book art',
    flavor: 'WHAM! ZZAP! Halftone dots, speed lines, iconic panels',
    badge: '🦸 Hero',
  },
  {
    id: 'epic',
    label: 'Epic Blockbuster',
    emoji: '⚡',
    img: '/icon_epic.webp',
    desc: 'Blockbuster trailer-style key art',
    flavor: 'Massive scale, explosions, bio-electric finale, sunset',
    badge: '🏆 Epic',
  },
]

// ─── 100 story worlds — each has a gradient background ─────────────────────
const THEME_OPTIONS = [
  // ── Fantasy ──────────────────────────────────────────────────────────────
  { id: 'magical rainbow forest',          label: 'Magic Forest',      emoji: '🌲', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#134e1b,#1a6b2a,#2d8a3e)' },
  { id: 'fantasy kingdom castle',          label: 'Fantasy Castle',    emoji: '🏰', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#3b1d6b,#5a2d9b,#7c3aed)' },
  { id: 'enchanted fairy village',         label: 'Fairy Village',     emoji: '🧚', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#6b1d5a,#9b2d80,#ec4899)' },
  { id: 'dragon mountain lair',            label: 'Dragon Mountain',   emoji: '🐉', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#6b1a00,#9b2d00,#c2410c)' },
  { id: 'enchanted mushroom forest',       label: 'Mushroom Grove',    emoji: '🍄', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#3d1a5c,#6b2fa0,#a855f7)' },
  { id: 'wizard magic school',             label: 'Magic Academy',     emoji: '🧙', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#1a1a5c,#2d3080,#4338ca)' },
  { id: 'unicorn rainbow meadow',          label: 'Unicorn Meadow',    emoji: '🦄', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#5c1a4a,#ec4899,#f9a8d4)' },
  { id: 'ancient magic ruins',             label: 'Ancient Ruins',     emoji: '🗿', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#3d2a00,#6b4a00,#92400e)' },
  { id: 'giant beanstalk sky castle',      label: 'Sky Castle',        emoji: '🌱', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#0c4a0a,#16a34a,#86efac)' },
  { id: 'talking animal village',          label: 'Animal Kingdom',    emoji: '🦊', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#4a2000,#7c3a00,#b45309)' },
  // ── Space ─────────────────────────────────────────────────────────────────
  { id: 'outer space adventure',           label: 'Space Explorer',    emoji: '🚀', cat: 'Space',     bg: 'linear-gradient(135deg,#050014,#0d0030,#1e0060)' },
  { id: 'alien planet civilization',       label: 'Alien Planet',      emoji: '👽', cat: 'Space',     bg: 'linear-gradient(135deg,#001a0d,#003320,#065f46)' },
  { id: 'moon base colony',               label: 'Moon Base',          emoji: '🌕', cat: 'Space',     bg: 'linear-gradient(135deg,#1c1c2e,#2d2d44,#4a4a6a)' },
  { id: 'supernova nebula cloud',          label: 'Nebula Galaxy',     emoji: '🌌', cat: 'Space',     bg: 'linear-gradient(135deg,#2d0050,#6b21a8,#9333ea)' },
  { id: 'asteroid mining belt',            label: 'Asteroid Belt',     emoji: '☄️', cat: 'Space',     bg: 'linear-gradient(135deg,#1a0a00,#3b1500,#6b2600)' },
  { id: 'space station zero gravity',      label: 'Space Station',     emoji: '🛸', cat: 'Space',     bg: 'linear-gradient(135deg,#000d1a,#001f3f,#003d82)' },
  { id: 'wormhole time jump',              label: 'Wormhole Jump',     emoji: '🌀', cat: 'Space',     bg: 'linear-gradient(135deg,#0a0050,#3730a3,#6366f1)' },
  { id: 'galactic senate planet',          label: 'Galactic Senate',   emoji: '⭐', cat: 'Space',     bg: 'linear-gradient(135deg,#0d0030,#4a1d96,#7c3aed)' },
  { id: 'saturn ring adventure',           label: 'Saturn Rings',      emoji: '🪐', cat: 'Space',     bg: 'linear-gradient(135deg,#4a2900,#b45309,#d97706)' },
  { id: 'robot planet future world',       label: 'Robot Planet',      emoji: '🤖', cat: 'Space',     bg: 'linear-gradient(135deg,#0d1117,#1e293b,#334155)' },
  // ── Ocean ─────────────────────────────────────────────────────────────────
  { id: 'under the ocean',                 label: 'Ocean Deep',        emoji: '🌊', cat: 'Ocean',     bg: 'linear-gradient(135deg,#001f3f,#003d82,#0055b3)' },
  { id: 'underwater mermaid kingdom',      label: 'Mermaid Cove',      emoji: '🧜', cat: 'Ocean',     bg: 'linear-gradient(135deg,#0a2b4a,#0e5a8a,#38bdf8)' },
  { id: 'underwater treasure cave',        label: 'Treasure Dive',     emoji: '💎', cat: 'Ocean',     bg: 'linear-gradient(135deg,#003322,#006644,#059669)' },
  { id: 'giant squid deep sea',            label: 'Deep Sea Monster',  emoji: '🦑', cat: 'Ocean',     bg: 'linear-gradient(135deg,#000d1a,#001a33,#003366)' },
  { id: 'coral reef paradise',             label: 'Coral Reef',        emoji: '🐠', cat: 'Ocean',     bg: 'linear-gradient(135deg,#0c4a4a,#065f6b,#0891b2)' },
  { id: 'pirate ship ocean battle',        label: 'Pirate Ship',       emoji: '⚓', cat: 'Ocean',     bg: 'linear-gradient(135deg,#1c1400,#3b2900,#6b4a00)' },
  { id: 'sunken city ruins underwater',    label: 'Sunken City',       emoji: '🏛️', cat: 'Ocean',     bg: 'linear-gradient(135deg,#0a1f3d,#143d6e,#1d6fa4)' },
  { id: 'whale whale watching adventure',  label: 'Whale Watch',       emoji: '🐳', cat: 'Ocean',     bg: 'linear-gradient(135deg,#001a3d,#003380,#0050c8)' },
  { id: 'sea turtle island lagoon',        label: 'Turtle Lagoon',     emoji: '🐢', cat: 'Ocean',     bg: 'linear-gradient(135deg,#002b1a,#005e37,#059669)' },
  { id: 'beach island paradise',           label: 'Tropical Island',   emoji: '🏝️', cat: 'Ocean',     bg: 'linear-gradient(135deg,#005e7a,#0891b2,#38bdf8)' },
  // ── Adventure ─────────────────────────────────────────────────────────────
  { id: 'pirate treasure hunt',            label: 'Pirate Quest',      emoji: '🏴‍☠️', cat: 'Adventure', bg: 'linear-gradient(135deg,#1a0f00,#4a2700,#7c4500)' },
  { id: 'safari africa animals',           label: 'Safari Trek',       emoji: '🦒', cat: 'Adventure', bg: 'linear-gradient(135deg,#4a2800,#8a5200,#d97706)' },
  { id: 'mountain climbing expedition',    label: 'Mountain Trek',     emoji: '⛰️', cat: 'Adventure', bg: 'linear-gradient(135deg,#1a3040,#2d4d63,#4a7a8a)' },
  { id: 'jungle with wild animals',        label: 'Wild Jungle',       emoji: '🦁', cat: 'Adventure', bg: 'linear-gradient(135deg,#0a2a00,#1a5c00,#2d8a00)' },
  { id: 'superhero city rescue',           label: 'Superhero City',    emoji: '🦸', cat: 'Adventure', bg: 'linear-gradient(135deg,#0d0030,#1a0060,#3b00c8)' },
  { id: 'racing cars championship',        label: 'Race Day',          emoji: '🏎️', cat: 'Adventure', bg: 'linear-gradient(135deg,#3d0000,#800000,#cc0000)' },
  { id: 'ninja training dojo',             label: 'Ninja Dojo',        emoji: '🥷', cat: 'Adventure', bg: 'linear-gradient(135deg,#0d0d0d,#1a1a1a,#2d2d2d)' },
  { id: 'spy secret mission world',        label: 'Secret Mission',    emoji: '🕵️', cat: 'Adventure', bg: 'linear-gradient(135deg,#0a1a0a,#1a3a1a,#0f5f0f)' },
  { id: 'treasure map desert journey',     label: 'Desert Quest',      emoji: '🗺️', cat: 'Adventure', bg: 'linear-gradient(135deg,#4a2900,#8a5a00,#c27a00)' },
  { id: 'lost city jungle expedition',     label: 'Lost City',         emoji: '🏺', cat: 'Adventure', bg: 'linear-gradient(135deg,#1a3300,#2d5c00,#3f8000)' },
  // ── Nature ────────────────────────────────────────────────────────────────
  { id: 'friendly dinosaur park',          label: 'Dino World',        emoji: '🦕', cat: 'Nature',    bg: 'linear-gradient(135deg,#0a3300,#1a5c00,#2d8000)' },
  { id: 'icy arctic polar bears',          label: 'Arctic Ice',        emoji: '🐻‍❄️', cat: 'Nature',    bg: 'linear-gradient(135deg,#0a2040,#1a3d6b,#2b6cb0)' },
  { id: 'volcano island lava adventure',   label: 'Volcano Isle',      emoji: '🌋', cat: 'Nature',    bg: 'linear-gradient(135deg,#3d0000,#7a0a00,#c0280a)' },
  { id: 'rainforest amazon wildlife',      label: 'Amazon Rainforest', emoji: '🌿', cat: 'Nature',    bg: 'linear-gradient(135deg,#002b00,#005c00,#008000)' },
  { id: 'snowy mountain winter wonder',    label: 'Winter Wonderland', emoji: '❄️', cat: 'Nature',    bg: 'linear-gradient(135deg,#1a2a4a,#2d4a7a,#6b9ac4)' },
  { id: 'autumn harvest pumpkin farm',     label: 'Harvest Farm',      emoji: '🎃', cat: 'Nature',    bg: 'linear-gradient(135deg,#4a1e00,#8a3d00,#b86000)' },
  { id: 'underwater kelp forest',          label: 'Kelp Forest',       emoji: '🌾', cat: 'Nature',    bg: 'linear-gradient(135deg,#002b1a,#005c37,#008055)' },
  { id: 'spring flower garden blooms',     label: 'Flower Garden',     emoji: '🌸', cat: 'Nature',    bg: 'linear-gradient(135deg,#4a003d,#8a0070,#c800a8)' },
  { id: 'giant redwood forest ancient',    label: 'Redwood Forest',    emoji: '🌳', cat: 'Nature',    bg: 'linear-gradient(135deg,#1a0c00,#3d2000,#6b3800)' },
  { id: 'animal wildlife sanctuary',       label: 'Wildlife Sanctuary',emoji: '🦋', cat: 'Nature',    bg: 'linear-gradient(135deg,#003300,#006600,#009900)' },
  // ── Ancient ───────────────────────────────────────────────────────────────
  { id: 'ancient egypt pyramids pharaoh',  label: 'Ancient Egypt',     emoji: '🛕', cat: 'Ancient',   bg: 'linear-gradient(135deg,#4a2800,#8a5200,#bf8c00)' },
  { id: 'ancient rome colosseum warrior',  label: 'Ancient Rome',      emoji: '⚔️', cat: 'Ancient',   bg: 'linear-gradient(135deg,#3d1a00,#7a3a00,#b35c00)' },
  { id: 'viking norse mythology longship', label: 'Viking Saga',       emoji: '🪓', cat: 'Ancient',   bg: 'linear-gradient(135deg,#0d1a2a,#1a3040,#2d4d63)' },
  { id: 'samurai feudal japan village',    label: 'Samurai Japan',     emoji: '⛩️', cat: 'Ancient',   bg: 'linear-gradient(135deg,#3d0000,#7a0a00,#c01010)' },
  { id: 'aztec mayan pyramid jungle',      label: 'Aztec Temple',      emoji: '🏛️', cat: 'Ancient',   bg: 'linear-gradient(135deg,#1a3300,#2d5c00,#3d7a00)' },
  { id: 'ancient greek olympus gods',      label: 'Mount Olympus',     emoji: '⚡', cat: 'Ancient',   bg: 'linear-gradient(135deg,#1a1a3d,#2d2d80,#4040c0)' },
  { id: 'medieval knight tournament',      label: 'Medieval Kingdom',  emoji: '🛡️', cat: 'Ancient',   bg: 'linear-gradient(135deg,#1a0f2a,#2d1a4a,#4a2d7a)' },
  { id: 'ancient china dynasty palace',    label: 'Imperial China',    emoji: '🐼', cat: 'Ancient',   bg: 'linear-gradient(135deg,#4a0000,#8a0000,#cc0000)' },
  { id: 'atlantis lost island civilization',label: 'Atlantis',         emoji: '🌐', cat: 'Ancient',   bg: 'linear-gradient(135deg,#002244,#003d80,#0055c0)' },
  { id: 'ancient inca mountain city',      label: 'Inca Citadel',      emoji: '🦅', cat: 'Ancient',   bg: 'linear-gradient(135deg,#2a1500,#5a2d00,#8a4500)' },
  // ── Future ────────────────────────────────────────────────────────────────
  { id: 'robot factory future world',      label: 'Robot World',       emoji: '🤖', cat: 'Future',    bg: 'linear-gradient(135deg,#0d1117,#1e293b,#334155)' },
  { id: 'time travel history adventure',   label: 'Time Travel',       emoji: '⏰', cat: 'Future',    bg: 'linear-gradient(135deg,#1a0044,#3d00b3,#6600ff)' },
  { id: 'futuristic neon cyber city',      label: 'Cyber City',        emoji: '🏙️', cat: 'Future',    bg: 'linear-gradient(135deg,#001a3d,#003380,#0055c8)' },
  { id: 'hologram virtual reality world',  label: 'VR Hologram World', emoji: '🥽', cat: 'Future',    bg: 'linear-gradient(135deg,#001a3d,#0033a0,#00aaff)' },
  { id: 'underwater dome future city',     label: 'Future Dome City',  emoji: '🔬', cat: 'Future',    bg: 'linear-gradient(135deg,#001a4a,#003399,#0055ee)' },
  { id: 'flying cars skyway city',         label: 'Skyway City',       emoji: '🚁', cat: 'Future',    bg: 'linear-gradient(135deg,#0d0030,#220080,#4400cc)' },
  { id: 'quantum computer brain world',    label: 'Quantum World',     emoji: '💻', cat: 'Future',    bg: 'linear-gradient(135deg,#001a2a,#003d6b,#0070c0)' },
  { id: 'genetic lab dna scientist',       label: 'Science Lab',       emoji: '🧬', cat: 'Future',    bg: 'linear-gradient(135deg,#001a00,#003300,#00660a)' },
  { id: 'ai city robot companions',        label: 'AI City',           emoji: '🦾', cat: 'Future',    bg: 'linear-gradient(135deg,#0a0a2e,#1a1a66,#2a2aaa)' },
  { id: 'space colony terraformed planet', label: 'New Earth',         emoji: '🌍', cat: 'Future',    bg: 'linear-gradient(135deg,#002b00,#005500,#008800)' },
  // ── Spooky ────────────────────────────────────────────────────────────────
  { id: 'haunted friendly ghost town',     label: 'Ghost Town',        emoji: '👻', cat: 'Spooky',    bg: 'linear-gradient(135deg,#0d0d0d,#1a0a2a,#2d1a4a)' },
  { id: 'friendly vampire castle night',   label: 'Vampire Castle',    emoji: '🧛', cat: 'Spooky',    bg: 'linear-gradient(135deg,#1a0000,#3d0000,#660000)' },
  { id: 'zombie abandoned city fun',       label: 'Zombie Town',       emoji: '🧟', cat: 'Spooky',    bg: 'linear-gradient(135deg,#0a1a00,#1a3300,#005500)' },
  { id: 'witch forest potion cauldron',    label: 'Witch Forest',      emoji: '🧙‍♀️', cat: 'Spooky',    bg: 'linear-gradient(135deg,#0d0020,#1a0040,#2d0066)' },
  { id: 'haunted carnival fun house',      label: 'Haunted Carnival',  emoji: '🎪', cat: 'Spooky',    bg: 'linear-gradient(135deg,#2a0040,#4a0070,#6600a8)' },
  { id: 'mystery detective foggy city',    label: 'Mystery Fog City',  emoji: '🔍', cat: 'Spooky',    bg: 'linear-gradient(135deg,#0d1a1a,#1a3030,#2d4a4a)' },
  { id: 'monster school friendly',         label: 'Monster School',    emoji: '👾', cat: 'Spooky',    bg: 'linear-gradient(135deg,#1a0030,#3d0070,#6600b8)' },
  { id: 'dark forest firefly magic night', label: 'Firefly Night',     emoji: '✨', cat: 'Spooky',    bg: 'linear-gradient(135deg,#001a00,#003300,#004d00)' },
  { id: 'pirate ghost ship ocean mist',    label: 'Ghost Ship',        emoji: '🚢', cat: 'Spooky',    bg: 'linear-gradient(135deg,#0d1a2a,#1a3040,#1f4060)' },
  { id: 'abandoned toy factory magic',     label: 'Toy Factory',       emoji: '🪆', cat: 'Spooky',    bg: 'linear-gradient(135deg,#1a0a00,#3d1a00,#662a00)' },
  // ── Seasonal ──────────────────────────────────────────────────────────────
  { id: 'enchanted candy land',            label: 'Candy Kingdom',     emoji: '🍭', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#4a003d,#8c0080,#cc44bb)' },
  { id: 'christmas north pole santa',      label: 'North Pole',        emoji: '🎅', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#001a3d,#003399,#cc0000)' },
  { id: 'halloween pumpkin spooky village',label: 'Halloween Town',    emoji: '🎃', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#1a0000,#3d0800,#6b1800)' },
  { id: 'summer beach surfing fun',        label: 'Summer Beach',      emoji: '🏄', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#003d7a,#0070cc,#009fff)' },
  { id: 'spring cherry blossom japan',     label: 'Cherry Blossom',    emoji: '🌸', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#4a0040,#8a1070,#d44da0)' },
  { id: 'thanksgiving harvest festival',   label: 'Harvest Festival',  emoji: '🦃', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#3d1a00,#7a3800,#b86000)' },
  { id: 'new year fireworks celebration',  label: 'New Year Gala',     emoji: '🎆', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#0d003d,#2200a0,#4400ff)' },
  { id: 'valentines love heart world',     label: 'Valentine World',   emoji: '💖', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#4a0020,#8a003d,#cc0066)' },
  { id: 'cloud kingdom sky adventure',     label: 'Sky Kingdom',       emoji: '☁️', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#003366,#0055a8,#4488cc)' },
  { id: 'circus amazing big top show',     label: 'Big Top Circus',    emoji: '🎡', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#3d0020,#7a1040,#b84470)' },
]

const THEME_CATEGORIES = ['Fantasy', 'Space', 'Ocean', 'Adventure', 'Nature', 'Ancient', 'Future', 'Spooky', 'Seasonal']


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

type Step = 'character' | 'scene' | 'language' | 'artStyle' | 'preview'

interface CharacterData {
  character_name: string
  universe: string
  description: string
  visual_appearance: string   // precise visual string for image generation
  character_media_url: string | null
  scenes: { id: string; label: string; emoji: string; description: string; color: string }[]
}

const STEP_NUMS: Record<Step, number> = {
  character: 1, scene: 2, language: 3, artStyle: 4, preview: 5,
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

  // ── Kid-safe content check ────────────────────────────────────────────────
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


// ─── Cinematic Story Generating Loader ──────────────────────────────────────
const STORY_GENERATE_STEPS = [
  { icon: '✍️', label: 'Writing your story…',        sub: 'Crafting pages & plot twists' },
  { icon: '🎨', label: 'Designing each scene…',       sub: 'Painting every moment in detail' },
  { icon: '🖼️', label: 'Rendering illustrations…',    sub: 'Bringing your characters to life' },
  { icon: '🧩', label: 'Composing page layouts…',     sub: 'Arranging words & art together' },
  { icon: '🌟', label: 'Adding magic touches…',       sub: 'Polishing every little detail' },
  { icon: '📖', label: 'Finalizing your book…',       sub: 'Almost ready — hang tight!' },
]

interface StoryGeneratingLoaderProps {
  characterImgSrc: string
  backgroundImgSrc: string | null
  characterName: string
  storyTitle?: string
  stepIndex: number
}

function StoryGeneratingLoader({
  characterImgSrc, backgroundImgSrc, characterName, storyTitle, stepIndex,
}: StoryGeneratingLoaderProps) {
  const step = STORY_GENERATE_STEPS[stepIndex % STORY_GENERATE_STEPS.length]
  const progress = Math.min(98, (stepIndex / (STORY_GENERATE_STEPS.length - 1)) * 100)

  return (
    <motion.div
      className="sgl-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {backgroundImgSrc ? (
        <img src={backgroundImgSrc} className="sgl-bg-img" alt="" />
      ) : (
        <div className="sgl-bg-fallback" />
      )}
      <div className="sgl-bg-darken" />

      <div className="sgl-particles">
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className="sgl-particle" style={{
            left: `${(i * 5.7 + 3) % 100}%`,
            animationDelay: `${(i * 0.37).toFixed(2)}s`,
            animationDuration: `${2.4 + (i % 5) * 0.4}s`,
          }} />
        ))}
      </div>

      <div className="sgl-card">
        <div className="sgl-portrait-wrap">
          {characterImgSrc ? (
            <img src={characterImgSrc} alt={characterName} className="sgl-portrait" />
          ) : (
            <div className="sgl-portrait-placeholder">
              <span style={{ fontSize: 56 }}>🧙</span>
            </div>
          )}
          <div className="sgl-portrait-ring" />
        </div>

        <div className="sgl-text">
          <div className="sgl-book-label">✦ Creating your story</div>
          {storyTitle ? (
            <motion.h1 className="sgl-title"
              key={storyTitle}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              "{storyTitle}"
            </motion.h1>
          ) : (
            <h1 className="sgl-title sgl-title-placeholder">
              {characterName}'s Adventure
            </h1>
          )}
          <p className="sgl-char-name">{characterName}</p>

          <AnimatePresence mode="wait">
            <motion.div className="sgl-step-row" key={stepIndex}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.35 }}
            >
              <span className="sgl-step-icon">{step.icon}</span>
              <div>
                <div className="sgl-step-label">{step.label}</div>
                <div className="sgl-step-sub">{step.sub}</div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="sgl-progress-track">
            <motion.div className="sgl-progress-fill"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="sgl-progress-dots">
            {STORY_GENERATE_STEPS.map((_, i) => (
              <span key={i} className={`sgl-dot${i <= stepIndex ? ' sgl-dot-active' : ''}`} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
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
  const [charBgRemoving, setCharBgRemoving] = useState(false)  // true while waiting for server bg-removal
  const [sceneDescription, setSceneDescription] = useState('')
  const [sceneError, setSceneError] = useState('')
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [customTheme, setCustomTheme] = useState('')
  const customThemeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const charDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState('english')
  const [selectedArtStyle, setSelectedArtStyle] = useState<string | null>(null)
  const [tipIndex, setTipIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [genStepIndex, setGenStepIndex] = useState(0)
  const [genStoryTitle, setGenStoryTitle] = useState('')
  const [generatedStory, setGeneratedStory] = useState<{ id: string; title: string } | null>(null)
  const [generateError, setGenerateError] = useState('')

  // ── Theme Background — AI-generated live background for Step 2 ────────────
  const [themeBackground, setThemeBackground] = useState<string | null>(null)
  const [bgLoading, setBgLoading] = useState(false)   // background landscape generating
  const [portraitLoading, setPortraitLoading] = useState(false) // character scene portrait generating
  const bgAbortRef = useRef<AbortController | null>(null)
  const portraitAbortRef = useRef<AbortController | null>(null)

  // ── Theme picker filter state ─────────────────────────────────────────────
  const [themeSearch, setThemeSearch] = useState('')
  const [themeCat, setThemeCat] = useState('Fantasy')

  // Hero character — pick from a small curated seed pool of reliable images on mount
  // (Gallery hover or onVerified will update this dynamically)
  const RELIABLE_SEEDS = ['Luna Star', 'Leo the Lion', 'Sky Knight', 'Alice', 'Athena', 'Jade Dragon', 'Nova Scout']
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

  // ── Gallery quick-select — transitions to Step 2 and removes bg via API ───────────────────────────
  const handleGallerySelect = useCallback((name: string) => {
    const found = ALL_CHARACTERS.find(c => c.name === name)
    setCharacterInput(name)
    setAnalyzeError('')

    const galleryImg = found?.img ?? null

    // Set data immediately (no portrait yet — null triggers the loader on Step 2)
    setCharacterData({
      character_name: name,
      universe: found ? 'Adventure' : 'Original Story',
      description: `${name} — ready for an epic adventure!`,
      visual_appearance: found?.visualDesc ?? name,
      character_media_url: null,   // will be set after bg removal completes
      scenes: [],
    })
    if (found) { setHeroChar(found); setHoveredHeroSrc(null) }
    setSceneDescription('')
    setSelectedTheme(null)
    setThemeBackground(null)
    setStep('scene')

    // ── Server-side background removal ──────────────────────────────────────
    // Show loader on Step 2 while API removes the background.
    // Falls back to raw gallery image if the API fails.
    if (galleryImg) {
      setCharBgRemoving(true)
      storiesApi.removeBackground(galleryImg)
        .then(res => {
          const transparentUrl = res.data?.transparent_url
          setCharacterData(prev => prev
            ? { ...prev, character_media_url: transparentUrl ?? galleryImg }
            : prev
          )
        })
        .catch(() => {
          // Fallback — show original gallery image if bg removal fails
          setCharacterData(prev => prev
            ? { ...prev, character_media_url: galleryImg }
            : prev
          )
        })
        .finally(() => setCharBgRemoving(false))
    }

    // Fire analyze in background ONLY to enrich metadata (universe/description).
    // Never overwrite character_media_url — the gallery transparent portrait is authoritative.
    storiesApi.analyzeCharacter(name)
      .then(res => {
        const d = res.data
        setCharacterData(prev => prev ? ({
          ...prev,
          character_name: d.character_name ?? name,
          universe: d.universe ?? prev.universe ?? 'Adventure',
          description: d.description ?? prev.description ?? `${name} — ready for adventure!`,
          visual_appearance: prev.visual_appearance || d.visual_appearance || name,
          scenes: d.scenes ?? prev.scenes ?? [],
          // character_media_url intentionally NOT touched — gallery transparent portrait wins
        }) : prev)
      })
      .catch(() => { /* keep pre-populated data */ })
  }, [])

  const handleAnalyzeCharacter = async () => {
    if (!characterInput.trim()) { setAnalyzeError('Tell us your favorite character! 😊'); return }
    const blocked = validateContent(characterInput)
    if (blocked) { setAnalyzeError(blocked); return }
    setAnalyzeError(''); setCharLoading(true); setCharacterData(null)
    setSceneDescription('')
    // Stay on Step 1 — show the full-screen loader while character generates.
    // Only advance to Step 2 AFTER the API returns.
    let msgIdx = 0
    charMsgIntervalRef.current = setInterval(() => { msgIdx = (msgIdx + 1) % CHAR_LOADING_MSGS.length; setCharLoadingMsg(CHAR_LOADING_MSGS[msgIdx]) }, 3000)
    try {
      const res = await storiesApi.analyzeCharacter(characterInput.trim())
      const d = res.data
      const rawUrl = d.character_image_url ?? d.character_media_url ?? null
      // Remove white background from AI-generated portrait before displaying
      const transparentUrl = rawUrl ? await removeBackground(rawUrl) : null
      setCharacterData({
        character_name: d.character_name ?? characterInput.trim(),
        universe: d.universe ?? 'Original Story',
        description: d.description ?? `The amazing ${characterInput.trim()}!`,
        visual_appearance: d.visual_appearance ?? characterInput.trim(),
        character_media_url: transparentUrl,
        scenes: d.scenes ?? [],
      })
    } catch {
      setCharacterData({
        character_name: characterInput.trim(),
        universe: 'Original Story',
        description: `The amazing ${characterInput.trim()} — ready for a great adventure!`,
        visual_appearance: characterInput.trim(),
        character_media_url: null,
        scenes: [],
      })
    } finally {
      if (charMsgIntervalRef.current) clearInterval(charMsgIntervalRef.current)
      setCharLoading(false)
      // Now that character is ready, navigate to Step 2
      setStep('scene')
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
      const rawUrl = d.character_image_url ?? d.character_media_url ?? null
      // Remove white background from regenerated portrait
      const transparentUrl = rawUrl ? await removeBackground(rawUrl) : null
      setCharacterData(prev => prev ? {
        ...prev,
        character_media_url: transparentUrl,
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

  // Hide floating XP badge on this page — the header has its own logo
  useEffect(() => {
    document.body.classList.add('generator-active')
    return () => document.body.classList.remove('generator-active')
  }, [])


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

    // Capture the current gallery portrait so we can restore it if the API doesn't return one.
    // Gallery portrait = a /char_icons/ path or a data: URL from removeBackground.
    // We only clear it temporarily to show the loading indicator — it is NOT discarded.
    const galleryPortrait = characterData?.character_media_url ?? null
    const isGalleryPortrait = galleryPortrait
      && (galleryPortrait.startsWith('/char_icons/') || galleryPortrait.startsWith('data:'))

    // Temporarily clear portrait to trigger the loading indicator in the preview
    setCharacterData(prev => prev ? { ...prev, character_media_url: null } : prev)

    const theme = THEME_OPTIONS.find(t => t.id === selectedTheme)
    const label = theme?.label ?? selectedTheme
    const charName = (characterData?.character_name ?? characterInput.trim()) || undefined
    const sceneDetail = sceneDescription.trim() || undefined
    // Pass the precise visual description so the backend renders the correct character
    const visualDesc = characterData?.visual_appearance || undefined

    storiesApi.generateBackground(label, charName, sceneDetail, visualDesc)
      .then(res => {
        if (!ctrl.signal.aborted) {
          if (res.data?.background_url) setThemeBackground(res.data.background_url)
          // Prefer: if we had a locked gallery portrait, restore it (scene portrait is bonus context).
          // Otherwise use the freshly generated portrait from the API.
          const newPortrait = isGalleryPortrait ? galleryPortrait : (res.data?.portrait_url ?? galleryPortrait)
          setCharacterData(prev => prev
            ? { ...prev, character_media_url: newPortrait }
            : prev
          )
        }
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) {
          console.warn('[generate scene] failed (non-fatal):', err?.message)
          // Restore gallery portrait on error
          setCharacterData(prev => prev ? { ...prev, character_media_url: galleryPortrait } : prev)
        }
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
    if (!selectedTheme && !sceneDescription.trim()) { setSceneError('Pick a theme or describe a scene!'); return }
    setSceneError(''); setStep('language')
  }

  const handleGenerate = async () => {
    setIsGenerating(true); setGenerateError('')
    setGenStepIndex(0); setGenStoryTitle('')
    const charName = characterData?.character_name || characterInput.trim() || 'Your Hero'

    // Cycle through step messages every 8s so the loader feels alive
    let stepIdx = 0
    const stepInterval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, STORY_GENERATE_STEPS.length - 1)
      setGenStepIndex(stepIdx)
    }, 8000)

    try {
      const theme = getEffectiveTheme().trim() || 'exciting adventure'
      const headers: Record<string, string> = {}
      if (selectedChild) headers['X-Student-ID'] = selectedChild.id
      const res = await api.post('/stories/generate',
        {
          grade,
          theme,
          character_name: characterData?.character_name ?? characterInput,
          language: selectedLanguage,
          art_style: selectedArtStyle ?? 'cartoon',
          character_description: characterData?.visual_appearance ?? characterData?.description ?? undefined,
          character_universe: characterData?.universe ?? undefined,
          character_image_url: characterData?.character_media_url ?? undefined,
        },
        { timeout: 300000, headers },
      )
      const story = res.data
      // Update loader to show the real title before transitioning
      if (story.title) setGenStoryTitle(story.title)
      clearInterval(stepInterval)
      setGeneratedStory(story); setIsGenerating(false); setStep('preview')
    } catch (err: unknown) {
      clearInterval(stepInterval)
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Story generation failed. Please try again.'
      setGenerateError(msg); setIsGenerating(false)
    }
  }

  const currentNum = Math.min(STEP_NUMS[step], 4)

  // Right panel preview content
  const previewTheme = selectedTheme ?? (sceneDescription ? sceneDescription.slice(0, 30) : null)
  const previewChar = characterData?.character_name ?? characterInput
  const previewEmoji = THEME_OPTIONS.find(t => t.id === selectedTheme)?.emoji ?? '📖'

  return (
    <div className="gen-root">

      {/* ══ CINEMATIC GENERATION LOADER ══ */}
      <AnimatePresence>
        {isGenerating && (
          <StoryGeneratingLoader
            characterImgSrc={resolvePortraitSrc(characterData?.character_media_url)}
            backgroundImgSrc={themeBackground}
            characterName={characterData?.character_name || characterInput || 'Your Hero'}
            storyTitle={genStoryTitle}
            stepIndex={genStepIndex}
          />
        )}
      </AnimatePresence>

      <header className={`gen-header${['character','scene','language','artStyle','done','preview'].includes(step) ? ' gen-header-dark' : ''}`}>
        {/* Col 1 — left: back button */}
        <button className="gen-back-btn" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>

        {/* Col 2 — center: step progress */}
        <div className="gen-header-title">
          {step !== 'preview'
            ? `Step ${currentNum} of 4`
            : '🎉 Done!'}
        </div>

        {/* Col 3 — right: brand logo */}
        <div className="gen-header-logo-wrap">
          <div className="gen-header-logo">ReadQuest ✨</div>
          <div className="gen-header-subtitle">Story Creator</div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="gen-body">

        {/* ══ LEFT STEP NAV — hidden on all 4 immersive steps ══ */}
        {step !== 'preview' && !['character','scene','language','artStyle'].includes(step) && (
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
                <StudentDropdown
                  children={children}
                  selected={selectedChild}
                  onChange={(child) => setSelectedChild(child)}
                  allowAll={false}
                />
              </div>
            )}
          </aside>
        )}

        {/* ══ CENTER CONTENT ══ */}
        <div className={`gen-center${['character','scene','language','artStyle'].includes(step) ? ' gen-center-immersive' : ''}`}>
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
                      src={hoveredHeroSrc ?? heroChar.img ?? heroChar.emoji}
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
                        placeholder="e.g. Luna Star, Sky Knight, Jade Dragon, Nova Scout..."
                        value={characterInput}
                        onChange={e => {
                          const val = e.target.value
                          setCharacterInput(val)
                          if (analyzeError) setAnalyzeError('')
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

                    {/* Child selector in step 1 */}
                    {childrenLoaded && children.length > 0 && (
                      <div className="step1-child-row">
                        <StudentDropdown
                          children={children}
                          selected={selectedChild}
                          onChange={(child) => setSelectedChild(child)}
                          allowAll={false}
                          label="Story for:"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* ── GALLERY — full width below split ── */}
                <CharacterGallery
                  onSelect={handleGallerySelect}
                  onHoverChar={(name) => {
                      const ch = ALL_CHARACTERS.find(c => c.name === name)
                      setHoveredHeroSrc(ch?.img ?? ch?.emoji ?? null)
                    }}
                  onHoverLeave={() => setHoveredHeroSrc(null)}
                  onVerified={(chars) => { if (chars[0]) setHeroChar(chars[0]) }}
                />

                {/* Welcome voice — plays once on load, references the hero's name */}
                <WelcomeVoice charName={heroChar.name} />

                {/* ── Full-screen character creation loader ── */}
                {charLoading && (
                  <motion.div
                    key="char-loader"
                    className="step1-char-loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Spinning magic portal rings */}
                    <div className="step1-loader-rings">
                      <div className="step1-loader-ring step1-loader-ring-1" />
                      <div className="step1-loader-ring step1-loader-ring-2" />
                      <div className="step1-loader-ring step1-loader-ring-3" />
                      <div className="step1-loader-center">
                        <span style={{ fontSize: '2.8rem' }}>🌟</span>
                      </div>
                    </div>

                    {/* Character name */}
                    <div className="step1-loader-name">
                      Creating <span className="step1-loader-charname">{characterInput}</span>…
                    </div>

                    {/* Rotating status messages */}
                    <motion.div
                      key={charLoadingMsg}
                      className="step1-loader-msg"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.4 }}
                    >
                      {charLoadingMsg}
                    </motion.div>

                    {/* Progress dots */}
                    <div className="step1-loader-dots">
                      {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="step1-loader-dot" style={{ animationDelay: `${i * 0.18}s` }} />
                      ))}
                    </div>
                  </motion.div>
                )}

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

                {/* ── WORLD PICKER — full-width, search + category tabs + 6-col gradient grid ── */}
                <div className="scene2-left-panel world-picker-panel">
                  {/* Header */}
                  <div className="wp-header">
                    <div className="wp-title">🌍 Choose Your World</div>
                    <div className="wp-subtitle">Pick a setting — scroll to explore {THEME_OPTIONS.length} worlds</div>
                  </div>

                  {/* Search */}
                  <div className="wp-search-wrap">
                    <span className="wp-search-icon">🔍</span>
                    <input
                      className="wp-search-input"
                      placeholder="Search worlds…"
                      value={themeSearch}
                      onChange={e => setThemeSearch(e.target.value)}
                    />
                    {themeSearch && (
                      <button className="wp-search-clear" onClick={() => setThemeSearch('')}>✕</button>
                    )}
                  </div>

                  {/* Category tabs */}
                  <div className="wp-cat-tabs">
                    {THEME_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        className={`wp-cat-tab ${themeCat === cat ? 'active' : ''}`}
                        onClick={() => setThemeCat(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* 6-column world card grid */}
                  <div className="wp-grid">
                    {THEME_OPTIONS
                      .filter(t =>
                        (themeCat === 'All' || t.cat === themeCat) &&
                        (themeSearch === '' || t.label.toLowerCase().includes(themeSearch.toLowerCase()))
                      )
                      .map(t => (
                        <motion.button key={t.id}
                          className={`wp-card ${selectedTheme === t.id ? 'selected' : ''}`}
                          style={{ background: t.bg }}
                          whileHover={{ scale: 1.06, y: -3 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => handleThemeSelect(t.id)}
                        >
                          <span className="wp-card-emoji">{t.emoji}</span>
                          <div className="wp-card-overlay">
                            <span className="wp-card-label">{t.label}</span>
                          </div>
                          {selectedTheme === t.id && (
                            <span className="wp-card-check">
                              {bgLoading ? '⏳' : '✓'}
                            </span>
                          )}
                        </motion.button>
                      ))}
                    {THEME_OPTIONS.filter(t =>
                      (themeCat === 'All' || t.cat === themeCat) &&
                      (themeSearch === '' || t.label.toLowerCase().includes(themeSearch.toLowerCase()))
                    ).length === 0 && (
                      <div className="wp-empty">No worlds found — try a different search!</div>
                    )}
                  </div>

                  {/* ── Custom theme input ── */}
                  <div className="scene2-custom-theme-wrap">
                    <label className="scene2-custom-theme-label">
                      ✏️ Or describe your own world
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


                  {/* Scene description — optional extra detail */}
                  <div className="scene2-divider-label">
                    ✍️ Describe the scene <span style={{ color: 'rgba(167,139,250,0.7)', fontSize: '0.7rem' }}>optional</span>
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

                </div>

                {/* ── CENTER: Character Stage — loader → portrait → invite ── */}
                <AnimatePresence>
                  {charBgRemoving ? (
                    // Server is removing background — show spinner
                    <motion.div key="bg-removing" className="scene2-center-stage"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                      <div className="scene2-bgrm-loader">
                        <div className="scene2-bgrm-spinner" />
                        <div className="scene2-bgrm-name">{characterData?.character_name ?? 'Hero'}</div>
                        <div className="scene2-bgrm-label">✨ Making transparent…</div>
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
                          src={resolvePortraitSrc(characterData.character_media_url)}
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
                        <span className="scene2-invite-emoji">🌍</span>
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
                  <p className="imm-sub">Choose how your story looks AND reads</p>
                  <div className="imm-circle-grid">
                    {ART_STYLES.map(a => (
                      <motion.button key={a.id}
                        className={`imm-circle-btn imm-circle-art ${selectedArtStyle === a.id ? 'selected' : ''}`}
                        whileHover={{ scale: 1.08, y: -4 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => { setSelectedArtStyle(a.id); setGenerateError('') }}>
                        <span className="imm-circle-icon imm-circle-img-wrap">
                          <img src={a.img} alt={a.label} className="imm-style-img" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                          <span className="imm-style-img-fallback">{a.emoji}</span>
                        </span>
                        <span className="imm-circle-name">{a.label}</span>
                        <span className="imm-circle-desc">{a.flavor}</span>
                        <span className="imm-style-badge">{a.badge}</span>
                        {selectedArtStyle === a.id && <span className="imm-circle-check">✓</span>}
                      </motion.button>
                    ))}
                  </div>
                  {generateError && <p className="gen-error" style={{ marginTop: 16, textAlign: 'center' }}>{generateError}</p>}
                </div>
              </motion.div>
            )}

            {/* ── Preview ── */}
            {step === 'preview' && generatedStory && (() => {
              const artStyle = ART_STYLES.find(a => a.id === selectedArtStyle)
              const lang = LANGUAGES.find(l => l.id === selectedLanguage)
              return (
                <motion.div key="preview" className="prev-canvas"
                  style={themeBackground ? {
                    backgroundImage: `url(${themeBackground})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : {}}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>

                  {/* Full-screen cinematic overlay — darkens edges, keeps center bright */}
                  <div className="prev-scene-overlay" />

                  {/* ── Full-bleed layout: char left, glass card right ── */}
                  <div className="prev-scene-layout">

                    {/* LEFT: character — full height, no frame, blends into scene */}
                    {characterData?.character_media_url && (
                      <motion.div className="prev-char-side"
                        initial={{ opacity: 0, x: -60, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ duration: 0.9, delay: 0.1, type: 'spring', stiffness: 80 }}>
                        <img
                          src={characterData.character_media_url}
                          alt={characterData.character_name}
                          className="prev-char-full"
                        />
                        <div className="prev-char-nameplate">{characterData.character_name}</div>
                      </motion.div>
                    )}

                    {/* RIGHT: frosted-glass info card */}
                    <motion.div className="prev-glass-card"
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: 0.3 }}>

                      {/* Done badge */}
                      <div className="prev-done-badge">
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                        Story Ready!
                      </div>

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
        {step !== 'preview' && step !== 'scene' && step !== 'character' && (
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
                  src={resolvePortraitSrc(characterData.character_media_url)}
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
      {step !== 'preview' && step !== 'character' && (
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
              {isGenerating ? (
                <><span className="scene2-generate-spinner" /> Creating your story…</>
              ) : 'Next: Language →'}
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
            <motion.button className="gen-btn" disabled={!selectedArtStyle || isGenerating}
              style={{ opacity: (!selectedArtStyle || isGenerating) ? 0.75 : 1 }}
              whileHover={selectedArtStyle && !isGenerating ? { scale: 1.02 } : {}} whileTap={{ scale: 0.98 }}
              onClick={handleGenerate}>
              {isGenerating ? (
                <><span className="scene2-generate-spinner" /> Creating your story…</>
              ) : (
                <>🚀 Generate My Story!
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </>
              )}
            </motion.button>
          )}
        </div>
      )}

    </div>
  )
}
