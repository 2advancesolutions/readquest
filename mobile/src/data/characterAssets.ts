import type { ImageSourcePropType } from 'react-native'

export interface AssetOption {
  id: string
  label: string
  emoji: string
  xpRequired?: number
}

// ── HAIR ──────────────────────────────────────────────
export const BOY_HAIR: AssetOption[] = [
  { id: 'fade_cut',     label: 'Fade Cut',      emoji: '💈' },
  { id: 'short_spiky',  label: 'Short Spiky',   emoji: '⚡' },
  { id: 'crew_cut',     label: 'Crew Cut',       emoji: '✂️' },
  { id: 'cornrows',     label: 'Cornrows',       emoji: '〰️' },
  { id: 'short_afro',   label: 'Short Afro',    emoji: '🌀' },
  { id: 'slick_back',   label: 'Slick Back',    emoji: '💧' },
  { id: 'buzz_cut',     label: 'Buzz Cut',      emoji: '⬛' },
  { id: 'messy_mop',    label: 'Messy Mop',     emoji: '🌊' },
  { id: 'mohawk',       label: 'Mohawk',         emoji: '🔱', xpRequired: 500 },
  { id: 'dreadlocks',   label: 'Dreads',         emoji: '🌿', xpRequired: 500 },
]

export const GIRL_HAIR: AssetOption[] = [
  { id: 'long_wavy',    label: 'Long Wavy',     emoji: '🌊' },
  { id: 'ponytail',     label: 'Ponytail',       emoji: '🎀' },
  { id: 'braids',       label: 'Braids',         emoji: '🪢' },
  { id: 'twin_tails',   label: 'Twin Tails',    emoji: '🦋' },
  { id: 'bob_cut',      label: 'Bob Cut',        emoji: '✂️' },
  { id: 'top_bun',      label: 'Top Bun',        emoji: '🍡' },
  { id: 'curly_long',   label: 'Curly Long',    emoji: '🌸' },
  { id: 'pigtails',     label: 'Pigtails',       emoji: '🎊' },
  { id: 'side_swept',   label: 'Side Swept',    emoji: '💨' },
  { id: 'space_buns',   label: 'Space Buns',    emoji: '🪐', xpRequired: 500 },
]

export const NEUTRAL_HAIR: AssetOption[] = [
  { id: 'short_curls',  label: 'Short Curls',   emoji: '🫧' },
  { id: 'curly_afro',   label: 'Curly Afro',    emoji: '🌀' },
  { id: 'wild_spiky',   label: 'Wild Spiky',    emoji: '⚡' },
  { id: 'shaggy',       label: 'Shaggy',         emoji: '🌿' },
  { id: 'fluffy',       label: 'Fluffy',         emoji: '☁️' },
  { id: 'bald',         label: 'Bald',           emoji: '🥚' },
  { id: 'undercut',     label: 'Undercut',       emoji: '⚔️', xpRequired: 500 },
]

export function getHairByGender(g: string) {
  if (g === 'boy')  return BOY_HAIR
  if (g === 'girl') return GIRL_HAIR
  return NEUTRAL_HAIR
}

// ── OUTFITS ───────────────────────────────────────────
export const BOY_OUTFITS: AssetOption[] = [
  { id: 'tshirt_jeans',   label: 'Tee + Jeans',     emoji: '👕' },
  { id: 'hoodie',         label: 'Hoodie',            emoji: '🆒' },
  { id: 'sports_jersey',  label: 'Sports Jersey',    emoji: '🏆' },
  { id: 'ninja_gi',       label: 'Ninja Gi',          emoji: '🥷' },
  { id: 'knight_armor',   label: 'Knight Armor',     emoji: '⚔️', xpRequired: 1000 },
  { id: 'superhero_suit', label: 'Superhero Suit',   emoji: '🦸', xpRequired: 500 },
  { id: 'wizard_robe',    label: 'Wizard Robe',      emoji: '🧙', xpRequired: 500 },
  { id: 'lab_coat',       label: 'Lab Coat',          emoji: '🔬' },
  { id: 'space_suit',     label: 'Space Suit',        emoji: '🚀', xpRequired: 2000 },
  { id: 'street_wear',    label: 'Street Wear',      emoji: '😎' },
  { id: 'pirate',         label: 'Pirate',            emoji: '🏴‍☠️', xpRequired: 1000 },
]

