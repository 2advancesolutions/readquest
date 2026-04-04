/**
 * Scores Hub — React Native (Phase 6)
 * Route: /scores (hidden tab)
 *
 * Unified performance dashboard — 3 tabs:
 * 1. Overview: XP trend, Reading accuracy, recent activity
 * 2. Exams: Exam history summary + section breakdown
 * 3. Spelling: Same as SpellingScores overview integrated here
 */
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { rewardsApi, examsApi, spellingApi } from '../../src/lib/api'
import { storage } from '../../src/lib/storage'

// ── Types ─────────────────────────────────────────────────────────────────────
interface XPHistoryItem { date: string; xp: number }
interface ExamHistoryItem {
  attempt_id:string; section:string; section_label:string; score_pct:number
  passed:boolean; completed_at:string; is_practice:boolean; xp_earned:number
}
interface SpellingSession {
  session_id:string; character_name:string; accuracy_pct:number
  correct_count:number; total_words:number; xp_earned:number; started_at?:string
}

const SECTION_COLORS: Record<string,string> = {
  phonics:'#60a5fa', vocabulary:'#c084fc', comprehension:'#4ade80',
  grammar:'#fbbf24', mixed:'#f87171',
}
const SECTION_EMOJI: Record<string,string> = {
  phonics:'🔊', vocabulary:'📖', comprehension:'🧠', grammar:'✍️', mixed:'🏆',
}

function formatDate(iso:string) {
  return new Date(iso).toLocaleDateString('en-US',{ month:'short', day:'numeric' })
}
function getAccColor(pct:number) {
  return pct>=70?'#22c55e':pct>=40?'#f59e0b':'#ef4444'
}

