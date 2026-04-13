/**
 * Grade 1 Game Data Banks
 * Sourced directly from:
 *   - 1stGradeMagneticReadingFREEWorksheets...pdf
 *   - SpringReadingComprehensionPassages...pdf
 *   - TracingCapitalAlphabetLettersAZ...pdf
 */

// Shared utility
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Sight Words (Super Words) ─────────────────────────────────────────────────
// Source: MagneticReading pp.4 — Lessons 1-4 "Super Words"
export interface SightWordItem {
  word: string
  missingIdx: number      // index of letter to blank out
  lesson: number
  grade: number
}

export const SIGHT_WORD_BANKS: SightWordItem[] = [
  // Lesson 1
  { word: 'and', missingIdx: 1, lesson: 1, grade: 1 },
  { word: 'see', missingIdx: 0, lesson: 1, grade: 1 },
  { word: 'the', missingIdx: 2, lesson: 1, grade: 1 },
  { word: 'to',  missingIdx: 1, lesson: 1, grade: 1 },
  // Lesson 2
  { word: 'but', missingIdx: 1, lesson: 2, grade: 1 },
  { word: 'had', missingIdx: 0, lesson: 2, grade: 1 },
  { word: 'not', missingIdx: 2, lesson: 2, grade: 1 },
  { word: 'of',  missingIdx: 0, lesson: 2, grade: 1 },
  // Lesson 3
  { word: 'do',   missingIdx: 0, lesson: 3, grade: 1 },
  { word: 'that', missingIdx: 2, lesson: 3, grade: 1 },
  { word: 'they', missingIdx: 1, lesson: 3, grade: 1 },
  { word: 'was',  missingIdx: 2, lesson: 3, grade: 1 },
  // Lesson 4
  { word: 'are',  missingIdx: 0, lesson: 4, grade: 1 },
  { word: 'for',  missingIdx: 1, lesson: 4, grade: 1 },
  { word: 'with', missingIdx: 3, lesson: 4, grade: 1 },
  { word: 'you',  missingIdx: 1, lesson: 4, grade: 1 },
]

export function getSightWordItems(grade: number): SightWordItem[] {
  return SIGHT_WORD_BANKS.filter(w => w.grade <= grade)
}

// ── Plural Maker ──────────────────────────────────────────────────────────────
// Source: MagneticReading p.5 — "Word Analysis Lesson 1: Plurals with –s"
export interface PluralItem {
  singular: string
  plural: string
  emoji: string
  grade: number
}

export const PLURAL_BANKS: PluralItem[] = [
  // Direct from PDF spinner words
  { singular: 'bag',  plural: 'bags',  emoji: '👜', grade: 1 },
  { singular: 'cat',  plural: 'cats',  emoji: '🐱', grade: 1 },
  { singular: 'fan',  plural: 'fans',  emoji: '🌀', grade: 1 },
  { singular: 'map',  plural: 'maps',  emoji: '🗺️', grade: 1 },
  // Extended from passage vocabulary
  { singular: 'pond', plural: 'ponds', emoji: '🏞️', grade: 1 },
  { singular: 'snack',plural: 'snacks',emoji: '🍎', grade: 1 },
  { singular: 'pal',  plural: 'pals',  emoji: '🤝', grade: 1 },
  { singular: 'dog',  plural: 'dogs',  emoji: '🐶', grade: 1 },
  { singular: 'bug',  plural: 'bugs',  emoji: '🐛', grade: 1 },
  { singular: 'hat',  plural: 'hats',  emoji: '🎩', grade: 1 },
  { singular: 'cup',  plural: 'cups',  emoji: '🥤', grade: 1 },
  { singular: 'frog', plural: 'frogs', emoji: '🐸', grade: 1 },
  { singular: 'star', plural: 'stars', emoji: '⭐', grade: 1 },
  { singular: 'book', plural: 'books', emoji: '📚', grade: 1 },
  { singular: 'bird', plural: 'birds', emoji: '🐦', grade: 1 },
  { singular: 'tree', plural: 'trees', emoji: '🌳', grade: 1 },
]