export const GIRL_OUTFITS: AssetOption[] = [
  { id: 'tshirt_jeans',   label: 'Tee + Jeans',     emoji: '👕' },
  { id: 'hoodie',         label: 'Hoodie',            emoji: '🆒' },
  { id: 'princess_gown',  label: 'Princess Gown',   emoji: '👗', xpRequired: 500 },
  { id: 'superhero_dress',label: 'Hero Dress',       emoji: '🦸‍♀️', xpRequired: 500 },
  { id: 'ninja_uniform',  label: 'Ninja Uniform',    emoji: '🥷' },
  { id: 'witch_dress',    label: 'Witch Dress',      emoji: '🧙‍♀️', xpRequired: 500 },
  { id: 'lab_coat',       label: 'Lab Coat',          emoji: '🔬' },
  { id: 'ballet_outfit',  label: 'Ballet',            emoji: '🩰' },
  { id: 'space_suit',     label: 'Space Suit',        emoji: '🚀', xpRequired: 2000 },
  { id: 'sport_skirt',    label: 'Sport Skirt',      emoji: '🏃‍♀️' },
  { id: 'pirate',         label: 'Pirate',            emoji: '🏴‍☠️', xpRequired: 1000 },
]

export const NEUTRAL_OUTFITS: AssetOption[] = [
  { id: 'jumpsuit',       label: 'Jumpsuit',          emoji: '🦺' },
  { id: 'battle_armor',   label: 'Battle Armor',     emoji: '⚔️', xpRequired: 1000 },
  { id: 'cloak',          label: 'Cloak',             emoji: '🧣' },
  { id: 'lab_coat',       label: 'Lab Coat',          emoji: '🔬' },
  { id: 'space_suit',     label: 'Space Suit',        emoji: '🚀', xpRequired: 2000 },
  { id: 'casual',         label: 'Casual',            emoji: '🎽' },
]

export function getOutfitsByGender(g: string) {
  if (g === 'boy')  return BOY_OUTFITS
  if (g === 'girl') return GIRL_OUTFITS
  return NEUTRAL_OUTFITS
}

// ── SHOES ─────────────────────────────────────────────
export const BOY_SHOES: AssetOption[] = [
  { id: 'sneakers',    label: 'Sneakers',      emoji: '👟' },
  { id: 'high_tops',   label: 'High-Tops',     emoji: '🏀' },
  { id: 'boots',       label: 'Combat Boots',  emoji: '🥾' },
  { id: 'flip_flops',  label: 'Flip-Flops',   emoji: '🌊' },
  { id: 'rocket_boots',label: 'Rocket Boots', emoji: '🚀', xpRequired: 2000 },
  { id: 'cleats',      label: 'Cleats',        emoji: '⚽' },
]

export const GIRL_SHOES: AssetOption[] = [
  { id: 'sneakers',    label: 'Sneakers',      emoji: '👟' },
  { id: 'heels',       label: 'Heels',         emoji: '👠' },
  { id: 'sandals',     label: 'Sandals',       emoji: '🩴' },
  { id: 'ballet_flats',label: 'Ballet Flats', emoji: '🩰' },
  { id: 'boots',       label: 'Cute Boots',   emoji: '🥾' },
  { id: 'rocket_boots',label: 'Rocket Boots', emoji: '🚀', xpRequired: 2000 },
]

export const NEUTRAL_SHOES: AssetOption[] = [
  { id: 'sneakers',    label: 'Sneakers',      emoji: '👟' },
  { id: 'boots',       label: 'Boots',         emoji: '🥾' },
  { id: 'sandals',     label: 'Sandals',       emoji: '🩴' },
  { id: 'rocket_boots',label: 'Rocket Boots', emoji: '🚀', xpRequired: 2000 },
]

export function getShoesByGender(g: string) {
  if (g === 'boy')  return BOY_SHOES
  if (g === 'girl') return GIRL_SHOES
  return NEUTRAL_SHOES
}

