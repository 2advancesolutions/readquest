/**
 * Reading Exams — React Native (Phase 5)
 * Route: /exams (hidden tab, navigated via router.push)
 *
 * Views: hub → generating → testing → results
 * Conversions:
 * - framer-motion → Animated
 * - CSS tables → FlatList
 * - HTML select → TouchableOpacity pills
 * - Countdown timer ported faithfully (useEffect interval)
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Animated,
  ActivityIndicator, Alert, TextInput,
} from 'react-native'
import { googleSpeak, googleStop } from '../../src/lib/tts'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { examsApi } from '../../src/lib/api'
import { storage } from '../../src/lib/storage'
import { emitXpUpdate } from '../../src/components/XpBadge'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ExamQuestion {
  id: string; question_number: number; question_text: string; passage?: string
  choices: string[]; strand: string; difficulty: string; question_type: 'single'|'multi'
}
interface ReadingExam {
  exam_id: string; section: string; grade_level: number; is_practice: boolean
  time_limit_sec: number; exam_difficulty?: string; questions: ExamQuestion[]
}
interface ExamResultQ {
  question_id: string; question_number: number; strand: string; is_correct: boolean
  student_answers: string[]; correct_answers: string[]; question_text: string
  explanation?: string
}
interface ExamResult {
  score_pct: number; correct_count: number; total_questions: number; passed: boolean
  is_practice: boolean; section: string; exam_number?: number; xp_earned: number
  time_taken_sec?: number; results: ExamResultQ[]; retakes_remaining?: number; reset_triggered?: boolean
}
interface SectionStatus {
  section: string; passed: boolean; best_score: number; total_attempts: number
  retake_number: number; retakes_remaining: number
}
interface GradeReadiness {
  student_grade: number; ready_for_next_grade: boolean; total_passed_exams: number
  required_exams: number; books_read: number; required_books: number
  overall_avg_score: number; required_avg: number; sections: SectionStatus[]
  any_section_maxed_retakes: boolean
}
interface ExamHistoryItem {
  attempt_id: string; section: string; section_label: string; score_pct: number
  correct_count: number; total_questions: number; passed: boolean; time_taken_sec?: number
  completed_at: string; is_practice: boolean; exam_number?: number; xp_earned: number
}

type ExamView = 'hub' | 'generating' | 'testing' | 'results'

// ── Constants ──────────────────────────────────────────────────────────────────
const GRADE_LABELS = ['Kindergarten','1st Grade','2nd Grade','3rd Grade','4th Grade','5th Grade','6th Grade','7th Grade','8th Grade']
const EXAM_SECTIONS: Record<string, { emoji: string; label: string; desc: string; color: string }> = {
  phonics:       { emoji:'🔊', label:'Phonics',       desc:'Letter sounds & blends',        color:'#60a5fa' },
  vocabulary:    { emoji:'📖', label:'Vocabulary',    desc:'Word meaning & usage',           color:'#c084fc' },
  comprehension: { emoji:'🧠', label:'Comprehension', desc:'Read and understand passages',   color:'#4ade80' },
  grammar:       { emoji:'✍️', label:'Grammar',       desc:'Sentence structure & rules',     color:'#fbbf24' },
  mixed:         { emoji:'🏆', label:'Mixed',          desc:'All strands — final readiness', color:'#f87171' },
}

function formatTime(s: number) {
  return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' })
}
function strandColor(strand: string) {
  const m: Record<string,string> = { phonics:'#60a5fa', vocabulary:'#c084fc', comprehension:'#4ade80', grammar:'#fbbf24', mixed:'#f87171' }
  return m[strand] ?? '#c084fc'
}

const ENCOURAGING = [
  "You've got this! Every great reader started right here. 🌟",
  "Deep breaths — you've practiced hard for this moment! 💪",
  "Your brain is incredible. Trust what you've learned! 🧠",
  "Champions warm up before they shine. You're one of them! 🏆",
  "Every question is a chance to show how smart you are! ⭐",
  "Mistakes are stepping stones to greatness. Go for it! 🚀",
]

// ── Hub View ───────────────────────────────────────────────────────────────────
function HubView({ readiness, history, grade, loading, onStart, onReset, onReview }: {
  readiness: GradeReadiness|null; history: ExamHistoryItem[]; grade: number
  loading: boolean; onStart:(s:string,isPractice:boolean)=>void; onReset:()=>void; onReview:(item:ExamHistoryItem)=>void
}) {
  const sectionMap: Record<string,SectionStatus> = {}
  readiness?.sections.forEach(s => { sectionMap[s.section] = s })
  const nextExam = readiness ? Math.min(readiness.total_passed_exams + 1, 10) : 1

  return (
    <ScrollView contentContainerStyle={{ padding:16, paddingBottom:100 }} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={{ backgroundColor:'#1a1a35', borderRadius:16, padding:20, marginBottom:16, borderWidth:1, borderColor:'#702AE122' }}>
        <Text style={{ color:'#B28CFF', fontSize:12, fontWeight:'700', textTransform:'uppercase', marginBottom:4 }}>📝 Reading Exam Center</Text>
        <Text style={{ color:'#fff', fontWeight:'900', fontSize:22 }}>{GRADE_LABELS[grade]} Exams</Text>
        <Text style={{ color:'#8a7aaa', fontSize:13, marginTop:4 }}>
          Exam #{nextExam} of 10 · Pass 10 exams with 80%+ to advance to {GRADE_LABELS[grade+1] ?? 'next grade'}
        </Text>
      </View>

      {/* Readiness banner */}
      {readiness && (
        <View style={{ backgroundColor: readiness.ready_for_next_grade ? '#22c55e15' : '#1a1a35',
          borderRadius:14, padding:14, marginBottom:16, borderWidth:1,
          borderColor: readiness.ready_for_next_grade ? '#22c55e44' : '#2a2a4a' }}>
          <Text style={{ color: readiness.ready_for_next_grade ? '#22c55e' : '#fff', fontWeight:'800', fontSize:14, marginBottom:10 }}>
            {readiness.ready_for_next_grade ? `🎉 ${GRADE_LABELS[grade]} Complete!` : `📊 Grade Readiness Progress`}
          </Text>
          {[
            { label:'Exams', cur:readiness.total_passed_exams, req:readiness.required_exams },
            { label:'Books', cur:readiness.books_read, req:readiness.required_books },
            { label:'Avg Score', cur:`${readiness.overall_avg_score}%`, req:`${readiness.required_avg}%` },
          ].map(p => (
            <View key={p.label} style={{ marginBottom:8 }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:3 }}>
                <Text style={{ color:'#B28CFF', fontSize:11, fontWeight:'700' }}>{p.label}</Text>
                <Text style={{ color:'#6b5d80', fontSize:11 }}>{p.cur} / {p.req}</Text>
              </View>
              <View style={{ height:5, backgroundColor:'#2a2a4a', borderRadius:3 }}>
                <View style={{ height:5, borderRadius:3, backgroundColor:'#702AE1',
                  width:`${Math.min(100, typeof p.cur==='number' ? (p.cur/Number(p.req))*100 : 0)}%` }} />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Practice banner */}
      <TouchableOpacity onPress={() => onStart('phonics', true)} style={{
        backgroundColor:'#60a5fa15', borderRadius:14, padding:14, flexDirection:'row',
        alignItems:'center', marginBottom:16, borderWidth:1, borderColor:'#60a5fa33' }}>
        <Text style={{ fontSize:32, marginRight:12 }}>🧪</Text>
        <View style={{ flex:1 }}>
          <Text style={{ color:'#60a5fa', fontWeight:'800', fontSize:14 }}>Practice Test — Warm Up First!</Text>
          <Text style={{ color:'#8a7aaa', fontSize:12, marginTop:2 }}>15 questions · 10 min · Does NOT count toward grade</Text>
        </View>
        <Text style={{ color:'#60a5fa', fontWeight:'800', fontSize:18 }}>→</Text>
      </TouchableOpacity>

      {/* Section cards */}
      <Text style={{ color:'#fff', fontWeight:'700', fontSize:14, marginBottom:10 }}>Choose a Section:</Text>
      <View style={{ gap:10, marginBottom:16 }}>
        {Object.entries(EXAM_SECTIONS).filter(([k]) => k !== 'mixed').map(([key, meta]) => {
          const ss = sectionMap[key]
          const locked = ss?.retakes_remaining === 0 && !ss?.passed
          return (
            <TouchableOpacity key={key} onPress={() => !locked && onStart(key, false)} disabled={locked}
              style={{ backgroundColor:'#1a1a35', borderRadius:14, padding:14, flexDirection:'row', alignItems:'center',
                borderWidth:1, borderColor:`${meta.color}33`, opacity: locked ? 0.5 : 1 }}>
              <Text style={{ fontSize:28, marginRight:12 }}>{meta.emoji}</Text>
              <View style={{ flex:1 }}>
                <Text style={{ color:'#fff', fontWeight:'800', fontSize:14 }}>{meta.label}</Text>
                <Text style={{ color:'#8a7aaa', fontSize:12, marginTop:2 }}>{meta.desc}</Text>
                {ss && (
                  <Text style={{ color: ss.passed ? '#22c55e' : '#f59e0b', fontSize:11, marginTop:3, fontWeight:'700' }}>
                    {ss.passed ? `✓ Passed ${ss.best_score}%` : `Best: ${ss.best_score}% · ${ss.retakes_remaining} retakes left`}
                  </Text>
                )}
                {!ss && <Text style={{ color:'#4a4a6a', fontSize:11, marginTop:3 }}>Not taken yet</Text>}
              </View>
              {locked
                ? <Text style={{ color:'#ef4444', fontSize:11, fontWeight:'700' }}>🔒</Text>
                : <View style={{ backgroundColor:meta.color, borderRadius:10, paddingHorizontal:10, paddingVertical:5 }}>
                    <Text style={{ color:'#fff', fontWeight:'800', fontSize:12 }}>{ss?.total_attempts ? 'Retake' : 'Start'}</Text>
                  </View>
              }
            </TouchableOpacity>
          )
        })}

        {/* Mixed card */}
        {(() => {
          const meta = EXAM_SECTIONS['mixed']
          const ss   = sectionMap['mixed']
          const locked = ss?.retakes_remaining === 0 && !ss?.passed
          return (
            <TouchableOpacity onPress={() => !locked && onStart('mixed', false)} disabled={locked}
              style={{ backgroundColor:'#f8717115', borderRadius:14, padding:14, flexDirection:'row',
                alignItems:'center', borderWidth:1, borderColor:'#f8717133', opacity: locked ? 0.5 : 1 }}>
              <Text style={{ fontSize:28, marginRight:12 }}>{meta.emoji}</Text>
              <View style={{ flex:1 }}>
                <Text style={{ color:'#fff', fontWeight:'800', fontSize:14 }}>{meta.label} — Final Readiness</Text>
                <Text style={{ color:'#8a7aaa', fontSize:12, marginTop:2 }}>{meta.desc} — Pass to earn your Grade Certificate!</Text>
                {ss && (
                  <Text style={{ color: ss.passed ? '#22c55e' : '#f59e0b', fontSize:11, marginTop:3, fontWeight:'700' }}>
                    {ss.passed ? `✓ Passed ${ss.best_score}%` : `Best: ${ss.best_score}%`}
                  </Text>
                )}
              </View>
              {locked
                ? <Text style={{ color:'#ef4444', fontSize:11, fontWeight:'700' }}>🔒</Text>
                : <View style={{ backgroundColor:'#f87171', borderRadius:10, paddingHorizontal:10, paddingVertical:5 }}>
                    <Text style={{ color:'#fff', fontWeight:'800', fontSize:12 }}>{ss?.total_attempts ? 'Retake' : 'Start'}</Text>
                  </View>
              }
            </TouchableOpacity>
          )
        })()}
      </View>

      {/* Reset zone */}
      {readiness?.any_section_maxed_retakes && (
        <TouchableOpacity onPress={onReset} style={{ backgroundColor:'#ef444415', borderRadius:14, padding:14,
          flexDirection:'row', alignItems:'center', marginBottom:20, borderWidth:1, borderColor:'#ef444433' }}>
          <Text style={{ fontSize:28, marginRight:12 }}>🔄</Text>
          <View style={{ flex:1 }}>
            <Text style={{ color:'#ef4444', fontWeight:'800' }}>Reset Progress</Text>
            <Text style={{ color:'#8a7aaa', fontSize:12, marginTop:2 }}>All retakes used — reset to start over (XP is kept)</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* History */}
      <Text style={{ color:'#fff', fontWeight:'700', fontSize:14, marginBottom:10 }}>📋 Exam History</Text>
      {loading ? <ActivityIndicator color="#702AE1" /> :
        history.length === 0 ? (
          <Text style={{ color:'#4a4a6a', fontSize:13, textAlign:'center', paddingVertical:20 }}>
            No exams taken yet — start with the Practice Test above! 🚀
          </Text>
        ) : (
          history.map(item => (
            <View key={item.attempt_id} style={{ backgroundColor:'#1a1a35', borderRadius:12, padding:12,
              marginBottom:8, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'#2a2a4a' }}>
              <View style={{ flex:1 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                  <Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>
                    {EXAM_SECTIONS[item.section]?.emoji} {item.section_label}
                  </Text>
                  {item.is_practice
                    ? <View style={{ backgroundColor:'#60a5fa22', borderRadius:8, paddingHorizontal:6, paddingVertical:2 }}>
                        <Text style={{ color:'#60a5fa', fontSize:9, fontWeight:'700' }}>Practice</Text>
                      </View>
                    : <View style={{ backgroundColor:'#702AE122', borderRadius:8, paddingHorizontal:6, paddingVertical:2 }}>
                        <Text style={{ color:'#B28CFF', fontSize:9, fontWeight:'700' }}>Exam #{item.exam_number}</Text>
                      </View>
                  }
                </View>
                <Text style={{ color:'#6b5d80', fontSize:11, marginTop:2 }}>{formatDate(item.completed_at)}</Text>
              </View>
              <View style={{ alignItems:'flex-end', gap:4 }}>
                <Text style={{ color: item.passed ? '#22c55e' : '#ef4444', fontWeight:'800', fontSize:16 }}>{item.score_pct}%</Text>
                <Text style={{ color:'#f59e0b', fontSize:11 }}>⚡ +{item.xp_earned}</Text>
              </View>
              <TouchableOpacity onPress={() => onReview(item)} style={{ marginLeft:12, backgroundColor:'#702AE130', borderRadius:8, paddingHorizontal:8, paddingVertical:6 }}>
                <Text style={{ color:'#B28CFF', fontSize:11, fontWeight:'700' }}>Review</Text>
              </TouchableOpacity>
            </View>
          ))
        )
      }
    </ScrollView>
  )
}

// ── Exam speech helpers ───────────────────────────────────────────────────────
function buildQuestionScript(q: ExamQuestion): string {
  const passage = q.passage ? `Passage: ${q.passage}. ` : ''
  const letters = ['A', 'B', 'C', 'D']
  const choices = q.choices.map((c, i) => `${letters[i]}. ${c.slice(2).trim()}`).join('. ')
  return `${passage}Question: ${q.question_text}. Your choices are: ${choices}`
}

async function speakIfUnmuted(text: string): Promise<void> {
  try {
    const val = await AsyncStorage.getItem('readquest_muted')
    if (val === 'true') return
  } catch {}
  await googleSpeak(text, 'quiz')
}

function speakQuestion(q: ExamQuestion) {
  void speakIfUnmuted(buildQuestionScript(q))
}

// ── Test View ──────────────────────────────────────────────────────────────────
function TestView({ exam, onSubmit, submitting }: {
  exam: ReadingExam
  onSubmit: (answers: Record<string,string[]>, timeTaken:number, startedAt:string) => void
  submitting: boolean
}) {
  const [current,  setCurrent]  = useState(0)
  const [answers,  setAnswers]  = useState<Record<string,string[]>>({})
  const [timeLeft, setTimeLeft] = useState(exam.time_limit_sec)
  const [showExit, setShowExit] = useState(false)
  const [reading,  setReading]  = useState(false)
  const startedAt = useRef(new Date().toISOString())
  const answersRef = useRef(answers)
  answersRef.current = answers

  // Auto-read question when it changes
  useEffect(() => {
    const q = exam.questions[current]
    if (!q) return
    setReading(true)
    void speakIfUnmuted(buildQuestionScript(q)).then(() => setReading(false))
  }, [current]) // eslint-disable-line

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); onSubmit(answersRef.current, exam.time_limit_sec, startedAt.current); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => { clearInterval(t); void googleStop() }
  }, []) // eslint-disable-line

  const q    = exam.questions[current]
  const totalQ = exam.questions.length
  const sel  = answers[q.id] ?? []
  const getLetter = (c: string) => c.charAt(0).toUpperCase()
  const answered = Object.keys(answers).length
  const timerColor = timeLeft/exam.time_limit_sec <= 0.1 ? '#ef4444' : timeLeft/exam.time_limit_sec <= 0.25 ? '#f59e0b' : '#B28CFF'

  const toggle = (letter: string) => {
    const isMulti = q.question_type === 'multi'
    setAnswers(prev => {
      const cur = prev[q.id] ?? []
      if (isMulti) return { ...prev, [q.id]: cur.includes(letter) ? cur.filter(l => l!==letter) : [...cur, letter] }
      return { ...prev, [q.id]: [letter] }
    })
  }

  return (
    <View style={{ flex:1 }}>
      {/* Exit modal */}
      {showExit && (
        <View style={{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.85)',
          alignItems:'center', justifyContent:'center', zIndex:99, padding:24 }}>
          <View style={{ backgroundColor:'#1a1a35', borderRadius:16, padding:24, width:'100%' }}>
            <Text style={{ color:'#fff', fontWeight:'900', fontSize:18, textAlign:'center', marginBottom:8 }}>Exit Exam?</Text>
            <Text style={{ color:'#8a7aaa', fontSize:14, textAlign:'center', marginBottom:20 }}>
              Progress will be lost. You've answered {answered} of {totalQ} questions.
            </Text>
            <View style={{ flexDirection:'row', gap:10 }}>
              <TouchableOpacity onPress={() => setShowExit(false)} style={{ flex:1, backgroundColor:'#702AE1', borderRadius:12, padding:13, alignItems:'center' }}>
                <Text style={{ color:'#fff', fontWeight:'800' }}>Keep Going</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.back()} style={{ flex:1, backgroundColor:'#2a2a4a', borderRadius:12, padding:13, alignItems:'center' }}>
                <Text style={{ color:'#8a7aaa', fontWeight:'700' }}>Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Nav bar */}
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between',
        paddingHorizontal:16, paddingVertical:10, borderBottomWidth:1, borderBottomColor:'#2a2a4a' }}>
        <TouchableOpacity onPress={() => { void googleStop(); setShowExit(true) }}>
          <Text style={{ color:'#8a7aaa', fontSize:13 }}>← Exit</Text>
        </TouchableOpacity>
        <Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>
          {exam.is_practice ? '🧪 Practice' : `${EXAM_SECTIONS[exam.section]?.emoji} ${EXAM_SECTIONS[exam.section]?.label}`}
        </Text>
        <Text style={{ color:timerColor, fontWeight:'900', fontSize:18 }}>{formatTime(timeLeft)}</Text>
      </View>

      {/* Progress */}
      <View style={{ height:4, backgroundColor:'#1a1a35' }}>
        <View style={{ height:4, backgroundColor:'#702AE1', width:`${((current+1)/totalQ)*100}%` }} />
      </View>

      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:80 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:12 }}>
          <Text style={{ color:'#8a7aaa', fontSize:12 }}>Q {current+1} / {totalQ}</Text>
          <Text style={{ color:'#6b5d80', fontSize:12 }}>{answered} answered · {totalQ-answered} remaining</Text>
        </View>

        {q.passage && (
          <View style={{ backgroundColor:'#0d0d1f', borderRadius:12, padding:14, marginBottom:14, borderWidth:1, borderColor:'#2a2a4a' }}>
            <Text style={{ color:'#B28CFF', fontWeight:'700', fontSize:11, marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Passage</Text>
            <Text style={{ color:'#ccc4e0', fontSize:14, lineHeight:22 }}>{q.passage}</Text>
          </View>
        )}

        <View style={{ backgroundColor:'#1a1a35', borderRadius:14, padding:16, marginBottom:16, borderWidth:1, borderColor:'#702AE122' }}>
          <View style={{ flexDirection:'row', gap:6, marginBottom:8, flexWrap:'wrap' }}>
            <View style={{ backgroundColor:`${strandColor(q.strand)}22`, borderRadius:8, paddingHorizontal:8, paddingVertical:3 }}>
              <Text style={{ color:strandColor(q.strand), fontSize:10, fontWeight:'700' }}>{q.strand}</Text>
            </View>
            {q.question_type === 'multi' && (
              <View style={{ backgroundColor:'#f8717122', borderRadius:8, paddingHorizontal:8, paddingVertical:3 }}>
                <Text style={{ color:'#f87171', fontSize:10, fontWeight:'700' }}>Multi-select</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection:'row', alignItems:'flex-start', gap:8 }}>
            <Text style={{ color:'#fff', fontSize:16, fontWeight:'700', lineHeight:24, flex:1 }}>{q.question_text}</Text>
            <TouchableOpacity
              onPress={() => { setReading(true); speakQuestion(q) }}
              style={{ backgroundColor: reading ? '#702AE1' : '#702AE130', borderRadius:10,
                padding:8, marginTop:2, borderWidth:1, borderColor:'#702AE1' }}>
              <Text style={{ fontSize:16 }}>{reading ? '🔊' : '🔉'}</Text>
            </TouchableOpacity>
          </View>
          {q.question_type === 'multi' && (
            <Text style={{ color:'#f59e0b', fontSize:11, marginTop:6 }}>⚠️ Select ALL correct answers</Text>
          )}
        </View>

        <View style={{ gap:10, marginBottom:20 }}>
          {q.choices.map((choice, i) => {
            const letter = getLetter(choice)
            const text   = choice.slice(2).trim()
            const isSelected = sel.includes(letter)
            return (
              <TouchableOpacity key={i} onPress={() => toggle(letter)}
                style={{ backgroundColor: isSelected ? '#702AE130' : '#1a1a35',
                  borderRadius:14, padding:14, flexDirection:'row', alignItems:'center',
                  borderWidth: isSelected ? 1.5 : 1, borderColor: isSelected ? '#702AE1' : '#2a2a4a' }}>
                <View style={{ width:28, height:28, borderRadius:14, marginRight:12,
                  backgroundColor: isSelected ? '#702AE1' : '#2a2a4a',
                  alignItems:'center', justifyContent:'center' }}>
                  <Text style={{ color:'#fff', fontWeight:'800', fontSize:13 }}>{letter}</Text>
                </View>
                <Text style={{ color: isSelected ? '#fff' : '#e0d8f0', fontSize:14, flex:1, lineHeight:20 }}>{text}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Dot nav */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:16 }}>
          {exam.questions.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => setCurrent(i)} style={{ marginRight:6 }}>
              <View style={{ width:24, height:24, borderRadius:12, alignItems:'center', justifyContent:'center',
                backgroundColor: answers[exam.questions[i].id] ? '#702AE1' : i===current ? '#702AE130' : '#1a1a35',
                borderWidth:1, borderColor: i===current ? '#702AE1' : '#2a2a4a' }}>
                <Text style={{ color:'#fff', fontSize:9, fontWeight:'800' }}>{i+1}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Prev/Next + Submit */}
        <View style={{ flexDirection:'row', gap:10, marginBottom:12 }}>
          <TouchableOpacity onPress={() => setCurrent(c=>c-1)} disabled={current===0}
            style={{ flex:1, backgroundColor:'#1a1a35', borderRadius:12, padding:13, alignItems:'center',
              borderWidth:1, borderColor:'#2a2a4a', opacity:current===0?0.4:1 }}>
            <Text style={{ color:'#8a7aaa', fontWeight:'700' }}>← Prev</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCurrent(c=>c+1)} disabled={current===totalQ-1}
            style={{ flex:1, backgroundColor:'#1a1a35', borderRadius:12, padding:13, alignItems:'center',
              borderWidth:1, borderColor:'#2a2a4a', opacity:current===totalQ-1?0.4:1 }}>
            <Text style={{ color:'#8a7aaa', fontWeight:'700' }}>Next →</Text>
          </TouchableOpacity>
        </View>

        {current === totalQ - 1 && (
          <>
            <TouchableOpacity onPress={() => onSubmit(answers, exam.time_limit_sec-timeLeft, startedAt.current)}
              disabled={submitting}
              style={{ backgroundColor:'#22c55e', borderRadius:14, padding:16, alignItems:'center', marginBottom: 8 }}>
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color:'#fff', fontWeight:'900', fontSize:16 }}>
                    Submit ({answered}/{totalQ} answered)
                  </Text>
              }
            </TouchableOpacity>
            {answered < totalQ && (
              <Text style={{ color:'#f59e0b', fontSize:12, textAlign:'center', marginTop:4 }}>
                ⚠️ {totalQ-answered} question{totalQ-answered!==1?'s':''} unanswered
              </Text>
            )}
          </>
        )}

      </ScrollView>
    </View>
  )
}

