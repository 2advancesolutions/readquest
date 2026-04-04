import { useState } from 'react'
import { motion } from 'framer-motion'

interface CharEntry {
  name: string
  emoji: string      // fallback if image fails to load
  img: string        // AI-generated artwork — every character is unique
  visualDesc: string  // precise visual description for AI image generation consistency
}

// ─────────────────────────────────────────────────────────────────────────────
//  CHARACTER ROSTER — Disney-inspired Adventurers first, then Superheroes
//  All characters use transparent PNG assets.
//  Every character has a `visualDesc` that locks in their exact appearance
//  so the AI image generator renders the SAME character across all story pages.
// ─────────────────────────────────────────────────────────────────────────────
export const ALL_CHARACTERS: CharEntry[] = [

  // ── Disney-inspired Adventurers ──────────────────────────────────────────
  { name: 'Sea Prince',      emoji: '🌊', img: '/char_icons/disney_seaprince.png',
    visualDesc: 'Sea Prince — charming young ocean prince with wavy aquamarine hair, bright sea-blue eyes, wearing a shimmering teal-and-gold ocean-themed tunic with coral accents, a triton symbol, relaxed confident smile' },
  { name: 'Snow Queen',      emoji: '❄️', img: '/char_icons/disney_snowqueen.png',
    visualDesc: 'Snow Queen — elegant young queen with flowing platinum blonde hair adorned with ice crystal crown, pale blue eyes, wearing a translucent ice-blue gown with snowflake patterns and sparkling frost cape' },
  { name: 'Sun Prince',      emoji: '☀️', img: '/char_icons/disney_sunprince.png',
    visualDesc: 'Sun Prince — dashing young prince with golden-brown sun-kissed hair, warm amber eyes, wearing a vibrant golden-yellow royal tunic with sun motifs and flowing orange cape, bright charismatic smile' },
  { name: 'Adventure Girl',  emoji: '🏔️', img: '/char_icons/disney_adventuregirl.png',
    visualDesc: 'Adventure Girl — spirited young explorer girl with curly auburn hair in pigtails, bright hazel eyes, wearing a teal explorer vest over white shirt, rugged brown boots, carrying a map and compass' },
  { name: 'Forest Girl',     emoji: '🌲', img: '/char_icons/disney_forestgirl.png',
    visualDesc: 'Forest Girl — nature-loving girl with long straight dark hair adorned with twigs and flowers, warm brown eyes, wearing a green-and-brown woodland tunic with leaf patterns, barefoot with deer companion' },
  { name: 'Marine Boy',      emoji: '🐬', img: '/char_icons/disney_marineboy.png',
    visualDesc: 'Marine Boy — cheerful ocean-loving boy with short spiky saltwater-bleached hair, sea-green eyes, wearing a blue-and-white sailor-style outfit with ocean wave patterns, holding a friendly dolphin' },
  { name: 'Star Gazer',      emoji: '⭐', img: '/char_icons/disney_stargazer.png',
    visualDesc: 'Star Gazer — dreamy young astronomer girl with dark curly hair dotted with star clips, wide curious dark eyes, wearing a deep purple dress with constellation patterns, holding a golden telescope' },
  { name: 'Dragon Rider',    emoji: '🐲', img: '/char_icons/disney_dragonrider.png',
    visualDesc: 'Dragon Rider — brave teen boy with windswept dark blond hair, determined blue eyes, wearing a Viking-inspired leather armor with dragon-scale patterns, riding atop a small friendly baby dragon companion' },
  { name: 'Music Girl',      emoji: '🎵', img: '/char_icons/disney_musicgirl.png',
    visualDesc: 'Music Girl — talented young musician girl with long wavy chestnut hair with floral clips, bright expressive brown eyes, wearing a colorful flowy dress with musical note patterns, playing a glowing guitar' },
  { name: 'Tinker Boy',      emoji: '🔧', img: '/char_icons/disney_tinkerboy.png',
    visualDesc: 'Tinker Boy — inventive young mechanic boy with short messy blond hair, curious green eyes and freckles, wearing brass-goggled leather cap, a tool-belt overalls, holding a glowing gadget he built himself' },
  { name: 'Witch Girl',      emoji: '🧹', img: '/char_icons/disney_witchgirl.png',
    visualDesc: 'Witch Girl — young friendly witch apprentice with short black hair and a cropped sparkle hat, curious purple eyes, wearing a starry purple-black cloak, riding a broom with a glowing rune tip, cute black cat on shoulder' },
  { name: 'Farm Boy',        emoji: '🌾', img: '/char_icons/disney_farmboy.png',
    visualDesc: 'Farm Boy — wholesome young hero with clean-cut sandy brown hair, honest blue eyes, wearing simple farm clothes with a plaid shirt and dungarees, holding a glowing magical sword he discovered in a field' },
  { name: 'Ice Girl',        emoji: '🧊', img: '/char_icons/disney_icegirl.png',
    visualDesc: 'Ice Girl — cool and playful girl with braided platinum hair and icy blue streaks, bright sky-blue eyes, wearing a sparkling frost-blue tunic with snowflake embroidery, skating on self-created ice path' },

  // ── Superheroes ──────────────────────────────────────────────────────────
  { name: 'Blaze',           emoji: '🔥', img: '/char_icons/hero_blaze.png',
    visualDesc: 'Blaze — teen superhero with spiked fiery orange-red hair, intense amber eyes, wearing a sleek crimson bodysuit with flame patterns and glowing orange chest emblem, fire energy radiating from fists, dynamic heroic pose' },
  { name: 'Storm Wing',      emoji: '🌩️', img: '/char_icons/hero_stormwing.png',
    visualDesc: 'Storm Wing — young superhero with silver-white hair, electric blue eyes, wearing a dark blue aerodynamic suit with lightning bolt accents and silver wing-shaped pauldrons, crackling electricity around hands' },
  { name: 'Titan Fist',      emoji: '💪', img: '/char_icons/hero_titanfist.png',
    visualDesc: 'Titan Fist — powerful young male hero with broad shoulders, dark short hair, determined brown eyes, wearing a heavy titanium-grey armored suit with glowing orange power-core gauntlets and red chest emblem' },
  { name: 'Shadow Claw',     emoji: '🐾', img: '/char_icons/hero_shadowclaw.png',
    visualDesc: 'Shadow Claw — agile young hero with dark purple-black hair, silver-grey eyes, wearing a sleek obsidian bodysuit with claw-tipped gloves, shadow energy trails behind movements, stealthy predator aesthetic' },
  { name: 'Aqua Rush',       emoji: '💧', img: '/char_icons/hero_aquarush.png',
    visualDesc: 'Aqua Rush — teen water hero with sea-blue hair and turquoise streaks, teal eyes, wearing a flowing blue-white suit with water wave patterns, water swirling around arms and feet in dynamic pose' },
  { name: 'Gear Bolt',       emoji: '⚙️', img: '/char_icons/hero_gearbolt.png',
    visualDesc: 'Gear Bolt — tech-genius young hero with goggles pushed up on short brown hair, sharp hazel eyes, wearing a yellow-and-brown mechanical suit with visible gears, utility belt with gadgets, wrench in hand' },
  { name: 'Terra Vine',      emoji: '🌿', img: '/char_icons/hero_terravine.png',
    visualDesc: 'Terra Vine — nature hero teen girl with flowing green-streaked dark hair woven with leaves, forest-green eyes, wearing an earthy green bodysuit with vine patterns, glowing plant tendrils extending from hands' },
  { name: 'Frost Nova',      emoji: '❄️', img: '/char_icons/hero_frostnova.png',
    visualDesc: 'Frost Nova — ice hero with stark white hair with blue tips, icy pale blue eyes, wearing a crystalline blue-white bodysuit with snowflake patterns, ice crystals forming around outstretched hands' },
  { name: 'Moon Shield',     emoji: '🌙', img: '/char_icons/hero_moonshield.png',
    visualDesc: 'Moon Shield — graceful teen girl hero with silvery-white hair, luminous silver eyes, wearing a midnight-blue armor with crescent moon motifs and a glowing silver shield, moonlight aura surrounding her' },
  { name: 'Thunder Strike',  emoji: '⚡', img: '/char_icons/hero_thunderstrike.png',
    visualDesc: 'Thunder Strike — bold young male hero with gold-tipped dark hair, golden eyes, wearing a yellow-and-black armored suit with thunderbolt chest emblem, electric sparks crackling around the body' },
  { name: 'Iron Veil',       emoji: '🛡️', img: '/char_icons/hero_ironveil.png',
    visualDesc: 'Iron Veil — mysterious female hero with dark crimson hair pulled back, violet eyes, wearing a sleek dark red armored suit with interlocking iron plates and a translucent energy veil shield' },
  { name: 'Galaxy Brave',    emoji: '🌌', img: '/char_icons/hero_galaxybrave.png',
    visualDesc: 'Galaxy Brave — cosmic hero boy with galaxy-pattern dark hair showing stars, deep purple eyes with starlight flecks, wearing a deep space black suit with nebula-colored energy trails and a glowing star emblem' },
  { name: 'Wind Runner',     emoji: '💨', img: '/char_icons/hero_windrunner.png',
    visualDesc: 'Wind Runner — swift teen girl hero with windswept teal hair always in motion, bright green eyes, wearing a light grey aerodynamic suit with wind-slash patterns and speed trails behind, always in running pose' },
  { name: 'Prism Queen',     emoji: '🌈', img: '/char_icons/hero_prismqueen.png',
    visualDesc: 'Prism Queen — radiant hero girl with prismatic hair shifting through rainbow colors, sparkling multicolored eyes, wearing a white crystalline bodysuit that refracts light into rainbow shards, light beams emanating from hands' },
  { name: 'Stone Guard',     emoji: '🪨', img: '/char_icons/hero_stoneguard.png',
    visualDesc: 'Stone Guard — sturdy male hero with short sandy hair, warm brown eyes, wearing a rocky stone-textured brown-grey armor with ancient rune markings and massive stone gauntlets, earth energy rumbling around him' },
]


// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  onSelect: (name: string) => void
  onHoverChar?: (name: string) => void
  onHoverLeave?: () => void
  onVerified?: (chars: CharEntry[]) => void
}

function CharCard({ char, onSelect, onHoverChar, onHoverLeave, onVerified, all }: {
  char: CharEntry
  onSelect: (n: string) => void
  onHoverChar?: (n: string) => void
  onHoverLeave?: () => void
  onVerified?: (chars: CharEntry[]) => void
  all: CharEntry[]
}) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <motion.button
      className="cgal-circle-wrap"
      whileHover={{ scale: 1.12, y: -6 }}
      whileTap={{ scale: 0.92 }}
      onClick={() => { onVerified?.(all); onSelect(char.name) }}
      onMouseEnter={() => onHoverChar?.(char.name)}
      onMouseLeave={() => onHoverLeave?.()}
      title={`Choose ${char.name} as your hero`}
    >
      <div className={`cgal-circle ${!imgFailed ? 'cgal-img-circle' : 'cgal-emoji-circle'}`}>
        {!imgFailed ? (
          <img
            src={char.img}
            alt={char.name}
            className="cgal-circle-img"
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="cgal-char-emoji">{char.emoji}</span>
        )}
      </div>
      <span className="cgal-circle-name">{char.name}</span>
    </motion.button>
  )
}

export default function CharacterGallery({ onSelect, onHoverChar, onHoverLeave, onVerified }: Props) {
  return (
    <div className="cgal-section">
      <div className="cgal-header">
        <span className="cgal-label">Pick your hero — click one to start! ✨</span>
      </div>
      <div className="cgal-grid">
        {ALL_CHARACTERS.map(char => (
          <CharCard
            key={char.name}
            char={char}
            all={ALL_CHARACTERS}
            onSelect={onSelect}
            onHoverChar={onHoverChar}
            onHoverLeave={onHoverLeave}
            onVerified={onVerified}
          />
        ))}
      </div>
    </div>
  )
}
