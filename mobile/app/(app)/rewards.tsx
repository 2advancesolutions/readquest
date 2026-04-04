/**
 * Rewards — React Native (Phase 4)
 *
 * 4 tabs: Overview · Achievements · Leaderboard · Redeem XP
 * Conversions:
 * - AnimatePresence  → state-driven conditional renders + Animated
 * - motion.div       → Animated.View
 * - localStorage     → AsyncStorage (via storage lib)
 * - CalendarPicker   → native date picker pills
 * - img              → expo-image <Image>
 * - framer-motion bars → Animated.timing
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, ActivityIndicator, Alert,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'
import { storage } from '../../src/lib/storage'
import { rewardsApi } from '../../src/lib/api'
import { emitXpUpdate } from '../../src/components/XpBadge'
import { useAuth } from '../_layout'
import Constants from 'expo-constants'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

// ── Types ─────────────────────────────────────────────────────────────────
interface StudentRewards {
  total_xp: number; level: number; level_name: string
  xp_to_next_level: number; xp_progress_pct: number
  current_streak: number; badges: Badge[]; stories_read: number
  xp_history: { date: string; amount: number }[]
  weekly_activity: { date: string; active: boolean }[]
}

interface Badge { id: string; slug: string; name: string; icon: string; description: string; earned: boolean }
interface LeaderboardEntry { student_id: string; name: string; total_xp: number; level_name: string; rank: number }
interface Child { id: string; name: string; grade_level: number }

interface RedeemItem {
  id: string; name: string; img: string; xpCost: number
  grades: number[]; tag: 'both'|'boy'|'girl'; desc: string; color: string
}

const FALLBACK_BADGES: Badge[] = [
  { id:'1', slug:'first_book',   name:'First Book!',    icon:'📖', description:'Read your first book',       earned:false },
  { id:'2', slug:'streak_3',     name:'3-Day Streak',   icon:'🔥', description:'Read 3 days in a row',       earned:false },
  { id:'3', slug:'quiz_master',  name:'Quiz Master',    icon:'🧠', description:'Get 5 quiz questions right', earned:false },
  { id:'4', slug:'speed_reader', name:'Speed Reader',   icon:'⚡', description:'Read a book under 10 min',   earned:false },
  { id:'5', slug:'streak_7',     name:'7-Day Streak',   icon:'🏆', description:'Read 7 days in a row',       earned:false },
  { id:'6', slug:'explorer',     name:'Genre Explorer', icon:'🗺️', description:'Read in 3 different themes', earned:false },
  { id:'7', slug:'bookworm',     name:'Bookworm',       icon:'🐛', description:'Complete 5 books',           earned:false },
  { id:'8', slug:'word_wizard',  name:'Word Wizard',    icon:'🔮', description:'Reach level 3',              earned:false },
]

const EMPTY: StudentRewards = {
  total_xp:0, level:1, level_name:'Bookworm', xp_to_next_level:200, xp_progress_pct:0,
  current_streak:0, badges:[], stories_read:0, xp_history:[], weekly_activity:[],
}

const REDEEM_CATALOG: RedeemItem[] = [
  { id:'sticker_pack', name:'Jumbo Sticker Pack', img:'https://wsrv.nl/?url=m.media-amazon.com/images/I/81dlmdkRXOL._AC_SY500_.jpg&w=200&h=200&fit=cover', xpCost:3000,  grades:[0,1], tag:'both', desc:'500+ stickers!', color:'#f97316' },
  { id:'lego_mini',    name:'LEGO Creator Set',   img:'https://wsrv.nl/?url=m.media-amazon.com/images/I/71bv0R9ETQL._AC_SY500_.jpg&w=200&h=200&fit=cover', xpCost:7000,  grades:[2,3], tag:'both', desc:'3-in-1 LEGO fun', color:'#f97316' },
  { id:'pokemon_pack', name:'Pokémon Boosters',   img:'https://wsrv.nl/?url=m.media-amazon.com/images/I/81Gv3RqCHOL._AC_SY500_.jpg&w=200&h=200&fit=cover', xpCost:12000, grades:[4,5], tag:'both', desc:'6 booster packs', color:'#f59e0b' },
  { id:'roblox_gc',    name:'Roblox $10 Card',    img:'https://wsrv.nl/?url=m.media-amazon.com/images/I/71fvX0dMNaL._AC_SY500_.jpg&w=200&h=200&fit=cover', xpCost:25000, grades:[6,7], tag:'both', desc:'800 Robux!', color:'#10b981' },
  { id:'amazon_gc',    name:'Amazon $25 Card',    img:'https://wsrv.nl/?url=m.media-amazon.com/images/I/61eRLMGH0ZL._AC_SY500_.jpg&w=200&h=200&fit=cover', xpCost:45000, grades:[8],   tag:'both', desc:'Spend anywhere', color:'#f59e0b' },
  { id:'airpods',      name:'Apple AirPods',      img:'https://wsrv.nl/?url=m.media-amazon.com/images/I/61SUj2aKoEL._AC_SY500_.jpg&w=200&h=200&fit=cover', xpCost:80000, grades:[8],   tag:'both', desc:'AirPods 3rd gen', color:'#818cf8' },
]

type Tab = 'overview'|'badges'|'leaderboard'|'redeem'

// ── AnimatedBar ────────────────────────────────────────────────────────────
function AnimatedBar({ pct, delay }: { pct: number; delay: number }) {
  const barH = useRef(new Animated.Value(0)).current
  useEffect(() => {
    setTimeout(() => {
      Animated.timing(barH, { toValue: pct, duration: 500, useNativeDriver: false }).start()
    }, delay)
  }, [pct])
  return (
    <Animated.View style={{
      width: 8, borderRadius: 4,
      backgroundColor: '#702AE1',
      height: barH.interpolate({ inputRange:[0,100], outputRange:['0%','100%'] }),
    }} />
  )
}

// ── RedeemCard ─────────────────────────────────────────────────────────────
function RedeemCard({ item, inCart, canAfford, onAdd, onRemove }: {
  item: RedeemItem; inCart: boolean; canAfford: boolean
  onAdd: () => void; onRemove: () => void
}) {
  return (
    <View style={{
      backgroundColor: '#1a1a35', borderRadius: 16, marginBottom: 12,
      borderWidth: 1, borderColor: inCart ? '#22c55e44' : '#2a2a4a',
      overflow: 'hidden',
    }}>
      <View style={{ flexDirection:'row', padding:12 }}>
        <Image source={{ uri: item.img }} style={{ width:72, height:72, borderRadius:10 }} contentFit="cover" />
        <View style={{ flex:1, marginLeft:12 }}>
          <Text style={{ color:'#fff', fontWeight:'800', fontSize:14 }}>{item.name}</Text>
          <Text style={{ color:'#8a7aaa', fontSize:12, marginTop:2, marginBottom:6 }}>{item.desc}</Text>
          <Text style={{ color: item.color, fontWeight:'700', fontSize:13 }}>⚡ {item.xpCost.toLocaleString()} XP</Text>
          <TouchableOpacity
            onPress={inCart ? onRemove : (canAfford ? onAdd : undefined)}
            style={{
              alignSelf: 'flex-start', marginTop:6,
              backgroundColor: inCart ? '#22c55e30' : canAfford ? '#702AE130' : '#2a2a4a',
              borderRadius:20, paddingHorizontal:12, paddingVertical:5,
            }}
          >
            <Text style={{ color: inCart ? '#22c55e' : canAfford ? '#B28CFF' : '#4a4a6a', fontWeight:'700', fontSize:12 }}>
              {inCart ? '✓ In Cart' : canAfford ? '+ Add' : '🔒 Need XP'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

// ══════════════════════════════════════════════════════════════════════
export default function RewardsScreen() {
  const { session } = useAuth()
  const insets = useSafeAreaInsets()

  const [rewards,     setRewards]     = useState<StudentRewards>(EMPTY)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading,     setLoading]     = useState(true)
  const [lbLoading,   setLbLoading]   = useState(true)
  const [tab,         setTab]         = useState<Tab>('overview')
  const [children,    setChildren]    = useState<Child[]>([])
  const [activeChild, setActiveChild] = useState<Child|null>(null)
  const [cart,        setCart]        = useState<RedeemItem[]>([])
  const [checkoutDone,setCheckoutDone]= useState(false)
  const [studentId,   setStudentId]   = useState('')

  const cartTotal = cart.reduce((s,i) => s + i.xpCost, 0)
  const canAfford = rewards.total_xp >= cartTotal

  // ── Load data ────────────────────────────────────────────────────────
  useEffect(() => {
    const user = session?.user
    if (!user) { setLoading(false); setLbLoading(false); return }

    storage.getString('readquest_student_id').then(sid => {
      setStudentId(sid ?? '')
    })

    fetch(`${API_URL}/api/students/parent/${user.id}`)
      .then(r => r.json()).then(async (list: Child[]) => {
        if (!Array.isArray(list) || list.length === 0) return
        setChildren(list)
        const savedId = await storage.getString('readquest_student_id')
        const match = list.find(c => c.id === savedId) ?? list[0]
        setActiveChild(match)
      }).catch(() => {})
  }, [session])

  useEffect(() => {
    if (!activeChild) return
    setLoading(true)

    rewardsApi.getXP().then(r => {
      const data = r.data as any
      setRewards(prev => ({
        ...prev, ...data,
        badges: data.badges?.length > 0 ? data.badges : FALLBACK_BADGES,
      }))
      if (data.total_xp != null) emitXpUpdate(data.total_xp)
    }).catch(() => {}).finally(() => setLoading(false))

    rewardsApi.getLeaderboard()
      .then(r => setLeaderboard(Array.isArray(r.data) ? r.data : []))
      .catch(() => {}).finally(() => setLbLoading(false))
  }, [activeChild])

  const selectChild = (child: Child) => {
    setActiveChild(child)
    storage.setString('readquest_student_id', child.id)
    storage.setString('readquest_student_name', child.name)
  }

  const xpHistory = rewards.xp_history ?? []
  const maxXP     = Math.max(...xpHistory.map(d => d.amount), 1)

  // ── Tab bar ───────────────────────────────────────────────────────────
  const TABS: { key: Tab; label: string }[] = [
    { key:'overview',    label:'📊 Overview' },
    { key:'badges',      label:'🏅 Badges' },
    { key:'leaderboard', label:'🏆 Leaderboard' },
    { key:'redeem',      label:'🎁 Redeem' },
  ]

  return (
    <View style={{ flex:1, backgroundColor:'#0d0d1f', paddingTop:insets.top }}>

      {/* Hero banner */}
      <View style={{ padding:20, paddingBottom:0 }}>
        <View style={{ flexDirection:'row', alignItems:'center' }}>
          <View style={{
            width:60, height:60, borderRadius:30,
            backgroundColor:'#702AE120', borderWidth:2, borderColor:'#702AE1',
            alignItems:'center', justifyContent:'center', marginRight:14,
          }}>
            <Text style={{ color:'#B28CFF', fontSize:11, fontWeight:'700' }}>Level</Text>
            <Text style={{ color:'#fff', fontSize:22, fontWeight:'900', lineHeight:24 }}>{rewards.level}</Text>
          </View>
          <View style={{ flex:1 }}>
            <Text style={{ color:'#fff', fontWeight:'800', fontSize:18 }}>{rewards.level_name}</Text>
            {/* Stats row */}
            <View style={{ flexDirection:'row', marginTop:4, gap:16 }}>
              <Text style={{ color:'#B28CFF', fontSize:12 }}>⚡ {rewards.total_xp.toLocaleString()} XP</Text>
              <Text style={{ color:'#f59e0b', fontSize:12 }}>🔥 {rewards.current_streak} days</Text>
              <Text style={{ color:'#22c55e', fontSize:12 }}>📚 {rewards.stories_read}</Text>
            </View>
            {/* XP progress bar */}
            <View style={{ height:6, backgroundColor:'#1a1a35', borderRadius:3, marginTop:8 }}>
              <View style={{ height:6, borderRadius:3, backgroundColor:'#702AE1', width:`${Math.min(rewards.xp_progress_pct,100)}%` }} />
            </View>
            <Text style={{ color:'#6b5d80', fontSize:10, marginTop:2 }}>
              {rewards.xp_to_next_level} XP to next level
            </Text>
          </View>
        </View>

        {/* Child switcher pills */}
        {children.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop:12 }}>
            {children.map((child, i) => {
              const active = child.id === (activeChild?.id ?? '')
              return (
                <TouchableOpacity
                  key={child.id} onPress={() => selectChild(child)}
                  style={{
                    flexDirection:'row', alignItems:'center', marginRight:8,
                    backgroundColor: active ? '#702AE1' : '#1a1a35',
                    borderRadius:20, paddingHorizontal:12, paddingVertical:6,
                    borderWidth:1, borderColor: active ? '#702AE1' : '#2a2a4a',
                  }}
                >
                  <View style={{ width:20, height:20, borderRadius:10,
                    backgroundColor:`hsl(${(i*137)%360},70%,60%)`,
                    alignItems:'center', justifyContent:'center', marginRight:6 }}>
                    <Text style={{ color:'#fff', fontSize:10, fontWeight:'800' }}>{child.name.charAt(0)}</Text>
                  </View>
                  <Text style={{ color: active ? '#fff' : '#8a7aaa', fontWeight:'700', fontSize:12 }}>{child.name}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ maxHeight:48, marginTop:12 }}
        contentContainerStyle={{ paddingHorizontal:16, paddingBottom:8 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
            style={{
              paddingHorizontal:14, paddingVertical:8, marginRight:6, borderRadius:20,
              backgroundColor: tab === t.key ? '#702AE1' : '#1a1a35',
              borderWidth:1, borderColor: tab === t.key ? '#702AE1' : '#2a2a4a',
            }}>
            <Text style={{ color: tab === t.key ? '#fff' : '#8a7aaa', fontWeight:'700', fontSize:12 }}>
              {t.label}
              {t.key==='redeem' && cart.length > 0 ? ` (${cart.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {loading && tab === 'overview' ? (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <ActivityIndicator size="large" color="#702AE1" />
        </View>
      ) : (
        <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding:16, paddingBottom:100 }} showsVerticalScrollIndicator={false}>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <View>
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:15, marginBottom:12 }}>📈 XP Activity (Last 7 Days)</Text>
              {xpHistory.length === 0 ? (
                <View style={{ backgroundColor:'#1a1a35', borderRadius:14, padding:24, alignItems:'center' }}>
                  <Text style={{ color:'#6b5d80', fontSize:14 }}>No XP earned yet — start reading! 📖</Text>
                </View>
              ) : (
                <View style={{ backgroundColor:'#1a1a35', borderRadius:14, padding:16 }}>
                  <View style={{ flexDirection:'row', alignItems:'flex-end', justifyContent:'space-around', height:90 }}>
                    {xpHistory.map((d, i) => (
                      <View key={i} style={{ flex:1, alignItems:'center' }}>
                        <Text style={{ color:'#8a7aaa', fontSize:9, marginBottom:3 }}>{d.amount > 0 ? d.amount : ''}</Text>
                        <View style={{ height:70, justifyContent:'flex-end' }}>
                          <AnimatedBar pct={d.amount > 0 ? (d.amount / maxXP) * 100 : 4} delay={i * 70} />
                        </View>
                        <Text style={{ color:'#6b5d80', fontSize:10, marginTop:4 }}>
                          {d.date ? new Date(d.date + 'T12:00').toLocaleDateString('en-US',{ weekday:'short' }).charAt(0) : '?'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Reading consistency */}
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:15, marginTop:20, marginBottom:10 }}>🔥 Reading Streak</Text>
              <View style={{ backgroundColor:'#1a1a35', borderRadius:14, padding:16 }}>
                <View style={{ flexDirection:'row', justifyContent:'space-around' }}>
                  {(rewards.weekly_activity ?? []).map((w, i) => {
                    const label = w.date
                      ? new Date(w.date + 'T12:00').toLocaleDateString('en-US',{ weekday:'short' }).charAt(0)
                      : ['M','T','W','T','F','S','S'][i]
                    return (
                      <View key={i} style={{ alignItems:'center' }}>
                        <View style={{
                          width:32, height:32, borderRadius:16,
                          backgroundColor: w.active ? '#702AE1' : '#2a2a4a',
                          alignItems:'center', justifyContent:'center', marginBottom:4,
                        }}>
                          {w.active && <Text style={{ color:'#fff', fontSize:14 }}>✓</Text>}
                        </View>
                        <Text style={{ color:'#6b5d80', fontSize:10 }}>{label}</Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            </View>
          )}

          {/* ── BADGES ── */}
          {tab === 'badges' && (
            <View>
              {(rewards.badges.length > 0 ? rewards.badges : FALLBACK_BADGES).map((badge, i) => (
                <View key={badge.id} style={{
                  backgroundColor:'#1a1a35', borderRadius:14, padding:14, marginBottom:10,
                  flexDirection:'row', alignItems:'center',
                  borderWidth:1, borderColor: badge.earned ? '#702AE144' : '#1a1a35',
                  opacity: badge.earned ? 1 : 0.55,
                }}>
                  <Text style={{ fontSize:28, marginRight:12 }}>{badge.earned ? badge.icon : '🔒'}</Text>
                  <View style={{ flex:1 }}>
                    <Text style={{ color:'#fff', fontWeight:'700', fontSize:14 }}>{badge.name}</Text>
                    <Text style={{ color:'#8a7aaa', fontSize:12, marginTop:2 }}>{badge.description}</Text>
                    {badge.earned && <Text style={{ color:'#22c55e', fontSize:11, marginTop:2 }}>✅ Earned</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── LEADERBOARD ── */}
          {tab === 'leaderboard' && (
            <View>
              {lbLoading ? <ActivityIndicator size="large" color="#702AE1" style={{ marginTop:40 }} /> : (
                leaderboard.length === 0 ? (
                  <View style={{ alignItems:'center', paddingVertical:40 }}>
                    <Text style={{ fontSize:48 }}>🏆</Text>
                    <Text style={{ color:'#8a7aaa', fontSize:14, marginTop:12 }}>No students yet — start reading to appear here!</Text>
                  </View>
                ) : (
                  leaderboard.map((entry, i) => {
                    const isMe = entry.student_id === studentId
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${entry.rank}`
                    return (
                      <View key={entry.student_id + i} style={{
                        backgroundColor: isMe ? '#702AE115' : '#1a1a35',
                        borderRadius:12, padding:14, marginBottom:8, flexDirection:'row', alignItems:'center',
                        borderWidth:1, borderColor: isMe ? '#702AE144' : '#2a2a4a',
                      }}>
                        <Text style={{ fontSize:18, marginRight:10, minWidth:30, textAlign:'center' }}>{medal}</Text>
                        <View style={{ width:34, height:34, borderRadius:17,
                          backgroundColor:`hsl(${(i*137)%360},60%,50%)`,
                          alignItems:'center', justifyContent:'center', marginRight:10 }}>
                          <Text style={{ color:'#fff', fontWeight:'800' }}>{entry.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex:1 }}>
                          <Text style={{ color:'#fff', fontWeight:'700', fontSize:14 }}>{entry.name}{isMe ? ' 👈 You' : ''}</Text>
                          <Text style={{ color:'#8a7aaa', fontSize:11 }}>{entry.level_name}</Text>
                        </View>
                        <Text style={{ color:'#B28CFF', fontWeight:'700', fontSize:13 }}>{entry.total_xp.toLocaleString()} XP</Text>
                      </View>
                    )
                  })
                )
              )}
            </View>
          )}

          {/* ── REDEEM ── */}
          {tab === 'redeem' && (
            <View>
              {checkoutDone ? (
                <View style={{ alignItems:'center', paddingVertical:60 }}>
                  <Text style={{ fontSize:64 }}>🎉</Text>
                  <Text style={{ color:'#fff', fontWeight:'800', fontSize:22, marginTop:12 }}>Order Requested!</Text>
                  <Text style={{ color:'#8a7aaa', fontSize:14, marginTop:6, textAlign:'center', paddingHorizontal:24 }}>
                    Great job! Your reward request has been sent to your parent.{'\n'}Keep reading to earn more XP!
                  </Text>
                  <Text style={{ fontSize:28, marginTop:16 }}>⭐ ⭐ ⭐ ⭐ ⭐</Text>
                  <TouchableOpacity onPress={() => { setCart([]); setCheckoutDone(false) }}
                    style={{ backgroundColor:'#702AE1', borderRadius:14, paddingHorizontal:24, paddingVertical:12, marginTop:20 }}>
                    <Text style={{ color:'#fff', fontWeight:'800' }}>Shop Again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* Balance */}
                  <View style={{ backgroundColor:'#702AE120', borderRadius:14, padding:16, marginBottom:16,
                    borderWidth:1, borderColor:'#702AE144', flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                    <View>
                      <Text style={{ color:'#8a7aaa', fontSize:12 }}>Your XP Balance</Text>
                      <Text style={{ color:'#B28CFF', fontWeight:'900', fontSize:22 }}>⚡ {rewards.total_xp.toLocaleString()}</Text>
                    </View>
                    {cart.length > 0 && (
                      <View>
                        <Text style={{ color:'#8a7aaa', fontSize:11 }}>Cart total</Text>
                        <Text style={{ color: canAfford ? '#22c55e' : '#ef4444', fontWeight:'700', fontSize:14 }}>
                          ⚡ {cartTotal.toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Cart checkout */}
                  {cart.length > 0 && (
                    <TouchableOpacity
                      onPress={canAfford ? () => { setCart([]); setCheckoutDone(true) } : undefined}
                      style={{ backgroundColor: canAfford ? '#702AE1' : '#2a2a4a',
                        borderRadius:14, padding:14, alignItems:'center', marginBottom:16 }}>
                      <Text style={{ color: canAfford ? '#fff' : '#6b5d80', fontWeight:'800', fontSize:15 }}>
                        {canAfford ? `🎁 Redeem ${cart.length} item${cart.length > 1 ? 's' : ''}` : '🔒 Need More XP'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Catalog */}
                  <Text style={{ color:'#fff', fontWeight:'700', fontSize:14, marginBottom:10 }}>🏪 Reward Shop</Text>
                  {REDEEM_CATALOG.map(item => {
                    const inCart = cart.some(c => c.id === item.id)
                    const affordable = rewards.total_xp >= item.xpCost
                    return (
                      <RedeemCard
                        key={item.id} item={item}
                        inCart={inCart} canAfford={affordable}
                        onAdd={() => setCart(c => c.find(i => i.id === item.id) ? c : [...c, item])}
                        onRemove={() => setCart(c => c.filter(i => i.id !== item.id))}
                      />
                    )
                  })}
                </>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}
