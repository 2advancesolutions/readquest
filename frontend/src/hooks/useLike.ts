import { useState, useEffect, useCallback } from 'react'
import { storiesApi } from '../services/api'

const API = import.meta.env.VITE_API_URL ?? ''

function getSessionKey(): string {
  const k = 'rq_session_key'
  let sk = localStorage.getItem(k)
  if (!sk) {
    sk = `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`
    localStorage.setItem(k, sk)
  }
  return sk
}

export function useLike(storyId: string, initialCount = 0) {
  const [likeCount, setLikeCount] = useState(initialCount)
  const [alreadyLiked, setAlreadyLiked] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!storyId) return
    setLikeCount(initialCount)
    // Check local cache first for instant render
    const cached = localStorage.getItem(`rq_like_${storyId}`)
    if (cached) setAlreadyLiked(true)
    // Then verify server state
    const sk = getSessionKey()
    storiesApi.getLikeStatus(storyId, sk)
      .then((data: any) => {
        setAlreadyLiked(data.already_liked)
        setLikeCount(data.like_count)
      })
      .catch(() => {})
  }, [storyId, initialCount])

  const like = useCallback(async () => {
    if (alreadyLiked || loading || !storyId) return
    setAlreadyLiked(true)
    setLikeCount(c => c + 1)
    localStorage.setItem(`rq_like_${storyId}`, '1')
    setLoading(true)
    try {
      const data = await storiesApi.publicLike(storyId, getSessionKey()) as any
      setLikeCount(data.like_count)
    } catch {
      // keep optimistic state
    } finally {
      setLoading(false)
    }
  }, [storyId, alreadyLiked, loading])

  return { likeCount, alreadyLiked, like, loading }
}
