import { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL ?? ''

function getSessionKey(): string {
  const key = 'rq_session_key'
  let sk = localStorage.getItem(key)
  if (!sk) {
    sk = `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`
    localStorage.setItem(key, sk)
  }
  return sk
}

export function useFollow(studentId: string) {
  const [following, setFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Restore from localStorage
  useEffect(() => {
    if (!studentId) return
    const stored = localStorage.getItem(`rq_follow_${studentId}`)
    if (stored) {
      try {
        const { following: f, count } = JSON.parse(stored)
        setFollowing(f)
        setFollowerCount(count)
      } catch {}
    }
    // Also fetch server state
    const sk = getSessionKey()
    fetch(`${API}/api/stories/public/follow/${studentId}?session_key=${sk}`)
      .then(r => r.json())
      .then(data => {
        setFollowing(data.following)
        setFollowerCount(data.follower_count)
        localStorage.setItem(`rq_follow_${studentId}`, JSON.stringify({ following: data.following, count: data.follower_count }))
      })
      .catch(() => {})
  }, [studentId])

  const toggle = useCallback(async () => {
    if (!studentId || loading) return
    const newFollowing = !following
    const newCount = followerCount + (newFollowing ? 1 : -1)
    // Optimistic
    setFollowing(newFollowing)
    setFollowerCount(newCount)
    localStorage.setItem(`rq_follow_${studentId}`, JSON.stringify({ following: newFollowing, count: newCount }))
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/stories/public/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_key: getSessionKey(), student_id: studentId }),
      })
      const data = await res.json()
      setFollowing(data.following)
      setFollowerCount(data.follower_count)
      localStorage.setItem(`rq_follow_${studentId}`, JSON.stringify({ following: data.following, count: data.follower_count }))
    } catch {
      // Revert on error
      setFollowing(following)
      setFollowerCount(followerCount)
    } finally {
      setLoading(false)
    }
  }, [studentId, following, followerCount, loading])

  return { following, followerCount, toggle, loading }
}
