import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ALL_CHARACTERS } from './CharacterGallery'

type CoachState = 'idle' | 'correct' | 'wrong' | 'mastery' | 'intro'

interface Props {
  characterName: string
  state: CoachState
  message?: string
}

const CHAR_PHRASES: Record<string, Record<CoachState, string[]>> = {
  'SpongeBob':    { idle: ["I'm ready!", "Let's go!"], correct: ["I'm ready, I'm ready! 🎉", "Barnacles, that was great!"], wrong: ["Tartar sauce! Try again 💪", "Don't give up, buddy!"], mastery: ["BEST DAY EVER! 🏆", "Patrick would be SO proud!"], intro: ["Are you ready, kids?! Let's spell!"] },
  'Pikachu':      { idle: ["Pika pika!"], correct: ["Pika-GREAT! ⚡🎉", "Pi-ka-CHU! Amazing!"], wrong: ["Pika... try again 💪", "Chu chu! You got this!"], mastery: ["PIKACHU! 🏆 You're a champion!"], intro: ["Pika pika! Let's learn to spell!"] },
  'Elsa':         { idle: ["Ready to begin?"], correct: ["Magical! ❄️✨", "You make the cold proud!"], wrong: ["Nearly there! Let it go... try again 💪"], mastery: ["Let it spell! 🏆❄️ You mastered it!"], intro: ["Let's spell! The cold never bothered me anyway ❄️"] },
  'Moana':        { idle: ["The ocean calls!"], correct: ["You are the ocean's gift! 🌊🎉", "Te Fiti is pleased!"], wrong: ["The sea doesn't give up — neither do you! 💪"], mastery: ["You've found your way! 🏆🌊"], intro: ["How far I'll spell! Let's go!"] },
  'Simba':        { idle: ["Hakuna Matata!"], correct: ["ROAR! That's a winner! 🦁🎉"], wrong: ["Remember who you are — try again! 💪"], mastery: ["The king of spelling! 🏆👑"], intro: ["I just can't wait to spell! Let's go!"] },
  'Mickey Mouse': { idle: ["Ha-ha!"], correct: ["Oh boy, oh boy! 🎉 You got it!", "Ha-ha! Fantastic!"], wrong: ["That's okay! Try again, pal! 💪"], mastery: ["Hot dog! You mastered it! 🏆"], intro: ["Ha-ha! Let's get spelling!"] },
}

const DEFAULT_PHRASES: Record<CoachState, string[]> = {
  idle:    ["Let's spell!", "You can do it!"],
  correct: ["Amazing! 🎉", "That's right!", "Excellent! ✨"],
  wrong:   ["Almost! Try again 💪", "So close! You've got this!"],
  mastery: ["You mastered it! 🏆🌟", "Word champion!"],
  intro:   ["Let's learn some words together! 📚"],
}

function pick(arr: string[]) { return arr[Math.floor(Math.random() * arr.length)] }

function getPhrase(name: string, state: CoachState): string {
  const phrases = CHAR_PHRASES[name]?.[state] ?? DEFAULT_PHRASES[state]
  return pick(phrases)
}

function getCharImg(name: string): string | undefined {
  return ALL_CHARACTERS.find(c => c.name === name)?.img
}

const coachVariants = {
  idle:    { scale: [1, 1.02, 1], transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' } },
  correct: { scale: [1, 1.18, 0.95, 1.1, 1], transition: { duration: 0.6, times: [0, 0.3, 0.5, 0.7, 1] } },
  wrong:   { x: [0, -10, 10, -8, 8, -4, 0], transition: { duration: 0.5 } },
  mastery: { scale: [1, 1.25, 0.9, 1.2, 1], rotate: [0, -8, 8, -4, 0], transition: { duration: 0.8 } },
  intro:   { y: [40, 0], opacity: [0, 1], transition: { duration: 0.5, ease: 'easeOut' } },
}

const glowColor: Record<CoachState, string> = {
  idle:    'rgba(112,42,225,0.3)',
  correct: 'rgba(34,197,94,0.5)',
  wrong:   'rgba(239,68,68,0.4)',
  mastery: 'rgba(255,215,9,0.6)',
  intro:   'rgba(112,42,225,0.3)',
}

export default function SpellingCoach({ characterName, state, message }: Props) {
  const img = getCharImg(characterName)
  const [displayMsg, setDisplayMsg] = useState(message ?? getPhrase(characterName, state))

  useEffect(() => {
    setDisplayMsg(message ?? getPhrase(characterName, state))
  }, [characterName, state, message])

  return (
    <div className="coach-wrap">
      {/* Character bubble */}
      <motion.div
        className="coach-character"
        animate={state}
        variants={coachVariants}
        style={{ boxShadow: `0 0 40px ${glowColor[state]}` }}
      >
        {img ? (
          <img src={img} alt={characterName} className="coach-img" />
        ) : (
          <span className="coach-fallback">🧙</span>
        )}

        {/* Mastery confetti ring */}
        {state === 'mastery' && (
          <motion.div
            className="coach-confetti-ring"
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.8 }}
          />
        )}
      </motion.div>

      {/* Speech bubble */}
      <AnimatePresence mode="wait">
        <motion.div
          key={displayMsg}
          className="coach-bubble"
          initial={{ opacity: 0, y: 8, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.88 }}
          transition={{ duration: 0.25 }}
        >
          {displayMsg}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
