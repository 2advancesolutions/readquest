/**
 * HeroCharDisplay
 * A simple controlled component — shows whichever `src` is passed in.
 * Animates with a quick crossfade when src changes.
 * No internal rotation or timers.
 */
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  src: string
  size?: number
  className?: string
}

export default function HeroCharDisplay({ src, size = 96, className = '' }: Props) {
  return (
    <div
      className={`rh-char-wrap ${className}`}
      style={{ width: size, height: size }}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={src}
          src={src}
          alt="hero character"
          className="rh-char-img"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.22 }}
        />
      </AnimatePresence>
    </div>
  )
}