// ── HATS ──────────────────────────────────────────────
export const BOY_HATS: AssetOption[] = [
  { id: 'none',        label: 'No Hat',        emoji: '❌' },
  { id: 'baseball',    label: 'Baseball Cap',  emoji: '🧢' },
  { id: 'beanie',      label: 'Beanie',        emoji: '🎿' },
  { id: 'helmet',      label: 'Hero Helmet',   emoji: '🪖', xpRequired: 1000 },
  { id: 'pirate_hat',  label: 'Pirate Hat',   emoji: '🏴‍☠️', xpRequired: 1000 },
  { id: 'top_hat',     label: 'Top Hat',       emoji: '🎩', xpRequired: 500 },
  { id: 'wizard_hat',  label: 'Wizard Hat',   emoji: '🧙' },
  { id: 'crown',       label: 'Crown',         emoji: '👑', xpRequired: 2000 },
]

export const GIRL_HATS: AssetOption[] = [
  { id: 'none',        label: 'No Hat',        emoji: '❌' },
  { id: 'flower_crown',label: 'Flower Crown', emoji: '🌸' },
  { id: 'baseball',    label: 'Baseball Cap', emoji: '🧢' },
  { id: 'witch_hat',   label: 'Witch Hat',    emoji: '🧙‍♀️', xpRequired: 500 },
  { id: 'tiara',       label: 'Tiara',         emoji: '👸', xpRequired: 1000 },
  { id: 'beanie',      label: 'Beanie',        emoji: '🎿' },
  { id: 'crown',       label: 'Crown',         emoji: '👑', xpRequired: 2000 },
  { id: 'party_hat',   label: 'Party Hat',    emoji: '🎉' },
]

export const NEUTRAL_HATS: AssetOption[] = [
  { id: 'none',        label: 'No Hat',        emoji: '❌' },
  { id: 'baseball',    label: 'Cap',           emoji: '🧢' },
  { id: 'helmet',      label: 'Helmet',        emoji: '🪖', xpRequired: 1000 },
  { id: 'crown',       label: 'Crown',         emoji: '👑', xpRequired: 2000 },
  { id: 'wizard_hat',  label: 'Wizard Hat',   emoji: '🧙' },
]

export function getHatsByGender(g: string) {
  if (g === 'boy')  return BOY_HATS
  if (g === 'girl') return GIRL_HATS
  return NEUTRAL_HATS
}

// ── JACKETS ───────────────────────────────────────────
export const BOY_JACKETS: AssetOption[] = [
  { id: 'none',         label: 'No Jacket',     emoji: '❌' },
  { id: 'leather',      label: 'Leather',       emoji: '🤘' },
  { id: 'varsity',      label: 'Varsity',       emoji: '🏈', xpRequired: 500 },
  { id: 'cape',         label: 'Hero Cape',     emoji: '🦸', xpRequired: 1000 },
  { id: 'puffer',       label: 'Puffer',        emoji: '❄️' },
  { id: 'wizard_robe',  label: 'Battle Robe',  emoji: '🧙', xpRequired: 500 },
]

export const GIRL_JACKETS: AssetOption[] = [
  { id: 'none',         label: 'No Jacket',     emoji: '❌' },
  { id: 'denim',        label: 'Denim Jacket',  emoji: '💙' },
  { id: 'cape',         label: 'Hero Cape',     emoji: '🦸‍♀️', xpRequired: 1000 },
  { id: 'cardigan',     label: 'Cardigan',      emoji: '🌸' },
  { id: 'puffer',       label: 'Puffer',        emoji: '❄️' },
  { id: 'witch_cloak',  label: 'Witch Cloak',  emoji: '🧙‍♀️', xpRequired: 500 },
]

export const NEUTRAL_JACKETS: AssetOption[] = [
  { id: 'none',         label: 'No Jacket',     emoji: '❌' },
  { id: 'cape',         label: 'Hero Cape',     emoji: '🦸', xpRequired: 1000 },
  { id: 'blazer',       label: 'Blazer',        emoji: '🪄' },
  { id: 'raincoat',     label: 'Raincoat',      emoji: '🌧️' },
]

export function getJacketsByGender(g: string) {
  if (g === 'boy')  return BOY_JACKETS
  if (g === 'girl') return GIRL_JACKETS
  return NEUTRAL_JACKETS
}

