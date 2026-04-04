import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { removeBackground } from '../lib/removeBackground';
import '../styles/app-shell.css';
import '../styles/design-tokens.css';
import '../styles/shelf.css'; // reuse avatar modal styles

const GRADES = [
  { value: 'K', label: 'Kindergarten' },
  { value: '1', label: '1st Grade' },
  { value: '2', label: '2nd Grade' },
  { value: '3', label: '3rd Grade' },
  { value: '4', label: '4th Grade' },
  { value: '5', label: '5th Grade' },
  { value: '6', label: '6th Grade' },
  { value: '7', label: '7th Grade' },
  { value: '8', label: '8th Grade' },
];

const AVATAR_COLORS = [
  '#702AE1', '#10B981', '#3B82F6', '#EC4899',
  '#F97316', '#06B6D4', '#8B5CF6', '#EF4444',
];

// Full 100-world set — same as StoryGenerator
const BACKGROUND_THEMES = [
  // Fantasy
  { id: 'magical rainbow forest',          label: 'Magic Forest',       emoji: '🌲', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#134e1b,#1a6b2a,#2d8a3e)' },
  { id: 'fantasy kingdom castle',          label: 'Fantasy Castle',     emoji: '🏰', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#3b1d6b,#5a2d9b,#7c3aed)' },
  { id: 'enchanted fairy village',         label: 'Fairy Village',      emoji: '🧚', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#6b1d5a,#9b2d80,#ec4899)' },
  { id: 'dragon mountain lair',            label: 'Dragon Mountain',    emoji: '🐉', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#6b1a00,#9b2d00,#c2410c)' },
  { id: 'enchanted mushroom forest',       label: 'Mushroom Grove',     emoji: '🍄', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#3d1a5c,#6b2fa0,#a855f7)' },
  { id: 'wizard magic school',             label: 'Magic Academy',      emoji: '🧙', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#1a1a5c,#2d3080,#4338ca)' },
  { id: 'unicorn rainbow meadow',          label: 'Unicorn Meadow',     emoji: '🦄', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#5c1a4a,#ec4899,#f9a8d4)' },
  { id: 'ancient magic ruins',             label: 'Ancient Ruins',      emoji: '🗿', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#3d2a00,#6b4a00,#92400e)' },
  { id: 'giant beanstalk sky castle',      label: 'Sky Castle',         emoji: '🌱', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#0c4a0a,#16a34a,#86efac)' },
  { id: 'talking animal village',          label: 'Animal Kingdom',     emoji: '🦊', cat: 'Fantasy',    bg: 'linear-gradient(135deg,#4a2000,#7c3a00,#b45309)' },
  // Space
  { id: 'outer space adventure',           label: 'Space Explorer',     emoji: '🚀', cat: 'Space',     bg: 'linear-gradient(135deg,#050014,#0d0030,#1e0060)' },
  { id: 'alien planet civilization',       label: 'Alien Planet',       emoji: '👽', cat: 'Space',     bg: 'linear-gradient(135deg,#001a0d,#003320,#065f46)' },
  { id: 'moon base colony',                label: 'Moon Base',          emoji: '🌕', cat: 'Space',     bg: 'linear-gradient(135deg,#1c1c2e,#2d2d44,#4a4a6a)' },
  { id: 'supernova nebula cloud',          label: 'Nebula Galaxy',      emoji: '🌌', cat: 'Space',     bg: 'linear-gradient(135deg,#2d0050,#6b21a8,#9333ea)' },
  { id: 'asteroid mining belt',            label: 'Asteroid Belt',      emoji: '☄️', cat: 'Space',     bg: 'linear-gradient(135deg,#1a0a00,#3b1500,#6b2600)' },
  { id: 'space station zero gravity',      label: 'Space Station',      emoji: '🛸', cat: 'Space',     bg: 'linear-gradient(135deg,#000d1a,#001f3f,#003d82)' },
  { id: 'wormhole time jump',              label: 'Wormhole Jump',      emoji: '🌀', cat: 'Space',     bg: 'linear-gradient(135deg,#0a0050,#3730a3,#6366f1)' },
  { id: 'galactic senate planet',          label: 'Galactic Senate',    emoji: '⭐', cat: 'Space',     bg: 'linear-gradient(135deg,#0d0030,#4a1d96,#7c3aed)' },
  { id: 'saturn ring adventure',           label: 'Saturn Rings',       emoji: '🪐', cat: 'Space',     bg: 'linear-gradient(135deg,#4a2900,#b45309,#d97706)' },
  { id: 'robot planet future world',       label: 'Robot Planet',       emoji: '🤖', cat: 'Space',     bg: 'linear-gradient(135deg,#0d1117,#1e293b,#334155)' },
  // Ocean
  { id: 'under the ocean',                 label: 'Ocean Deep',         emoji: '🌊', cat: 'Ocean',     bg: 'linear-gradient(135deg,#001f3f,#003d82,#0055b3)' },
  { id: 'underwater mermaid kingdom',      label: 'Mermaid Cove',       emoji: '🧜', cat: 'Ocean',     bg: 'linear-gradient(135deg,#0a2b4a,#0e5a8a,#38bdf8)' },
  { id: 'underwater treasure cave',        label: 'Treasure Dive',      emoji: '💎', cat: 'Ocean',     bg: 'linear-gradient(135deg,#003322,#006644,#059669)' },
  { id: 'giant squid deep sea',            label: 'Deep Sea Monster',   emoji: '🦑', cat: 'Ocean',     bg: 'linear-gradient(135deg,#000d1a,#001a33,#003366)' },
  { id: 'coral reef paradise',             label: 'Coral Reef',         emoji: '🐠', cat: 'Ocean',     bg: 'linear-gradient(135deg,#0c4a4a,#065f6b,#0891b2)' },
  { id: 'pirate ship ocean battle',        label: 'Pirate Ship',        emoji: '⚓', cat: 'Ocean',     bg: 'linear-gradient(135deg,#1c1400,#3b2900,#6b4a00)' },
  { id: 'sunken city ruins underwater',    label: 'Sunken City',        emoji: '🏛️', cat: 'Ocean',     bg: 'linear-gradient(135deg,#0a1f3d,#143d6e,#1d6fa4)' },
  { id: 'whale whale watching adventure',  label: 'Whale Watch',        emoji: '🐳', cat: 'Ocean',     bg: 'linear-gradient(135deg,#001a3d,#003380,#0050c8)' },
  { id: 'sea turtle island lagoon',        label: 'Turtle Lagoon',      emoji: '🐢', cat: 'Ocean',     bg: 'linear-gradient(135deg,#002b1a,#005e37,#059669)' },
  { id: 'beach island paradise',           label: 'Tropical Island',    emoji: '🏝️', cat: 'Ocean',     bg: 'linear-gradient(135deg,#005e7a,#0891b2,#38bdf8)' },
  // Adventure
  { id: 'pirate treasure hunt',            label: 'Pirate Quest',       emoji: '🏴‍☠️', cat: 'Adventure', bg: 'linear-gradient(135deg,#1a0f00,#4a2700,#7c4500)' },
  { id: 'safari africa animals',           label: 'Safari Trek',        emoji: '🦒', cat: 'Adventure', bg: 'linear-gradient(135deg,#4a2800,#8a5200,#d97706)' },
  { id: 'mountain climbing expedition',    label: 'Mountain Trek',      emoji: '⛰️', cat: 'Adventure', bg: 'linear-gradient(135deg,#1a3040,#2d4d63,#4a7a8a)' },
  { id: 'jungle with wild animals',        label: 'Wild Jungle',        emoji: '🦁', cat: 'Adventure', bg: 'linear-gradient(135deg,#0a2a00,#1a5c00,#2d8a00)' },
  { id: 'superhero city rescue',           label: 'Superhero City',     emoji: '🦸', cat: 'Adventure', bg: 'linear-gradient(135deg,#0d0030,#1a0060,#3b00c8)' },
  { id: 'racing cars championship',        label: 'Race Day',           emoji: '🏎️', cat: 'Adventure', bg: 'linear-gradient(135deg,#3d0000,#800000,#cc0000)' },
  { id: 'ninja training dojo',             label: 'Ninja Dojo',         emoji: '🥷', cat: 'Adventure', bg: 'linear-gradient(135deg,#0d0d0d,#1a1a1a,#2d2d2d)' },
  { id: 'spy secret mission world',        label: 'Secret Mission',     emoji: '🕵️', cat: 'Adventure', bg: 'linear-gradient(135deg,#0a1a0a,#1a3a1a,#0f5f0f)' },
  { id: 'treasure map desert journey',     label: 'Desert Quest',       emoji: '🗺️', cat: 'Adventure', bg: 'linear-gradient(135deg,#4a2900,#8a5a00,#c27a00)' },
  { id: 'lost city jungle expedition',     label: 'Lost City',          emoji: '🏺', cat: 'Adventure', bg: 'linear-gradient(135deg,#1a3300,#2d5c00,#3f8000)' },
  // Nature
  { id: 'friendly dinosaur park',          label: 'Dino World',         emoji: '🦕', cat: 'Nature',    bg: 'linear-gradient(135deg,#0a3300,#1a5c00,#2d8000)' },
  { id: 'icy arctic polar bears',          label: 'Arctic Ice',         emoji: '🐻‍❄️', cat: 'Nature',    bg: 'linear-gradient(135deg,#0a2040,#1a3d6b,#2b6cb0)' },
  { id: 'volcano island lava adventure',   label: 'Volcano Isle',       emoji: '🌋', cat: 'Nature',    bg: 'linear-gradient(135deg,#3d0000,#7a0a00,#c0280a)' },
  { id: 'rainforest amazon wildlife',      label: 'Amazon Rainforest',  emoji: '🌿', cat: 'Nature',    bg: 'linear-gradient(135deg,#002b00,#005c00,#008000)' },
  { id: 'snowy mountain winter wonder',    label: 'Winter Wonderland',  emoji: '❄️', cat: 'Nature',    bg: 'linear-gradient(135deg,#1a2a4a,#2d4a7a,#6b9ac4)' },
  { id: 'autumn harvest pumpkin farm',     label: 'Harvest Farm',       emoji: '🎃', cat: 'Nature',    bg: 'linear-gradient(135deg,#4a1e00,#8a3d00,#b86000)' },
  { id: 'underwater kelp forest',          label: 'Kelp Forest',        emoji: '🌾', cat: 'Nature',    bg: 'linear-gradient(135deg,#002b1a,#005c37,#008055)' },
  { id: 'spring flower garden blooms',     label: 'Flower Garden',      emoji: '🌸', cat: 'Nature',    bg: 'linear-gradient(135deg,#4a003d,#8a0070,#c800a8)' },
  { id: 'giant redwood forest ancient',    label: 'Redwood Forest',     emoji: '🌳', cat: 'Nature',    bg: 'linear-gradient(135deg,#1a0c00,#3d2000,#6b3800)' },
  { id: 'animal wildlife sanctuary',       label: 'Wildlife Sanctuary', emoji: '🦋', cat: 'Nature',    bg: 'linear-gradient(135deg,#003300,#006600,#009900)' },
  // Ancient
  { id: 'ancient egypt pyramids pharaoh', label: 'Ancient Egypt',       emoji: '🛕', cat: 'Ancient',   bg: 'linear-gradient(135deg,#4a2800,#8a5200,#bf8c00)' },
  { id: 'ancient rome colosseum warrior', label: 'Ancient Rome',        emoji: '⚔️', cat: 'Ancient',   bg: 'linear-gradient(135deg,#3d1a00,#7a3a00,#b35c00)' },
  { id: 'viking norse mythology longship',label: 'Viking Saga',         emoji: '🪓', cat: 'Ancient',   bg: 'linear-gradient(135deg,#0d1a2a,#1a3040,#2d4d63)' },
  { id: 'samurai feudal japan village',   label: 'Samurai Japan',       emoji: '⛩️', cat: 'Ancient',   bg: 'linear-gradient(135deg,#3d0000,#7a0a00,#c01010)' },
  { id: 'aztec mayan pyramid jungle',     label: 'Aztec Temple',        emoji: '🏛️', cat: 'Ancient',   bg: 'linear-gradient(135deg,#1a3300,#2d5c00,#3d7a00)' },
  { id: 'ancient greek olympus gods',     label: 'Mount Olympus',       emoji: '⚡', cat: 'Ancient',   bg: 'linear-gradient(135deg,#1a1a3d,#2d2d80,#4040c0)' },
  { id: 'medieval knight tournament',     label: 'Medieval Kingdom',    emoji: '🛡️', cat: 'Ancient',   bg: 'linear-gradient(135deg,#1a0f2a,#2d1a4a,#4a2d7a)' },
  { id: 'ancient china dynasty palace',   label: 'Imperial China',      emoji: '🐼', cat: 'Ancient',   bg: 'linear-gradient(135deg,#4a0000,#8a0000,#cc0000)' },
  { id: 'atlantis lost island civilization',label: 'Atlantis',          emoji: '🌐', cat: 'Ancient',   bg: 'linear-gradient(135deg,#002244,#003d80,#0055c0)' },
  { id: 'ancient inca mountain city',     label: 'Inca Citadel',        emoji: '🦅', cat: 'Ancient',   bg: 'linear-gradient(135deg,#2a1500,#5a2d00,#8a4500)' },
  // Future
  { id: 'robot factory future world',     label: 'Robot World',         emoji: '🤖', cat: 'Future',    bg: 'linear-gradient(135deg,#0d1117,#1e293b,#334155)' },
  { id: 'time travel history adventure',  label: 'Time Travel',         emoji: '⏰', cat: 'Future',    bg: 'linear-gradient(135deg,#1a0044,#3d00b3,#6600ff)' },
  { id: 'futuristic neon cyber city',     label: 'Cyber City',          emoji: '🏙️', cat: 'Future',    bg: 'linear-gradient(135deg,#001a3d,#003380,#0055c8)' },
  { id: 'hologram virtual reality world', label: 'VR Hologram World',   emoji: '🥽', cat: 'Future',    bg: 'linear-gradient(135deg,#001a3d,#0033a0,#00aaff)' },
  { id: 'underwater dome future city',    label: 'Future Dome City',    emoji: '🔬', cat: 'Future',    bg: 'linear-gradient(135deg,#001a4a,#003399,#0055ee)' },
  { id: 'flying cars skyway city',        label: 'Skyway City',         emoji: '🚁', cat: 'Future',    bg: 'linear-gradient(135deg,#0d0030,#220080,#4400cc)' },
  { id: 'quantum computer brain world',   label: 'Quantum World',       emoji: '💻', cat: 'Future',    bg: 'linear-gradient(135deg,#001a2a,#003d6b,#0070c0)' },
  { id: 'genetic lab dna scientist',      label: 'Science Lab',         emoji: '🧬', cat: 'Future',    bg: 'linear-gradient(135deg,#001a00,#003300,#00660a)' },
  { id: 'ai city robot companions',       label: 'AI City',             emoji: '🦾', cat: 'Future',    bg: 'linear-gradient(135deg,#0a0a2e,#1a1a66,#2a2aaa)' },
  { id: 'space colony terraformed planet',label: 'New Earth',           emoji: '🌍', cat: 'Future',    bg: 'linear-gradient(135deg,#002b00,#005500,#008800)' },
  // Spooky
  { id: 'haunted friendly ghost town',    label: 'Ghost Town',          emoji: '👻', cat: 'Spooky',    bg: 'linear-gradient(135deg,#0d0d0d,#1a0a2a,#2d1a4a)' },
  { id: 'friendly vampire castle night',  label: 'Vampire Castle',      emoji: '🧛', cat: 'Spooky',    bg: 'linear-gradient(135deg,#1a0000,#3d0000,#660000)' },
  { id: 'zombie abandoned city fun',      label: 'Zombie Town',         emoji: '🧟', cat: 'Spooky',    bg: 'linear-gradient(135deg,#0a1a00,#1a3300,#005500)' },
  { id: 'witch forest potion cauldron',   label: 'Witch Forest',        emoji: '🧙‍♀️', cat: 'Spooky',    bg: 'linear-gradient(135deg,#0d0020,#1a0040,#2d0066)' },
  { id: 'haunted carnival fun house',     label: 'Haunted Carnival',    emoji: '🎪', cat: 'Spooky',    bg: 'linear-gradient(135deg,#2a0040,#4a0070,#6600a8)' },
  { id: 'mystery detective foggy city',   label: 'Mystery Fog City',    emoji: '🔍', cat: 'Spooky',    bg: 'linear-gradient(135deg,#0d1a1a,#1a3030,#2d4a4a)' },
  { id: 'monster school friendly',        label: 'Monster School',      emoji: '👾', cat: 'Spooky',    bg: 'linear-gradient(135deg,#1a0030,#3d0070,#6600b8)' },
  { id: 'dark forest firefly magic night',label: 'Firefly Night',       emoji: '✨', cat: 'Spooky',    bg: 'linear-gradient(135deg,#001a00,#003300,#004d00)' },
  { id: 'pirate ghost ship ocean mist',   label: 'Ghost Ship',          emoji: '🚢', cat: 'Spooky',    bg: 'linear-gradient(135deg,#0d1a2a,#1a3040,#1f4060)' },
  { id: 'abandoned toy factory magic',    label: 'Toy Factory',         emoji: '🪆', cat: 'Spooky',    bg: 'linear-gradient(135deg,#1a0a00,#3d1a00,#662a00)' },
  // Seasonal
  { id: 'enchanted candy land',           label: 'Candy Kingdom',       emoji: '🍭', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#4a003d,#8c0080,#cc44bb)' },
  { id: 'christmas north pole santa',     label: 'North Pole',          emoji: '🎅', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#001a3d,#003399,#cc0000)' },
  { id: 'halloween pumpkin spooky village',label: 'Halloween Town',     emoji: '🎃', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#1a0000,#3d0800,#6b1800)' },
  { id: 'summer beach surfing fun',       label: 'Summer Beach',        emoji: '🏄', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#003d7a,#0070cc,#009fff)' },
  { id: 'spring cherry blossom japan',    label: 'Cherry Blossom',      emoji: '🌸', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#4a0040,#8a1070,#d44da0)' },
  { id: 'thanksgiving harvest festival',  label: 'Harvest Festival',    emoji: '🦃', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#3d1a00,#7a3800,#b86000)' },
  { id: 'new year fireworks celebration', label: 'New Year Gala',       emoji: '🎆', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#0d003d,#2200a0,#4400ff)' },
  { id: 'valentines love heart world',    label: 'Valentine World',     emoji: '💖', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#4a0020,#8a003d,#cc0066)' },
  { id: 'cloud kingdom sky adventure',    label: 'Sky Kingdom',         emoji: '☁️', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#003366,#0055a8,#4488cc)' },
  { id: 'circus amazing big top show',    label: 'Big Top Circus',      emoji: '🎡', cat: 'Seasonal',  bg: 'linear-gradient(135deg,#3d0020,#7a1040,#b84470)' },
];

const THEME_CATEGORIES = ['All', 'Fantasy', 'Space', 'Ocean', 'Adventure', 'Nature', 'Ancient', 'Future', 'Spooky', 'Seasonal'];

const ART_STYLES = [
  { id: 'cartoon',   emoji: '🎨', label: 'Cartoon',   color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.4)' },
  { id: 'comic',     emoji: '💥', label: 'Comic',     color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.4)' },
  { id: 'pixar',     emoji: '🎬', label: 'Pixar 3D',  color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.4)' },
  { id: 'cinematic', emoji: '🎞️', label: 'Cinematic', color: '#eab308', bg: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.4)' },
  { id: 'real',      emoji: '📷', label: 'Realistic', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.4)' },
  { id: 'epic',      emoji: '⚡', label: 'Epic',      color: '#ec4899', bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.4)' },
];

interface ExistingChild {
  id: string;
  name: string;
  grade_level: number;
  school?: string;
  avatar_url?: string;
}

/* ── Helpers ────────────────────────────────────────────────────── */
const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

/** Pull all hex colours out of a CSS linear-gradient string */
const extractGradientColors = (bg: string): string[] => {
  const matches = bg.match(/#[0-9a-fA-F]{3,8}/g);
  return matches && matches.length ? matches : ['#1a0066'];
};

/* ── Generate Avatar Modal ─────────────────────────────────────── */
function GenerateAvatarModal({
  child, onClose, onSaved,
}: {
  child: ExistingChild;
  onClose: () => void;
  onSaved: (url: string) => void;
}) {
  const API = import.meta.env.VITE_API_URL ?? '';
  const [description, setDescription]     = useState('');
  const [sceneDesc, setSceneDesc]          = useState('');
  const [bgTheme, setBgTheme]              = useState(BACKGROUND_THEMES[0].id);
  const [themeCat, setThemeCat]            = useState('Fantasy');
  const [artStyle, setArtStyle]            = useState(ART_STYLES[0].id);
  const [generating, setGenerating]        = useState(false);
  const [error, setError]                  = useState('');

  // ── Character portrait (transparent) ──────────────────────────────────────
  const [charPortraitUrl, setCharPortraitUrl] = useState<string | null>(null);
  const [charGenerating, setCharGenerating]   = useState(false);
  const [charError, setCharError]             = useState('');

  // ── Custom background generator (3-second debounce) ───────────────────────
  const [customBgText, setCustomBgText]    = useState('');
  const [customBgUrl, setCustomBgUrl]      = useState<string | null>(null);
  const [customBgLoading, setCustomBgLoading] = useState(false);
  const customBgRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (customBgRef.current) clearTimeout(customBgRef.current);
    if (!customBgText.trim()) { setCustomBgUrl(null); return; }
    customBgRef.current = setTimeout(() => generateCustomBg(customBgText.trim()), 3000);
    return () => { if (customBgRef.current) clearTimeout(customBgRef.current); };
  }, [customBgText]); // eslint-disable-line

  const generateCustomBg = async (prompt: string) => {
    setCustomBgLoading(true);
    try {
      const res = await fetch(`${API}/api/stories/generate-background`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: prompt, character_name: '', character_description: '', scene_description: prompt, art_style: artStyle }),
      });
      const data = await res.json();
      const url = data.background_url ?? data.portrait_url;
      if (url) { setCustomBgUrl(url); setBgTheme('__custom__'); }
    } catch { /* silent */ }
    finally { setCustomBgLoading(false); }
  };

  // ── Generate transparent character portrait ───────────────────────────────
  const generateCharacter = async () => {
    if (!description.trim()) { setCharError('Add a character description first!'); return; }
    setCharError('');
    setCharGenerating(true);
    try {
      // Use the selected world theme so the AI generates character IN the chosen world
      const worldTheme = bgTheme === '__custom__'
        ? (customBgText.trim() || 'fantastical magical world')
        : (BACKGROUND_THEMES.find(t => t.id === bgTheme)?.id ?? 'magical world');

      const res = await fetch(`${API}/api/stories/generate-background`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: worldTheme,
          character_name: child.name,
          character_description: description.trim(),
          scene_description: sceneDesc.trim()
            ? sceneDesc.trim()
            : `${child.name} standing confidently, full body portrait, ${description.trim()}`,
          art_style: artStyle,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API ${res.status}: ${errText.slice(0, 120)}`);
      }
      const data = await res.json();
      const rawUrl = data.portrait_url ?? data.background_url;
      if (!rawUrl) throw new Error('No portrait returned from server');
      // Remove white background to get transparent PNG
      const transparentUrl = await removeBackground(rawUrl);
      setCharPortraitUrl(transparentUrl ?? rawUrl);
    } catch (e: any) {
      console.error('[generateCharacter]', e);
      setCharError(`Character generation failed — ${e?.message ?? 'try again!'}`);
    } finally {
      setCharGenerating(false);
    }
  };

  // ── Save avatar: composite bg + character on canvas, upload, persist ───────
  const saveAvatar = async () => {
    if (!charPortraitUrl) { setError('Generate your character first!'); return; }
    setError('');
    setGenerating(true);
    try {
      const SIZE = 420;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d')!;

      // 1. Draw background
      if (bgTheme === '__custom__' && customBgUrl) {
        try {
          const bgImg = await loadImage(customBgUrl);
          ctx.drawImage(bgImg, 0, 0, SIZE, SIZE);
        } catch {
          const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
          g.addColorStop(0, '#1a0066'); g.addColorStop(1, '#4400cc');
          ctx.fillStyle = g; ctx.fillRect(0, 0, SIZE, SIZE);
        }
      } else {
        const colors = extractGradientColors(selectedThemeMeta.bg);
        const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
        g.addColorStop(0, colors[0]);
        if (colors[1]) g.addColorStop(0.5, colors[1]);
        g.addColorStop(1, colors[colors.length - 1]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, SIZE, SIZE);
      }

      // 2. Vignette
      const vig = ctx.createLinearGradient(0, SIZE, 0, 0);
      vig.addColorStop(0, 'rgba(0,0,0,0.55)');
      vig.addColorStop(0.4, 'rgba(0,0,0,0.1)');
      vig.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, SIZE, SIZE);

      // 3. Draw character centred, pinned to bottom
      const charImg = await loadImage(charPortraitUrl);
      const aspect = charImg.naturalWidth / charImg.naturalHeight;
      const charH = SIZE * 0.95;
      const charW = charH * aspect;
      ctx.drawImage(charImg, (SIZE - charW) / 2, SIZE - charH, charW, charH);

      // 4. Upload to Supabase 'avatars' bucket
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/png'),
      );
      const filename = `${child.id}_${Date.now()}.png`;
      const { error: uploadErr } = await supabase.storage
        .from('avatars').upload(filename, blob, { upsert: true, contentType: 'image/png' });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars').getPublicUrl(filename);

      // 5. Persist
      await fetch(`${API}/api/students/${child.id}/avatar`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: publicUrl }),
      });
      onSaved(publicUrl);
    } catch (e: any) {
      console.error('[saveAvatar]', e);
      setError(`Save failed — ${e?.message ?? 'try again!'}`);
    } finally {
      setGenerating(false);
    }
  };

  const selectedStyleMeta = ART_STYLES.find(s => s.id === artStyle) ?? ART_STYLES[0];
  const selectedThemeMeta = bgTheme === '__custom__'
    ? { id: '__custom__', label: 'Custom', emoji: '✦', bg: 'linear-gradient(135deg,#1a0066,#4400cc,#8800ff)', cat: 'Custom' }
    : (BACKGROUND_THEMES.find(t => t.id === bgTheme) ?? BACKGROUND_THEMES[0]);

  const filteredThemes = BACKGROUND_THEMES.filter(t => themeCat === 'All' || t.cat === themeCat);
  const canSave = !!charPortraitUrl && !!bgTheme;

  return (
    <div className="avatar-modal-overlay" onClick={onClose}>
      <motion.div
        className="avatar-modal"
        initial={{ opacity: 0, scale: 0.9, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}>

        <button className="avatar-modal-close" onClick={onClose}>✕</button>
        <h2 className="avatar-modal-title">✨ Generate Avatar</h2>
        <p className="avatar-modal-sub">Design a unique avatar for <strong>{child.name}</strong></p>

        {/* ── Avatar Preview — background updates live on world selection ── */}
        <div
          className="avatar-preview-wrap avatar-preview-scene"
          style={{
            position: 'relative',
            borderRadius: 20,
            overflow: 'hidden',
            transition: 'background 0.5s ease, box-shadow 0.4s ease',
            boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.08)`,
          }}>

          {/* Live background layer */}
          {bgTheme === '__custom__' && customBgUrl ? (
            <img
              src={customBgUrl}
              alt="background"
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                transition: 'opacity 0.5s ease',
              }}
            />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              background: selectedThemeMeta.bg,
              transition: 'background 0.5s ease',
            }} />
          )}

          {/* Subtle dark vignette so avatar/text reads well */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
          }} />

          {/* Character portrait (transparent) or initial placeholder */}
          {charPortraitUrl ? (
            <img
              src={charPortraitUrl}
              alt="character"
              style={{
                position: 'absolute',
                bottom: 0, left: '50%',
                transform: 'translateX(-50%)',
                height: '95%',
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 18px rgba(0,0,0,0.6))',
                zIndex: 2,
              }}
            />
          ) : charGenerating ? (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 2,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <svg style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', color: '#c084fc' }} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" />
              </svg>
              <span style={{ fontSize: '0.7rem', color: '#e9d5ff', fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>Creating character…</span>
            </div>
          ) : (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 2,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <span style={{
                fontSize: '4rem', fontWeight: 900, color: 'rgba(255,255,255,0.85)',
                textShadow: '0 2px 12px rgba(0,0,0,0.5)', lineHeight: 1,
              }}>
                {child.name.charAt(0).toUpperCase()}
              </span>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                textShadow: '0 1px 6px rgba(0,0,0,0.6)',
              }}>
                {child.name}
              </span>
            </div>
          )}

          {/* Generating spinner */}
          {generating && (
            <div className="avatar-generating-overlay">
              <div className="avatar-spinner" />
              <span>Generating…</span>
            </div>
          )}

          {/* World label badge — bottom left */}
          {!generating && (
            <div style={{
              position: 'absolute', bottom: 8, left: 8,
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 999, padding: '3px 9px',
              fontSize: '0.62rem', fontWeight: 800, color: '#fff',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              pointerEvents: 'none',
            }}>
              <span>{selectedThemeMeta.emoji}</span>
              <span>{selectedThemeMeta.label}</span>
            </div>
          )}

          {/* Art style badge — bottom right */}
          {!generating && (() => {
            const sm = ART_STYLES.find(s => s.id === artStyle);
            return sm ? (
              <div style={{
                position: 'absolute', bottom: 8, right: 8,
                background: sm.bg,
                border: `1px solid ${sm.border}`,
                borderRadius: 999, padding: '3px 9px',
                fontSize: '0.62rem', fontWeight: 800, color: sm.color,
                whiteSpace: 'nowrap', backdropFilter: 'blur(8px)',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                pointerEvents: 'none',
              }}>
                {sm.emoji}
              </div>
            ) : null;
          })()}
        </div>

        <label className="avatar-label">Character description</label>
        <textarea
          className="avatar-textarea"
          rows={2}
          placeholder="e.g. a brave girl with curly red hair, green eyes, wearing a purple cape..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          disabled={generating || charGenerating}
        />

        <label className="avatar-label">Scene description <span style={{ fontWeight: 400, opacity: 0.5 }}>(optional)</span></label>
        <textarea
          className="avatar-textarea"
          rows={2}
          placeholder={`e.g. ${child.name} leaping through a burst of light, cape flying, determined expression...`}
          value={sceneDesc}
          onChange={e => setSceneDesc(e.target.value)}
          disabled={generating || charGenerating}
          style={{ marginBottom: 10 }}
        />

        {/* ── Create Character button ── */}
        <motion.button
          whileHover={{ scale: charGenerating ? 1 : 1.02 }}
          whileTap={{ scale: charGenerating ? 1 : 0.97 }}
          disabled={charGenerating || generating || !description.trim()}
          onClick={generateCharacter}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 12, marginBottom: 4,
            background: charPortraitUrl
              ? 'linear-gradient(135deg,#065f46,#059669)'
              : 'linear-gradient(135deg,#6d28d9,#7c3aed)',
            border: 'none', color: '#fff', fontFamily: 'inherit',
            fontSize: '0.88rem', fontWeight: 800, cursor: charGenerating || !description.trim() ? 'default' : 'pointer',
            letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: !description.trim() ? 0.5 : 1,
            boxShadow: charPortraitUrl ? '0 4px 18px rgba(5,150,105,0.4)' : '0 4px 18px rgba(124,58,237,0.4)',
          }}>
          {charGenerating ? (
            <>
              <svg style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" />
              </svg>
              Creating Character…
            </>
          ) : charPortraitUrl ? '✓ Recreate Character' : '🧍 Create Character'}
        </motion.button>
        {charPortraitUrl && !charGenerating && (
          <div style={{ fontSize: '0.68rem', color: '#6ee7b7', textAlign: 'center', marginBottom: 12, fontWeight: 600 }}>
            ✓ Character generated — now pick a background world below!
          </div>
        )}
        {charError && <p style={{ color: '#f87171', fontSize: '0.75rem', marginBottom: 8, textAlign: 'center' }}>{charError}</p>}

        <label className="avatar-label">Background world</label>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
          {THEME_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setThemeCat(cat)}
              disabled={generating}
              style={{
                padding: '4px 11px',
                borderRadius: 999,
                fontSize: '0.65rem',
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '0.04em',
                transition: 'all 0.15s',
                background: themeCat === cat ? 'rgba(168,85,247,0.22)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${themeCat === cat ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.1)'}`,
                color: themeCat === cat ? '#e9d5ff' : 'rgba(180,160,220,0.5)',
              }}>
              {cat}
            </button>
          ))}
        </div>

        {/* ── Custom background creator ── */}
        <div style={{
          position: 'relative',
          marginBottom: 8,
          borderRadius: 11,
          border: customBgText.trim() ? '1.5px solid rgba(168,85,247,0.6)' : '1.5px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.04)',
          overflow: 'hidden',
          transition: 'border-color 0.2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 4px' }}>
            <span style={{ fontSize: '1rem' }}>✦</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#c084fc', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Create Custom Background</span>
            {customBgLoading && (
              <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" />
                </svg>
                Generating…
              </span>
            )}
          </div>
          <textarea
            rows={2}
            placeholder="Describe any world you can imagine… e.g. a glowing neon jungle with purple waterfalls and fireflies"
            value={customBgText}
            onChange={e => setCustomBgText(e.target.value)}
            disabled={generating}
            style={{
              width: '100%',
              padding: '4px 12px 9px',
              background: 'transparent',
              border: 'none',
              color: '#e9d5ff',
              fontFamily: 'inherit',
              fontSize: '0.8rem',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              lineHeight: 1.5,
            }}
          />
          {customBgText.trim() && !customBgLoading && !customBgUrl && (
            <div style={{ padding: '0 12px 8px', fontSize: '0.68rem', color: 'rgba(168,85,247,0.7)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>⏱</span> Generating in a moment…
            </div>
          )}
          {customBgUrl && (
            <div style={{ padding: '4px 12px 8px', fontSize: '0.68rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>✓</span> Custom background ready — selected!
            </div>
          )}
        </div>

        {/* Scrollable theme grid — custom chip first, then category chips */}
        <div className="avatar-theme-grid">
          {/* Custom background chip */}
          {(customBgUrl || customBgLoading) && (
            <button
              onClick={() => customBgUrl && setBgTheme('__custom__')}
              disabled={generating || customBgLoading}
              title="Custom background"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                padding: '3px 2px',
                borderRadius: 10,
                border: `2px solid ${bgTheme === '__custom__' ? 'rgba(192,132,252,0.9)' : 'rgba(192,132,252,0.35)'}`,
                overflow: 'hidden',
                position: 'relative',
                cursor: customBgLoading ? 'default' : 'pointer',
                transform: bgTheme === '__custom__' ? 'scale(1.05)' : 'none',
                transition: 'all 0.15s',
                boxShadow: bgTheme === '__custom__' ? '0 0 16px rgba(168,85,247,0.5)' : 'none',
                minHeight: 64,
                background: customBgLoading ? 'rgba(168,85,247,0.1)' : 'none',
              }}>
              {customBgLoading ? (
                <>
                  <svg style={{ width: 18, height: 18, animation: 'spin 1s linear infinite', color: '#c084fc' }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" />
                  </svg>
                  <span style={{ fontSize: '0.55rem', color: '#c084fc', fontWeight: 700 }}>Creating…</span>
                </>
              ) : customBgUrl ? (
                <>
                  <img src={customBgUrl} alt="custom bg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 40%, transparent)', borderRadius: 8 }} />
                  <span style={{ position: 'relative', fontSize: '0.7rem', lineHeight: 1, zIndex: 1, marginTop: 'auto' }}>✦</span>
                  <span style={{ position: 'relative', fontSize: '0.58rem', fontWeight: 800, color: '#fff', zIndex: 1, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>Custom</span>
                </>
              ) : null}
            </button>
          )}

          {filteredThemes.map(t => (
            <button
              key={t.id}
              onClick={() => setBgTheme(t.id)}
              disabled={generating}
              title={t.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '7px 3px',
                borderRadius: 10,
                background: bgTheme === t.id ? t.bg : 'rgba(255,255,255,0.04)',
                border: `2px solid ${bgTheme === t.id ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color: bgTheme === t.id ? '#fff' : 'rgba(180,160,220,0.65)',
                fontFamily: 'inherit',
                fontSize: '0.6rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: bgTheme === t.id ? '0 2px 10px rgba(0,0,0,0.4)' : 'none',
                transform: bgTheme === t.id ? 'scale(1.05)' : 'none',
                textShadow: bgTheme === t.id ? '0 1px 3px rgba(0,0,0,0.6)' : 'none',
              }}>
              <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{t.emoji}</span>
              <span style={{ textAlign: 'center', lineHeight: 1.2 }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Selected world indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 9,
          background: selectedThemeMeta.bg, marginBottom: 12,
          fontSize: '0.78rem', fontWeight: 700, color: '#fff',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        }}>
          <span style={{ fontSize: '1.1rem' }}>{selectedThemeMeta.emoji}</span>
          <span>World: <strong>{selectedThemeMeta.label}</strong></span>
        </div>



        <label className="avatar-label">Art style</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {ART_STYLES.map(s => (
            <button
              key={s.id}
              onClick={() => setArtStyle(s.id)}
              disabled={generating}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 6px',
                borderRadius: 12,
                background: artStyle === s.id ? s.bg : 'rgba(255,255,255,0.04)',
                border: `2px solid ${artStyle === s.id ? s.border : 'rgba(255,255,255,0.08)'}`,
                color: artStyle === s.id ? s.color : 'rgba(200,185,230,0.6)',
                fontFamily: 'inherit',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.18s',
                letterSpacing: '0.02em',
                boxShadow: artStyle === s.id ? `0 0 16px ${s.color}33` : 'none',
                transform: artStyle === s.id ? 'translateY(-1px)' : 'none',
              }}>
              <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{s.emoji}</span>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
              {artStyle === s.id && (
                <span style={{
                  width: 20, height: 3, borderRadius: 2,
                  background: s.color,
                  marginTop: 2,
                  display: 'block',
                }} />
              )}
            </button>
          ))}
        </div>

        {/* Active style preview strip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          borderRadius: 10,
          background: selectedStyleMeta.bg,
          border: `1px solid ${selectedStyleMeta.border}`,
          marginBottom: 16,
          fontSize: '0.8rem',
          fontWeight: 700,
          color: selectedStyleMeta.color,
        }}>
          <span style={{ fontSize: '1.1rem' }}>{selectedStyleMeta.emoji}</span>
          <span>Generating in <strong>{selectedStyleMeta.label}</strong> style — AI image tuned for maximum accuracy</span>
        </div>

        {error && <p className="avatar-error">{error}</p>}

        {/* Step status */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <div style={{ flex: 1, padding: '6px 10px', borderRadius: 8, textAlign: 'center', fontSize: '0.65rem', fontWeight: 800,
            background: charPortraitUrl ? 'rgba(5,150,105,0.18)' : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${charPortraitUrl ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.08)'}`,
            color: charPortraitUrl ? '#6ee7b7' : 'rgba(180,160,220,0.5)',
          }}>
            {charPortraitUrl ? '✓ Character Ready' : '① Create Character'}
          </div>
          <div style={{ flex: 1, padding: '6px 10px', borderRadius: 8, textAlign: 'center', fontSize: '0.65rem', fontWeight: 800,
            background: bgTheme ? 'rgba(5,150,105,0.18)' : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${bgTheme ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.08)'}`,
            color: bgTheme ? '#6ee7b7' : 'rgba(180,160,220,0.5)',
          }}>
            {bgTheme ? '✓ World Selected' : '② Pick a World'}
          </div>
        </div>

        <motion.button
          className="avatar-generate-btn"
          whileHover={{ scale: canSave ? 1.03 : 1 }}
          whileTap={{ scale: canSave ? 0.97 : 1 }}
          disabled={generating || !canSave}
          onClick={saveAvatar}
          style={{
            background: canSave
              ? `linear-gradient(135deg, ${selectedStyleMeta.color}cc, ${selectedStyleMeta.color}88)`
              : 'rgba(255,255,255,0.06)',
            boxShadow: canSave ? `0 4px 18px ${selectedStyleMeta.color}44` : 'none',
            opacity: canSave ? 1 : 0.5,
            cursor: canSave ? 'pointer' : 'default',
          }}>
          {generating ? '⏳ Saving Avatar…' : canSave ? `✨ Save Avatar` : '⚠ Generate character + world first'}
        </motion.button>
      </motion.div>
    </div>
  );
}

/* ── Sidebar ─────────────────────────────────────────────────────── */
function AppSidebar({ active }: { active: string }) {
  const navigate = useNavigate();
  const handleLogout = useCallback(() => {
    localStorage.clear();
    supabase.auth.signOut();
    navigate('/');
  }, [navigate]);

  const links = [
    { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
    { key: 'rewards', label: 'Progress & Metrics', path: '/rewards', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { key: 'shelf', label: 'Reading Shelf', path: '/shelf', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
    { key: 'generate', label: 'Generate Story', path: '/generate', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> },
    { key: 'kids', label: 'Manage Children', path: '/add-kid', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { key: 'profile', label: 'My Profile', path: '/profile', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
  ];

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-logo" onClick={() => navigate('/dashboard')}>ReadQuest ✨</div>
      <nav className="app-sidebar-nav">
        {links.map(l => (
          <button key={l.key} className={`app-sidebar-link ${active === l.key ? 'active' : ''}`} onClick={() => navigate(l.path)}>
            {l.icon}<span>{l.label}</span>
          </button>
        ))}
      </nav>
      <div className="app-sidebar-bottom">
        <button className="app-sidebar-logout" onClick={handleLogout}><span>Log out</span></button>
      </div>
    </aside>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */
const AddKid = () => {
  const navigate = useNavigate();
  const [parentId, setParentId] = useState<string | null>(null);
  const [existingChildren, setExistingChildren] = useState<ExistingChild[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [grade, setGrade] = useState('1');
  const [school, setSchool] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [avatarModal, setAvatarModal] = useState<ExistingChild | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate('/login'); return; }
      setParentId(session.user.id);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/students/parent/${session.user.id}`);
        if (res.ok) setExistingChildren(await res.json());
      } catch { /* non-fatal */ }
      setFetching(false);
    });
  }, [navigate]);

  const handleAddKid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentId) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: parentId,
          name: `${firstName} ${lastName}`.trim(),
          grade_level: grade === 'K' ? 0 : parseInt(grade),
          school: school || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to add child');
      const newChild: ExistingChild = await res.json();
      setExistingChildren(prev => [...prev, newChild]);
      setFirstName(''); setLastName(''); setGrade('1'); setSchool('');
      setSuccess(`${firstName} was added! 🎉`);
      setTimeout(() => setSuccess(''), 3500);
    } catch (err: any) {
      setError(err.message || 'Error adding child');
    } finally {
      setLoading(false);
    }
  };

  const gradeLabel = (gl: number) => {
    if (gl === 0) return 'Kindergarten';
    return GRADES.find(g => g.value === String(gl))?.label ?? `Grade ${gl}`;
  };

  return (
    <>
    <div className="app-shell">
      <AppSidebar active="kids" />

      <div className="app-content">
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(160deg, #080418 0%, #110729 45%, #0d0520 100%)',
          padding: 'clamp(20px, 5vw, 48px) clamp(16px, 5vw, 48px) 80px',
          position: 'relative',
          overflow: 'hidden',
          color: 'rgba(233,221,255,0.9)',
        }}>
          {/* Background blobs */}
          <div style={{ position: 'absolute', top: -180, left: -120, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.05) 45%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -80, right: -60, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, rgba(112,42,225,0.06) 50%, transparent 70%)', pointerEvents: 'none' }} />

          {/* ── Page Header ── */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.4rem, 5vw, 2rem)', fontWeight: 800, color: 'rgba(233,221,255,0.95)', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
              👧 Manage Children
            </h1>
            <p style={{ color: 'rgba(204,195,216,0.55)', fontSize: '0.95rem', margin: 0, fontWeight: 500 }}>
              Add or manage children linked to your account
            </p>
          </motion.div>

          {/* ── Your Children ── */}
          {fetching ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
              {[0, 1].map(i => (
                <div key={i} style={{ height: 80, borderRadius: 24, background: 'linear-gradient(90deg, rgba(30,14,70,0.8) 25%, rgba(60,30,120,0.5) 50%, rgba(30,14,70,0.8) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', border: '1px solid rgba(150,110,255,0.1)' }} />
              ))}
            </div>
          ) : existingChildren.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ marginBottom: 40 }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(204,195,216,0.45)', marginBottom: 16 }}>
                Your Children
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {existingChildren.map((child, i) => (
                  <motion.div key={child.id}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 * i, type: 'spring', stiffness: 240, damping: 22 }}
                    style={{
                      background: 'rgba(20,10,50,0.7)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: 20,
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      border: '1px solid rgba(150,110,255,0.15)',
                      boxShadow: '0 4px 16px rgba(10,4,28,0.4)',
                    }}>
                    {/* Top row: avatar + info + grade chip */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                        background: child.avatar_url ? 'transparent' : AVATAR_COLORS[i % AVATAR_COLORS.length],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.1rem', fontWeight: 800, color: '#fff',
                        overflow: 'hidden',
                        border: child.avatar_url ? '2px solid rgba(168,85,247,0.4)' : 'none',
                      }}>
                        {child.avatar_url
                          ? <img src={child.avatar_url} alt={child.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : child.name.charAt(0).toUpperCase()
                        }
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'rgba(233,221,255,0.9)', marginBottom: 2 }}>{child.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(204,195,216,0.5)' }}>
                          {child.school ? `${child.school} · ` : ''}{gradeLabel(child.grade_level)}
                        </div>
                      </div>

                      {/* Grade chip */}
                      <div style={{
                        background: 'rgba(124,58,237,0.2)', color: '#c084fc',
                        border: '1px solid rgba(192,132,252,0.25)',
                        borderRadius: 999, padding: '4px 12px',
                        fontSize: '0.72rem', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap',
                      }}>
                        {gradeLabel(child.grade_level)}
                      </div>
                    </div>

                    {/* Bottom row: action buttons — full-width, side by side */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                        onClick={() => setAvatarModal(child)}
                        style={{
                          flex: 1,
                          background: 'linear-gradient(135deg, rgba(168,85,247,0.18), rgba(99,102,241,0.15))',
                          color: '#c4b5fd',
                          border: '1.5px solid rgba(168,85,247,0.35)',
                          borderRadius: 999, padding: '9px 10px',
                          fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 700,
                          cursor: 'pointer', transition: 'all 0.18s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                        {child.avatar_url ? '🔄 Update Avatar' : '✨ Generate Avatar'}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          localStorage.setItem('readquest_student_id', child.id);
                          localStorage.setItem('readquest_student_name', child.name);
                          navigate('/dashboard');
                        }}
                        style={{
                          flex: 1,
                          background: 'rgba(124,58,237,0.15)', color: '#c084fc',
                          border: '1px solid rgba(192,132,252,0.2)', borderRadius: 999, padding: '9px 10px',
                          fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 700,
                          cursor: 'pointer', transition: 'background 0.18s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        ▶ Select
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Add a Child Form ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ background: 'rgba(20,10,50,0.75)', backdropFilter: 'blur(16px)', border: '1px solid rgba(150,110,255,0.15)', borderRadius: 24, padding: 'clamp(20px, 4vw, 32px)', boxShadow: '0 8px 32px rgba(10,4,28,0.4)' }}>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(204,195,216,0.45)', marginBottom: 24 }}>
              Add a Child
            </p>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ background: 'rgba(247,75,109,0.08)', borderRadius: 14, padding: '12px 18px', color: 'var(--rq-coral)', fontSize: '0.88rem', fontWeight: 600, marginBottom: 20 }}>
                  ❌ {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ background: 'rgba(0,116,57,0.08)', borderRadius: 14, padding: '12px 18px', color: '#007439', fontSize: '0.88rem', fontWeight: 600, marginBottom: 20 }}>
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleAddKid}>
              {/* Row 1 */}
              <div className="addkid-form-row">
                <div>
                  <label style={labelStyle}>First Name</label>
                  <input required value={firstName} onChange={e => setFirstName(e.target.value)}
                    style={inputStyle} placeholder="Alex" />
                </div>
                <div>
                  <label style={labelStyle}>Last Name</label>
                  <input required value={lastName} onChange={e => setLastName(e.target.value)}
                    style={inputStyle} placeholder="Johnson" />
                </div>
              </div>

              {/* Row 2 */}
              <div className="addkid-form-row" style={{ marginBottom: 28 }}>
                <div>
                  <label style={labelStyle}>Grade Level</label>
                  <select value={grade} onChange={e => setGrade(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>School <span style={{ fontWeight: 400, opacity: 0.65 }}>(optional)</span></label>
                  <input value={school} onChange={e => setSchool(e.target.value)}
                    style={inputStyle} placeholder="Lincoln Elementary" />
                </div>
              </div>

              {/* CTA */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                style={{
                  width: '100%',
                  padding: '15px 0',
                  background: 'linear-gradient(135deg, #702AE1, #6411D5)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 999,
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.72 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 8px 28px rgba(112,42,225,0.32)',
                  letterSpacing: '-0.01em',
                  transition: 'opacity 0.18s',
                }}>
                {loading ? (
                  <>
                    <svg style={{ width: 18, height: 18, animation: 'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
                    </svg>
                    Adding…
                  </>
                ) : '+ Add Child'}
              </motion.button>
            </form>
          </motion.div>

          <style>{`
            @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
            @keyframes spin { to { transform: rotate(360deg); } }
            input:focus, select:focus { outline: none; border-color: rgba(192,132,252,0.5) !important; box-shadow: 0 0 0 3px rgba(112,42,225,0.2) !important; background: rgba(30,14,70,0.9) !important; }
            .addkid-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
            @media (max-width: 480px) {
              .addkid-form-row { grid-template-columns: 1fr; }
            }
          `}</style>
        </div>
      </div>
    </div>

    {/* Avatar Modal */}
    <AnimatePresence>
      {avatarModal && (
        <GenerateAvatarModal
          child={avatarModal}
          onClose={() => setAvatarModal(null)}
          onSaved={(url) => {
            const id = avatarModal!.id;
            setExistingChildren(prev => prev.map(c => c.id === id ? { ...c, avatar_url: url } : c));
            setAvatarModal(null);
          }}
        />
      )}
    </AnimatePresence>
    </>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'rgba(204,195,216,0.55)',
  marginBottom: 8,
  letterSpacing: '0.01em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 14,
  border: '1.5px solid rgba(150,110,255,0.2)',
  background: 'rgba(30,14,70,0.7)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.95rem',
  fontWeight: 500,
  color: 'rgba(233,221,255,0.9)',
  boxSizing: 'border-box',
  transition: 'border-color 0.18s, box-shadow 0.18s, background 0.18s',
};

export default AddKid;
