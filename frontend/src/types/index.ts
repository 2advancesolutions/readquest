// ReadQuest TypeScript Types

export interface WordResult {
  word: string;
  correct: boolean;
  attempts: number;
}

export interface PageScore {
  pageNumber: number;
  correctWords: number;
  totalWords: number;
  incorrectWords: WordResult[];
}

export interface ReadingSession {
  scores: PageScore[];
  totalCorrect: number;
  totalWords: number;
  accuracyPct: number;    // overall score (70% reading + 30% quiz)
  readingPct?: number;    // reading accuracy only
  quizPct?: number;       // quiz accuracy only
  quizCorrect?: number;
  quizTotal?: number;
}

export interface ComprehensionAnswer {
  question: string;
  answer: string;
}

export interface Student {
  id: string;
  name: string;
  grade_level: number;
  avatar_url?: string;
  created_at: string;
}

export interface StoryPage {
  id: string;
  story_id: string;
  page_number: number;
  content: string;
  media_url?: string;
  word_count: number;
}

export interface QuizQuestion {
  id: string;
  story_page_id: string;
  question: string;
  choices: string[];
  correct_answer: string;
  explanation?: string;
}

export interface Story {
  id: string;
  student_id: string;
  title: string;
  grade_level: number;
  theme: string;
  cover_media_url?: string;
  pages: StoryPage[];
  quiz_questions: QuizQuestion[];
  created_at: string;
}

export interface Badge {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
  earned_at?: string;
}

export interface XPLedgerEntry {
  id: string;
  amount: number;
  reason: string;
  earned_at: string;
}

export interface StudentRewards {
  total_xp: number;
  level: number;
  level_name: string;
  xp_to_next_level: number;
  xp_progress_pct: number;
  current_streak: number;
  badges: Badge[];
  xp_history: { date: string; amount: number }[];
  weekly_activity?: { date: string; active: boolean }[];
  stories_read?: number;
}

export interface GenerateStoryRequest {
  grade: number;
  theme: string;
  character_name: string;
}

export type Theme =
  | 'animals'
  | 'space'
  | 'adventure'
  | 'fantasy'
  | 'sports'
  | 'science'
  | 'ocean'
  | 'dinosaurs';

export interface LeaderboardEntry {
  student_id: string;
  name: string;
  avatar_url?: string;
  total_xp: number;
  level: number;
  level_name: string;
  rank: number;
}

export const LEVEL_NAMES: Record<number, string> = {
  1: 'Bookworm 🐛',
  2: 'Story Explorer 🗺️',
  3: 'Word Wizard 🔮',
  4: 'Reading Champion 🏆',
  5: 'Legend 🌟',
};

export const XP_PER_LEVEL = 200;

export const THEME_META: Record<Theme, { emoji: string; label: string; color: string }> = {
  animals:   { emoji: '🦁', label: 'Animals',    color: '#4ADE80' },
  space:     { emoji: '🚀', label: 'Space',       color: '#38BDF8' },
  adventure: { emoji: '🗺️', label: 'Adventure',  color: '#FBBF24' },
  fantasy:   { emoji: '🧙', label: 'Fantasy',     color: '#A78BFA' },
  sports:    { emoji: '⚽', label: 'Sports',      color: '#F87171' },
  science:   { emoji: '🔬', label: 'Science',     color: '#2DD4BF' },
  ocean:     { emoji: '🐠', label: 'Ocean',       color: '#0EA5E9' },
  dinosaurs: { emoji: '🦕', label: 'Dinosaurs',   color: '#84CC16' },
};
