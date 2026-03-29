/**
 * HeroCharDisplay
 * A simple controlled component — shows whichever `src` is passed in.
 * Animates with a quick crossfade when src changes.
 * Falls back to the next reliable character image if the src fails to load.
 * No internal rotation or timers.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// A curated set of known-reliable fallback character images
const FALLBACK_SRCS = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Bugs_Bunny.png/250px-Bugs_Bunny.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/SpongeBob_SquarePants_character.png/250px-SpongeBob_SquarePants_character.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Mickey_Mouse_%28poster_version%29.svg/250px-Mickey_Mouse_%28poster_version%29.svg.png',
  'https://upload.wikimedia.org/wikipedia/en/thumb/a/a6/Pok%C3%A9mon_Pikachu_art.png/250px-Pok%C3%A9mon_Pikachu_art.png',
]

interface Props {
  src: string
  size?: number
  className?: string
}

export default function HeroCharDisplay({ src, size = 96, className = '' }: Props) {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [fallbackIdx, setFallbackIdx] = useState(0)

  // When parent changes the src (e.g. gallery hover), reset to that src
  useEffect(() => {
    setCurrentSrc(src)
    setFallbackIdx(0)
  }, [src])

  const handleError = () => {
    // Try each fallback in order — stop once we've exhausted them
    const next = FALLBACK_SRCS[fallbackIdx]
    if (next && next !== currentSrc) {
      setCurrentSrc(next)
      setFallbackIdx(prev => prev + 1)
    }
  }

  return (
    <div
      className={`rh-char-wrap ${className}`}
      style={{ width: size, height: size }}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={currentSrc}
          src={currentSrc}
          alt="hero character"
          className="rh-char-img"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.22 }}
          onError={handleError}
        />
      </AnimatePresence>
    </div>
  )
}
