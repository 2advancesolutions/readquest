import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { ALL_CHARACTERS } from './components/CharacterGallery'

import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import BookReader from './pages/BookReader'
import StoryGenerator from './pages/StoryGenerator'
import Rewards from './pages/Rewards'
import Signup from './pages/Signup'
import Login from './pages/Login'
import AddKid from './pages/AddKid'
import ReadingShelf from './pages/ReadingShelf'
import Profile from './pages/Profile'
import QuestMode from './pages/QuestMode'
import Assignments from './pages/Assignments'
import ParentDashboard from './pages/ParentDashboard'
import RecordingsLibrary from './pages/RecordingsLibrary'
import BookRecordings from './pages/BookRecordings'
import RecordingPlayback from './pages/RecordingPlayback'

function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION first with the persisted session,
    // so we use that as the single source of truth to avoid a login flash.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'INITIAL_SESSION') {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Preload all gallery character images into the browser cache ──
  // Phase 1 (immediate): the 7 hero seed characters + fallbacks load right away so
  //   the hero circle is always populated the instant the Create Story page mounts.
  // Phase 2 (idle): remaining images load in the background.
  useEffect(() => {
    const PRIORITY_NAMES = ['SpongeBob', 'Mickey Mouse', 'Pikachu', 'Mario', 'Stitch', 'Elsa', 'Simba']
    const FALLBACK_SRCS = [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Bugs_Bunny.png/250px-Bugs_Bunny.png',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/SpongeBob_SquarePants_character.png/250px-SpongeBob_SquarePants_character.png',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Mickey_Mouse_%28poster_version%29.svg/250px-Mickey_Mouse_%28poster_version%29.svg.png',
    ]

    // Phase 1: priority images — fired immediately (synchronous kick-off)
    const priorityChars = ALL_CHARACTERS.filter(c => PRIORITY_NAMES.includes(c.name))
    ;[...priorityChars, ...FALLBACK_SRCS.map(src => ({ img: src }))].forEach(c => {
      const img = new Image()
      img.src = (c as any).img
    })

    // Phase 2: rest of gallery — deferred to idle time
    const remaining = ALL_CHARACTERS.filter(c => !PRIORITY_NAMES.includes(c.name))
    const preloadRest = () => remaining.forEach(c => { const img = new Image(); img.src = c.img })
    if ('requestIdleCallback' in window) {
      ;(window as any).requestIdleCallback(preloadRest, { timeout: 4000 })
    } else {
      setTimeout(preloadRest, 0)
    }
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* Signup renders regardless of session — the wizard controls its own flow */}
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" replace />} />
        <Route path="/add-kid" element={session ? <AddKid /> : <Navigate to="/login" replace />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/read/:storyId" element={session ? <BookReader /> : <Navigate to="/login" replace />} />
        <Route path="/generate" element={session ? <StoryGenerator /> : <Navigate to="/login" replace />} />
        <Route path="/rewards" element={session ? <Rewards /> : <Navigate to="/login" replace />} />
        <Route path="/shelf" element={session ? <ReadingShelf /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={session ? <Profile /> : <Navigate to="/login" replace />} />
        {/* Phase 1 — AI Tutor routes */}
        <Route path="/quest" element={session ? <QuestMode /> : <Navigate to="/login" replace />} />
        <Route path="/assignments" element={session ? <Assignments /> : <Navigate to="/login" replace />} />
        <Route path="/parent-dashboard" element={session ? <ParentDashboard /> : <Navigate to="/login" replace />} />

        {/* Recordings routes */}
        <Route path="/recordings" element={session ? <RecordingsLibrary /> : <Navigate to="/login" replace />} />
        <Route path="/recordings/:bookId" element={session ? <BookRecordings /> : <Navigate to="/login" replace />} />
        <Route path="/recordings/:bookId/:recordingId" element={session ? <RecordingPlayback /> : <Navigate to="/login" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
