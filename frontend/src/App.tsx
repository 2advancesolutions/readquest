import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import BookReader from './pages/BookReader'
import StoryGenerator from './pages/StoryGenerator'
import Rewards from './pages/Rewards'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/read/:storyId" element={<BookReader />} />
        <Route path="/generate" element={<StoryGenerator />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
