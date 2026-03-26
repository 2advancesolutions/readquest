/**
 * RandomHeroChar
 * Shows a random verified character photo as a floating round bubble.
 * Picks a new random character every `intervalMs` milliseconds.
 * Skips broken images by trying the next random candidate.
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ALL_CHARACTERS } from './CharacterGallery'

interface Props {
  className?: string
  size?: number        // diameter in px
  intervalMs?: number  // how often to switch, default 4000ms
}

function pickRandom(): string {
  return ALL_CHARACTERS[Math.floor(Math.random() * ALL_CHARACTERS.length)].img
}

export default function RandomHeroChar({
  className = '',
  size = 96,
  intervalMs = 4000,
}: Props) {
  const [src, setSrc]         = useState<string>(() => pickRandom())
  const [visible, setVisible] = useState(true)
  const attemptsRef           = useRef(0)

  // Try a new random image — if it fails load, immediately try another
  function tryNext() {
    attemptsRef.current = 0
    setVisible(false)
    setTimeout(() => {
      setSrc(pickRandom())
      setVisible(true)
    }, 350)
  }

  function handleError() {
    // If this one 404s, try a different random one immediately (max 10 attempts)
    if (attemptsRef.current < 10) {
      attemptsRef.current++
      setSrc(pickRandom())
    }
  }

  // Auto-rotate on interval
  useEffect(() => {
    const id = setInterval(tryNext, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.span
          key={src}
          className={`rh-char-wrap ${className}`}
          style={{ width: size, height: size }}
          initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.7, rotate: 12 }}
          transition={{ duration: 0.35, type: 'spring', stiffness: 260, damping: 22 }}
        >
          <img
            src={src}
            alt="character"
            className="rh-char-img"
            onError={handleError}
          />
        </motion.span>
      )}
    </AnimatePresence>
  )
}