// ── ACCESSORIES (shared) ──────────────────────────────
export const ACCESSORIES: AssetOption[] = [
  { id: 'none',       label: 'None',          emoji: '❌' },
  { id: 'glasses',    label: 'Glasses',       emoji: '👓' },
  { id: 'wings',      label: 'Wings',         emoji: '🪽', xpRequired: 2000 },
  { id: 'sword',      label: 'Magic Sword',  emoji: '⚔️', xpRequired: 1000 },
  { id: 'shield',     label: 'Shield',        emoji: '🛡️', xpRequired: 1000 },
  { id: 'wand',       label: 'Magic Wand',   emoji: '🪄' },
  { id: 'backpack',   label: 'Backpack',      emoji: '🎒' },
  { id: 'bow_arrow',  label: 'Bow & Arrow',  emoji: '🏹', xpRequired: 500 },
  { id: 'dragon_pet', label: 'Dragon Buddy', emoji: '🐉', xpRequired: 5000 },
  { id: 'lasso',      label: 'Lasso',         emoji: '🤠', xpRequired: 500 },
]

// ── EFFECTS (shared) ──────────────────────────────────
export const EFFECTS: AssetOption[] = [
  { id: 'none',         label: 'None',          emoji: '❌' },
  { id: 'sparkles',     label: 'Sparkles',      emoji: '✨' },
  { id: 'fire_aura',    label: 'Fire Aura',    emoji: '🔥', xpRequired: 1000 },
  { id: 'ice_crystals', label: 'Ice Crystals', emoji: '❄️', xpRequired: 1000 },
  { id: 'star_trail',   label: 'Star Trail',   emoji: '⭐', xpRequired: 500 },
  { id: 'lightning',    label: 'Lightning',     emoji: '⚡', xpRequired: 2000 },
  { id: 'rainbow_glow', label: 'Rainbow',      emoji: '🌈', xpRequired: 2000 },
  { id: 'flower_bloom', label: 'Flowers',      emoji: '🌸' },
  { id: 'galaxy_swirl', label: 'Galaxy',       emoji: '🌌', xpRequired: 5000 },
]

// ── SKIN TONES ────────────────────────────────────────
export const SKIN_TONES = [
  { hex: '#FDDBB4', name: 'Ivory' },
  { hex: '#F5C99A', name: 'Peach' },
  { hex: '#E8B480', name: 'Warm Sand' },
  { hex: '#D09B6A', name: 'Golden' },
  { hex: '#C08050', name: 'Honey' },
  { hex: '#A0693A', name: 'Caramel' },
  { hex: '#7A4828', name: 'Mocha' },
  { hex: '#5C3118', name: 'Espresso' },
  { hex: '#3B1E0A', name: 'Ebony' },
]

export const HAIR_COLORS = [
  '#1A0A00','#3B2507','#6B3A1A','#A05C2A',
  '#D4A55A','#F0D090','#FFFFFF',
  '#E8102A','#1E40AF','#059669','#7C3AED','#EC4899',
]

export const OUTFIT_COLORS = [
  '#7C3AED','#2563EB','#DC2626','#059669',
  '#D97706','#EC4899','#0891B2','#FFFFFF','#1F2937',
]

// ── Random defaults by gender ──────────────────────────
interface CharDefaults {
  hairStyle: string; outfit: string; shoes: string
}
export const BOY_DEFAULTS: CharDefaults[] = [
  { hairStyle: 'fade_cut',    outfit: 'superhero_suit', shoes: 'sneakers' },
  { hairStyle: 'short_spiky', outfit: 'ninja_gi',       shoes: 'high_tops' },
  { hairStyle: 'crew_cut',    outfit: 'street_wear',    shoes: 'sneakers' },
  { hairStyle: 'short_afro',  outfit: 'sports_jersey',  shoes: 'cleats' },
]
export const GIRL_DEFAULTS: CharDefaults[] = [
  { hairStyle: 'ponytail',    outfit: 'superhero_dress', shoes: 'sneakers' },
  { hairStyle: 'braids',      outfit: 'witch_dress',     shoes: 'boots' },
  { hairStyle: 'twin_tails',  outfit: 'tshirt_jeans',   shoes: 'sandals' },
  { hairStyle: 'long_wavy',   outfit: 'princess_gown',  shoes: 'heels' },
]