export function getPluralItems(grade: number): PluralItem[] {
  return PLURAL_BANKS.filter(p => p.grade <= grade)
}

// ── Short Vowel Fill ──────────────────────────────────────────────────────────
// Source: MagneticReading p.8 — "Phonics Lesson 1: Short a" fill-in grid
export interface VowelFillItem {
  word: string       // complete word
  vowel: 'a' | 'e' | 'i' | 'o' | 'u'
  vowelIdx: number   // position of the vowel in the word
  choices: string[]  // vowel options
  emoji: string
  grade: number
}

export const VOWEL_FILL_BANKS: VowelFillItem[] = [
  // From MagneticReading p.8 (short a grid): c_t, b_g, h_m, s_d, f_n, m_p, c_p, j_m, h_t
  { word: 'cat', vowel: 'a', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🐱', grade: 1 },
  { word: 'bag', vowel: 'a', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '👜', grade: 1 },
  { word: 'ham', vowel: 'a', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🍖', grade: 1 },
  { word: 'sad', vowel: 'a', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '😢', grade: 1 },
  { word: 'fan', vowel: 'a', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🌀', grade: 1 },
  { word: 'map', vowel: 'a', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🗺️', grade: 1 },
  { word: 'cap', vowel: 'a', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🧢', grade: 1 },
  { word: 'jam', vowel: 'a', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🍓', grade: 1 },
  { word: 'hat', vowel: 'a', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🎩', grade: 1 },
  // Short i
  { word: 'sit', vowel: 'i', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🪑', grade: 1 },
  { word: 'big', vowel: 'i', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🐘', grade: 1 },
  { word: 'hit', vowel: 'i', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '⚾', grade: 1 },
  { word: 'pin', vowel: 'i', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '📌', grade: 1 },
  { word: 'dig', vowel: 'i', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '⛏️', grade: 1 },
  // Short o
  { word: 'pot', vowel: 'o', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🍲', grade: 1 },
  { word: 'hot', vowel: 'o', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🔥', grade: 1 },
  { word: 'mop', vowel: 'o', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🧹', grade: 1 },
  { word: 'log', vowel: 'o', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🪵', grade: 1 },
  // Short e
  { word: 'bed', vowel: 'e', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🛏️', grade: 1 },
  { word: 'hen', vowel: 'e', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🐔', grade: 1 },
  { word: 'net', vowel: 'e', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🕸️', grade: 1 },
  // Short u
  { word: 'bug', vowel: 'u', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🐛', grade: 1 },
  { word: 'run', vowel: 'u', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🏃', grade: 1 },
  { word: 'cup', vowel: 'u', vowelIdx: 1, choices: ['a','e','i','o','u'], emoji: '🥤', grade: 1 },
]

export function getVowelFillItems(grade: number): VowelFillItem[] {
  return VOWEL_FILL_BANKS.filter(v => v.grade <= grade)
}

// ── Sentence Stairs ───────────────────────────────────────────────────────────
// Source: MagneticReading pp.9-10 — "Sentence Stairs"
export interface SentenceStairItem {
  words: string[]     // full sentence split by word
  topic: string       // short label
  grade: number
}

export const SENTENCE_STAIR_BANKS: SentenceStairItem[] = [
  // From MagneticReading p.9 (Short a lesson)
  { words: ['Sam','has','a','cat','and','a','bat.'], topic: 'Sam & cat', grade: 1 },
  // From MagneticReading p.10 (Consonant review)  
  { words: ['The','bug','hid','in','the','red','pot.'], topic: 'Bug in pot', grade: 1 },
  // Extended 1st grade sentences
  { words: ['Max','and','Ben','sat','in','the','sun.'], topic: 'Max & Ben', grade: 1 },
  { words: ['The','cat','ran','to','the','big','pond.'], topic: 'Cat at pond', grade: 1 },
  { words: ['She','has','a','red','bag','and','a','hat.'], topic: 'Red bag', grade: 1 },
  { words: ['They','can','see','the','frog','jump.'], topic: 'Frog jump', grade: 1 },
  { words: ['He','had','a','bag','of','snacks.'], topic: 'Snack bag', grade: 1 },
  { words: ['The','dog','ran','fast','to','the','park.'], topic: 'Fast dog', grade: 1 },
]

export function getSentenceStairItems(grade: number): SentenceStairItem[] {
  return SENTENCE_STAIR_BANKS.filter(s => s.grade <= grade)
}

// ── Reading Passages + Comprehension Questions ────────────────────────────────
// Source: SpringComprehension pp.1-2 + MagneticReading p.3
export interface PassageQuestion {
  question: string
  choices: string[]
  correct: string
}

export interface PassageItem {
  title: string
  emoji: string
  passage: string
  questions: PassageQuestion[]
  grade: number
}

export const PASSAGE_BANKS: PassageItem[] = [
  // From MagneticReading p.3
  {
    title: 'Max and Ben',
    emoji: '🧒',
    grade: 1,
    passage: `Max and Ben sit in the sun. They see cats in the grass. One cat naps. One cat acts silly. Ben has a bag of snacks. He said, "Let's eat and play!" Max said, "We can share." They had a laugh. Max and Ben ran to the pond. They got wet! The pals sat to dry. The day was fun.`,
    questions: [
      {
        question: 'What do Max and Ben see in the grass?',
        choices: ['Dogs', 'Cats', 'Birds', 'Frogs'],
        correct: 'Cats',
      },
      {
        question: 'Where do Max and Ben run to?',
        choices: ['The park', 'The pond', 'The school', 'The house'],
        correct: 'The pond',
      },
      {
        question: 'What does Ben have in his bag?',
        choices: ['Toys', 'Books', 'Snacks', 'Cats'],
        correct: 'Snacks',
      },
    ],
  },
  // From SpringComprehension p.1
  {
    title: 'A Rainbow After the Rain',
    emoji: '🌈',
    grade: 1,
    passage: `After a spring storm, the sun came out. The sky was still wet, and suddenly, a rainbow appeared! It had red, orange, yellow, green, blue, and purple stripes. People stopped to admire its beauty. Rainbows only last for a short time. Seeing a rainbow is always a special surprise!`,
    questions: [
      {
        question: 'When did the rainbow appear?',
        choices: ['After a storm', 'In the morning', 'During lunch', 'Before school'],
        correct: 'After a storm',
      },
      {
        question: 'How many colors does a rainbow have in the story?',
        choices: ['3', '4', '5', '6'],
        correct: '6',
      },
      {
        question: 'How long do rainbows last?',
        choices: ['All day', 'A short time', 'One hour', 'All night'],
        correct: 'A short time',
      },
    ],
  },
  // From SpringComprehension p.2
  {
    title: 'The First Butterfly',
    emoji: '🦋',
    grade: 1,
    passage: `Mia was playing outside when she saw a butterfly. Its wings were orange and black. It landed on a flower and flapped its wings. Mia watched as it flew away. She knew that spring was finally here. Butterflies love warm weather and bright flowers!`,
    questions: [
      {
        question: 'What colors were the butterfly\'s wings?',
        choices: ['Red and blue', 'Yellow and green', 'Orange and black', 'Purple and pink'],
        correct: 'Orange and black',
      },
      {
        question: 'Where did the butterfly land?',
        choices: ['On a tree', 'On a flower', 'On Mia\'s hand', 'On the grass'],
        correct: 'On a flower',
      },
      {
        question: 'What did seeing the butterfly mean?',
        choices: ['Rain was coming', 'Winter was here', 'Spring had arrived', 'School was starting'],
        correct: 'Spring had arrived',
      },
    ],
  },
]

export function getPassageItems(grade: number): PassageItem[] {
  return PASSAGE_BANKS.filter(p => p.grade <= grade)
}
