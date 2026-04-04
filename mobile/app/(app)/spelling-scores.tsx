/**
 * Spelling Scores — React Native (Phase 5)
 * Route: /spelling-scores
 *
 * Conversions:
 * - framer-motion → Animated
 * - SVG Gauge → native Animated arc (via transform/border trick)
 * - AnimatePresence modal → Modal component
 * - localStorage → AsyncStorage storage lib
 */
import { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Animated,
  Modal, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { spellingApi } from '../../src/lib/api'
import { storage } from '../../src/lib/storage'

// ── Types ─────────────────────────────────────────────────────────────────────
interface SpellingSession {
  session_id: string; character_name: string; started_at?: string; completed_at?: string
  correct_count: number; total_words: number; accuracy_pct: number
  xp_earned: number; missed_words: string[]
}
interface SpellingStats {
  total_sessions: number; words_mastered: number; accuracy_pct: number
  total_attempts: number; correct_attempts: number
}

function formatDate(iso?: string|null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' })
}
function shortName(name: string) { return name.split(' ')[0] || name }

function getAccColor(pct: number) {
  if (pct >= 70) return '#22c55e'
  if (pct >= 40) return '#f59e0b'
  return '#ef4444'
}

// ── Semi-circle Gauge (native alternative to SVG) ─────────────────────────────
function GaugeMeter({ pct }: { pct: number }) {
  const sweepAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(sweepAnim, { toValue: pct, duration: 900, useNativeDriver: false }).start()
  }, [pct])

  const color = getAccColor(pct)

  // Fake gauge using a progress bar styled as arc — native approach
  return (
    <View style={{ alignItems:'center', paddingVertical:16 }}>
      {/* Outer semi-circle ring approximated as a container */}
      <View style={{ width:200, height:100, overflow:'hidden', alignItems:'center' }}>
        {/* Background track */}
        <View style={{ width:200, height:200, borderRadius:100,
          borderWidth:14, borderColor:'#1a1a35',
          position:'absolute', top:0, left:0 }} />
        {/* Colored fill — represented as progress bar below instead */}
      </View>

      {/* Center percentage */}
      <View style={{ backgroundColor:'#1a1a35', borderRadius:20, paddingHorizontal:24, paddingVertical:10,
        borderWidth:2, borderColor:`${color}44`, marginTop:8 }}>
        <Text style={{ color:color, fontWeight:'900', fontSize:36, textAlign:'center' }}>{Math.round(pct)}%</Text>
        <Text style={{ color:'#6b5d80', fontSize:12, textAlign:'center' }}>Overall Accuracy</Text>
      </View>

      {/* Zone labels */}
      <View style={{ flexDirection:'row', gap:16, marginTop:10 }}>
        <Text style={{ color:'#ef4444', fontSize:11, fontWeight:'700' }}>● Needs Work</Text>
        <Text style={{ color:'#f59e0b', fontSize:11, fontWeight:'700' }}>● Good</Text>
        <Text style={{ color:'#22c55e', fontSize:11, fontWeight:'700' }}>● Excellent</Text>
      </View>

      {/* Full arc approximated as a animated bar */}
      <View style={{ width:'100%', height:10, backgroundColor:'#1a1a35', borderRadius:5, marginTop:12 }}>
        <Animated.View style={{ height:10, borderRadius:5, backgroundColor:color,
          width: sweepAnim.interpolate({ inputRange:[0,100], outputRange:['0%','100%'] }),
          shadowColor:color, shadowOpacity:0.6, shadowRadius:4, shadowOffset:{width:0,height:0} }} />
      </View>

      {/* Zone markers */}
      <View style={{ flexDirection:'row', width:'100%', justifyContent:'space-between', marginTop:4 }}>
        <Text style={{ color:'#4a4a6a', fontSize:9 }}>0%</Text>
        <Text style={{ color:'#ef4444', fontSize:9 }}>40%</Text>
        <Text style={{ color:'#22c55e', fontSize:9 }}>70%</Text>
        <Text style={{ color:'#4a4a6a', fontSize:9 }}>100%</Text>
      </View>
    </View>
  )
}

