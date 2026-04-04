/**
 * useVote — shared hook for voting on public stories.
 * Manages optimistic updates, persists session votes in localStorage,
 * and syncs with the backend via /api/stories/public/vote.
 */

import { useState, useCallback, useEffect } from 'react'

/** Generate or retrieve a stable anonymous session key for this browser */
export function getSessionKey(): string {
  const STORAGE_KEY = 'rq_session_key'
  let key = localStorage.getItem(STORAGE_KEY)
  if (!key) {
    key = `rq_${Date.now()}_${Math.random().toString(36).slice(2)}`
    localStorage.setItem(STORAGE_KEY, key)
  }
  return key
}

/** Returns per-story user vote direction from localStorage */
function getStoredVote(storyId: string): 1 | -1 | 0 {
  try {
    const stored = localStorage.getItem(`rq_vote_${storyId}`)
    if (stored === '1') return 1
    if (stored === '-1') return -1
  } catch {}
  return 0
}

function storeVote(storyId: string, direction: 1 | -1 | 0) {
  try {
    if (direction === 0) {
      localStorage.removeItem(`rq_vote_${storyId}`)
    } else {
      localStorage.setItem(`rq_vote_${storyId}`, String(direction))
    }
  } catch {}
}

interface UseVoteOptions {
  storyId: string
  initialCount: number
}

export function useVote({ storyId, initialCount }: UseVoteOptions) {
  const [count, setCount] = useState(initialCount)
  const [userVote, setUserVote] = useState<1 | -1 | 0>(() => getStoredVote(storyId))
  const [loading, setLoading] = useState(false)

  // Sync count with initialCount if it changes (e.g. after re-fetch)
  useEffect(() => {
    setCount(initialCount)
  }, [initialCount])

  const vote = useCallback(async (direction: 1 | -1) => {
    if (loading) return
    setLoading(true)

    // Optimistic update
    const prevVote = userVote
    const prevCount = count
    let delta = 0
    let newVote: 1 | -1 | 0

    if (prevVote === direction) {
      // Toggle off
      delta = -direction
      newVote = 0
    } else if (prevVote === 0) {
      // New vote
      delta = direction
      newVote = direction
    } else {
      // Flip direction
      delta = direction * 2
      newVote = direction
    }

    setCount(c => Math.max(0, c + delta))
    setUserVote(newVote)
    storeVote(storyId, newVote)

    try {
      const sessionKey = getSessionKey()
      const res = await fetch('/api/stories/public/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story_id: storyId, session_key: sessionKey, direction }),
      })
      if (res.ok) {
        const data = await res.json()
        setCount(data.vote_count)
        const sv = data.user_vote === 1 ? 1 : data.user_vote === -1 ? -1 : 0
        setUserVote(sv)
        storeVote(storyId, sv)
      } else {
        // Revert on error
        setCount(prevCount)
        setUserVote(prevVote)
        storeVote(storyId, prevVote)
      }
    } catch {
      setCount(prevCount)
      setUserVote(prevVote)
      storeVote(storyId, prevVote)
    } finally {
      setLoading(false)
    }
  }, [storyId, count, userVote, loading])

  return { count, userVote, vote, loading }
}
