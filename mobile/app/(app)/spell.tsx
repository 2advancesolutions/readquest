/**
 * Spelling Arena — React Native (Phase 4)
 *
 * 3-phase flow: select character → game → summary
 * Conversions:
 * - AnimatePresence  → conditional renders + Animated
 * - localStorage     → AsyncStorage (storage lib)
 * - useTTS           → expo-speech
 * - <input>          → <TextInput>
 * - img              → expo-image
 * - CSS AudioContext → expo-haptics for feedback
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  Animated, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { googleSpeak, googleStop } from '../../src/lib/tts'
import { Image } from 'expo-image'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { storage } from '../../src/lib/storage'
import { spellingApi } from '../../src/lib/api'
import type { SpellingWordOut, AttemptResultOut } from '../../src/lib/api'
import { emitXpUpdate } from '../../src/components/XpBadge'
import { onMuteChange } from '../../src/components/MuteButton'

type Phase    = 'select' | 'game' | 'summary'
type GameMode = 'bee' | 'blanks' | 'scramble'

const ROUND_SIZE = 10

function randomMode(): GameMode {
  return (['bee','blanks','scramble'] as GameMode[])[Math.floor(Math.random() * 3)]
}

interface RoundResult { word: string; correct: boolean; xpEarned: number; mastered: boolean }

// Curated coach characters (simple emojis so no image dependency needed)
const COACHES = [
  { name: 'Lunar', emoji: '🌙' }, { name: 'Rex',   emoji: '🦖' },
  { name: 'Nova',  emoji: '⭐' }, { name: 'Blaze', emoji: '🔥' },
  { name: 'Pearl', emoji: '🦋' }, { name: 'Titan', emoji: '🤖' },
  { name: 'Ivy',   emoji: '🌿' }, { name: 'Storm', emoji: '⚡' },
  { name: 'Jade',  emoji: '💎' }, { name: 'Cosmo', emoji: '🚀' },
  { name: 'Asha',  emoji: '🦚' }, { name: 'Finn',  emoji: '🐬' },
]

function speak(text: string, mode: 'word' | 'teacher' | 'quiz' = 'word') {
  // Fire-and-forget — googleSpeak handles mute check internally
  void googleSpeak(text, mode)
}

// ── Spelling Bee game mode ─────────────────────────────────────────────────
function SpellingBeeMode({ word, onSubmit, disabled }: { word: SpellingWordOut; onSubmit: (a:string)=>void; disabled: boolean }) {
  const [answer, setAnswer] = useState('')
  const ref = useRef<TextInput>(null)
  useEffect(() => { setAnswer(''); setTimeout(() => ref.current?.focus(), 300) }, [word.word])

  return (
    <View style={{ alignItems:'center', paddingHorizontal:16 }}>
      <Text style={{ color:'#8a7aaa', fontSize:13, marginBottom:8 }}>Listen and spell the word:</Text>
      <TouchableOpacity onPress={() => speak(`Spell this word: ${word.word}`)}>
        <View style={{ backgroundColor:'#702AE120', borderRadius:40, padding:14, marginBottom:12 }}>
          <Text style={{ color:'#B28CFF', fontSize:28 }}>🔊</Text>
        </View>
      </TouchableOpacity>
      {word.definition && (
        <Text style={{ color:'#8a7aaa', fontSize:13, textAlign:'center', marginBottom:10, paddingHorizontal:8 }}>
          Hint: {word.definition}
        </Text>
      )}
      <TextInput
        ref={ref}
        value={answer}
        onChangeText={setAnswer}
        onSubmitEditing={() => { if (answer.trim()) onSubmit(answer.trim().toLowerCase()) }}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Type your answer…"
        placeholderTextColor="#3a3a5a"
        editable={!disabled}
        returnKeyType="done"
        style={{
          backgroundColor:'#1a1a35', borderRadius:12, borderWidth:1, borderColor:'#702AE1',
          color:'#fff', fontSize:22, fontWeight:'800', textAlign:'center',
          padding:14, width:'100%', marginBottom:14, letterSpacing:4,
        }}
      />
      <TouchableOpacity
        onPress={() => { if (answer.trim()) { Keyboard.dismiss(); onSubmit(answer.trim().toLowerCase()) } }}
        disabled={disabled || !answer.trim()}
        style={{ backgroundColor: answer.trim() ? '#702AE1' : '#2a2a4a', borderRadius:14, paddingHorizontal:32, paddingVertical:13 }}
      >
        <Text style={{ color:'#fff', fontWeight:'800', fontSize:16 }}>Submit ✓</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Fill in the Blanks mode ────────────────────────────────────────────────
function FillBlanksMode({ word, onSubmit, disabled }: { word: SpellingWordOut; onSubmit:(a:string)=>void; disabled:boolean }) {
  const letters = word.word.split('')
  // Reveal every 3rd letter as hint
  const masked = letters.map((l, i) => i % 3 === 1 ? '_' : l)
  const blanks  = masked.filter(l => l === '_').length
  const [inputs, setInputs] = useState<string[]>(Array(blanks).fill(''))
  const refs = useRef<(TextInput|null)[]>([])
  useEffect(() => { setInputs(Array(blanks).fill('')) }, [word.word])

  const handleChange = (val: string, idx: number) => {
    const next = [...inputs]
    next[idx] = val.toLowerCase().slice(-1)
    setInputs(next)
    if (val && idx < blanks - 1) refs.current[idx + 1]?.focus()
  }

  const buildAnswer = () => {
    let bi = 0
    return masked.map(l => l === '_' ? (inputs[bi++] ?? '') : l).join('')
  }

  return (
    <View style={{ alignItems:'center', paddingHorizontal:16 }}>
      <Text style={{ color:'#8a7aaa', fontSize:13, marginBottom:12 }}>Fill in the missing letters:</Text>
      <View style={{ flexDirection:'row', flexWrap:'wrap', justifyContent:'center', gap:6, marginBottom:20 }}>
        {masked.map((l, i) => {
          if (l !== '_') return (
            <View key={i} style={{ width:34, height:40, backgroundColor:'#1a1a35', borderRadius:8, alignItems:'center', justifyContent:'center' }}>
              <Text style={{ color:'#B28CFF', fontSize:20, fontWeight:'800' }}>{l}</Text>
            </View>
          )
          const blankIdx = masked.slice(0,i).filter(x=>x==='_').length
          return (
            <TextInput
              key={i}
              ref={r => { refs.current[blankIdx] = r }}
              value={inputs[blankIdx] ?? ''}
              onChangeText={v => handleChange(v, blankIdx)}
              maxLength={1}
              editable={!disabled}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                width:34, height:40, backgroundColor:'#702AE120', borderRadius:8,
                borderWidth:1, borderColor:'#702AE1', color:'#fff', fontSize:18,
                fontWeight:'800', textAlign:'center',
              }}
            />
          )
        })}
      </View>
      <TouchableOpacity
        onPress={() => { Keyboard.dismiss(); onSubmit(buildAnswer()) }}
        disabled={disabled || inputs.some(c => !c)}
        style={{ backgroundColor: inputs.some(c=>!c) ? '#2a2a4a' : '#702AE1', borderRadius:14, paddingHorizontal:32, paddingVertical:13 }}
      >
        <Text style={{ color:'#fff', fontWeight:'800', fontSize:16 }}>Check Answer ✓</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Word Scramble mode ────────────────────────────────────────────────────
function ScrambleMode({ word, onSubmit, disabled }: { word: SpellingWordOut; onSubmit:(a:string)=>void; disabled:boolean }) {
  const scramble = (w: string) => w.split('').sort(() => Math.random()-0.5)
  const [tiles,    setTiles]    = useState<{letter:string;used:boolean}[]>(() => scramble(word.word).map(l=>({letter:l,used:false})))
  const [selected, setSelected] = useState<string[]>([])
  useEffect(() => { setTiles(scramble(word.word).map(l=>({letter:l,used:false}))); setSelected([]) }, [word.word])

  const addLetter = (idx: number) => {
    if (tiles[idx].used) return
    const next = [...tiles]; next[idx].used = true; setTiles(next)
    const sel = [...selected, tiles[idx].letter]; setSelected(sel)
    if (sel.length === word.word.length) { setTimeout(() => onSubmit(sel.join('')), 200) }
  }

  const clearAll = () => { setTiles(scramble(word.word).map(l=>({letter:l,used:false}))); setSelected([]) }

  return (
    <View style={{ alignItems:'center', paddingHorizontal:16 }}>
      <Text style={{ color:'#8a7aaa', fontSize:13, marginBottom:8 }}>Tap letters to spell the word:</Text>
      {/* Answer row */}
      <View style={{ flexDirection:'row', marginBottom:20, minHeight:48, gap:6, flexWrap:'wrap', justifyContent:'center' }}>
        {selected.map((l,i) => (
          <View key={i} style={{ width:36, height:44, backgroundColor:'#702AE1', borderRadius:8, alignItems:'center', justifyContent:'center' }}>
            <Text style={{ color:'#fff', fontSize:20, fontWeight:'800' }}>{l}</Text>
          </View>
        ))}
        {selected.length === 0 && <Text style={{ color:'#3a3a5a', fontSize:13, alignSelf:'center' }}>Tap letters below…</Text>}
      </View>
      {/* Letter bank */}
      <View style={{ flexDirection:'row', flexWrap:'wrap', justifyContent:'center', gap:8, marginBottom:16 }}>
        {tiles.map((t,i) => (
          <TouchableOpacity key={i} onPress={() => addLetter(i)} disabled={t.used||disabled}>
            <View style={{ width:44, height:52, backgroundColor: t.used ? '#1a1a35' : '#2a2a4a',
              borderRadius:10, borderWidth:1, borderColor: t.used ? '#1a1a35' : '#4a4a6a',
              alignItems:'center', justifyContent:'center', opacity: t.used ? 0.3 : 1 }}>
              <Text style={{ color:'#fff', fontSize:22, fontWeight:'800' }}>{t.letter}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity onPress={clearAll} disabled={disabled}>
        <Text style={{ color:'#6b5d80', fontSize:13, fontWeight:'600' }}>🔄 Reset</Text>
      </TouchableOpacity>
    </View>
  )
}

// ══════════════════════════════════════════════════════════════════════
export default function SpellingArenaScreen() {
  const insets = useSafeAreaInsets()
  const [studentId,    setStudentId]    = useState<string|null>(null)
  const [studentGrade, setStudentGrade] = useState(5)
  const [phase,        setPhase]        = useState<Phase>('select')
  const [selectedChar, setSelectedChar] = useState('')
  const [wordSource,   setWordSource]   = useState<'my_words'|'grade_words'|'mixed'>('mixed')
  const [words,        setWords]        = useState<SpellingWordOut[]>([])
  const [wordModes,    setWordModes]    = useState<GameMode[]>([])
  const [sessionId,    setSessionId]    = useState('')
  const [wordIndex,    setWordIndex]    = useState(0)
  const [results,      setResults]      = useState<RoundResult[]>([])
  const [feedback,     setFeedback]     = useState<{correct:boolean;correct_answer:string;xp:number}|null>(null)
  const [submitting,   setSubmitting]   = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [sessionXP,    setSessionXP]    = useState(0)
  const [missedWords,  setMissedWords]  = useState<string[]>([])
  const xpRef = useRef(0)
  const feedbackAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    storage.getString('readquest_student_id').then(id => setStudentId(id ?? null))
    storage.getString('readquest_student_grade').then(g => {
      if (g) setStudentGrade(parseInt(g, 10))
    })
    storage.get<number>('readquest_xp').then(v => { xpRef.current = v ?? 0 })
  }, [])

  // Stop speech immediately when user taps the global mute button
  useEffect(() => {
    const unsub = onMuteChange(muted => { if (muted) void googleStop() })
    return () => { void unsub() }
  }, [])

  const startGame = useCallback(async () => {
    if (!studentId || !selectedChar) return
    setLoading(true); setError('')
    try {
      let pool: SpellingWordOut[] = []
      if (wordSource === 'my_words') {
        const r = await spellingApi.getWords(studentId, ROUND_SIZE); pool = r.data
      } else if (wordSource === 'grade_words') {
        const r = await spellingApi.getGradeWords(studentId, ROUND_SIZE); pool = r.data
      } else {
        const half = Math.ceil(ROUND_SIZE / 2)
        const [a, b] = await Promise.all([
          spellingApi.getWords(studentId, half),
          spellingApi.getGradeWords(studentId, half),
        ])
        const seen = new Set<string>()
        for (const w of [...a.data, ...b.data]) {
          if (!seen.has(w.word.toLowerCase())) { seen.add(w.word.toLowerCase()); pool.push(w) }
        }
        pool = pool.slice(0, ROUND_SIZE)
      }
      if (pool.length === 0) { setError('No words found. Try a different word source!'); return }
      const sessionRes = await spellingApi.createSession(studentId, selectedChar, pool.length)
      setWords(pool); setWordModes(pool.map(() => randomMode()))
      setSessionId(sessionRes.data.session_id)
      setWordIndex(0); setResults([]); setMissedWords([])
      setFeedback(null); setSessionXP(0); setPhase('game')
      // TTS welcome
      setTimeout(() => speak(`${selectedChar} here! Let's spell ${pool.length} words. Ready!`), 400)
    } catch { setError('Could not load words. Try again.') }
    finally { setLoading(false) }
  }, [studentId, selectedChar, wordSource])

  const handleAnswer = useCallback(async (answer: string) => {
    if (submitting || !sessionId || !studentId) return
    const current = words[wordIndex]
    const mode    = wordModes[wordIndex]
    setSubmitting(true)
    try {
      const res = await spellingApi.submitAttempt(studentId, sessionId, current.word, mode, answer, 1)
      const result: AttemptResultOut = res.data
      setFeedback({ correct: result.is_correct, correct_answer: result.correct_answer, xp: result.xp_awarded })

      if (result.is_correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        speak(result.newly_mastered ? `Brilliant! You mastered ${current.word}!` : 'Correct! Great job!')
        setSessionXP(p => p + result.xp_awarded)
        emitXpUpdate(xpRef.current + result.xp_awarded, result.xp_awarded)
        xpRef.current += result.xp_awarded
        setResults(p => [...p, { word:current.word, correct:true, xpEarned:result.xp_awarded, mastered:result.mastered }])
        setTimeout(() => {
          if (wordIndex + 1 >= words.length) { setPhase('summary') }
          else { setWordIndex(i=>i+1); setFeedback(null); setSubmitting(false) }
        }, 1500)
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        speak(`The correct spelling is: ${result.correct_answer}`)
        setMissedWords(p => p.includes(current.word) ? p : [...p, current.word])
        setResults(p => [...p, { word:current.word, correct:false, xpEarned:0, mastered:false }])
        setTimeout(() => {
          if (wordIndex + 1 >= words.length) { setPhase('summary') }
          else { setWordIndex(i=>i+1); setFeedback(null); setSubmitting(false) }
        }, 2200)
      }
    } catch { setSubmitting(false) }
  }, [submitting, sessionId, studentId, words, wordIndex, wordModes])

  const totalCorrect   = results.filter(r => r.correct).length
  const totalXP        = results.reduce((s,r) => s + r.xpEarned, 0)
  const masteredCount  = results.filter(r => r.mastered).length
  const score          = results.length > 0 ? Math.round((totalCorrect / results.length) * 100) : 0

  // ── SELECT PHASE ─────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <View style={{ flex:1, backgroundColor:'#0d0d1f', paddingTop:insets.top }}>
        <View style={{ paddingHorizontal:20, paddingTop:16, paddingBottom:8 }}>
          <Text style={{ color:'#fff', fontSize:24, fontWeight:'800' }}>✏️ Spelling Arena</Text>
          <Text style={{ color:'#6b5d80', fontSize:13 }}>Pick your spelling coach!</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding:16, paddingBottom:120 }} showsVerticalScrollIndicator={false}>
          {/* Coach grid */}
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10 }}>
            {COACHES.map(coach => (
              <TouchableOpacity key={coach.name} onPress={() => { setSelectedChar(coach.name); Haptics.selectionAsync() }}
                style={{
                  backgroundColor: selectedChar === coach.name ? '#702AE1' : '#1a1a35',
                  borderRadius:14, padding:14, alignItems:'center', width:'22%',
                  borderWidth:1, borderColor: selectedChar === coach.name ? '#702AE1' : '#2a2a4a',
                }}>
                <Text style={{ fontSize:28 }}>{coach.emoji}</Text>
                <Text style={{ color: selectedChar === coach.name ? '#fff' : '#8a7aaa', fontSize:10, fontWeight:'700', marginTop:4, textAlign:'center' }}>{coach.name}</Text>
                {selectedChar === coach.name && <Text style={{ color:'#fff', fontSize:10 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>

          {/* Word source */}
          <Text style={{ color:'#fff', fontWeight:'700', fontSize:14, marginTop:20, marginBottom:10 }}>Word Source:</Text>
          <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
            {(['my_words','grade_words','mixed'] as const).map(src => (
              <TouchableOpacity key={src} onPress={() => setWordSource(src)}
                style={{
                  flex:1, backgroundColor: wordSource === src ? '#702AE1' : '#1a1a35',
                  borderRadius:12, paddingVertical:10, alignItems:'center',
                  borderWidth:1, borderColor: wordSource === src ? '#702AE1' : '#2a2a4a',
                }}>
                <Text style={{ color: wordSource === src ? '#fff' : '#8a7aaa', fontWeight:'700', fontSize:12 }}>
                  {src === 'my_words' ? '📖 My Words' : src === 'grade_words' ? '🎓 Grade' : '🔀 Mixed'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ color:'#6b5d80', fontSize:12, marginBottom:16 }}>
            {wordSource === 'my_words' ? 'Words from your reading mistakes' : wordSource === 'grade_words' ? 'Grade-level spelling words' : 'A mix of both sources'}
          </Text>

          {error ? <Text style={{ color:'#ef4444', fontSize:13, textAlign:'center', marginBottom:12 }}>{error}</Text> : null}

          <TouchableOpacity
            onPress={startGame}
            disabled={!selectedChar || loading || !studentId}
            style={{
              backgroundColor: (selectedChar && !loading && studentId) ? '#702AE1' : '#2a2a4a',
              borderRadius:16, padding:16, alignItems:'center',
            }}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color:'#fff', fontWeight:'800', fontSize:16 }}>
                  {selectedChar ? `Start with ${selectedChar}! 🚀` : 'Pick a coach first…'}
                </Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  // ── GAME PHASE ────────────────────────────────────────────────────────────
  if (phase === 'game' && words.length > 0) {
    const current = words[wordIndex]
    const mode    = wordModes[wordIndex]
    const coach   = COACHES.find(c => c.name === selectedChar)
    return (
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1, backgroundColor:'#0d0d1f', paddingTop:insets.top }}>
        {/* Progress */}
        <View style={{ paddingHorizontal:16, paddingTop:12 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
            <Text style={{ color:'#8a7aaa', fontSize:12 }}>Word {wordIndex+1} / {words.length}</Text>
            <View style={{ flexDirection:'row', gap:12 }}>
              <Text style={{ color:'#22c55e', fontSize:12 }}>⭐ {totalCorrect} correct</Text>
              {sessionXP > 0 && <Text style={{ color:'#B28CFF', fontSize:12 }}>⚡ +{sessionXP} XP</Text>}
            </View>
          </View>
          <View style={{ height:6, backgroundColor:'#1a1a35', borderRadius:3 }}>
            <View style={{ height:6, borderRadius:3, backgroundColor:'#702AE1', width:`${(wordIndex/words.length)*100}%` }} />
          </View>
        </View>

        <ScrollView
          style={{ flex:1 }}
          contentContainerStyle={{ paddingVertical:20, paddingBottom:30 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Coach + feedback */}
          <View style={{ alignItems:'center', marginBottom:20 }}>
            <View style={{ width:80, height:80, borderRadius:40, backgroundColor:'#1a1a35', alignItems:'center', justifyContent:'center', marginBottom:6 }}>
              <Text style={{ fontSize:44 }}>{coach?.emoji ?? '🌟'}</Text>
            </View>
            <Text style={{ color:'#B28CFF', fontWeight:'700', fontSize:14 }}>{selectedChar}</Text>
            {feedback && (
              <View style={{ backgroundColor: feedback.correct ? '#22c55e20' : '#ef444420',
                borderRadius:12, paddingHorizontal:16, paddingVertical:8, marginTop:8,
                borderWidth:1, borderColor: feedback.correct ? '#22c55e44' : '#ef444444' }}>
                <Text style={{ color: feedback.correct ? '#22c55e' : '#ef4444', fontWeight:'700', textAlign:'center' }}>
                  {feedback.correct ? `✅ Correct! +${feedback.xp} XP` : `😊 The word was: ${feedback.correct_answer}`}
                </Text>
              </View>
            )}
          </View>

          {/* Mode label */}
          <View style={{ alignItems:'center', marginBottom:16 }}>
            <View style={{ backgroundColor:'#702AE120', borderRadius:20, paddingHorizontal:14, paddingVertical:5 }}>
              <Text style={{ color:'#B28CFF', fontSize:12, fontWeight:'700' }}>
                {mode === 'bee' ? '🐝 Spelling Bee' : mode === 'blanks' ? '⬜ Fill in Blanks' : '🔀 Word Scramble'}
              </Text>
            </View>
          </View>

          {/* Game mode */}
          {mode === 'bee'     && <SpellingBeeMode  word={current} onSubmit={handleAnswer} disabled={submitting} />}
          {mode === 'blanks'  && <FillBlanksMode   word={current} onSubmit={handleAnswer} disabled={submitting} />}
          {mode === 'scramble'&& <ScrambleMode      word={current} onSubmit={handleAnswer} disabled={submitting} />}

          {/* Read aloud */}
          <View style={{ alignItems:'center', marginTop:16 }}>
            <TouchableOpacity onPress={() => speak(`The word is: ${current.word}`)}>
              <Text style={{ color:'#6b5d80', fontSize:13 }}>🔊 Hear the word again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  // ── SUMMARY PHASE ─────────────────────────────────────────────────────────
  const coach = COACHES.find(c => c.name === selectedChar)
  return (
    <View style={{ flex:1, backgroundColor:'#0d0d1f', paddingTop:insets.top }}>
      <ScrollView contentContainerStyle={{ padding:20, paddingBottom:100 }} showsVerticalScrollIndicator={false}>
        {/* Coach result */}
        <View style={{ alignItems:'center', marginBottom:20 }}>
          <Text style={{ fontSize:72 }}>{coach?.emoji ?? '⭐'}</Text>
          <Text style={{ color: score>=70 ? '#22c55e' : '#f59e0b', fontSize:22, fontWeight:'900', marginTop:8 }}>
            {score >= 70 ? "You're amazing! 🏆" : "Great practice! 💪"}
          </Text>
        </View>

        {/* Stats */}
        <View style={{ flexDirection:'row', justifyContent:'space-around', backgroundColor:'#1a1a35',
          borderRadius:16, padding:16, marginBottom:20 }}>
          {[
            { val:`${totalCorrect}/${results.length}`, lbl:'Correct' },
            { val:`+${totalXP}`,                       lbl:'XP Earned' },
            { val:String(masteredCount),               lbl:'Mastered' },
          ].map(s => (
            <View key={s.lbl} style={{ alignItems:'center' }}>
              <Text style={{ color:'#B28CFF', fontWeight:'900', fontSize:22 }}>{s.val}</Text>
              <Text style={{ color:'#6b5d80', fontSize:12 }}>{s.lbl}</Text>
            </View>
          ))}
        </View>

        {/* Missed words */}
        {missedWords.length > 0 && (
          <View style={{ backgroundColor:'#1a1a35', borderRadius:14, padding:14, marginBottom:16 }}>
            <Text style={{ color:'#ef4444', fontWeight:'700', fontSize:13, marginBottom:8 }}>📋 Words to Practice ({missedWords.length})</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
              {missedWords.map(w => (
                <View key={w} style={{ backgroundColor:'#ef444420', borderRadius:8, paddingHorizontal:10, paddingVertical:4 }}>
                  <Text style={{ color:'#ef4444', fontWeight:'700' }}>❌ {w}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Word results */}
        <View style={{ backgroundColor:'#1a1a35', borderRadius:14, padding:14, marginBottom:20 }}>
          {results.map((r, i) => (
            <View key={i} style={{ flexDirection:'row', alignItems:'center', paddingVertical:6,
              borderBottomWidth: i < results.length-1 ? 1 : 0, borderBottomColor:'#2a2a4a' }}>
              <Text style={{ fontSize:16, marginRight:10 }}>{r.correct ? '✅' : '❌'}</Text>
              <Text style={{ color:'#fff', fontWeight:'600', flex:1 }}>{r.word}</Text>
              {r.mastered && <Text style={{ color:'#f59e0b', fontSize:11, marginRight:6 }}>⭐ Mastered</Text>}
              {r.xpEarned > 0 && <Text style={{ color:'#B28CFF', fontSize:11 }}>+{r.xpEarned} XP</Text>}
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={{ gap:10 }}>
          <TouchableOpacity onPress={() => { setPhase('select'); setSelectedChar('') }}
            style={{ backgroundColor:'#702AE1', borderRadius:14, padding:15, alignItems:'center' }}>
            <Text style={{ color:'#fff', fontWeight:'800', fontSize:16 }}>🔁 Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(app)/dashboard' as any)}
            style={{ backgroundColor:'#1a1a35', borderRadius:14, padding:13, alignItems:'center', borderWidth:1, borderColor:'#2a2a4a' }}>
            <Text style={{ color:'#8a7aaa', fontWeight:'600' }}>🏠 Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}
