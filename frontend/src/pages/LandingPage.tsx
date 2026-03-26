import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { studentsApi } from '../services/api'
import { supabase } from '../lib/supabase'
import '../styles/landing.css'

// ── 10 books per grade K–8 (Open Library ISBN covers, shuffled on mount) ──
type BookEntry = { title: string; cover: string; grade: string; genre: string; progress: number }

const BOOKS_BY_GRADE: BookEntry[] = [
  // ─ Kindergarten ──────────────────────────────────────────────────
  { title: 'The Very Hungry Caterpillar',    cover: 'https://covers.openlibrary.org/b/isbn/0399226907-L.jpg',  grade: 'K', genre: 'Picture Book', progress: 88 },
  { title: 'Goodnight Moon',                 cover: 'https://covers.openlibrary.org/b/isbn/0064430170-L.jpg',  grade: 'K', genre: 'Bedtime',      progress: 95 },
  { title: 'Where the Wild Things Are',      cover: 'https://covers.openlibrary.org/b/isbn/0064431789-L.jpg',  grade: 'K', genre: 'Picture Book', progress: 80 },
  { title: 'The Cat in the Hat',             cover: 'https://covers.openlibrary.org/b/isbn/0679873503-L.jpg',  grade: 'K', genre: 'Rhyme',        progress: 76 },
  { title: 'Green Eggs and Ham',             cover: 'https://covers.openlibrary.org/b/isbn/0394800168-L.jpg',  grade: 'K', genre: 'Rhyme',        progress: 92 },
  { title: 'Brown Bear, Brown Bear',         cover: 'https://covers.openlibrary.org/b/isbn/0805047905-L.jpg',  grade: 'K', genre: 'Picture Book', progress: 97 },
  { title: 'If You Give a Mouse a Cookie',   cover: 'https://covers.openlibrary.org/b/isbn/0060245867-L.jpg',  grade: 'K', genre: 'Picture Book', progress: 84 },
  { title: 'Chicka Chicka Boom Boom',        cover: 'https://covers.openlibrary.org/b/isbn/0689835477-L.jpg',  grade: 'K', genre: 'Alphabet',     progress: 91 },
  { title: 'Corduroy',                       cover: 'https://covers.openlibrary.org/b/isbn/0670241334-L.jpg',  grade: 'K', genre: 'Picture Book', progress: 78 },
  { title: 'The Snowy Day',                  cover: 'https://covers.openlibrary.org/b/isbn/0670654000-L.jpg',  grade: 'K', genre: 'Picture Book', progress: 85 },

  // ─ Grade 1 ───────────────────────────────────────────────────────
  { title: 'Frog and Toad Are Friends',      cover: 'https://covers.openlibrary.org/b/isbn/0064440206-L.jpg',  grade: 'Grade 1', genre: 'Early Reader', progress: 74 },
  { title: 'The Giving Tree',               cover: 'https://covers.openlibrary.org/b/isbn/0060256656-L.jpg',  grade: 'Grade 1', genre: 'Classic',      progress: 89 },
  { title: 'Harold and the Purple Crayon',   cover: 'https://covers.openlibrary.org/b/isbn/0064430227-L.jpg',  grade: 'Grade 1', genre: 'Picture Book', progress: 93 },
  { title: 'Horton Hears a Who!',           cover: 'https://covers.openlibrary.org/b/isbn/0394800788-L.jpg',  grade: 'Grade 1', genre: 'Rhyme',        progress: 82 },
  { title: 'The Polar Express',              cover: 'https://covers.openlibrary.org/b/isbn/0395389496-L.jpg',  grade: 'Grade 1', genre: 'Holiday',      progress: 71 },
  { title: 'Sylvester & the Magic Pebble',  cover: 'https://covers.openlibrary.org/b/isbn/0671662694-L.jpg',  grade: 'Grade 1', genre: 'Picture Book', progress: 67 },
  { title: "Don't Let the Pigeon Drive",    cover: 'https://covers.openlibrary.org/b/isbn/0786820012-L.jpg',  grade: 'Grade 1', genre: 'Humor',        progress: 96 },
  { title: 'Click, Clack, Moo',            cover: 'https://covers.openlibrary.org/b/isbn/0689832133-L.jpg',  grade: 'Grade 1', genre: 'Farm',         progress: 88 },
  { title: 'Amelia Bedelia',                cover: 'https://covers.openlibrary.org/b/isbn/0064441555-L.jpg',  grade: 'Grade 1', genre: 'Humor',        progress: 79 },
  { title: 'Alexander and the Terrible Day',cover: 'https://covers.openlibrary.org/b/isbn/0689711735-L.jpg',  grade: 'Grade 1', genre: 'Humor',        progress: 72 },

  // ─ Grade 2 ───────────────────────────────────────────────────────
  { title: 'Ramona the Pest',               cover: 'https://covers.openlibrary.org/b/isbn/0380709163-L.jpg',  grade: 'Grade 2', genre: 'Chapter Book', progress: 61 },
  { title: 'Magic Tree House #1',           cover: 'https://covers.openlibrary.org/b/isbn/0679824111-L.jpg',  grade: 'Grade 2', genre: 'Adventure',    progress: 55 },
  { title: 'Nate the Great',               cover: 'https://covers.openlibrary.org/b/isbn/0440400414-L.jpg',  grade: 'Grade 2', genre: 'Mystery',      progress: 70 },
  { title: 'The Boxcar Children',           cover: 'https://covers.openlibrary.org/b/isbn/0807508527-L.jpg',  grade: 'Grade 2', genre: 'Mystery',      progress: 48 },
  { title: 'Junie B. Jones',               cover: 'https://covers.openlibrary.org/b/isbn/0679826963-L.jpg',  grade: 'Grade 2', genre: 'Humor',        progress: 66 },
  { title: 'Stuart Little',                cover: 'https://covers.openlibrary.org/b/isbn/0064400468-L.jpg',  grade: 'Grade 2', genre: 'Classic',      progress: 43 },
  { title: "My Father's Dragon",           cover: 'https://covers.openlibrary.org/b/isbn/0394890485-L.jpg',  grade: 'Grade 2', genre: 'Fantasy',      progress: 58 },
  { title: "Mr. Popper's Penguins",        cover: 'https://covers.openlibrary.org/b/isbn/0316058432-L.jpg',  grade: 'Grade 2', genre: 'Classic',      progress: 77 },
  { title: 'Henry and Mudge',              cover: 'https://covers.openlibrary.org/b/isbn/0689810040-L.jpg',  grade: 'Grade 2', genre: 'Early Reader', progress: 83 },
  { title: 'Flat Stanley',                 cover: 'https://covers.openlibrary.org/b/isbn/0064420264-L.jpg',  grade: 'Grade 2', genre: 'Adventure',    progress: 60 },

  // ─ Grade 3 ───────────────────────────────────────────────────────
  { title: "Charlotte's Web",              cover: 'https://covers.openlibrary.org/b/isbn/0064400557-L.jpg',  grade: 'Grade 3', genre: 'Classic',      progress: 54 },
  { title: 'James and the Giant Peach',    cover: 'https://covers.openlibrary.org/b/isbn/0142410381-L.jpg',  grade: 'Grade 3', genre: 'Fantasy',      progress: 47 },
  { title: 'Matilda',                      cover: 'https://covers.openlibrary.org/b/isbn/0142410314-L.jpg',  grade: 'Grade 3', genre: 'Fantasy',      progress: 63 },
  { title: 'Little House on the Prairie',  cover: 'https://covers.openlibrary.org/b/isbn/9780064400022-L.jpg', grade: 'Grade 3', genre: 'Historical',   progress: 38 },
  { title: 'The BFG',                      cover: 'https://covers.openlibrary.org/b/isbn/0140328726-L.jpg',  grade: 'Grade 3', genre: 'Fantasy',      progress: 71 },
  { title: 'Because of Winn-Dixie',        cover: 'https://covers.openlibrary.org/b/isbn/0763617229-L.jpg',  grade: 'Grade 3', genre: 'Realistic',    progress: 57 },
  { title: 'Sarah, Plain and Tall',        cover: 'https://covers.openlibrary.org/b/isbn/0064402053-L.jpg',  grade: 'Grade 3', genre: 'Historical',   progress: 44 },
  { title: 'Encyclopedia Brown',           cover: 'https://covers.openlibrary.org/b/isbn/0553158937-L.jpg',  grade: 'Grade 3', genre: 'Mystery',      progress: 65 },
  { title: 'Shiloh',                       cover: 'https://covers.openlibrary.org/b/isbn/0440407524-L.jpg',  grade: 'Grade 3', genre: 'Realistic',    progress: 52 },
  { title: 'The Phantom Tollbooth',        cover: 'https://covers.openlibrary.org/b/isbn/0394820371-L.jpg',  grade: 'Grade 3', genre: 'Fantasy',      progress: 40 },

  // ─ Grade 4 ───────────────────────────────────────────────────────
  { title: "Harry Potter & the Sorcerer's",cover: 'https://covers.openlibrary.org/b/isbn/0439708184-L.jpg',  grade: 'Grade 4', genre: 'Fantasy',      progress: 41 },
  { title: 'The Lion, the Witch & Wardrobe',cover:'https://covers.openlibrary.org/b/isbn/0064404994-L.jpg', grade: 'Grade 4', genre: 'Fantasy',      progress: 33 },
  { title: 'Diary of a Wimpy Kid',         cover: 'https://covers.openlibrary.org/b/isbn/0810993139-L.jpg',  grade: 'Grade 4', genre: 'Humor',        progress: 62 },
  { title: 'Where the Red Fern Grows',     cover: 'https://covers.openlibrary.org/b/isbn/0553274295-L.jpg',  grade: 'Grade 4', genre: 'Classic',      progress: 29 },
  { title: 'Island of the Blue Dolphins',  cover: 'https://covers.openlibrary.org/b/isbn/9780395536803-L.jpg', grade: 'Grade 4', genre: 'Adventure',    progress: 55 },
  { title: 'Mrs. Frisby and the Rats',     cover: 'https://covers.openlibrary.org/b/isbn/0689710682-L.jpg',  grade: 'Grade 4', genre: 'Fantasy',      progress: 37 },
  { title: 'Tuck Everlasting',             cover: 'https://covers.openlibrary.org/b/isbn/0374480095-L.jpg',  grade: 'Grade 4', genre: 'Fantasy',      progress: 48 },
  { title: 'The Trumpet of the Swan',      cover: 'https://covers.openlibrary.org/b/isbn/0064410226-L.jpg',  grade: 'Grade 4', genre: 'Classic',      progress: 66 },
  { title: 'The Witches',                  cover: 'https://covers.openlibrary.org/b/isbn/0141301104-L.jpg',  grade: 'Grade 4', genre: 'Fantasy',      progress: 74 },
  { title: 'My Side of the Mountain',      cover: 'https://covers.openlibrary.org/b/isbn/0439153883-L.jpg',  grade: 'Grade 4', genre: 'Adventure',    progress: 42 },

  // ─ Grade 5 ───────────────────────────────────────────────────────
  { title: 'Percy Jackson: Lightning Thief',cover:'https://covers.openlibrary.org/b/isbn/0786838655-L.jpg',  grade: 'Grade 5', genre: 'Mythology',    progress: 29 },
  { title: 'Wonder',                       cover: 'https://covers.openlibrary.org/b/isbn/0375869026-L.jpg',  grade: 'Grade 5', genre: 'Realistic',    progress: 72 },
  { title: 'Hatchet',                      cover: 'https://covers.openlibrary.org/b/isbn/0689840926-L.jpg',  grade: 'Grade 5', genre: 'Survival',     progress: 53 },
  { title: 'Number the Stars',             cover: 'https://covers.openlibrary.org/b/isbn/0395510600-L.jpg',  grade: 'Grade 5', genre: 'Historical',   progress: 67 },
  { title: 'Bridge to Terabithia',         cover: 'https://covers.openlibrary.org/b/isbn/0064401847-L.jpg',  grade: 'Grade 5', genre: 'Realistic',    progress: 44 },
  { title: 'A Wrinkle in Time',            cover: 'https://covers.openlibrary.org/b/isbn/0312367554-L.jpg',  grade: 'Grade 5', genre: 'Sci-Fi',       progress: 38 },
  { title: 'From Mixed-Up Files of Mrs. B',cover: 'https://covers.openlibrary.org/b/isbn/0689711816-L.jpg',  grade: 'Grade 5', genre: 'Mystery',      progress: 61 },
  { title: 'The Watsons Go to Birmingham', cover: 'https://covers.openlibrary.org/b/isbn/0440414121-L.jpg',  grade: 'Grade 5', genre: 'Historical',   progress: 50 },
  { title: 'Maniac Magee',                 cover: 'https://covers.openlibrary.org/b/isbn/0316809063-L.jpg',  grade: 'Grade 5', genre: 'Realistic',    progress: 34 },
  { title: 'Bud, Not Buddy',               cover: 'https://covers.openlibrary.org/b/isbn/0440418186-L.jpg',  grade: 'Grade 5', genre: 'Historical',   progress: 46 },

  // ─ Grade 6 ───────────────────────────────────────────────────────
  { title: 'Holes',                        cover: 'https://covers.openlibrary.org/b/isbn/0440414806-L.jpg',  grade: 'Grade 6', genre: 'Adventure',    progress: 45 },
  { title: 'Roll of Thunder, Hear My Cry', cover: 'https://covers.openlibrary.org/b/isbn/0142401129-L.jpg',  grade: 'Grade 6', genre: 'Historical',   progress: 31 },
  { title: 'Harriet the Spy',             cover: 'https://covers.openlibrary.org/b/isbn/0440414008-L.jpg',  grade: 'Grade 6', genre: 'Realistic',    progress: 57 },
  { title: 'The True Confessions of Charlotte Doyle', cover:'https://covers.openlibrary.org/b/isbn/0380714752-L.jpg', grade:'Grade 6', genre:'Adventure', progress: 39 },
  { title: 'Walk Two Moons',              cover: 'https://covers.openlibrary.org/b/isbn/0064405176-L.jpg',  grade: 'Grade 6', genre: 'Realistic',    progress: 62 },
  { title: 'The Hobbit',                  cover: 'https://covers.openlibrary.org/b/isbn/0618968636-L.jpg',  grade: 'Grade 6', genre: 'Fantasy',      progress: 28 },
  { title: 'Anne of Green Gables',        cover: 'https://covers.openlibrary.org/b/isbn/0553213113-L.jpg',  grade: 'Grade 6', genre: 'Classic',      progress: 53 },
  { title: 'The Secret Garden',           cover: 'https://covers.openlibrary.org/b/isbn/0064401383-L.jpg',  grade: 'Grade 6', genre: 'Classic',      progress: 47 },
  { title: 'Tom Sawyer',                  cover: 'https://covers.openlibrary.org/b/isbn/0486400778-L.jpg',  grade: 'Grade 6', genre: 'Classic',      progress: 36 },
  { title: 'The Witch of Blackbird Pond',  cover: 'https://covers.openlibrary.org/b/isbn/0547550294-L.jpg',  grade: 'Grade 6', genre: 'Historical',   progress: 42 },

  // ─ Grade 7 ───────────────────────────────────────────────────────
  { title: 'The Giver',                   cover: 'https://covers.openlibrary.org/b/isbn/0440237688-L.jpg',  grade: 'Grade 7', genre: 'Dystopia',     progress: 58 },
  { title: 'The Outsiders',               cover: 'https://covers.openlibrary.org/b/isbn/0140385614-L.jpg',  grade: 'Grade 7', genre: 'Classic',      progress: 49 },
  { title: 'Animal Farm',                 cover: 'https://covers.openlibrary.org/b/isbn/0451526341-L.jpg',  grade: 'Grade 7', genre: 'Allegory',     progress: 37 },
  { title: 'Diary of Anne Frank',         cover: 'https://covers.openlibrary.org/b/isbn/0553577123-L.jpg',  grade: 'Grade 7', genre: 'Memoir',       progress: 64 },
  { title: 'A Separate Peace',            cover: 'https://covers.openlibrary.org/b/isbn/0743253973-L.jpg',  grade: 'Grade 7', genre: 'Classic',      progress: 29 },
  { title: 'Johnny Tremain',              cover: 'https://covers.openlibrary.org/b/isbn/0440442079-L.jpg',  grade: 'Grade 7', genre: 'Historical',   progress: 41 },
  { title: 'The Hunger Games',            cover: 'https://covers.openlibrary.org/b/isbn/0439023483-L.jpg',  grade: 'Grade 7', genre: 'Dystopia',     progress: 73 },
  { title: 'Divergent',                   cover: 'https://covers.openlibrary.org/b/isbn/0062024027-L.jpg',  grade: 'Grade 7', genre: 'Dystopia',     progress: 56 },
  { title: 'The House on Mango Street',   cover: 'https://covers.openlibrary.org/b/isbn/0679734775-L.jpg',  grade: 'Grade 7', genre: 'Classic',      progress: 44 },
  { title: 'Flowers for Algernon',        cover: 'https://covers.openlibrary.org/b/isbn/0156030306-L.jpg',  grade: 'Grade 7', genre: 'Sci-Fi',       progress: 61 },

  // ─ Grade 8 ───────────────────────────────────────────────────────
  { title: 'To Kill a Mockingbird',       cover: 'https://covers.openlibrary.org/b/isbn/0446310786-L.jpg',  grade: 'Grade 8', genre: 'Classic',      progress: 33 },
  { title: 'Lord of the Flies',           cover: 'https://covers.openlibrary.org/b/isbn/0399501487-L.jpg',  grade: 'Grade 8', genre: 'Classic',      progress: 45 },
  { title: '1984',                        cover: 'https://covers.openlibrary.org/b/isbn/0451524934-L.jpg',  grade: 'Grade 8', genre: 'Dystopia',     progress: 28 },
  { title: 'The Catcher in the Rye',      cover: 'https://covers.openlibrary.org/b/isbn/0316769487-L.jpg',  grade: 'Grade 8', genre: 'Classic',      progress: 52 },
  { title: 'Fahrenheit 451',              cover: 'https://covers.openlibrary.org/b/isbn/1451673310-L.jpg',  grade: 'Grade 8', genre: 'Dystopia',     progress: 39 },
  { title: 'The Maze Runner',             cover: 'https://covers.openlibrary.org/b/isbn/0385737955-L.jpg',  grade: 'Grade 8', genre: 'Sci-Fi',       progress: 67 },
  { title: 'Of Mice and Men',             cover: 'https://covers.openlibrary.org/b/isbn/0140177396-L.jpg',  grade: 'Grade 8', genre: 'Classic',      progress: 48 },
  { title: 'The Great Gatsby',            cover: 'https://covers.openlibrary.org/b/isbn/0743273567-L.jpg',  grade: 'Grade 8', genre: 'Classic',      progress: 31 },
  { title: 'Romeo and Juliet',            cover: 'https://covers.openlibrary.org/b/isbn/0743477111-L.jpg',  grade: 'Grade 8', genre: 'Drama',        progress: 55 },
  { title: 'The Alchemist',               cover: 'https://covers.openlibrary.org/b/isbn/0062315005-L.jpg',  grade: 'Grade 8', genre: 'Adventure',    progress: 42 },
]

