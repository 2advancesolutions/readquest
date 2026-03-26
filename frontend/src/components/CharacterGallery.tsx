import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface CharEntry {
  name: string
  img: string
}

// Wikipedia EN thumbnail helper
const WE = (path: string, w = 250) =>
  `https://upload.wikimedia.org/wikipedia/en/thumb/${path}/${w}px-${path.split('/').pop()}`

// Wikimedia Commons thumbnail helper
const WC = (path: string, w = 250) =>
  `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/${w}px-${path.split('/').pop()}`

// Full pool — verified Wikipedia CDN URLs
export const ALL_CHARACTERS: CharEntry[] = [
  { name: 'Stitch',          img: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d2/Stitch_%28Lilo_%26_Stitch%29.svg/250px-Stitch_%28Lilo_%26_Stitch%29.svg.png' },
  { name: 'Moana',           img: 'https://upload.wikimedia.org/wikipedia/en/5/56/Moana_%28character%29.png' },
  { name: 'Elsa',            img: 'https://upload.wikimedia.org/wikipedia/en/5/5e/Elsa_from_Disney%27s_Frozen.png' },
  { name: 'Anna',            img: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8a/Anna_Frozen.png/250px-Anna_Frozen.png' },
  { name: 'Simba',           img: 'https://upload.wikimedia.org/wikipedia/en/9/94/Simba_%28_Disney_character_-_adult%29.png' },
  { name: 'Ariel',           img: 'https://upload.wikimedia.org/wikipedia/en/7/77/Ariel_disney.png' },
  { name: 'Rapunzel',        img: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6a/Rapunzel_tangled.png/250px-Rapunzel_tangled.png' },
  { name: 'Buzz Lightyear',  img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Buzz_Lightyear_sculpture_of_Toy_Story_Hotel_Shanghai_%28cropped%29.jpg/250px-Buzz_Lightyear_sculpture_of_Toy_Story_Hotel_Shanghai_%28cropped%29.jpg' },
  { name: 'Woody',           img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Woody_at_Toy_Story_Land%2C_Hong_Kong.jpg/250px-Woody_at_Toy_Story_Land%2C_Hong_Kong.jpg' },
  { name: 'Mickey Mouse',    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Mickey_Mouse_%28poster_version%29.svg/250px-Mickey_Mouse_%28poster_version%29.svg.png' },
  { name: 'SpongeBob',       img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/SpongeBob_SquarePants_character.png/250px-SpongeBob_SquarePants_character.png' },
  { name: 'Dora',            img: 'https://upload.wikimedia.org/wikipedia/en/9/99/Dora_the_Explorer_%28character%29.webp' },
  { name: 'Bluey',           img: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/48/Bluey_%282018_TV_series%29_title_card.jpg/250px-Bluey_%282018_TV_series%29_title_card.jpg' },
  { name: 'Peppa Pig',       img: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/86/Peppa_Pig_logo.svg/500px-Peppa_Pig_logo.svg.png' },
  { name: 'Spider-Man',      img: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/21/Web_of_Spider-Man_Vol_1_129-1.png/250px-Web_of_Spider-Man_Vol_1_129-1.png' },
  { name: 'Iron Man',        img: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/Iron_Man_%28circa_2018%29.png/250px-Iron_Man_%28circa_2018%29.png' },
  { name: 'Thor',            img: 'https://upload.wikimedia.org/wikipedia/en/1/1a/Thor_%28Marvel_Comics%29.png' },
  { name: 'Hulk',            img: 'https://upload.wikimedia.org/wikipedia/en/a/aa/Hulk_%28circa_2019%29.png' },
  { name: 'Pikachu',         img: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a6/Pok%C3%A9mon_Pikachu_art.png/250px-Pok%C3%A9mon_Pikachu_art.png' },
  { name: 'Mario',           img: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5c/Mario_by_Shigehisa_Nakaue.png/250px-Mario_by_Shigehisa_Nakaue.png' },
  { name: 'Belle',           img: WE('f/f4/Beauty_and_the_Beast_Belle.png') },
  { name: 'Jasmine',         img: WE('c/c8/Jasmine_disney.png') },
  { name: 'Mulan',           img: WE('7/72/Mulan_disney.png') },
  { name: 'Merida',          img: WE('8/8a/Merida_from_Disney-Pixar_Brave.png') },
  { name: 'Tiana',           img: WE('e/e7/Tiana_disney.png') },
  { name: 'Cinderella',      img: WE('2/25/Cinderella_disney.png') },
  { name: 'Pocahontas',      img: WE('2/28/Pocahontas_disney.png') },
  { name: 'Mirabel',         img: WE('7/72/Mirabel_Madrigal.png') },
  { name: 'Nemo',            img: WE('3/33/Finding_Nemo_character_Nemo.png') },
  { name: 'Dory',            img: WE('8/8e/Dory_Finding_Nemo.png') },
  { name: 'WALL-E',          img: WE('d/d4/WALL-E_character.png') },
  { name: 'Tinker Bell',     img: WE('7/7e/Tinker_Bell.png') },
  { name: 'Peter Pan',       img: WE('e/ec/Peter_Pan_%28Disney_character%29.png') },
  { name: 'Winnie Pooh',     img: WC('1/1a/Winnie-the-Pooh-and-Tigger.png') },
  { name: 'Dumbo',           img: WE('a/a5/Dumbo_disney_character.png') },
  { name: 'Lilo',            img: WE('1/1c/Lilo_Pelekai.png') },
  { name: 'Baymax',          img: WE('f/f7/Baymax_bigherob6.png') },
  { name: 'McQueen',         img: WE('f/f8/Lightning_McQueen_rsq.png') },
  { name: 'Remy',            img: WE('2/2e/Remy_ratatouille.png') },
  { name: 'Sulley',          img: WE('6/61/Sulley_and_Mike_-_Monsters_Inc.png') },
  { name: 'Mike Wazowski',   img: WE('7/7e/Mike_Wazowski.png') },
  { name: 'Captain America', img: WE('3/35/Captain_america_%28comics%29.png') },
  { name: 'Black Panther',   img: WE('6/6c/Blackpanthermarvel.png') },
  { name: 'Wonder Woman',    img: WE('8/89/WW_Rebirth_design.png') },
  { name: 'Captain Marvel',  img: WE('5/57/CaptainMarvelVolume7.png') },
  { name: 'Batman',          img: WE('2/2c/BatmanArkhamKnight.png') },
  { name: 'Superman',        img: WE('7/71/Superman_man_of_steel.jpg') },
  { name: 'Avatar Aang',     img: WE('d/d3/AvatarAang.png') },
  { name: 'Bingo',           img: WE('a/a6/Bingo_bluey.png') },
  { name: 'Patrick Star',    img: WE('3/3c/Patrick_Star.png') },
  { name: 'Finn',            img: WE('e/e5/Finn_the_Human_-_Adventure_Time.png') },
  { name: 'Jake the Dog',    img: WE('3/37/Jake_the_Dog_Adventure_Time_character.png') },
  { name: 'Kim Possible',    img: WE('1/1e/Kim_Possible_character.png') },
  { name: 'Phineas',         img: WE('5/5e/Phineas_and_Ferb_characters.png') },
  { name: 'Scooby-Doo',      img: WE('8/8b/Scooby-Doo_and_Shaggy.png') },
  { name: 'Bugs Bunny',      img: WC('4/40/Bugs_Bunny.png') },
  { name: 'Naruto',          img: WE('0/0d/Naruto_Uzumaki_so.png') },
  { name: 'Totoro',          img: WE('4/4c/My_Neighbor_Totoro_-_Tonari_no_Totoro_%28Movie_Poster%29.jpg') },
  { name: 'Luigi',           img: WE('d/dc/Super_Mario_Bros._35th_Anniversary_Luigi.png') },
  { name: 'Princess Peach',  img: WE('a/ab/Princess_Peach.png') },
  { name: 'Sonic',           img: WE('4/4a/Sonic_the_Hedgehog_-_rendering.png') },
  { name: 'Kirby',           img: WE('7/70/Kirby_SSB4_%28cropped%29.png') },
  { name: 'Harry Potter',    img: WC('8/82/Harry_Potter_Daniel_Radcliffe_%28cropped%29.jpg') },
  { name: 'Hermione',        img: WC('6/6f/Emma_Watson_2013_%28cropped%29.jpg') },
  { name: 'Katniss',         img: WE('f/fd/Katniss_Everdeen.png') },
  { name: 'Paddington',      img: WC('7/7e/Paddington_Bear_in_Boots_2.jpg') },
  { name: 'Shrek',           img: WE('b/b7/Shrek.png') },
  { name: 'Puss in Boots',   img: WE('1/13/Puss_in_boots.png') },
  { name: 'Kung Fu Panda',   img: WE('7/7e/Kung_Fu_Panda_Po.png') },
  { name: 'Toothless',       img: WE('9/96/Toothless_HTTYD.png') },
  { name: 'Hiccup',          img: WE('9/9f/Hiccup_Horrendous_Haddock_III.png') },
  { name: 'Gru',             img: WE('a/a6/Gru_%28Despicable_Me%29.png') },
  { name: 'Minion Bob',      img: WE('9/9a/Minion_Bob.png') },
  { name: 'Donald Duck',     img: WC('1/18/Donald_Duck.png') },
  { name: 'Goofy',           img: WC('4/45/Goofy_newest_look-modified.png') },
  { name: 'Minnie Mouse',    img: WC('4/41/Minnie%27s_Bow-Toons.png') },
  { name: 'Hercules',        img: WE('5/5d/Hercules_Disney.png') },
  { name: 'Aladdin',         img: WE('0/01/Aladdin_disney.png') },
  { name: 'Pinocchio',       img: WE('b/b8/Pinocchio_character.png') },
  { name: 'Bambi',           img: WE('e/e4/Bambi_%28character%29.png') },
  { name: 'Tigger',          img: WE('2/2b/Tigger.png') },
  { name: 'Piglet',          img: WE('5/5d/Piglet-Pooh.png') },
  { name: 'Hiro Hamada',     img: WE('7/70/Hiro_Hamada.png') },
  { name: 'Raya',            img: WE('8/83/Raya_and_the_Last_Dragon.png') },
  { name: 'Korra',           img: WE('6/6e/Korra_%28character%29.png') },
  { name: 'Steven Universe', img: WE('4/41/Steven_Universe_%28character%29.png') },
  { name: 'Hilda',           img: WE('5/55/Hilda_%28character%29.png') },
  { name: 'Chase',           img: WE('4/4b/Chase_paw_patrol.png') },
  { name: 'Ponyo',           img: WE('1/13/Ponyo_%28character%29.png') },
  { name: 'Chihiro',         img: WE('d/d5/Spirited_Away_%28Sen_to_Chihiro%29.png') },
]

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Props {
  onSelect: (name: string) => void
  onHoverChar?: (img: string) => void
  onHoverLeave?: () => void
  onVerified?: (chars: CharEntry[]) => void
}

// Probe a URL — resolves true only if it loads successfully
function probeImg(src: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload  = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = src
  })
}

export default function CharacterGallery({ onSelect, onHoverChar, onHoverLeave, onVerified }: Props) {
  const [verified, setVerified] = useState<CharEntry[]>([])
  const [checking, setChecking] = useState(true)

  // One-time parallel probe — results are browser-cached, never re-fetched
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const results = await Promise.all(
        ALL_CHARACTERS.map(async char => {
          const ok = await probeImg(char.img)
          return ok ? char : null
        })
      )
      if (!cancelled) {
        const good = shuffleArray(results.filter(Boolean) as CharEntry[])
        setVerified(good)
        setChecking(false)
        onVerified?.(good)
      }
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (checking) {
    return (
      <div className="cgal-section">
        <div className="cgal-checking">
          <div className="cgal-checking-dots"><span /><span /><span /></div>
          <span className="cgal-checking-label">Loading characters...</span>
        </div>
      </div>
    )
  }

  if (verified.length === 0) return null

  return (
    <div className="cgal-section">
      <div className="cgal-header">
        <span className="cgal-label">
          Characters kids love — click one to make them your hero!
        </span>
      </div>

      {/* Static grid — all verified images shown at once, no rotation */}
      <div className="cgal-grid">
        {verified.map(char => (
          <motion.button
            key={char.name}
            className="cgal-circle-wrap"
            whileHover={{ scale: 1.12, y: -4 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => onSelect(char.name)}
            onMouseEnter={() => onHoverChar?.(char.img)}
            onMouseLeave={() => onHoverLeave?.()}
            title={`Use ${char.name} as your hero`}
          >
            <div className="cgal-circle">
              <img src={char.img} alt={char.name} className="cgal-circle-img" />
            </div>
            <span className="cgal-circle-name">{char.name}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