export const EFFECT_OVERLAYS: Record<string, { gradient: string; emoji: string[] }> = {
  fire_aura:    { gradient: '#ef444420', emoji: ['🔥','🔥'] },
  ice_crystals: { gradient: '#93c5fd20', emoji: ['❄️','❄️'] },
  star_trail:   { gradient: '#fbbf2420', emoji: ['⭐','✨'] },
  lightning:    { gradient: '#facc1520', emoji: ['⚡','⚡'] },
  rainbow_glow: { gradient: '#a78bfa20', emoji: ['🌈'] },
  sparkles:     { gradient: '#c084fc20', emoji: ['✨','✨','✨'] },
  flower_bloom: { gradient: '#ec489920', emoji: ['🌸','🌸'] },
  galaxy_swirl: { gradient: '#6d28d930', emoji: ['🌌','⭐'] },
}

// ── DiceBear avatar thumbnail mappings ────────────────────────────────────
const DB = 'https://api.dicebear.com/7.x/avataaars/svg'

const HAIR_DB: Record<string, string> = {
  fade_cut: 'ShortHairShortFlat', short_spiky: 'ShortHairFrizzle',
  crew_cut: 'ShortHairTheCaesar', cornrows: 'ShortHairDreads01',
  short_afro: 'ShortHairDreads02', slick_back: 'ShortHairShortRound',
  buzz_cut: 'ShortHairSides', messy_mop: 'ShortHairShaggyMullet',
  mohawk: 'ShortHairFrizzle', dreadlocks: 'LongHairDreads',
  long_wavy: 'LongHairCurvy', ponytail: 'LongHairMiaWallace',
  braids: 'LongHairFrida', twin_tails: 'LongHairStraight2',
  bob_cut: 'LongHairBob', top_bun: 'LongHairBun',
  curly_long: 'LongHairCurly', pigtails: 'LongHairFroBand',
  side_swept: 'LongHairStraight', space_buns: 'LongHairNotTooLong',
  short_curls: 'ShortHairShortCurly', curly_afro: 'ShortHairDreads01',
  wild_spiky: 'ShortHairFrizzle', shaggy: 'ShortHairShaggyMullet',
  fluffy: 'ShortHairShortWaved', bald: 'NoHair', undercut: 'ShortHairSides',
}

const EYE_DB: Record<string, string> = {
  round: 'Default', almond: 'Side', big_anime: 'Surprised',
  narrow: 'Squint', sparkle: 'Happy', sleepy: 'Close',
}

const OUTFIT_DB: Record<string, string> = {
  tshirt_jeans: 'ShirtCrewNeck', hoodie: 'Hoodie',
  sports_jersey: 'GraphicShirt', ninja_gi: 'Overall',
  knight_armor: 'BlazerShirt', superhero_suit: 'BlazerSweater',
  wizard_robe: 'CollarSweater', lab_coat: 'BlazerShirt',
  space_suit: 'Overall', street_wear: 'ShirtVNeck', pirate: 'Overall',
  princess_gown: 'ShirtScoopNeck', superhero_dress: 'BlazerSweater',
  ballet_outfit: 'ShirtScoopNeck', sport_skirt: 'ShirtCrewNeck',
  ninja_uniform: 'Overall', witch_dress: 'CollarSweater',
  jumpsuit: 'Overall', battle_armor: 'BlazerShirt', cloak: 'CollarSweater',
  casual: 'GraphicShirt',
}

export function getHairImage(hairId: string, gender: string, hairColor = '2c1b18'): string {
  const top = HAIR_DB[hairId] ?? 'ShortHairShortFlat'
  const col = hairColor.replace('#', '')
  const bg  = gender === 'girl' ? 'fce4ec' : 'dbeafe'
  return `${DB}?backgroundColor=${bg}&top=${top}&hairColor=${col}&eyes=Default&clotheType=BlazerShirt&clotheColor=3c4f5c&accessoriesChance=0&facialHairChance=0&skinColor=f8d5c2`
}

