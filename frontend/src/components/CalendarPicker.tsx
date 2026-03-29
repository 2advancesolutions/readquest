import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type CalendarMode = 'day' | 'range' | 'month'

export interface DateRange {
  start: Date
  end: Date
}

interface CalendarPickerProps {
  mode: CalendarMode
  onModeChange: (m: CalendarMode) => void
  dateRange: DateRange
  onRangeChange: (r: DateRange) => void
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

function startOfDay(d: Date) {
  const c = new Date(d); c.setHours(0,0,0,0); return c
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
}
function isBetween(d: Date, start: Date, end: Date) {
  return d >= start && d <= end
}

export default function CalendarPicker({ mode, onModeChange, dateRange, onRangeChange }: CalendarPickerProps) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => new Date(dateRange.start))
  const [hoverDate, setHoverDate] = useState<Date | null>(null)
  // For range: first click sets rangeStart, second click completes
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  const prevYear  = () => setViewDate(d => new Date(d.getFullYear() - 1, d.getMonth(), 1))
  const nextYear  = () => setViewDate(d => new Date(d.getFullYear() + 1, d.getMonth(), 1))

  // Build day grid for the current view month
  const buildGrid = () => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const first = new Date(year, month, 1)
    const last  = new Date(year, month + 1, 0)
    const cells: (Date | null)[] = Array(first.getDay()).fill(null)
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }

  const handleDayClick = useCallback((day: Date) => {
    if (mode === 'day') {
      onRangeChange({ start: startOfDay(day), end: startOfDay(day) })
      setOpen(false)
    } else if (mode === 'range') {
      if (!rangeStart) {
        setRangeStart(startOfDay(day))
      } else {
        const s = rangeStart <= day ? rangeStart : startOfDay(day)
        const e = rangeStart <= day ? startOfDay(day) : rangeStart
        onRangeChange({ start: s, end: e })
        setRangeStart(null)
        setOpen(false)
      }
    }
  }, [mode, onModeChange, onRangeChange, rangeStart])

  const handleMonthClick = (monthIdx: number) => {
    const year = viewDate.getFullYear()
    const start = new Date(year, monthIdx, 1)
    const end   = new Date(year, monthIdx + 1, 0)
    onRangeChange({ start, end })
    setOpen(false)
  }

  const grid = buildGrid()

  // Preview range while hovering (range mode)
  const previewStart = rangeStart
  const previewEnd   = rangeStart && hoverDate
    ? (rangeStart <= hoverDate ? hoverDate : rangeStart)
    : null
  const previewStartL = rangeStart && hoverDate
    ? (rangeStart <= hoverDate ? rangeStart : hoverDate)
    : null

  // Display label
  const formatLabel = () => {
    const { start, end } = dateRange
    if (mode === 'month') return `${MONTHS[start.getMonth()]} ${start.getFullYear()}`
    if (mode === 'day' || sameDay(start, end)) {
      return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
    const s = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const e = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${s} – ${e}`
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <motion.button
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px',
          borderRadius: 999,
          background: open ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.15)',
          border: '1.5px solid rgba(192,132,252,0.3)',
          color: '#c084fc',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: '0.82rem',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.18s',
        }}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {formatLabel()}
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d={open ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}/>
        </svg>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              zIndex: 999,
              background: 'rgba(15,8,40,0.97)',
              backdropFilter: 'blur(24px)',
              border: '1.5px solid rgba(150,110,255,0.25)',
              borderRadius: 20,
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
              padding: '20px',
              width: 'min(320px, calc(100vw - 32px))',
              userSelect: 'none',
            }}>

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 18, background: 'rgba(255,255,255,0.05)', borderRadius: 999, padding: 4 }}>
              {(['day', 'range', 'month'] as CalendarMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { onModeChange(m); setRangeStart(null) }}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textTransform: 'capitalize',
                    transition: 'all 0.18s',
                    background: mode === m ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'transparent',
                    color: mode === m ? '#fff' : 'rgba(204,195,216,0.55)',
                  }}>
                  {m === 'day' ? '📅 Day' : m === 'range' ? '📆 Range' : '🗓️ Month'}
                </button>
              ))}
            </div>

            {/* Month/Year navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <NavBtn onClick={prevYear} label="«" />
                {mode !== 'month' && <NavBtn onClick={prevMonth} label="‹" />}
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'rgba(233,221,255,0.9)' }}>
                {mode === 'month' ? viewDate.getFullYear() : `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {mode !== 'month' && <NavBtn onClick={nextMonth} label="›" />}
                <NavBtn onClick={nextYear} label="»" />
              </div>
            </div>

            {/* Month grid */}
            {mode === 'month' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {MONTHS.map((m, i) => {
                  const isSelected = dateRange.start.getMonth() === i &&
                                     dateRange.start.getFullYear() === viewDate.getFullYear()
                  return (
                    <motion.button
                      key={m}
                      whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
                      onClick={() => handleMonthClick(i)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: 12,
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                        fontWeight: isSelected ? 800 : 500,
                        fontSize: '0.82rem',
                        background: isSelected ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'rgba(255,255,255,0.05)',
                        color: isSelected ? '#fff' : 'rgba(204,195,216,0.7)',
                        transition: 'all 0.15s',
                      }}>
                      {m.slice(0, 3)}
                    </motion.button>
                  )
                })}
              </div>
            ) : (
              <>
                {/* Day-of-week headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
                  {DAYS.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(204,195,216,0.4)', padding: '2px 0' }}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                  {grid.map((day, idx) => {
                    if (!day) return <div key={idx} />
                    const isStart = sameDay(day, dateRange.start)
                    const isEnd   = sameDay(day, dateRange.end)
                    const inRange = mode === 'range' && isBetween(day, dateRange.start, dateRange.end)
                    const isToday = sameDay(day, new Date())

                    // Preview for in-progress range selection
                    const isPreviewStart = rangeStart && sameDay(day, rangeStart)
                    const inPreview = mode === 'range' && rangeStart && previewStartL && previewEnd
                      ? isBetween(day, previewStartL, previewEnd)
                      : false
                    const highlighted = isStart || isEnd || isPreviewStart

                    return (
                      <motion.button
                        key={idx}
                        whileHover={{ scale: 1.12 }}
                        onClick={() => handleDayClick(day)}
                        onMouseEnter={() => setHoverDate(day)}
                        onMouseLeave={() => setHoverDate(null)}
                        style={{
                          padding: '6px 0',
                          borderRadius: highlighted ? 999 : (inRange || inPreview) ? 0 : 8,
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-body)',
                          fontWeight: highlighted ? 800 : 400,
                          fontSize: '0.82rem',
                          background: highlighted
                            ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                            : (inRange || inPreview)
                              ? 'rgba(124,58,237,0.18)'
                              : 'transparent',
                          color: highlighted ? '#fff' : isToday ? '#c084fc' : 'rgba(233,221,255,0.8)',
                          outline: isToday && !highlighted ? '1.5px solid rgba(192,132,252,0.4)' : 'none',
                          transition: 'all 0.12s',
                        }}>
                        {day.getDate()}
                      </motion.button>
                    )
                  })}
                </div>
              </>
            )}

            {/* Hint */}
            {mode === 'range' && (
              <p style={{ textAlign: 'center', marginTop: 14, fontSize: '0.72rem', color: 'rgba(204,195,216,0.4)', margin: '14px 0 0' }}>
                {rangeStart ? 'Click an end date' : 'Click a start date'}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NavBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{
      width: 28, height: 28, borderRadius: 8,
      border: '1px solid rgba(150,110,255,0.2)',
      background: 'rgba(255,255,255,0.05)',
      color: 'rgba(204,195,216,0.7)',
      cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s',
    }}>
      {label}
    </button>
  )
}
