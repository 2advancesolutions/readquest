/**
 * XpBadge — persistent XP counter always visible in the top-right corner.
 *
 * Reads from localStorage key `readquest_student_xp`.
 * Listens to the custom event `rq:xp-update` for instant in-session updates.
 * Shows a "+N" floating animation when XP changes.
 */
import { useState, useEffect, useRef } from 'react'
import './xp-badge.css'

const XP_KEY = 'readquest_student_xp'

/** Call this whenever XP changes to update all XpBadge instances instantly. */
export function emitXpUpdate(newTotal: number, delta?: number) {
  localStorage.setItem(XP_KEY, String(newTotal))
  window.dispatchEvent(new CustomEvent('rq:xp-update', { detail: { total: newTotal, delta } }))
}

/** Read current XP from localStorage. */
export function getStoredXp(): number {
  return parseInt(localStorage.getItem(XP_KEY) || '0', 10)
}

export default function XpBadge() {
  const [xp, setXp]       = useState<number>(getStoredXp)
  const [delta, setDelta]  = useState<number | null>(null)
  const deltaTimer         = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const { total, delta: d } = (e as CustomEvent).detail
      setXp(total)
      if (d && d > 0) {
        setDelta(d)
        if (deltaTimer.current) clearTimeout(deltaTimer.current)
        deltaTimer.current = setTimeout(() => setDelta(null), 1400)
      }
    }
    window.addEventListener('rq:xp-update', handler)
    // Also sync if another tab writes to localStorage
    const storageHandler = () => setXp(getStoredXp())
    window.addEventListener('storage', storageHandler)
    return () => {
      window.removeEventListener('rq:xp-update', handler)
      window.removeEventListener('storage', storageHandler)
    }
  }, [])

  return (
    <div className="xp-badge" id="xp-badge-global" title="Your XP points">
      <span className="xp-badge-icon">⚡</span>
      <span className="xp-badge-value">{xp.toLocaleString()}</span>
      <span className="xp-badge-label">XP</span>
      {delta !== null && (
        <span key={delta + Date.now()} className="xp-badge-delta">+{delta}</span>
      )}
    </div>
  )
}