// Fisher-Yates shuffle — runs once to build the random play-order
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const GRADE_DATA = [
  { label: 'K',   full: 'Kindergarten', emoji: '🌱', color: '#4ADE80' },
  { label: '1st', full: '1st Grade',    emoji: '⭐', color: '#FBBF24' },
  { label: '2nd', full: '2nd Grade',    emoji: '🦋', color: '#F87171' },
  { label: '3rd', full: '3rd Grade',    emoji: '🚀', color: '#38BDF8' },
  { label: '4th', full: '4th Grade',    emoji: '🦁', color: '#A78BFA' },
  { label: '5th', full: '5th Grade',    emoji: '🐉', color: '#2DD4BF' },
  { label: '6th', full: '6th Grade',    emoji: '🔮', color: '#F59E0B' },
  { label: '7th', full: '7th Grade',    emoji: '🏆', color: '#EC4899' },
  { label: '8th', full: '8th Grade',    emoji: '🌟', color: '#c09cff' },
]

const FEATURES = [
  {
    emoji: '📚',
    title: 'AI-Powered Reading',
    desc: 'Custom stories generated just for your child — tailored to their grade, interests, and reading level.',
    bg: 'rgba(124,58,237,0.12)',
    color: '#c09cff',
    glow: 'radial-gradient(circle at 20% 80%, rgba(124,58,237,0.08) 0%, transparent 60%)',
    shadow: '0 8px 24px rgba(124,58,237,0.15)',
  },
  {
    emoji: '🎯',
    title: 'Smart Comprehension',
    desc: 'After each story, interactive quizzes and comprehension checks adapt to ensure real understanding.',
    bg: 'rgba(56,189,248,0.12)',
    color: '#7dd3fc',
    glow: 'radial-gradient(circle at 80% 20%, rgba(56,189,248,0.08) 0%, transparent 60%)',
    shadow: '0 8px 24px rgba(56,189,248,0.12)',
  },
  {
    emoji: '🏆',
    title: 'Rewards & Streaks',
    desc: 'Keep kids coming back with XP points, streak badges, and a leaderboard that makes reading a game.',
    bg: 'rgba(245,158,11,0.12)',
    color: '#FCD34D',
    glow: 'radial-gradient(circle at 50% 100%, rgba(245,158,11,0.08) 0%, transparent 60%)',
    shadow: '0 8px 24px rgba(245,158,11,0.12)',
  },
]

