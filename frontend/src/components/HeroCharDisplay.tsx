/**
 * HeroCharDisplay
 * Accepts either a URL (shows the image) or an emoji string.
 * Crossfades on change. Falls back gracefully on image error.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  src: string   // URL or emoji character(s)
  size?: number
  className?: string
}

export default function HeroCharDisplay({ src, size = 96, className = '' }: Props) {
  const isUrl = src.startsWith('http') || src.startsWith('/')
  const [failed, setFailed] = useState(false)

  useEffect(() => { setFailed(false) }, [src])

  return (
    <div
      className={`rh-char-wrap ${className}`}
      style={{ width: size, height: size }}
    >
      <AnimatePresence mode="wait">
        {isUrl && !failed ? (
          <motion.img
            key={src}
            src={src}
            alt="hero character"
            className="rh-char-img"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.22 }}
            onError={() => setFailed(true)}
          />
        ) : (
          <motion.div
            key={src + '-emoji'}
            className="rh-char-emoji"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.22 }}
            style={{ fontSize: size * 0.5 }}
          >
            {isUrl ? '🧙' : src}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