// ── Mini bar chart ────────────────────────────────────────────────────────────
function MiniBar({ pct, color }: { pct:number; color:string }) {
  return (
    <View style={{ flex:1, height:6, backgroundColor:'#1a1a35', borderRadius:3 }}>
      <View style={{ height:6, borderRadius:3, backgroundColor:color, width:`${pct}%` }} />
    </View>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ studentId }: { studentId:string }) {
  const [xp,       setXP]       = useState(0)
  const [streak,   setStreak]   = useState(0)
  const [xpHist,   setXPHist]   = useState<XPHistoryItem[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([rewardsApi.getXP(), rewardsApi.getStreaks(), rewardsApi.getXPHistory()])
      .then(([xpRes, strRes, histRes]) => {
        setXP(xpRes.data?.total_xp ?? 0)
        setStreak(strRes.data?.current_streak ?? 0)
        setXPHist((histRes.data as any[]) ?? [])
      }).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  const maxXP = Math.max(...xpHist.map(h=>h.xp), 1)

  if (loading) return <ActivityIndicator color="#702AE1" style={{ padding:40 }} />

  return (
    <ScrollView contentContainerStyle={{ padding:16, paddingBottom:60 }}>
      {/* Hero stats */}
      <View style={{ flexDirection:'row', gap:10, marginBottom:16 }}>
        <View style={{ flex:1, backgroundColor:'#702AE120', borderRadius:14, padding:14, alignItems:'center',
          borderWidth:1, borderColor:'#702AE144' }}>
          <Text style={{ fontSize:28 }}>⚡</Text>
          <Text style={{ color:'#B28CFF', fontWeight:'900', fontSize:28, marginTop:4 }}>{xp.toLocaleString()}</Text>
          <Text style={{ color:'#6b5d80', fontSize:11 }}>Total XP</Text>
        </View>
        <View style={{ flex:1, backgroundColor:'#ef444415', borderRadius:14, padding:14, alignItems:'center',
          borderWidth:1, borderColor:'#ef444433' }}>
          <Text style={{ fontSize:28 }}>🔥</Text>
          <Text style={{ color:'#ef4444', fontWeight:'900', fontSize:28, marginTop:4 }}>{streak}</Text>
          <Text style={{ color:'#6b5d80', fontSize:11 }}>Day Streak</Text>
        </View>
      </View>

      {/* XP history mini chart */}
      {xpHist.length > 0 && (
        <View style={{ backgroundColor:'#1a1a35', borderRadius:16, padding:16, marginBottom:16,
          borderWidth:1, borderColor:'#2a2a4a' }}>
          <Text style={{ color:'#fff', fontWeight:'700', fontSize:13, marginBottom:12 }}>📈 XP This Week</Text>
          <View style={{ flexDirection:'row', alignItems:'flex-end', gap:6, height:60 }}>
            {xpHist.slice(-7).map((h, i) => (
              <View key={i} style={{ flex:1, alignItems:'center' }}>
                <View style={{ width:'100%', borderRadius:4, backgroundColor:'#702AE1',
                  height: Math.max(4, (h.xp/maxXP)*52) }} />
                <Text style={{ color:'#4a4a6a', fontSize:9, marginTop:3 }}>{formatDate(h.date)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Quick actions */}
      <Text style={{ color:'#fff', fontWeight:'700', fontSize:13, marginBottom:10 }}>🚀 Jump To</Text>
      {[
        { icon:'📝', label:'Reading Exams',     sub:'Take a test & earn XP', route:'/(app)/exams',           color:'#60a5fa' },
        { icon:'📝', label:'Spelling Scores',   sub:'View session history',  route:'/(app)/spelling-scores', color:'#c084fc' },
        { icon:'🏆', label:'Leaderboard',       sub:'Compare with peers',    route:'/(app)/leaderboard',     color:'#f59e0b' },
        { icon:'🎮', label:'Play Games',        sub:'Earn XP while learning',route:'/(app)/games',           color:'#4ade80' },
      ].map(item => (
        <TouchableOpacity key={item.label} onPress={() => router.push(item.route as any)}
          style={{ backgroundColor:'#1a1a35', borderRadius:14, padding:14, flexDirection:'row',
            alignItems:'center', marginBottom:8, borderWidth:1, borderColor:'#2a2a4a' }}>
          <View style={{ width:44, height:44, borderRadius:12, backgroundColor:`${item.color}22`,
            alignItems:'center', justifyContent:'center', marginRight:12 }}>
            <Text style={{ fontSize:20 }}>{item.icon}</Text>
          </View>
          <View style={{ flex:1 }}>
            <Text style={{ color:'#fff', fontWeight:'700' }}>{item.label}</Text>
            <Text style={{ color:'#6b5d80', fontSize:12, marginTop:1 }}>{item.sub}</Text>
          </View>
          <Text style={{ color:item.color, fontWeight:'700', fontSize:16 }}>→</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

// ── Exams tab ─────────────────────────────────────────────────────────────────
function ExamsTab() {
  const [history, setHistory] = useState<ExamHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  // Compute section breakdown
  const sectionStats: Record<string,{best:number;passed:boolean;count:number}> = {}
  history.filter(h=>!h.is_practice).forEach(h => {
    if (!sectionStats[h.section]) sectionStats[h.section] = { best:0, passed:false, count:0 }
    sectionStats[h.section].count++
    if (h.score_pct > sectionStats[h.section].best) sectionStats[h.section].best = h.score_pct
    if (h.passed) sectionStats[h.section].passed = true
  })

  useEffect(() => {
    examsApi.history().then(r => setHistory((r.data as any) ?? [])).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  if (loading) return <ActivityIndicator color="#702AE1" style={{ padding:40 }} />

  return (
    <ScrollView contentContainerStyle={{ padding:16, paddingBottom:60 }}>
      {/* Section breakdown */}
      <Text style={{ color:'#fff', fontWeight:'700', fontSize:13, marginBottom:12 }}>📊 Section Performance</Text>
      {['phonics','vocabulary','comprehension','grammar','mixed'].map(sec => {
        const s = sectionStats[sec]
        const color = SECTION_COLORS[sec] ?? '#B28CFF'
        return (
          <View key={sec} style={{ backgroundColor:'#1a1a35', borderRadius:12, padding:12, marginBottom:8,
            borderWidth:1, borderColor:`${color}33` }}>
            <View style={{ flexDirection:'row', alignItems:'center', marginBottom:6 }}>
              <Text style={{ fontSize:18, marginRight:8 }}>{SECTION_EMOJI[sec]}</Text>
              <Text style={{ color:'#fff', fontWeight:'700', flex:1, textTransform:'capitalize' }}>{sec}</Text>
              {s ? (
                <Text style={{ color:s.passed?'#22c55e':'#f59e0b', fontWeight:'800', fontSize:14 }}>
                  {s.passed?'✓ Passed':s.best+'%'}
                </Text>
              ) : <Text style={{ color:'#4a4a6a', fontSize:12 }}>Not taken</Text>}
            </View>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
              <MiniBar pct={s?.best??0} color={color} />
              {s && <Text style={{ color:'#6b5d80', fontSize:11 }}>{s.count} attempt{s.count!==1?'s':''}</Text>}
            </View>
          </View>
        )
      })}

      <TouchableOpacity onPress={() => router.push('/(app)/exams' as any)}
        style={{ backgroundColor:'#702AE1', borderRadius:14, padding:14, alignItems:'center', marginTop:8 }}>
        <Text style={{ color:'#fff', fontWeight:'800' }}>📝 Take an Exam</Text>
      </TouchableOpacity>

      {/* Recent history */}
      {history.length > 0 && (
        <>
          <Text style={{ color:'#fff', fontWeight:'700', fontSize:13, marginBottom:10, marginTop:20 }}>📋 Recent Exams</Text>
          {history.slice(0,8).map(item => (
            <View key={item.attempt_id} style={{ backgroundColor:'#1a1a35', borderRadius:12, padding:12,
              marginBottom:8, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'#2a2a4a' }}>
              <Text style={{ fontSize:18, marginRight:10 }}>{SECTION_EMOJI[item.section]??'📝'}</Text>
              <View style={{ flex:1 }}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:12 }}>
                  {item.section_label} {item.is_practice?'(Practice)':''}
                </Text>
                <Text style={{ color:'#6b5d80', fontSize:11 }}>{formatDate(item.completed_at)}</Text>
              </View>
              <Text style={{ color:item.passed?'#22c55e':'#ef4444', fontWeight:'900', fontSize:15 }}>
                {item.score_pct}%
              </Text>
              <Text style={{ color:'#f59e0b', fontSize:11, marginLeft:8 }}>+{item.xp_earned}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  )
}

// ── Spelling tab ──────────────────────────────────────────────────────────────
function SpellingTab({ studentId }: { studentId:string }) {
  const [sessions, setSessions] = useState<SpellingSession[]>([])
  const [stats,    setStats]    = useState<{accuracy_pct:number;words_mastered:number;total_sessions:number}|null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([spellingApi.getHistory(studentId), spellingApi.getStats(studentId)])
      .then(([h,s]) => { setSessions(h.data as SpellingSession[]); setStats(s.data as any) })
      .catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  if (loading) return <ActivityIndicator color="#702AE1" style={{ padding:40 }} />

  return (
    <ScrollView contentContainerStyle={{ padding:16, paddingBottom:60 }}>
      {/* Stat cards */}
      {stats && (
        <View style={{ flexDirection:'row', gap:10, marginBottom:16 }}>
          {[
            { label:'Accuracy',    value:`${stats.accuracy_pct}%`,     icon:'🎯', color:getAccColor(stats.accuracy_pct) },
            { label:'Mastered',    value:stats.words_mastered,          icon:'⭐', color:'#B28CFF' },
            { label:'Tests Taken', value:stats.total_sessions,          icon:'📋', color:'#60a5fa' },
          ].map(c => (
            <View key={c.label} style={{ flex:1, backgroundColor:'#1a1a35', borderRadius:14,
              padding:12, alignItems:'center', borderWidth:1, borderColor:'#2a2a4a' }}>
              <Text style={{ fontSize:20 }}>{c.icon}</Text>
              <Text style={{ color:c.color, fontWeight:'900', fontSize:20, marginTop:4 }}>{c.value}</Text>
              <Text style={{ color:'#6b5d80', fontSize:10 }}>{c.label}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity onPress={() => router.push('/(app)/spelling-scores' as any)}
        style={{ backgroundColor:'#1a1a35', borderRadius:14, padding:14, alignItems:'center',
          borderWidth:1, borderColor:'#702AE133', marginBottom:16 }}>
        <Text style={{ color:'#B28CFF', fontWeight:'700' }}>📊 View Full Spelling Report →</Text>
      </TouchableOpacity>

      <Text style={{ color:'#fff', fontWeight:'700', fontSize:13, marginBottom:10 }}>📅 Recent Sessions</Text>
      {sessions.length === 0
        ? <Text style={{ color:'#4a4a6a', textAlign:'center', padding:20 }}>No spelling sessions yet — start one from Games!</Text>
        : sessions.slice(0,5).map(s => (
          <View key={s.session_id} style={{ backgroundColor:'#1a1a35', borderRadius:12, padding:12,
            marginBottom:8, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'#2a2a4a' }}>
            <Text style={{ fontSize:18, marginRight:10 }}>📝</Text>
            <View style={{ flex:1 }}>
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:12 }}>{s.character_name.split(' ')[0]}</Text>
              <Text style={{ color:'#6b5d80', fontSize:11 }}>{s.correct_count}/{s.total_words} correct</Text>
            </View>
            <Text style={{ color:getAccColor(s.accuracy_pct), fontWeight:'900', fontSize:14 }}>{s.accuracy_pct}%</Text>
          </View>
        ))
      }
    </ScrollView>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export default function ScoresScreen() {
  const insets    = useSafeAreaInsets()
  const [tab,     setTab]     = useState<'overview'|'exams'|'spelling'>('overview')
  const [studentId, setStudentId] = useState('guest')

  useEffect(() => {
    storage.getString('readquest_student_id').then(sid => { if (sid) setStudentId(sid) })
  }, [])

  const TABS = [
    { id:'overview', label:'Overview', emoji:'📊' },
    { id:'exams',    label:'Exams',    emoji:'📝' },
    { id:'spelling', label:'Spelling', emoji:'🔤' },
  ]

  return (
    <View style={{ flex:1, backgroundColor:'#0d0d1f', paddingTop:insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal:16, paddingVertical:10, flexDirection:'row', alignItems:'center',
        borderBottomWidth:1, borderBottomColor:'#702AE122' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight:12 }}>
          <Text style={{ color:'#8a7aaa', fontSize:13 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color:'#fff', fontWeight:'900', fontSize:15 }}>📊 Scores & Progress</Text>
      </View>

      {/* Tab bar */}
      <View style={{ flexDirection:'row', paddingHorizontal:16, paddingTop:10, gap:8 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} onPress={() => setTab(t.id as any)}
            style={{ flex:1, borderRadius:12, paddingVertical:9, alignItems:'center',
              backgroundColor: tab===t.id?'#702AE1':'#1a1a35',
              borderWidth:1, borderColor:tab===t.id?'#702AE1':'#2a2a4a' }}>
            <Text style={{ fontSize:15 }}>{t.emoji}</Text>
            <Text style={{ color:tab===t.id?'#fff':'#6b5d80', fontWeight:'700', fontSize:11, marginTop:2 }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={{ flex:1, marginTop:8 }}>
        {tab === 'overview' && <OverviewTab studentId={studentId} />}
        {tab === 'exams'    && <ExamsTab />}
        {tab === 'spelling' && <SpellingTab studentId={studentId} />}
      </View>
    </View>
  )
}