const HOW_STEPS = [
  { emoji: '👶', label: 'Create Profile', desc: 'Set up in seconds. No credit card needed.' },
  { emoji: '🎨', label: 'Pick a Story',   desc: 'Choose a theme, character & language.' },
  { emoji: '📖', label: 'Start Reading',  desc: 'AI narrates, then your child reads aloud.' },
  { emoji: '⭐', label: 'Earn Rewards',   desc: 'Collect XP, badges & climb the leaderboard.' },
]

// Generate random star positions (stable via ref)
function useStars(count = 40) {
  const ref = useRef<{ x: number; y: number; size: number; dur: number; delay: number; op: number }[]>([])
  if (!ref.current.length) {
    ref.current = Array.from({ length: count }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      dur: 3 + Math.random() * 5,
      delay: Math.random() * 6,
      op: 0.3 + Math.random() * 0.65,
    }))
  }
  return ref.current
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'hero' | 'name' | 'grade'>('hero')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [bookIndex, setBookIndex] = useState(0)
  const [bookVisible, setBookVisible] = useState(true)
  const stars = useStars(45)
  // Shuffle once on mount so each page visit has a different order
  const shuffledBooks = useRef<BookEntry[]>([])
  if (!shuffledBooks.current.length) shuffledBooks.current = shuffle(BOOKS_BY_GRADE)
  const currentBook = shuffledBooks.current[bookIndex]

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Auto-rotate book every 3.5 seconds with a fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      setBookVisible(false)
      setTimeout(() => {
        setBookIndex(i => (i + 1) % shuffledBooks.current.length)
        setBookVisible(true)
      }, 350)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  const handleNameNext = () => {
    if (name.trim().length < 2) { setNameError('Please enter at least 2 characters.'); return }
    setNameError('')
    setStep('grade')
  }

  const handleGradeSelect = async (gradeIndex: number) => {
    setSelectedGrade(gradeIndex)
    setLoading(true)
    try {
      const res = await studentsApi.create(name.trim(), gradeIndex)
      localStorage.setItem('readquest_student_id', res.data.id)
      localStorage.setItem('readquest_student_name', name.trim())
      localStorage.setItem('readquest_grade', String(gradeIndex))
      setTimeout(() => navigate('/dashboard'), 600)
    } catch {
      localStorage.setItem('readquest_student_id', 'demo-student-1')
      localStorage.setItem('readquest_student_name', name.trim())
      localStorage.setItem('readquest_grade', String(gradeIndex))
      setTimeout(() => navigate('/dashboard'), 600)
    }
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); setSession(null) }

  return (
    <div className="landing-root">

      {/* ── Star particles ── */}
      <div className="landing-stars" aria-hidden>
        {stars.map((s, i) => (
          <div key={i} className="landing-star" style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size,
            '--dur': `${s.dur}s`, '--delay': `${s.delay}s`, '--op': s.op,
          } as React.CSSProperties} />
        ))}
      </div>

      {/* ══ NAV ══ */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="landing-logo" onClick={() => setStep('hero')}>
            <span className="logo-icon">✨</span>
            Read<span className="logo-accent">Quest</span>
          </div>
          <div className="nav-links">
            <button className="nav-link" onClick={() => setStep('hero')}>Home</button>
            <button className="nav-link">Features</button>
            <button className="nav-link">Pricing</button>
            {session ? (
              <>
                <button className="nav-link nav-special" onClick={() => navigate('/dashboard')}>My Dashboard →</button>
                <button className="btn-ghost" onClick={handleSignOut}>Sign Out</button>
              </>
            ) : (
              <>
                <button className="nav-link" onClick={() => navigate('/login')}>Log In</button>
                <button className="btn-solid" onClick={() => navigate('/signup')}>Sign Up Free</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ══ MAIN ══ */}
      <main className="landing-main">
        <AnimatePresence mode="wait">

          {/* ── HERO ── */}
          {step === 'hero' && (
            <motion.div key="hero" className="view-hero"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4 }}>

              {/* Hero Columns */}
              <div className="hero-columns">

                {/* Left */}
                <div className="hero-text-col">
                  <motion.div className="badge-pill"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <span className="badge-pill-dot" />
                    🚀 AI-Powered Kids Reading Platform
                  </motion.div>

                  <motion.h1 className="hero-heading"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
                    Where Stories<br />Come <span className="text-gradient">Alive.</span>
                  </motion.h1>

                  <motion.p className="hero-subtext"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
                    Ignite your child's imagination with personalized, AI-powered reading adventures that grow with them — from Kindergarten to 8th Grade.
                  </motion.p>

                  <motion.div className="hero-actions"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    {session ? (
                      <button className="btn-solid btn-large" onClick={() => navigate('/dashboard')}>
                        Go to Dashboard 🚀
                      </button>
                    ) : (
                      <>
                        <button className="btn-solid btn-large" onClick={() => navigate('/signup')}>
                          Get Started Free ✨
                        </button>
                        <button className="btn-outline btn-large" onClick={() => navigate('/login')}>
                          Log In
                        </button>
                      </>
                    )}
                  </motion.div>

                  <motion.div className="hero-stats"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                    <div className="stat-block">
                      <strong>10K+</strong>
                      <span>Stories Created</span>
                    </div>
                    <div className="stat-block">
                      <strong>Grade K–8</strong>
                      <span>Skill Levels</span>
                    </div>
                    <div className="stat-block">
                      <strong>98%</strong>
                      <span>Parent Satisfaction</span>
                    </div>
                  </motion.div>
                </div>

                {/* Right — floating book card */}
                <motion.div className="hero-image-col"
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
                  <div className="image-wrapper">
                    <div className="image-glow" />
                    {/* Rotating real children's book card */}
                    <div className="hero-book-card" style={{ transition: 'opacity 0.35s ease', opacity: bookVisible ? 1 : 0 }}>
                      <div className="book-card-cover" style={{ background: 'none', padding: 0 }}>
                        <img
                          key={currentBook.cover}
                          src={currentBook.cover}
                          alt={currentBook.title}
                          style={{
                            width: '100%', height: '100%',
                            objectFit: 'cover',
                            borderRadius: 16,
                            display: 'block',
                          }}
                          onError={e => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>
                      <div className="book-card-title">{currentBook.title}</div>
                      <div className="book-card-meta">
                        <span className="book-card-tag">{currentBook.grade}</span>
                        <span className="book-card-tag">{currentBook.genre}</span>
                      </div>
                      <div className="book-card-progress">
                        <div className="book-card-progress-label">
                          <span>Reading Progress</span>
                          <span>{currentBook.progress}%</span>
                        </div>
                        <div className="book-card-bar">
                          <div className="book-card-bar-fill" style={{ width: `${currentBook.progress}%` }} />
                        </div>
                      </div>
                      {/* Dot indicators */}
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 4 }}>
                        {shuffledBooks.current.map((_: BookEntry, i: number) => (
                          <button
                            key={i}
                            onClick={() => { setBookVisible(false); setTimeout(() => { setBookIndex(i); setBookVisible(true) }, 200) }}
                            style={{
                              width: i === bookIndex ? 18 : 6,
                              height: 6,
                              borderRadius: 99,
                              background: i === bookIndex ? '#c09cff' : 'rgba(192,156,255,0.25)',
                              border: 'none', cursor: 'pointer',
                              padding: 0, transition: 'all 0.3s ease',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* ── Features Grid ── */}
              <div className="features-section">
                <motion.div className="features-eyebrow"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  <span>⭐</span> Everything your child needs to love reading
                </motion.div>
                <motion.h2 className="features-title"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
                  Learning that feels like play
                </motion.h2>
                <p className="features-sub">Designed by educators for kids ages 5–14.</p>

                <div className="modern-grid">
                  {FEATURES.map((f, i) => (
                    <motion.div key={f.title} className="modern-card"
                      style={{ '--card-glow': f.glow, '--card-shadow': f.shadow } as React.CSSProperties}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.1, duration: 0.45 }}>
                      <div className="card-icon" style={{ background: f.bg, color: f.color }}>
                        {f.emoji}
                      </div>
                      <h3>{f.title}</h3>
                      <p>{f.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* ── How it works ── */}
              <div className="how-section">
                <div className="features-eyebrow"><span>🗺️</span> Simple Setup, Instant Magic ✨</div>
                <h2 className="features-title">How the Magic Happens</h2>
                <p className="features-sub">Get your child reading in under 2 minutes.</p>
                <div className="how-steps">
                  {HOW_STEPS.map((s, i) => (
                    <motion.div key={s.label} className="how-step"
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.12 }}>
                      <div className="how-step-circle">{s.emoji}</div>
                      <div className="how-step-label">{s.label}</div>

                      <div className="how-step-desc">{s.desc}</div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* ── CTA Banner ── */}
              <motion.div className="cta-banner"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="features-eyebrow"><span>🎉</span> No credit card required</div>
                <h2 className="cta-title">Start your child's reading journey today</h2>
                <p className="cta-sub">Join thousands of families using ReadQuest to build confident, lifelong readers.</p>
                <div className="cta-actions">
                  {session ? (
                    <button className="btn-solid btn-large" onClick={() => navigate('/dashboard')}>
                      Open Dashboard →
                    </button>
                  ) : (
                    <>
                      <button className="btn-solid btn-large" onClick={() => navigate('/signup')}>
                        Create Free Account ✨
                      </button>
                      <button className="btn-outline btn-large" onClick={() => navigate('/login')}>
                        View Sample Stories 📚
                      </button>
                    </>
                  )}
                </div>
              </motion.div>

            </motion.div>
          )}

          {/* ── NAME STEP ── */}
          {step === 'name' && (
            <motion.div key="name" className="view-wizard"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: 0.3 }}>
              <div className="wizard-box">
                <div className="wizard-header">
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>👋</div>
                  <h2>Create Profile</h2>
                  <p>Let's personalize your child's experience.</p>
                </div>
                <div className="wizard-body">
                  <label className="form-label">Child's Name</label>
                  <input className={`form-input ${nameError ? 'input-error' : ''}`}
                    type="text" placeholder="e.g. Emma Doe"
                    value={name} onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleNameNext()} autoFocus />
                  {nameError && <div className="error-message">{nameError}</div>}
                </div>
                <div className="wizard-footer">
                  <button className="btn-ghost" onClick={() => setStep('hero')}>← Back</button>
                  <button className="btn-solid" onClick={handleNameNext}>Continue →</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── GRADE STEP ── */}
          {step === 'grade' && (
            <motion.div key="grade" className="view-wizard"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: 0.3 }}>
              <div className="wizard-box wizard-large">
                <div className="wizard-header">
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎓</div>
                  <h2>Welcome, {name}!</h2>
                  <p>Select {name}'s grade so we can calibrate the reading level.</p>
                </div>
                <div className="grade-grid">
                  {GRADE_DATA.map((g, i) => (
                    <motion.button key={i}
                      className={`grade-tile ${selectedGrade === i ? 'selected' : ''}`}
                      whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }}
                      onClick={() => handleGradeSelect(i)}
                      disabled={loading}
                      style={{ '--g-color': g.color } as React.CSSProperties}>
                      <span className="grade-icon">{g.emoji}</span>
                      <span className="grade-abbr">{g.label}</span>
                      <span className="grade-fulltxt">{g.full}</span>
                    </motion.button>
                  ))}
                </div>
                {loading && (
                  <div className="loading-state">
                    <span className="loader-ring" /> Setting up {name}'s reading world...
                  </div>
                )}
                <div className="wizard-footer" style={{ marginTop: 32 }}>
                  <button className="btn-ghost" onClick={() => setStep('name')}>← Back</button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ══ FOOTER ══ */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">✨ ReadQuest Junior</div>
          <div className="footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>
          <div className="footer-copy">© 2026 ReadQuest Inc. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