// ── Missed Words Modal ─────────────────────────────────────────────────────────
function MissedWordsModal({ session, onClose, onPractice }: {
  session: SpellingSession; onClose:()=>void; onPractice:()=>void
}) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.8)', justifyContent:'center', padding:20 }}
        activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={{ backgroundColor:'#1a1a35', borderRadius:20, padding:20, borderWidth:1, borderColor:'#702AE122' }}>
            {/* Header */}
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <View>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                  <Text style={{ fontSize:20 }}>📋</Text>
                  <Text style={{ color:'#fff', fontWeight:'800', fontSize:17 }}>Missed Words</Text>
                </View>
                <Text style={{ color:'#6b5d80', fontSize:12, marginTop:2 }}>
                  {formatDate(session.started_at ?? session.completed_at)} · {shortName(session.character_name)}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ backgroundColor:'#2a2a4a', borderRadius:8, padding:6 }}>
                <Text style={{ color:'#8a7aaa', fontSize:14, fontWeight:'700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {session.missed_words.length === 0 ? (
              <View style={{ alignItems:'center', padding:20 }}>
                <Text style={{ fontSize:40 }}>🎉</Text>
                <Text style={{ color:'#22c55e', fontWeight:'800', fontSize:16, marginTop:8 }}>Perfect Score!</Text>
                <Text style={{ color:'#6b5d80', fontSize:13, marginTop:4 }}>No missed words</Text>
              </View>
            ) : (
              <>
                <Text style={{ color:'#8a7aaa', fontSize:13, marginBottom:12 }}>
                  {session.missed_words.length} word{session.missed_words.length !== 1 ? 's' : ''} to practice:
                </Text>
                <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                  {session.missed_words.map((word, i) => (
                    <View key={i} style={{ backgroundColor:'#ef444420', borderRadius:10, paddingHorizontal:12, paddingVertical:7,
                      borderWidth:1, borderColor:'#ef444444' }}>
                      <Text style={{ color:'#ef4444', fontWeight:'700', fontSize:14 }}>
                        <Text style={{ fontSize:11 }}>✕ </Text>{word}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={{ color:'#6b5d80', fontSize:12, marginBottom:16 }}>
                  💡 These words will show up in your next "My Words" spelling session!
                </Text>
              </>
            )}

            <View style={{ flexDirection:'row', gap:10 }}>
              <TouchableOpacity onPress={onPractice} style={{ flex:1, backgroundColor:'#702AE1', borderRadius:12, padding:13, alignItems:'center' }}>
                <Text style={{ color:'#fff', fontWeight:'800' }}>🎮 Practice These</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={{ backgroundColor:'#2a2a4a', borderRadius:12, padding:13, paddingHorizontal:18, alignItems:'center' }}>
                <Text style={{ color:'#8a7aaa', fontWeight:'700' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export default function SpellingScoresScreen() {
  const insets = useSafeAreaInsets()

  const [sessions,  setSessions]  = useState<SpellingSession[]>([])
  const [stats,     setStats]     = useState<SpellingStats|null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [gaugePct,  setGaugePct]  = useState(0)
  const [selectedSession, setSelectedSession] = useState<SpellingSession|null>(null)

  useEffect(() => {
    storage.getString('readquest_student_id').then(studentId => {
      if (!studentId) { setLoading(false); return }
      Promise.all([
        spellingApi.getHistory(studentId),
        spellingApi.getStats(studentId),
      ])
        .then(([histRes, statsRes]) => {
          setSessions(histRes.data as SpellingSession[])
          setStats(statsRes.data as SpellingStats)
          setTimeout(() => setGaugePct((statsRes.data as SpellingStats).accuracy_pct), 300)
        })
        .catch(() => setError('Could not load spelling scores.'))
        .finally(() => setLoading(false))
    })
  }, [])

  const totalXP = sessions.reduce((sum, s) => sum + s.xp_earned, 0)
  const masteryPct = stats && stats.words_mastered > 0
    ? Math.min(100, Math.round((stats.words_mastered / Math.max(stats.words_mastered + 5, 1)) * 100)) : 0

  if (loading) return (
    <View style={{ flex:1, backgroundColor:'#0d0d1f', alignItems:'center', justifyContent:'center', paddingTop:insets.top }}>
      <ActivityIndicator size="large" color="#702AE1" />
      <Text style={{ color:'#8a7aaa', marginTop:12 }}>Loading scores…</Text>
    </View>
  )

  return (
    <View style={{ flex:1, backgroundColor:'#0d0d1f', paddingTop:insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal:16, paddingTop:12, paddingBottom:8,
        borderBottomWidth:1, borderBottomColor:'#702AE122', flexDirection:'row', alignItems:'center' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color:'#8a7aaa', fontSize:13 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color:'#fff', fontWeight:'800', fontSize:16, flex:1, marginLeft:12 }}>📝 Spelling Progress</Text>
      </View>

      {/* Missed words modal */}
      {selectedSession && (
        <MissedWordsModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onPractice={() => { setSelectedSession(null); router.push('/(app)/spell' as any) }}
        />
      )}

      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:100 }} showsVerticalScrollIndicator={false}>
        {error ? (
          <Text style={{ color:'#ef4444', textAlign:'center', padding:20 }}>{error}</Text>
        ) : (
          <>
            {/* Gauge */}
            <View style={{ backgroundColor:'#1a1a35', borderRadius:16, padding:16, marginBottom:16,
              borderWidth:1, borderColor:'#702AE122' }}>
              <GaugeMeter pct={gaugePct} />
            </View>

            {/* Stat cards */}
            <View style={{ flexDirection:'row', gap:10, marginBottom:16, flexWrap:'wrap' }}>
              {[
                { icon:'📋', value: stats?.total_sessions ?? 0,  label:'Tests Taken' },
                { icon:'⭐', value: stats?.words_mastered ?? 0,  label:'Words Mastered', featured:true },
                { icon:'🎯', value:`${stats?.accuracy_pct ?? 0}%`, label:'Accuracy' },
                { icon:'⚡', value: totalXP,                     label:'Total XP' },
              ].map(card => (
                <View key={card.label} style={{ flex:1, minWidth:'45%', backgroundColor: card.featured ? '#702AE120' : '#1a1a35',
                  borderRadius:12, padding:12, alignItems:'center', borderWidth:1,
                  borderColor: card.featured ? '#702AE144' : '#2a2a4a' }}>
                  <Text style={{ fontSize:22 }}>{card.icon}</Text>
                  <Text style={{ color: card.featured ? '#B28CFF' : '#fff', fontWeight:'900', fontSize:22, marginTop:4 }}>
                    {card.value}
                  </Text>
                  <Text style={{ color:'#6b5d80', fontSize:11, textAlign:'center' }}>{card.label}</Text>
                </View>
              ))}
            </View>

            {/* Mastery bar */}
            {stats && stats.words_mastered > 0 && (
              <View style={{ backgroundColor:'#1a1a35', borderRadius:14, padding:14, marginBottom:14,
                borderWidth:1, borderColor:'#2a2a4a' }}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
                  <Text style={{ color:'#fff', fontWeight:'700' }}>⭐ Words Mastered</Text>
                  <Text style={{ color:'#6b5d80', fontSize:12 }}>
                    {stats.words_mastered} mastered · {stats.total_attempts} practiced
                  </Text>
                </View>
                <View style={{ height:8, backgroundColor:'#2a2a4a', borderRadius:4 }}>
                  <View style={{ height:8, borderRadius:4, backgroundColor:'#702AE1', width:`${masteryPct}%`,
                    shadowColor:'#702AE1', shadowOpacity:0.5, shadowRadius:4, shadowOffset:{width:0,height:0} }} />
                </View>
              </View>
            )}

            {/* Accuracy bar */}
            {stats && stats.total_attempts > 0 && (
              <View style={{ backgroundColor:'#1a1a35', borderRadius:14, padding:14, marginBottom:20,
                borderWidth:1, borderColor:'#2a2a4a' }}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
                  <Text style={{ color:'#fff', fontWeight:'700' }}>🎯 Overall Accuracy</Text>
                  <Text style={{ color:'#6b5d80', fontSize:12 }}>
                    {stats.correct_attempts} / {stats.total_attempts}
                  </Text>
                </View>
                <View style={{ height:8, backgroundColor:'#2a2a4a', borderRadius:4 }}>
                  <View style={{ height:8, borderRadius:4, backgroundColor:getAccColor(stats.accuracy_pct),
                    width:`${stats.accuracy_pct}%` }} />
                </View>
              </View>
            )}

            {/* History */}
            <Text style={{ color:'#fff', fontWeight:'700', fontSize:15, marginBottom:12 }}>📅 Test History</Text>

            {sessions.length === 0 ? (
              <View style={{ backgroundColor:'#1a1a35', borderRadius:16, padding:32, alignItems:'center',
                borderWidth:1, borderColor:'#2a2a4a' }}>
                <Text style={{ fontSize:48 }}>🌟</Text>
                <Text style={{ color:'#fff', fontWeight:'800', fontSize:17, marginTop:10 }}>No tests yet!</Text>
                <Text style={{ color:'#6b5d80', fontSize:13, marginTop:6, textAlign:'center' }}>
                  Complete a spelling session to see your scores here.
                </Text>
                <TouchableOpacity onPress={() => router.push('/(app)/spell' as any)}
                  style={{ backgroundColor:'#702AE1', borderRadius:12, paddingHorizontal:20, paddingVertical:11, marginTop:16 }}>
                  <Text style={{ color:'#fff', fontWeight:'800' }}>Start Spelling 🎮</Text>
                </TouchableOpacity>
              </View>
            ) : (
              sessions.map((s, i) => {
                const accColor = getAccColor(s.accuracy_pct)
                const hasMissed = s.missed_words && s.missed_words.length > 0
                return (
                  <TouchableOpacity key={s.session_id}
                    onPress={() => { if (hasMissed) { Haptics.selectionAsync(); setSelectedSession(s) } }}
                    activeOpacity={hasMissed ? 0.7 : 1}
                    style={{ backgroundColor:'#1a1a35', borderRadius:14, padding:14, marginBottom:10,
                      flexDirection:'row', alignItems:'center', borderWidth:1,
                      borderColor: hasMissed ? '#702AE133' : '#2a2a4a' }}>
                    {/* Avatar */}
                    <View style={{ width:40, height:40, borderRadius:20, backgroundColor:'#702AE130',
                      alignItems:'center', justifyContent:'center', marginRight:12 }}>
                      <Text style={{ color:'#B28CFF', fontWeight:'800', fontSize:13 }}>
                        {shortName(s.character_name)[0]?.toUpperCase()}
                      </Text>
                    </View>

                    {/* Middle */}
                    <View style={{ flex:1 }}>
                      <Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>
                        {shortName(s.character_name)}
                      </Text>
                      <Text style={{ color:'#6b5d80', fontSize:11, marginTop:1 }}>
                        {formatDate(s.started_at ?? s.completed_at)}
                      </Text>
                      <View style={{ marginTop:6, height:5, backgroundColor:'#2a2a4a', borderRadius:3, width:'100%' }}>
                        <View style={{ height:5, borderRadius:3, backgroundColor:accColor, width:`${s.accuracy_pct}%` }} />
                      </View>
                      <Text style={{ color:'#6b5d80', fontSize:11, marginTop:3 }}>
                        {s.correct_count}/{s.total_words} correct
                        {hasMissed ? ` · ❌ ${s.missed_words.length} missed — tap to review` : ''}
                      </Text>
                    </View>

                    {/* Right */}
                    <View style={{ alignItems:'flex-end', gap:4, marginLeft:10 }}>
                      <View style={{ backgroundColor:`${accColor}22`, borderRadius:10, paddingHorizontal:10, paddingVertical:4,
                        borderWidth:1, borderColor:`${accColor}44` }}>
                        <Text style={{ color:accColor, fontWeight:'800', fontSize:14 }}>{s.accuracy_pct}%</Text>
                      </View>
                      {s.xp_earned > 0 && (
                        <Text style={{ color:'#f59e0b', fontSize:11, fontWeight:'700' }}>+{s.xp_earned} XP</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )
              })
            )}

            {/* CTA */}
            <TouchableOpacity onPress={() => router.push('/(app)/spell' as any)}
              style={{ backgroundColor:'#702AE1', borderRadius:14, padding:15, alignItems:'center', marginTop:12 }}>
              <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>🎮 Practice Spelling</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  )
}