export function getEyeImage(eyeId: string): string {
  const eyes = EYE_DB[eyeId] ?? 'Default'
  return `${DB}?backgroundColor=1a1040&top=ShortHairShortFlat&hairColor=2c1b18&eyes=${eyes}&clotheType=BlazerShirt&clotheColor=3c4f5c&accessoriesChance=0&facialHairChance=0&skinColor=f8d5c2`
}

export function getOutfitImage(outfitId: string, gender: string): string {
  const clothe = OUTFIT_DB[outfitId] ?? 'ShirtCrewNeck'
  const top    = gender === 'girl' ? 'LongHairStraight' : 'ShortHairShortFlat'
  const bg     = gender === 'girl' ? 'fce4ec' : 'dbeafe'
  return `${DB}?backgroundColor=${bg}&top=${top}&hairColor=2c1b18&eyes=Default&clotheType=${clothe}&clotheColor=3c4f5c&accessoriesChance=0&facialHairChance=0&skinColor=f8d5c2`
}

// Noto Emoji HD PNGs
const NOTO = 'https://fonts.gstatic.com/s/e/notoemoji/latest'
export function notoUrl(cp: string): string { return `${NOTO}/${cp}/512.webp` }

export const SHOE_IMAGES: Record<string, string> = {
  sneakers: notoUrl('1f45f'), high_tops: notoUrl('1f45f'),
  boots: notoUrl('1f97e'), flip_flops: notoUrl('1fa74'),
  rocket_boots: notoUrl('1f680'), cleats: notoUrl('26bd'),
  heels: notoUrl('1f460'), sandals: notoUrl('1fa74'), ballet_flats: notoUrl('1fa70'),
}
export const HAT_IMAGES: Record<string, string> = {
  none: notoUrl('274c'), baseball: notoUrl('1f9e2'), beanie: notoUrl('1f9e3'),
  helmet: notoUrl('1fa96'), pirate_hat: notoUrl('2620'), top_hat: notoUrl('1f3a9'),
  wizard_hat: notoUrl('1f9d9'), crown: notoUrl('1f451'), flower_crown: notoUrl('1f338'),
  witch_hat: notoUrl('1f9d9'), tiara: notoUrl('1f451'), party_hat: notoUrl('1f389'),
}
export const ACCESSORY_IMAGES: Record<string, string> = {
  none: notoUrl('274c'), glasses: notoUrl('1f453'), wings: notoUrl('1fab7'),
  sword: notoUrl('2694'), shield: notoUrl('1f6e1'), wand: notoUrl('1fa84'),
  backpack: notoUrl('1f392'), bow_arrow: notoUrl('1f3f9'), dragon_pet: notoUrl('1f409'), lasso: notoUrl('1f920'),
}
export const EFFECT_IMAGES: Record<string, string> = {
  none: notoUrl('274c'), sparkles: notoUrl('2728'), fire_aura: notoUrl('1f525'),
  ice_crystals: notoUrl('2744'), star_trail: notoUrl('2b50'), lightning: notoUrl('26a1'),
  rainbow_glow: notoUrl('1f308'), flower_bloom: notoUrl('1f338'), galaxy_swirl: notoUrl('1f30c'),
}

// ── LOCAL STATIC IMAGES (bundled via require) ─────────────────────────────

// Story style thumbnails — use as: <Image source={STYLE_ICONS.cartoon} />
export const STYLE_ICONS: Record<string, ImageSourcePropType> = {
  cartoon:   require('../../assets/icon_cartoon.png'),
  cinematic: require('../../assets/icon_cinematic.png'),
  comic:     require('../../assets/icon_comic.png'),
  epic:      require('../../assets/icon_epic.png'),
  pixar:     require('../../assets/icon_pixar.png'),
  realistic: require('../../assets/icon_realistic.png'),
}

export type StyleIconKey = keyof typeof STYLE_ICONS

// Dashboard quick-launch card images — use as: <Image source={QUICK_CARDS.story} />
export const QUICK_CARDS: Record<string, ImageSourcePropType> = {
  story:     require('../../assets/quick_card_story.png'),
  character: require('../../assets/quick_card_character.png'),
  movie:     require('../../assets/quick_card_movie.png'),
}

