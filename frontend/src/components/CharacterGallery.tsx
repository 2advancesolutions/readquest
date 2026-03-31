import { useState } from 'react'
import { motion } from 'framer-motion'

interface CharEntry {
  name: string
  emoji: string      // fallback if image fails to load
  img: string        // AI-generated artwork — every character is unique
  visualDesc: string  // precise visual description for AI image generation consistency
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPLETE CHARACTER ROSTER — ordered K → 8th grade
//  ◉ K–2  : cute, whimsical, Pixar-style originals
//  ◉ 3–5  : adventure & classic archetypes
//  ◉ 6–8  : comic-book & cinematic teen heroes (unique new artworks)
//  Zero copyrighted IP. Zero duplicate image paths.
//  Every character has a `visualDesc` that locks in their exact appearance
//  so the AI image generator renders the SAME character across all story pages.
// ─────────────────────────────────────────────────────────────────────────────
export const ALL_CHARACTERS: CharEntry[] = [

  // ── Kindergarten ─────────────────────────────────────────────────────────
  { name: 'Sparkle',         emoji: '🦄', img: '/char_icons/unicorn.webp',
    visualDesc: 'Sparkle the unicorn — cute cartoon white unicorn with a rainbow mane in pink, purple, blue and yellow, a golden spiraling horn, big sparkling purple eyes, rosy cheeks, and a fluffy pastel tail' },
  { name: 'Bindi Bunny',     emoji: '🐰', img: '/char_icons/bunny.webp',
    visualDesc: 'Bindi Bunny — adorable cartoon white bunny with long floppy ears tipped in soft pink, big round blue eyes, a small pink nose, wearing a tiny yellow flower crown' },
  { name: 'Pip the Penguin', emoji: '🐧', img: '/char_icons/penguin.webp',
    visualDesc: 'Pip the Penguin — cute cartoon baby penguin with black-and-white body, round orange beak, big shiny dark eyes, small flappy wings, wearing a tiny red scarf' },

  // ── Grade 1 ──────────────────────────────────────────────────────────────
  { name: 'Dino Rex',        emoji: '🦕', img: '/char_icons/dinosaur.webp',
    visualDesc: 'Dino Rex — friendly cartoon green T-Rex dinosaur with big amber eyes, tiny arms, a wide toothy grin, orange belly, and small spikes along the back, playful and cute' },
  { name: 'Leo the Lion',    emoji: '🦁', img: '/char_icons/lion.webp',
    visualDesc: 'Leo the Lion — brave cartoon lion cub with a golden-orange fluffy mane, warm brown eyes, a pink nose, tawny fur, and a tufted tail tip' },
  { name: 'Sage the Owl',    emoji: '🦉', img: '/char_icons/owl.webp',
    visualDesc: 'Sage the Owl — wise cartoon owl with brown-and-cream feathers, large round golden eyes with spectacle-like markings, a small orange beak, and tufted ear feathers' },

  // ── Grade 2 ──────────────────────────────────────────────────────────────
  { name: 'Lily the Fairy',  emoji: '🧚', img: '/char_icons/fairy.webp',
    visualDesc: 'Lily the Fairy — cute young fairy girl with long flowing blonde hair, sparkling blue eyes, translucent iridescent butterfly wings, wearing a pink-and-purple petal dress, holding a glowing magic wand with a star tip' },
  { name: 'Marina',          emoji: '🧜', img: '/char_icons/mermaid.webp',
    visualDesc: 'Marina the Mermaid — young cartoon mermaid girl with flowing turquoise-blue hair decorated with seashells, green eyes, wearing a purple seashell top, a shimmering teal-and-green fish tail, pearl necklace' },
  { name: 'Zap the Robot',   emoji: '🤖', img: '/char_icons/robot.webp',
    visualDesc: 'Zap the Robot — friendly cartoon robot with a boxy silver-blue metal body, a rounded head with two large glowing green circular eyes, antenna on top, articulated arms with claw hands, and a small LED panel chest' },

  // ── Grade 3 ──────────────────────────────────────────────────────────────
  { name: 'Wizard Kid',      emoji: '🧙', img: '/char_icons/young_wizard.webp',
    visualDesc: 'Wizard Kid — young boy wizard with messy brown hair, bright green eyes, wearing a purple pointed wizard hat with gold stars, a long blue-purple robe with gold trim, holding a wooden magic staff with a glowing crystal' },
  { name: 'Zoom',            emoji: '⚡', img: '/char_icons/kid_hero.webp',
    visualDesc: 'Zoom the Kid Hero — energetic young boy with spiky blonde hair, bright blue eyes, wearing a red-and-yellow superhero suit with a lightning bolt emblem on the chest, a small red cape, and blue boots' },
  { name: 'Captain Mia',     emoji: '🏴‍☠️', img: '/char_icons/pirate.webp',
    visualDesc: 'Captain Mia — adventurous young girl pirate with wavy red hair in a ponytail, freckles, green eyes, wearing a brown leather tricorn pirate hat, a white ruffled shirt, brown vest, and a toy cutlass at her belt' },

  // ── Grade 4 ──────────────────────────────────────────────────────────────
  { name: 'Crystal Mage',    emoji: '🔮', img: '/char_icons/mage.webp',
    visualDesc: 'Crystal Mage — young sorceress with long silver-white hair, glowing violet eyes, wearing a deep purple hooded cloak with crystal embroidery, holding a floating purple crystal orb, magical energy swirling around her hands' },
  { name: 'Princess Kira',   emoji: '⚔️', img: '/char_icons/knight_girl.webp',
    visualDesc: 'Princess Kira — brave young warrior princess with long dark brown braided hair, brown eyes, wearing silver knight armor with gold accents, a red royal cape, and carrying a silver sword and shield with a lion crest' },
  { name: 'Shadow Fox',      emoji: '🦊', img: '/char_icons/fox.webp',
    visualDesc: 'Shadow Fox — sleek anthropomorphic fox with dark reddish-brown fur, piercing amber-gold eyes, a bushy tail with a white tip, wearing a dark hooded cloak, stealthy and mysterious, ninja-like' },

  // ── Grade 5 ──────────────────────────────────────────────────────────────
  { name: 'Robin Hood',      emoji: '🏹', img: '/char_icons/explorer.webp',
    visualDesc: 'Robin Hood — young adventurer with tousled brown hair, hazel eyes, wearing a green tunic and brown leather vest, a green feathered cap, brown boots, carrying a wooden bow and a quiver of arrows on the back' },
  { name: 'Jade Dragon',     emoji: '🐉', img: '/char_icons/dragon.webp',
    visualDesc: 'Jade Dragon — majestic emerald-green dragon with jade-colored scales, golden eyes with slit pupils, two curved ivory horns, large green wings with golden membrane, a long serpentine tail, breathing jade-green fire' },
  { name: 'Coral Diver',     emoji: '🌊', img: '/char_icons/coral_diver.webp',
    visualDesc: 'Coral Diver — young deep-sea diver kid with short dark hair, brown eyes, wearing a teal-blue diving suit with orange accents, a clear dome diving helmet, flippers, carrying an underwater flashlight, surrounded by coral' },

  // ── Grade 6 — Comic-book style ───────────────────────────────────────────
  { name: 'Merlin',          emoji: '✨', img: '/char_icons/merlin.webp',
    visualDesc: 'Merlin — elderly wise wizard with a long flowing white beard, deep blue eyes under bushy eyebrows, wearing a tall pointed midnight-blue hat adorned with silver stars and moons, long blue robes, holding a gnarled wooden staff' },
  { name: 'Nova Pulse',      emoji: '💜', img: '/char_icons/nova_pulse.webp',
    visualDesc: 'Nova Pulse — Black teenage girl superhero with dark curly natural afro hair, amber-golden eyes, freckles on her cheeks, wearing a sleek purple high-tech armored bodysuit with glowing blue neon circuit lines and a stylized R emblem on the chest, comic-book art style' },
  { name: 'Athena',          emoji: '🦉', img: '/char_icons/goddess.webp',
    visualDesc: 'Athena — regal young goddess with long flowing dark hair adorned with a golden laurel wreath crown, wise grey eyes, wearing white-and-gold Greek armor with a golden breastplate, holding a golden spear and a round shield with an owl emblem' },

  // ── Grade 7 — Cinematic realistic ────────────────────────────────────────
  { name: 'Sky Knight',      emoji: '🛡️', img: '/char_icons/warrior.webp',
    visualDesc: 'Sky Knight — young male warrior with short dark hair, determined brown eyes, wearing gleaming silver plate armor with blue cape and gold shoulder pauldrons, holding a longsword and a kite shield with a wing crest, heroic stance' },
  { name: 'Cipher',          emoji: '🔵', img: '/char_icons/cipher.webp',
    visualDesc: 'Cipher — mysterious teen hacker with short styled dark hair with a blue streak, wearing a dark hoodie and a glowing blue holographic visor over the eyes, digital code particles floating around, cyberpunk aesthetic' },
  { name: 'Alice',           emoji: '🐇', img: '/char_icons/alice.webp',
    visualDesc: 'Alice — curious young girl with long blonde hair held back by a blue headband, big blue eyes, wearing a classic blue-and-white pinafore dress with a white apron, black shoes, holding a small pocket watch, wonderland fantasy style' },

  // ── Grade 8 — Epic cinematic ─────────────────────────────────────────────
  { name: 'Sherlock',        emoji: '🔍', img: '/char_icons/sherlock.webp',
    visualDesc: 'Sherlock — young teen detective with wavy dark brown hair, sharp intelligent grey-green eyes, wearing a long brown tweed overcoat, a dark scarf, holding a magnifying glass, deerstalker cap, Victorian-era inspired outfit' },
  { name: 'Nova Scout',      emoji: '🚀', img: '/char_icons/nova.webp',
    visualDesc: 'Nova Scout — young cartoon kid astronaut with messy blue-and-orange tipped hair sticking out of a clear space helmet, big bright blue eyes, freckles, wearing a white-and-orange space suit with a SCOUT name badge, blue gloves, jetpack on back, floating in a colorful galaxy' },
  { name: 'Sovereign',       emoji: '👑', img: '/char_icons/sovereign.webp',
    visualDesc: 'Sovereign — regal young ruler with flowing golden hair, piercing blue eyes, wearing an ornate gold-and-crimson royal suit of armor with a fur-trimmed cape, a jeweled golden crown, holding a scepter with a glowing gem' },
]

// ─────────────────────────────────────────────────────────────────────────────
//  COPYRIGHT KEYWORD BLOCKLIST
// ─────────────────────────────────────────────────────────────────────────────
export const BLOCKED_IP_TERMS: string[] = [
  // Disney classic
  'mickey mouse','minnie mouse','donald duck','goofy','pluto','dumbo','bambi',
  'cinderella','sleeping beauty','snow white','ariel','belle','beast','aladdin',
  'jasmine','simba','mufasa','nala','pocahontas','mulan','lilo','stitch','moana',
  'encanto','mirabel','raya','elsa','anna','olaf','rapunzel','flynn rider',
  'tinker bell','peter pan','wendy','pinocchio','jiminy cricket',
  'winnie the pooh','tigger','piglet','buzz lightyear',
  'woody','jessie','sully','mike wazowski','nemo','dory','remy','wall-e',
  'mcqueen','mater','baymax','hiro hamada','joy','sadness','tiana',
  'merida','hades','tarzan','zootopia','judy hopps',
  'nick wilde','wreck it ralph','vanellope',
  // Marvel
  'spider-man','spiderman','peter parker','iron man','tony stark',
  'captain america','steve rogers','thor','hulk','bruce banner','black widow',
  'natasha romanoff','hawkeye','clint barton','black panther','tchalla',
  'doctor strange','ant-man','scarlet witch','wanda maximoff','vision',
  'wolverine','deadpool','wade wilson','x-men','cyclops','jean grey',
  'magneto','professor x','fantastic four','avengers','thanos','loki',
  'nick fury','captain marvel','carol danvers','guardians of the galaxy',
  'star-lord','groot','rocket raccoon','gamora','drax','nebula','shazam',
  // Star Wars
  'luke skywalker','darth vader','princess leia','han solo','yoda',
  'obi-wan','obi wan','r2-d2','r2d2','c-3po','c3po','chewbacca','boba fett',
  'mandalorian','grogu','baby yoda','rey','kylo ren','palpatine',
  // Nintendo
  'mario','luigi','princess peach','bowser','yoshi','toad','donkey kong',
  'link','zelda','ganondorf','samus','kirby','pikachu','mewtwo','charizard',
  'pokemon','eevee','bulbasaur','squirtle','charmander',
  'fox mccloud','inkling','animal crossing','isabelle','tom nook',
  // DC
  'superman','batman','wonder woman','the flash','aquaman','green lantern',
  'joker','lex luthor','harley quinn','catwoman','robin','nightwing',
  'cyborg','green arrow','teen titans',
  // DreamWorks / Universal
  'shrek','fiona','puss in boots','kung fu panda','po','hiccup',
  'toothless','minion','gru','madagascar','trolls','boss baby',
  // Sony / Gaming
  'kratos','nathan drake','joel','ellie','aloy','ratchet','clank',
  'crash bandicoot','spyro','master chief','marcus fenix','banjo kazooie',
  'sonic','tails','knuckles','amy rose','shadow the hedgehog','dr eggman',
  'mega man','ryu','chun-li','ken masters','lara croft','cloud strife',
  'tifa lockhart','aerith','sephiroth','kingdom hearts',
  // Anime
  'goku','vegeta','naruto','sasuke','luffy','zoro','sailor moon','bleach',
  'eren','mikasa','tanjiro','deku','izuku midoriya','edward elric','light yagami',
  'itadori','sword art online','genos','saitama','evangelion','rei','asuka',
  // TV
  'bart simpson','homer simpson','stewie griffin','rick sanchez','morty',
  'aang','korra','spongebob','peppa pig','paw patrol','bluey','bingo',
  'stranger things','eleven','game of thrones','jon snow','daenerys',
  // Movies / Other
  'harry potter','hermione','ron weasley','dumbledore','voldemort',
  'frodo','gandalf','aragorn','legolas','gimli','transformers','optimus prime',
  'ghostbusters','tmnt','teenage mutant ninja turtles','power rangers',
  'terminator','ronald mcdonald',
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
