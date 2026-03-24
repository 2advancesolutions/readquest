// Mock story data — separate file to allow template literals without JSX parsing issues
import type { Story } from '../types'

const p1 = `Deep in the heart of the Sunshine Savanna, there lived a young lion named Leo. Leo had the fluffiest mane and the biggest, brightest eyes of any cub in the pride. But Leo had a secret — he was scared of the dark!`

const p2 = `Every night when the moon rose high in the sky, Leo would squeeze his eyes shut tight. He would wonder what scary things might be hiding in the shadows. His mother would nuzzle him gently and say: Brave lions do not just roar, Leo. They also face their fears.`

const p3 = `One stormy night, a tiny zebra foal got separated from his herd near the edge of the forest. The little zebra called out for help! Leo heard the cry. His heart thumped fast, but he remembered what his mother had said. He took a deep breath and stepped into the dark.`

const p4 = `Leo followed the sound of the foal's voice through the rustling trees. The shadows danced all around him, but Leo kept walking. Suddenly, there was the little zebra, shivering under a giant baobab tree! Leo said softly, do not worry little one. I will guide you home.`

const p5 = `When dawn painted the sky in gold and pink, Leo led the zebra foal back safely to the herd. The whole Sunshine Savanna cheered! Leo smiled the biggest lion smile. He discovered that being brave does not mean having no fear — it means helping others even when you feel afraid.`

export const MOCK_STORY: Story = {
  id: 'mock-1',
  student_id: 'demo-student-1',
  title: 'Leo the Brave Lion',
  grade_level: 2,
  theme: 'animals',
  cover_image_url: '',
  created_at: new Date().toISOString(),
  pages: [
    { id: 'p1', story_id: 'mock-1', page_number: 1, word_count: 45, content: p1, image_url: '/page1.png' },
    { id: 'p2', story_id: 'mock-1', page_number: 2, word_count: 50, content: p2, image_url: '/page2.png' },
    { id: 'p3', story_id: 'mock-1', page_number: 3, word_count: 55, content: p3, image_url: '/page3.png' },
    { id: 'p4', story_id: 'mock-1', page_number: 4, word_count: 48, content: p4, image_url: '/page4.png' },
    { id: 'p5', story_id: 'mock-1', page_number: 5, word_count: 42, content: p5, image_url: '/page5.png' },
  ],
  quiz_questions: [
    { id: 'q1', story_page_id: 'p2', question: 'What was Leo scared of?', choices: ['Loud thunder', 'The dark', 'Swimming in rivers', 'Tall trees'], correct_answer: 'The dark', explanation: 'The story says Leo was scared of the dark every night!' },
    { id: 'q2', story_page_id: 'p4', question: 'What did Leo find under the baobab tree?', choices: ['A lost elephant', 'A sleeping giraffe', 'A shivering zebra foal', 'A baby bird'], correct_answer: 'A shivering zebra foal', explanation: 'Leo found the little zebra foal shivering under the baobab tree.' },
    { id: 'q3', story_page_id: 'p5', question: 'What lesson did Leo learn at the end?', choices: ['Lions are the fastest runners', 'Being brave means having no fear', 'Bravery means helping others even when scared', 'The dark is not scary at all'], correct_answer: 'Bravery means helping others even when scared', explanation: 'Leo learned that you can be brave even when you feel scared — by helping others!' },
  ],
}