// ── Results View ────────────────────────────────────────────────────────────────
function ResultsView({ result, onRetake, onHub }: {
  result: ExamResult; onRetake:()=>void; onHub:()=>void
}) {
  const [showReview, setShowReview] = useState(false)
  const meta = EXAM_SECTIONS[result.section] ?? EXAM_SECTIONS['phonics']
  const strands: Record<string,{correct:number;total:number}> = {}
  result.results.forEach(q => {
    if (!strands[q.strand]) strands[q.strand] = { correct:0, total:0 }
    strands[q.strand].total++
    if (q.is_correct) strands[q.strand].correct++
  })

  return (
    <ScrollView contentContainerStyle={{ padding:20, paddingBottom:100 }}>
      <View style={{ alignItems:'center', marginBottom:24 }}>
        <Text style={{ fontSize:64 }}>{result.passed ? '🏆' : result.is_practice ? '🧪' : '💪'}</Text>
        <Text style={{ color:'#fff', fontWeight:'900', fontSize:24, marginTop:10, textAlign:'center' }}>
          {result.is_practice ? (result.passed ? 'Great Warmup!' : 'Good Practice!') : (result.passed ? 'Excellent Work!' : 'Keep Practicing!')}
        </Text>
        <Text style={{ color:'#8a7aaa', fontSize:13, marginTop:4 }}>
          {result.is_practice ? '🧪 Practice Test' : `${meta.emoji} ${meta.label}`}
          {!result.is_practice && ` · Exam #${result.exam_number}`}
        </Text>

        {/* Score circle */}
        <View style={{ width:120, height:120, borderRadius:60, marginTop:16,
          backgroundColor:`${result.passed ? '#22c55e' : '#ef4444'}15`,
          borderWidth:4, borderColor: result.passed ? '#22c55e' : '#ef4444',
          alignItems:'center', justifyContent:'center' }}>
          <Text style={{ color: result.passed ? '#22c55e' : '#ef4444', fontWeight:'900', fontSize:32 }}>
            {result.score_pct}%
          </Text>
          <Text style={{ color: result.passed ? '#22c55e' : '#ef4444', fontSize:11, fontWeight:'700' }}>
            {result.passed ? 'PASS ✓' : 'FAIL ✗'}
          </Text>
        </View>

        {/* Stats */}
        <View style={{ flexDirection:'row', gap:20, marginTop:16 }}>
          <View style={{ alignItems:'center' }}>
            <Text style={{ color:'#22c55e', fontWeight:'900', fontSize:22 }}>{result.correct_count}</Text>
            <Text style={{ color:'#6b5d80', fontSize:11 }}>Correct</Text>
          </View>
          <View style={{ alignItems:'center' }}>
            <Text style={{ color:'#ef4444', fontWeight:'900', fontSize:22 }}>{result.total_questions-result.correct_count}</Text>
            <Text style={{ color:'#6b5d80', fontSize:11 }}>Wrong</Text>
          </View>
          {result.time_taken_sec && (
            <View style={{ alignItems:'center' }}>
              <Text style={{ color:'#B28CFF', fontWeight:'900', fontSize:22 }}>{formatTime(result.time_taken_sec)}</Text>
              <Text style={{ color:'#6b5d80', fontSize:11 }}>Time</Text>
            </View>
          )}
          <View style={{ alignItems:'center' }}>
            <Text style={{ color:'#f59e0b', fontWeight:'900', fontSize:22 }}>+{result.xp_earned}</Text>
            <Text style={{ color:'#6b5d80', fontSize:11 }}>XP</Text>
          </View>
        </View>
      </View>

      {/* Strand breakdown */}
      <Text style={{ color:'#fff', fontWeight:'700', fontSize:14, marginBottom:12 }}>📊 Performance by Strand</Text>
      {Object.entries(strands).map(([strand, { correct, total }]) => {
        const pct = total > 0 ? Math.round((correct/total)*100) : 0
        return (
          <View key={strand} style={{ marginBottom:10 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
              <Text style={{ color:'#fff', fontSize:13 }}>{EXAM_SECTIONS[strand]?.emoji ?? '📝'} {strand}</Text>
              <Text style={{ color:strandColor(strand), fontWeight:'700', fontSize:13 }}>{pct}%</Text>
            </View>
            <View style={{ height:6, backgroundColor:'#1a1a35', borderRadius:3 }}>
              <View style={{ height:6, borderRadius:3, backgroundColor:strandColor(strand), width:`${pct}%` }} />
            </View>
          </View>
        )
      })}

      {/* Retake info */}
      {!result.passed && !result.reset_triggered && result.retakes_remaining !== undefined && (
        <View style={{ backgroundColor:'#f5945920', borderRadius:12, padding:12, marginVertical:12, borderWidth:1, borderColor:'#f5945944' }}>
          <Text style={{ color:'#f59e0b', fontWeight:'700' }}>
            🔁 {result.retakes_remaining} retake{result.retakes_remaining!==1?'s':''} remaining
          </Text>
        </View>
      )}
      {result.reset_triggered && (
        <View style={{ backgroundColor:'#ef444415', borderRadius:12, padding:12, marginVertical:12 }}>
          <Text style={{ color:'#ef4444', fontWeight:'700' }}>🔄 All retakes used — progress has been reset. You'll start fresh.</Text>
        </View>
      )}

      {/* Review answers */}
      <TouchableOpacity onPress={() => setShowReview(v=>!v)} style={{ backgroundColor:'#1a1a35', borderRadius:12, padding:13,
        alignItems:'center', marginBottom:10, borderWidth:1, borderColor:'#2a2a4a' }}>
        <Text style={{ color:'#B28CFF', fontWeight:'700' }}>{showReview ? 'Hide Review' : '🔍 Review Answers'}</Text>
      </TouchableOpacity>

      {showReview && result.results.map(q => (
        <View key={q.question_id} style={{ backgroundColor:'#1a1a35', borderRadius:12, padding:14, marginBottom:8,
          borderWidth:1, borderColor: q.is_correct ? '#22c55e33' : '#ef444433' }}>
          <View style={{ flexDirection:'row', alignItems:'center', marginBottom:6 }}>
            <Text style={{ fontSize:16 }}>{q.is_correct ? '✅' : '❌'}</Text>
            <Text style={{ color:'#6b5d80', fontSize:11, marginLeft:6 }}>Q{q.question_number} · {q.strand}</Text>
          </View>
          <Text style={{ color:'#e0d8f0', fontSize:13, lineHeight:20, marginBottom:8 }}>{q.question_text}</Text>
          <Text style={{ color: q.is_correct ? '#22c55e' : '#8a7aaa', fontSize:11 }}>
            Your answer: {q.student_answers.join(', ')} · Correct: {q.correct_answers.join(', ')}
          </Text>
          {q.explanation && <Text style={{ color:'#6b5d80', fontSize:11, marginTop:4 }}>💡 {q.explanation}</Text>}
        </View>
      ))}

      <View style={{ gap:10, marginTop:12 }}>
        <TouchableOpacity onPress={onHub} style={{ backgroundColor:'#702AE1', borderRadius:14, padding:15, alignItems:'center' }}>
          <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>← Back to Hub</Text>
        </TouchableOpacity>
        {!result.reset_triggered && (
          <TouchableOpacity onPress={onRetake} style={{ backgroundColor:'#1a1a35', borderRadius:14, padding:13, alignItems:'center', borderWidth:1, borderColor:'#2a2a4a' }}>
            <Text style={{ color:'#8a7aaa', fontWeight:'700' }}>🔄 Retake This Section</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export default function ExamsScreen() {
  const insets = useSafeAreaInsets()
  const [view,        setView]       = useState<ExamView>('hub')
  const [grade,       setGrade]      = useState(1)
  const [exam,        setExam]       = useState<ReadingExam|null>(null)
  const [result,      setResult]     = useState<ExamResult|null>(null)
  const [readiness,   setReadiness]  = useState<GradeReadiness|null>(null)
  const [history,     setHistory]    = useState<ExamHistoryItem[]>([])
  const [histLoading, setHistLoading]= useState(true)
  const [generating,  setGenerating] = useState(false)
  const [submitting,  setSubmitting] = useState(false)
  const [genMsg,      setGenMsg]     = useState(ENCOURAGING[0])
  const genSection  = useRef('')
  const genPractice = useRef(false)

  useEffect(() => {
    storage.getString('readquest_student_grade').then(g => { if (g) setGrade(parseInt(g,10)) })

    examsApi.readiness().then(r => setReadiness(r.data as GradeReadiness)).catch(() => {})
    examsApi.history().then(r => setHistory((r.data as any) ?? [])).catch(() => {}).finally(() => setHistLoading(false))
  }, [])

  const rotateMsg = useRef<ReturnType<typeof setInterval>|null>(null)

  const startGenerate = (section: string, isPractice: boolean) => {
    genSection.current  = section
    genPractice.current = isPractice
    setGenerating(true)
    let msgIdx = 1
    rotateMsg.current = setInterval(() => { setGenMsg(ENCOURAGING[msgIdx % ENCOURAGING.length]); msgIdx++ }, 3000)

    examsApi.generate(grade, section, isPractice)
      .then(r => {
        clearInterval(rotateMsg.current!)
        setExam(r.data as ReadingExam)
        setGenerating(false)
        setView('testing' as ExamView)
      })
      .catch(() => {
        clearInterval(rotateMsg.current!)
        setGenerating(false)
        Alert.alert('Generation Failed', 'Could not generate exam. Please try again.')
      })
  }

  const handleSubmit = async (answers: Record<string,string[]>, timeTaken:number, startedAt:string) => {
    if (!exam) return
    setSubmitting(true)
    try {
      const r = await examsApi.submit(exam.exam_id, answers, timeTaken, startedAt, exam.is_practice)
      const res = r.data as ExamResult
      setResult(res)
      setView('results' as ExamView)
      if (res.xp_earned > 0) {
        storage.get<number>('readquest_xp').then(v => {
          const total = (v??0) + res.xp_earned
          storage.set('readquest_xp', total)
          emitXpUpdate(total, res.xp_earned)
        })
      }
      // Refresh readiness
      examsApi.readiness().then(r2 => setReadiness(r2.data as GradeReadiness)).catch(()=>{})
      examsApi.history().then(r2 => setHistory((r2.data as any) ?? [])).catch(()=>{})
    } catch { Alert.alert('Submit Failed', 'Could not submit exam. Check your connection.') }
    finally { setSubmitting(false) }
  }

  const handleReset = () => {
    Alert.alert('Reset Progress', 'This will clear all exam attempts. Your XP is kept. Are you sure?', [
      { text:'Cancel', style:'cancel' },
      { text:'Reset', style:'destructive', onPress: () => {
        examsApi.resetProgress(grade).then(() => {
          examsApi.readiness().then(r => setReadiness(r.data as GradeReadiness)).catch(()=>{})
          setHistory([])
        }).catch(() => Alert.alert('Error', 'Reset failed. Try again.'))
      }},
    ])
  }

  return (
    <View style={{ flex:1, backgroundColor:'#0d0d1f', paddingTop:insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal:16, paddingTop:12, paddingBottom:8,
        borderBottomWidth:1, borderBottomColor:'#702AE122', flexDirection:'row', alignItems:'center' }}>
        <TouchableOpacity onPress={() => (view as string) !== 'hub' ? setView('hub' as ExamView) : router.back()}>
          <Text style={{ color:'#8a7aaa', fontSize:13 }}>← {(view as string) !== 'hub' ? 'Hub' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={{ color:'#fff', fontWeight:'800', fontSize:16, flex:1, marginLeft:12, textAlign:'center' }}>📝 Reading Exams</Text>
        <Text style={{ color:'#B28CFF', fontSize:12, fontWeight:'700' }}>{GRADE_LABELS[grade]}</Text>
      </View>

      {/* Generating overlay */}
      {generating && (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:24 }}>
          <Text style={{ fontSize:64, marginBottom:16 }}>✨</Text>
          <ActivityIndicator size="large" color="#702AE1" />
          <Text style={{ color:'#fff', fontWeight:'800', fontSize:18, marginTop:16, textAlign:'center' }}>
            {genPractice.current ? '🧪 Building Practice Test…' : '✨ Generating Your Exam…'}
          </Text>
          <View style={{ backgroundColor:'#702AE120', borderRadius:14, padding:14, marginTop:20, borderWidth:1, borderColor:'#702AE133' }}>
            <Text style={{ color:'#B28CFF', fontSize:14, textAlign:'center', lineHeight:22 }}>{genMsg}</Text>
          </View>
          <Text style={{ color:'#6b5d80', fontSize:12, marginTop:14, textAlign:'center' }}>
            {genPractice.current ? '15 warm-up questions · ~15 seconds' : '30 questions · 15–30 seconds'}
          </Text>
        </View>
      )}

      {!generating && (view as string) === 'hub' && (
        <HubView readiness={readiness} history={history} grade={grade} loading={histLoading}
          onStart={startGenerate} onReset={handleReset}
          onReview={(_item) => { /* future: show review screen */ }} />
      )}

      {!generating && (view as string) === 'testing' && exam && (
        <TestView exam={exam} onSubmit={handleSubmit} submitting={submitting} />
      )}

      {!generating && (view as string) === 'results' && result && (
        <ResultsView result={result}
          onRetake={() => startGenerate(result.section, result.is_practice)}
          onHub={() => setView('hub' as ExamView)} />
      )}
    </View>
  )
}
