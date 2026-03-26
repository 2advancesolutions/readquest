import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
