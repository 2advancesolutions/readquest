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
  language?: string;           // e.g. 'english', 'spanish', 'french', etc.
  cover_media_url?: string;
  pages: StoryPage[];
  quiz_questions: QuizQuestion[];
  created_at: string;
  // Reading progress fields (populated from localStorage / Supabase)
  last_page?: number;
  page_count?: number;
  progress_pct?: number;
  completed_at?: string | null;
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

// ── Phase 1 — AI Tutor Types ────────────────────────────────────────────────

export interface WordError {
  word: string;
  spoken_word?: string;
  error_type: 'mispronounced' | 'skipped' | 'repeated';
  word_index: number;
}

export interface FluencySession {
  session_id: string;
  student_id: string;
  story_id: string;
  page_number: number;
  accuracy_pct: number;
  words_per_minute: number | null;
  correct_words: number;
  total_words: number;
  word_errors: WordError[];
  feedback: string;
  recorded_at: string;
}

export interface VocabularyWord {
  id: string;
  word: string;
  definition: string;
  example_sentence: string;
  pronunciation_url?: string;
  grade_level: number;
  story_id: string;
  student_id: string;
  is_saved: boolean;
}

export type AssignmentType = 'vocabulary' | 'fluency' | 'comprehension' | 'mixed';
export type AssignmentStatus = 'pending' | 'completed' | 'reviewed';

export interface AssignmentTask {
  type: string;
  prompt: string;
  options?: string[];
  correct_answer?: string;
  hint?: string;
}

export interface Assignment {
  id: string;
  student_id: string;
  title: string;
  description: string;
  assignment_type: AssignmentType;
  status: AssignmentStatus;
  content: AssignmentTask[];
  difficulty_level: number;
  source: 'ai_generated' | 'parent';
  created_at: string;
}

export interface QuestLevel {
  id: string;
  level_number: number;
  name: string;
  description: string;
  required_stories: number;
  min_accuracy_pct: number;
  min_quiz_pct: number;
  min_assignment_score: number;
  xp_reward: number;
  badge_slug?: string;
}

export interface QuestProgress {
  student_id: string;
  current_level: number;
  level_name: string;
  stories_completed: number;
  stories_required: number;
  avg_accuracy: number;
  min_accuracy_required: number;
  avg_quiz_score: number;
  min_quiz_required: number;
  avg_assignment_score: number;
  min_assignment_required: number;
}

export interface ParentReview {
  id: string;
  parent_id: string;
  student_id: string;
  star_grade: number;   // 1-5
  comment?: string;
  assignment_id?: string;
  fluency_session_id?: string;
  reviewed_at: string;
}

export interface SELReflectionPrompt {
  question: string;
  hint_1: string;
  hint_2: string;
  hint_3: string;
}

export interface SELData {
  sel_tags: string[];
  reflection_prompts: SELReflectionPrompt[];
  character_guide: string;
}

// ── Recordings ───────────────────────────────────────────────────────────────

export type WordStatus = 'idle' | 'correct' | 'wrong' | 'current'

export interface Recording {
  id?: number                // auto-increment IndexedDB key
  studentId: string
  studentName: string
  bookId: string
  bookTitle: string
  bookCover?: string         // cover URL for display
  gradeLevel: number
  pageNumber: number
  pageText: string           // original story page text
  transcript: string         // what the child actually said
  wordStatuses: WordStatus[] // ['correct','wrong','correct',...]
  accuracy: number           // percentage 0-100
  audioBlob: Blob            // WebM audio from MediaRecorder
  duration: number           // seconds
  createdAt: string          // ISO timestamp
}


// ── Reading Exam Center ───────────────────────────────────────────────────────

export interface ExamQuestion {
  id: string
  question_number: number
  strand: string
  question_type: 'single' | 'multi'
  passage?: string | null
  question_text: string
  choices: string[]
  difficulty: string
}

export interface ReadingExam {
  exam_id: string
  grade_level: number
  section: string
  is_practice: boolean
  total_questions: number
  time_limit_sec: number
  exam_difficulty: string   // 'easy' | 'medium' | 'hard'
  questions: ExamQuestion[]
}

export interface QuestionResult {
  question_id: string
  question_number: number
  question_text: string
  passage?: string | null
  choices: string[]
  student_answers: string[]
  correct_answers: string[]
  is_correct: boolean
  explanation?: string | null
  strand: string
}

export interface ExamResult {
  attempt_id: string
  exam_id: string
  grade_level: number
  section: string
  is_practice: boolean
  exam_number: number
  retake_number: number
  retakes_remaining: number
  correct_count: number
  total_questions: number
  score_pct: number
  passed: boolean
  xp_earned: number
  time_taken_sec?: number | null
  reset_triggered: boolean
  results: QuestionResult[]
}

export interface ExamHistoryItem {
  attempt_id: string
  exam_id: string
  grade_level: number
  section: string
  section_label: string
  is_practice: boolean
  exam_number: number
  retake_number: number
  score_pct: number
  correct_count: number
  total_questions: number
  passed: boolean
  xp_earned: number
  time_taken_sec?: number | null
  completed_at: string
}

export interface SectionStatus {
  section: string
  section_label: string
  passed: boolean
  best_score: number
  total_attempts: number
  retake_number: number
  retakes_remaining: number
}

export interface GradeReadiness {
  student_grade: number
  total_passed_exams: number
  required_exams: number         // 10
  required_books: number         // 60
  books_read: number
  overall_avg_score: number
  required_avg: number           // 80.0
  sections: SectionStatus[]
  any_section_maxed_retakes: boolean
  ready_for_next_grade: boolean
  promoted_grade?: number | null
}

export const EXAM_SECTIONS: Record<string, { label: string; emoji: string; color: string; desc: string }> = {
  practice:      { label: 'Practice Test',               emoji: '🧪', color: '#60a5fa', desc: '15 questions · 10 minutes · Build confidence before the real exam' },
  phonics:       { label: 'Phonics & Word Recognition',  emoji: '📖', color: '#38BDF8', desc: 'Letter sounds, blending, and word patterns' },
  vocabulary:    { label: 'Vocabulary & Context Clues',  emoji: '💬', color: '#A78BFA', desc: 'Word meanings, synonyms, and context' },
  comprehension: { label: 'Reading Comprehension',       emoji: '🧠', color: '#4ADE80', desc: 'Understanding passages and drawing inferences' },
  grammar:       { label: 'Grammar & Language',          emoji: '✏️', color: '#FBBF24', desc: 'Parts of speech, punctuation, and sentence structure' },
  mixed:         { label: 'Mixed Assessment',            emoji: '🎯', color: '#F87171', desc: 'All strands — the final readiness exam' },
}

export const GRADE_LABELS: Record<number, string> = {
  0: 'Kindergarten', 1: 'Grade 1', 2: 'Grade 2', 3: 'Grade 3',
  4: 'Grade 4', 5: 'Grade 5', 6: 'Grade 6',
}


