/**
 * LikesBadge — shows total ♥ likes received across all of this student's books.
 * Sits in the global nav area (top-right, below XpBadge).
 * Polls every 60 seconds and listens for 'rq:likes-update' custom events.
 */
import { useState, useEffect } from 'react'
import './likes-badge.css'

const POLL_INTERVAL = 60_000

export default function LikesBadge() {
  const studentId = localStorage.getItem('readquest_student_id')
  const [total, setTotal] = useState(0)
  const [pop, setPop] = useState(false)

  const fetch_ = async () => {
    if (!studentId) return
    try {
      const res = await fetch(`/api/stories/public/likes/total?student_id=${studentId}`)
      const data = await res.json()
      const newTotal = data.total_likes ?? 0
      if (newTotal !== total && newTotal > total) {
        setPop(true)
        setTimeout(() => setPop(false), 1200)
      }
      setTotal(newTotal)
    } catch {}
  }

  useEffect(() => {
    if (!studentId) return
    fetch_()
    const iv = setInterval(fetch_, POLL_INTERVAL)
    const handler = () => fetch_()
    window.addEventListener('rq:likes-update', handler)
    return () => { clearInterval(iv); window.removeEventListener('rq:likes-update', handler) }
  }, [studentId])

  if (!studentId) return null

  return (
    <div className={`likes-badge${pop ? ' pop' : ''}`} id="likes-badge-global" title="Total likes on your books">
      <span className="likes-badge-icon">♥</span>
      <span className="likes-badge-value">{total.toLocaleString()}</span>
      <span className="likes-badge-label">Likes</span>
    </div>
  )
}
