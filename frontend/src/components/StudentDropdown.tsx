/**
 * StudentDropdown — shared pill-trigger + animated flyout used on every page
 * that needs parent→child student selection.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/student-dropdown.css'

export type Child = {
  id: string
  name: string
  grade_level: number
  school?: string
  avatar_url?: string
}

export const CHILD_COLORS = [
  '#702AE1', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#F97316',
]

interface Props {
  children: Child[]
  selected: Child | null
  onChange: (child: Child | null) => void
  allowAll?: boolean
  label?: string
  className?: string
}

export default function StudentDropdown({
  children,
  selected,
  onChange,
  allowAll = true,
  label,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const handleOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
  }, [])

  useEffect(() => {
    if (open) document.addEventListener('mousedown', handleOutside)
    else document.removeEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open, handleOutside])

  if (children.length === 0) return null

  const activeIdx = selected ? children.findIndex(c => c.id === selected.id) : -1

  const handleSelect = (child: Child | null) => {
    setOpen(false)
    onChange(child)
  }

  return (
    <div className={`sd-root ${className}`} ref={ref}>
      {label && <span className="sd-prefix-label">{label}</span>}

      <button
        className="sd-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <>
            <span
              className="sd-avatar"
              style={selected.avatar_url
                ? { background: 'transparent', padding: 0, overflow: 'hidden' }
                : { background: CHILD_COLORS[activeIdx % CHILD_COLORS.length] }}
            >
              {selected.avatar_url
                ? <img src={selected.avatar_url} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
                : selected.name.charAt(0)
              }
            </span>
            <span className="sd-trigger-name">{selected.name}</span>
            <span className="sd-trigger-grade">Grade {selected.grade_level}</span>
          </>
        ) : (
          <>
            <span className="sd-all-avatar">👥</span>
            <span className="sd-trigger-name">All Students</span>
          </>
        )}
        <svg
          className={`sd-caret${open ? ' open' : ''}`}
          width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            className="sd-menu"
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
          >
            {allowAll && (
              <>
                <li
                  role="option"
                  aria-selected={selected === null}
                  className={`sd-item${selected === null ? ' active' : ''}`}
                  onClick={() => handleSelect(null)}
                >
                  <span className="sd-all-avatar">👥</span>
                  <span className="sd-item-name">All Students</span>
                  {selected === null && <span className="sd-check">✓</span>}
                </li>
                <li className="sd-divider" aria-hidden />
              </>
            )}

            {children.map((child, i) => (
              <li
                key={child.id}
                role="option"
                aria-selected={selected?.id === child.id}
                className={`sd-item${selected?.id === child.id ? ' active' : ''}`}
                onClick={() => handleSelect(child)}
              >
                <span
                  className="sd-avatar"
                  style={child.avatar_url
                    ? { background: 'transparent', padding: 0, overflow: 'hidden' }
                    : { background: CHILD_COLORS[i % CHILD_COLORS.length] }}
                >
                  {child.avatar_url
                    ? <img src={child.avatar_url} alt={child.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
                    : child.name.charAt(0)
                  }
                </span>
                <span className="sd-item-name">{child.name}</span>
                <span className="sd-item-grade">Grade {child.grade_level}</span>
                {selected?.id === child.id && <span className="sd-check">✓</span>}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
