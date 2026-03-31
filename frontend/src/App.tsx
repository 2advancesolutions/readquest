import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense } from 'react'
import { supabase } from './lib/supabase'

// ── Only LandingPage is eager — all other routes are lazy-loaded ──────────
import LandingPage from './pages/LandingPage'
import XpBadge from './components/XpBadge'
import MobileNav from './components/MobileNav'
import MuteButton from './components/MuteButton'

const Dashboard          = lazy(() => import('./pages/Dashboard'))
const BookReader         = lazy(() => import('./pages/BookReader'))
const StoryGenerator     = lazy(() => import('./pages/StoryGenerator'))
const Rewards            = lazy(() => import('./pages/Rewards'))
const Signup             = lazy(() => import('./pages/Signup'))
const Login              = lazy(() => import('./pages/Login'))
const AddKid             = lazy(() => import('./pages/AddKid'))
const ReadingShelf       = lazy(() => import('./pages/ReadingShelf'))
const Profile            = lazy(() => import('./pages/Profile'))
const QuestMode          = lazy(() => import('./pages/QuestMode'))
const Assignments        = lazy(() => import('./pages/Assignments'))
const ParentDashboard    = lazy(() => import('./pages/ParentDashboard'))
const RecordingsLibrary  = lazy(() => import('./pages/RecordingsLibrary'))
const BookRecordings     = lazy(() => import('./pages/BookRecordings'))
const RecordingPlayback  = lazy(() => import('./pages/RecordingPlayback'))
const SpellingArena      = lazy(() => import('./pages/SpellingArena'))
const SpellingScores     = lazy(() => import('./pages/SpellingScores'))
const ReadingExams       = lazy(() => import('./pages/ReadingExams'))
const GamesArcade        = lazy(() => import('./pages/GamesArcade'))
const GamePlay           = lazy(() => import('./pages/GamePlay'))
const Leaderboard        = lazy(() => import('./pages/Leaderboard'))
const MovieStudio        = lazy(() => import('./pages/MovieStudio'))

// ── Minimal loading fallback — no layout shift, no spinner flicker ────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--nb-bg, #0d0d1a)',
      color: 'var(--nb-purple, #7C3AED)', fontSize: '1.5rem',
    }}>
      ✨
    </div>
  )
}

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

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <BrowserRouter>
      {/* Global XP badge — always top-right for logged-in users */}
      {session && <XpBadge />}
      {/* Global mobile nav — floating FAB + drawer, visible only on ≤768px */}
      {session && <MobileNav />}
      {/* Global mute button — mutes AI voice narration on any page */}
      {session && <MuteButton />}
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/spelling" element={session ? <SpellingArena /> : <Navigate to="/login" replace />} />
          <Route path="/spelling-scores" element={session ? <SpellingScores /> : <Navigate to="/login" replace />} />
          <Route path="/exams" element={session ? <ReadingExams /> : <Navigate to="/login" replace />} />
          <Route path="/scores" element={session ? <ReadingExams /> : <Navigate to="/login" replace />} />
          <Route path="/games" element={session ? <GamesArcade /> : <Navigate to="/login" replace />} />
          <Route path="/games/:gameId" element={session ? <GamePlay /> : <Navigate to="/login" replace />} />
          <Route path="/leaderboard" element={session ? <Leaderboard /> : <Navigate to="/login" replace />} />
          <Route path="/movie-studio" element={session ? <MovieStudio /> : <Navigate to="/login" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
