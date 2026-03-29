/**
 * MuteButton — floating global mute toggle.
 * Persists state in localStorage ('readquest_muted').
 * When unmuting: immediately kills any ongoing WelcomeVoice narration.
 * Renders a fixed-position button that works on EVERY page.
 */
import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { stopGlobalVoice } from './WelcomeVoice'

function getMuted(): boolean {
  try { return localStorage.getItem('readquest_muted') === 'true' } catch { return false }
}

export default function MuteButton() {
  const [muted, setMuted] = useState<boolean>(getMuted)

  const toggle = useCallback(() => {
    setMuted(prev => {
      const next = !prev
      try { localStorage.setItem('readquest_muted', String(next)) } catch { /* ignore */ }
      if (next) {
        // Muting → stop anything currently playing
        stopGlobalVoice()
      }
      return next
    })
  }, [])

  return (
    <motion.button
      id="global-mute-btn"
      className="global-mute-btn"
      onClick={toggle}
      title={muted ? 'Unmute AI voice' : 'Mute AI voice'}
      aria-label={muted ? 'Unmute AI voice' : 'Mute AI voice'}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      animate={{ opacity: 1 }}
      initial={{ opacity: 0 }}
    >
      {muted ? (
        // Muted icon — speaker with X
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" opacity="0.3" stroke="currentColor"/>
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        // Unmuted icon — speaker with waves
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" opacity="0.3" stroke="currentColor"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </motion.button>
  )
}