export type QuickCardKey = keyof typeof QUICK_CARDS

// Character portrait icons — use as: <Image source={CHAR_ICONS['lion']} />
export const CHAR_ICONS: Record<string, ImageSourcePropType> = {
  cipher:              require('../../assets/char_icons/cipher.png'),
  disney_adventuregirl:require('../../assets/char_icons/disney_adventuregirl.png'),
  disney_dragonrider:  require('../../assets/char_icons/disney_dragonrider.png'),
  disney_farmboy:      require('../../assets/char_icons/disney_farmboy.png'),
  disney_forestgirl:   require('../../assets/char_icons/disney_forestgirl.png'),
  disney_icegirl:      require('../../assets/char_icons/disney_icegirl.png'),
  disney_marineboy:    require('../../assets/char_icons/disney_marineboy.png'),
  disney_musicgirl:    require('../../assets/char_icons/disney_musicgirl.png'),
  disney_seaprince:    require('../../assets/char_icons/disney_seaprince.png'),
  disney_snowqueen:    require('../../assets/char_icons/disney_snowqueen.png'),
  disney_stargazer:    require('../../assets/char_icons/disney_stargazer.png'),
  disney_sunprince:    require('../../assets/char_icons/disney_sunprince.png'),
  disney_tinkerboy:    require('../../assets/char_icons/disney_tinkerboy.png'),
  disney_witchgirl:    require('../../assets/char_icons/disney_witchgirl.png'),
  fairy:               require('../../assets/char_icons/fairy.png'),
  fox:                 require('../../assets/char_icons/fox.png'),
  goddess:             require('../../assets/char_icons/goddess.png'),
  hero_aquarush:       require('../../assets/char_icons/hero_aquarush.png'),
  hero_blaze:          require('../../assets/char_icons/hero_blaze.png'),
  hero_galaxybrave:    require('../../assets/char_icons/hero_galaxybrave.png'),
  hero_gearbolt:       require('../../assets/char_icons/hero_gearbolt.png'),
  hero_ironveil:       require('../../assets/char_icons/hero_ironveil.png'),
  hero_moonshield:     require('../../assets/char_icons/hero_moonshield.png'),
  hero_prismqueen:     require('../../assets/char_icons/hero_prismqueen.png'),
  hero_shadowclaw:     require('../../assets/char_icons/hero_shadowclaw.png'),
  hero_stoneguard:     require('../../assets/char_icons/hero_stoneguard.png'),
  hero_stormwing:      require('../../assets/char_icons/hero_stormwing.png'),
  hero_terravine:      require('../../assets/char_icons/hero_terravine.png'),
  hero_thunderstrike:  require('../../assets/char_icons/hero_thunderstrike.png'),
  hero_titanfist:      require('../../assets/char_icons/hero_titanfist.png'),
  hero_windrunner:     require('../../assets/char_icons/hero_windrunner.png'),
  knight_girl:         require('../../assets/char_icons/knight_girl.png'),
  lion:                require('../../assets/char_icons/lion.png'),
  merlin:              require('../../assets/char_icons/merlin.png'),
  nova_pulse:          require('../../assets/char_icons/nova_pulse.png'),
  owl:                 require('../../assets/char_icons/owl.png'),
  princess_aurora:     require('../../assets/char_icons/princess_aurora.png'),
  princess_coral:      require('../../assets/char_icons/princess_coral.png'),
  princess_ember:      require('../../assets/char_icons/princess_ember.png'),
  princess_ivy:        require('../../assets/char_icons/princess_ivy.png'),
  princess_jade:       require('../../assets/char_icons/princess_jade.png'),
  princess_nova:       require('../../assets/char_icons/princess_nova.png'),
  princess_pearl:      require('../../assets/char_icons/princess_pearl.png'),
  princess_rosegold:   require('../../assets/char_icons/princess_rosegold.png'),
  princess_sapphire:   require('../../assets/char_icons/princess_sapphire.png'),
  princess_violet:     require('../../assets/char_icons/princess_violet.png'),
  sherlock:            require('../../assets/char_icons/sherlock.png'),
  sovereign:           require('../../assets/char_icons/sovereign.png'),
}
