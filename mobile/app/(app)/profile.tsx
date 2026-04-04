/**
 * Profile — React Native (Phase 6)
 * Route: /profile (hidden tab)
 *
 * Student profile, stats overview, QR code-style sharing placeholder,
 * parent controls, notification settings, sign-out.
 */
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert, ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { supabase } from '../../src/lib/supabase'
import { storage } from '../../src/lib/storage'
import { rewardsApi } from '../../src/lib/api'

interface StudentProfile {
  id: string; name: string; grade_level: number
  avatar_url?: string; school_name?: string; school_id?: string
}
interface Stats {
  total_xp: number; streak_days: number; books_read: number; accuracy_pct: number
}

const GRADE_LABELS = ['Kindergarten','1st Grade','2nd Grade','3rd Grade','4th Grade','5th Grade','6th Grade','7th Grade','8th Grade']

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const [profile,   setProfile]   = useState<StudentProfile|null>(null)
  const [stats,     setStats]     = useState<Stats|null>(null)
  const [loading,   setLoading]   = useState(true)
  const [editing,   setEditing]   = useState(false)
  const [editName,  setEditName]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [soundOn,   setSoundOn]   = useState(true)
  const [notifOn,   setNotifOn]   = useState(true)

  useEffect(() => {
    loadProfile()
    storage.get<boolean>('readquest_sound').then(v => { if(v!==null) setSoundOn(v) })
    storage.get<boolean>('readquest_notif').then(v => { if(v!==null) setNotifOn(v) })
  }, [])

  const loadProfile = async () => {
    try {
      const sid   = await storage.getString('readquest_student_id')
      if (!sid) { setLoading(false); return }

      const { data: student } = await supabase
        .from('students').select('*').eq('id', sid).single()
      if (student) {
        setProfile(student as StudentProfile)
        setEditName(student.name ?? '')
      }

      const xpRes = await rewardsApi.getXP()
      const strRes = await rewardsApi.getStreaks()
      setStats({
        total_xp:    xpRes.data?.total_xp ?? 0,
        streak_days: strRes.data?.current_streak ?? 0,
        books_read:  (await storage.get<number>('readquest_books_read')) ?? 0,
        accuracy_pct:80,
      })
    } catch { /* non-fatal */ }
    finally { setLoading(false) }
  }

  const handleSaveName = async () => {
    if (!profile || !editName.trim()) return
    setSaving(true)
    try {
      await supabase.from('students').update({ name: editName.trim() }).eq('id', profile.id)
      setProfile(p => p ? {...p, name:editName.trim()} : p)
      setEditing(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch { Alert.alert('Error','Could not save name.') }
    finally { setSaving(false) }
  }

  const handleSignOut = () => {
    Alert.alert('Sign Out','Are you sure you want to sign out?',[
      { text:'Cancel', style:'cancel' },
      { text:'Sign Out', style:'destructive', onPress: async () => {
        await supabase.auth.signOut()
        await storage.clear()
        router.replace('/(auth)/login' as any)
      }},
    ])
  }

  const handleToggleSound = async (v:boolean) => {
    setSoundOn(v); await storage.set('readquest_sound', v)
    Haptics.selectionAsync()
  }
  const handleToggleNotif = async (v:boolean) => {
    setNotifOn(v); await storage.set('readquest_notif', v)
    Haptics.selectionAsync()
  }

  if (loading) return (
    <View style={{ flex:1, backgroundColor:'#0d0d1f', alignItems:'center', justifyContent:'center', paddingTop:insets.top }}>
      <ActivityIndicator size="large" color="#702AE1" />
    </View>
  )

  return (
    <View style={{ flex:1, backgroundColor:'#0d0d1f', paddingTop:insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal:16, paddingVertical:10, flexDirection:'row', alignItems:'center',
        borderBottomWidth:1, borderBottomColor:'#702AE122' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight:12 }}>
          <Text style={{ color:'#8a7aaa', fontSize:13 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color:'#fff', fontWeight:'900', fontSize:15, flex:1 }}>👤 Profile</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/parent-dashboard' as any)}
          style={{ backgroundColor:'#1a1a35', borderRadius:10, paddingHorizontal:10, paddingVertical:6,
            borderWidth:1, borderColor:'#2a2a4a' }}>
          <Text style={{ color:'#B28CFF', fontSize:12, fontWeight:'700' }}>🔑 Parent</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding:20, paddingBottom:100 }} showsVerticalScrollIndicator={false}>

        {/* Avatar + name */}
        <View style={{ alignItems:'center', marginBottom:24 }}>
          <View style={{ width:90, height:90, borderRadius:45, backgroundColor:'#702AE130',
            alignItems:'center', justifyContent:'center', marginBottom:12,
            borderWidth:3, borderColor:'#702AE1',
            shadowColor:'#702AE1', shadowOpacity:0.5, shadowRadius:12 }}>
            {profile?.avatar_url
              ? <Image source={{uri:profile.avatar_url}} style={{width:90,height:90,borderRadius:45}} contentFit="cover" />
              : <Text style={{ fontSize:42 }}>🧒</Text>
            }
          </View>

          {editing ? (
            <View style={{ flexDirection:'row', alignItems:'center', gap:8, width:'100%', maxWidth:280 }}>
              <TextInput value={editName} onChangeText={setEditName} maxLength={30}
                style={{ flex:1, backgroundColor:'#1a1a35', borderRadius:12, padding:12, color:'#fff',
                  fontSize:18, fontWeight:'700', textAlign:'center', borderWidth:1, borderColor:'#702AE142' }}
                autoFocus returnKeyType="done" onSubmitEditing={handleSaveName} />
              <TouchableOpacity onPress={handleSaveName} disabled={saving}
                style={{ backgroundColor:'#702AE1', borderRadius:12, padding:12 }}>
                <Text style={{ color:'#fff', fontWeight:'800' }}>{saving?'…':'✓'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)} style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
              <Text style={{ color:'#fff', fontWeight:'900', fontSize:20 }}>{profile?.name ?? 'Reader'}</Text>
              <Text style={{ color:'#702AE1', fontSize:13 }}>✏️</Text>
            </TouchableOpacity>
          )}

          <Text style={{ color:'#8a7aaa', fontSize:13, marginTop:4 }}>
            {GRADE_LABELS[profile?.grade_level ?? 1]} · ReadQuest
          </Text>
          {profile?.school_name && (
            <Text style={{ color:'#6b5d80', fontSize:12, marginTop:2 }}>🏫 {profile.school_name}</Text>
          )}
        </View>

        {/* Stat cards */}
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:20 }}>
          {[
            { icon:'⚡', label:'Total XP',    value:stats?.total_xp ?? 0,            color:'#f59e0b' },
            { icon:'🔥', label:'Day Streak',  value:`${stats?.streak_days ?? 0}d`,   color:'#ef4444' },
            { icon:'📚', label:'Books Read',  value:stats?.books_read ?? 0,          color:'#4FACFE' },
            { icon:'🎯', label:'Accuracy',    value:`${stats?.accuracy_pct ?? 0}%`,  color:'#22c55e' },
          ].map(s => (
            <View key={s.label} style={{ flex:1, minWidth:'45%', backgroundColor:'#1a1a35', borderRadius:14,
              padding:14, alignItems:'center', borderWidth:1, borderColor:'#2a2a4a' }}>
              <Text style={{ fontSize:26 }}>{s.icon}</Text>
              <Text style={{ color:s.color, fontWeight:'900', fontSize:22, marginTop:4 }}>{s.value}</Text>
              <Text style={{ color:'#6b5d80', fontSize:11 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick nav */}
        <Text style={{ color:'#fff', fontWeight:'700', fontSize:14, marginBottom:12 }}>📋 My Progress</Text>
        {[
          { icon:'📝', label:'Reading Exams',    route:'/(app)/exams',          color:'#60a5fa' },
          { icon:'📝', label:'Spelling Scores',  route:'/(app)/spelling-scores',color:'#c084fc' },
          { icon:'📊', label:'Scores & History', route:'/(app)/scores',         color:'#4ade80' },
          { icon:'🏆', label:'Leaderboard',      route:'/(app)/leaderboard',    color:'#f59e0b' },
        ].map(item => (
          <TouchableOpacity key={item.label} onPress={() => router.push(item.route as any)}
            style={{ backgroundColor:'#1a1a35', borderRadius:14, padding:14, flexDirection:'row',
              alignItems:'center', marginBottom:8, borderWidth:1, borderColor:'#2a2a4a' }}>
            <Text style={{ fontSize:20, marginRight:12 }}>{item.icon}</Text>
            <Text style={{ color:'#fff', fontWeight:'700', flex:1 }}>{item.label}</Text>
            <Text style={{ color:item.color, fontWeight:'700', fontSize:16 }}>→</Text>
          </TouchableOpacity>
        ))}

        {/* Settings */}
        <Text style={{ color:'#fff', fontWeight:'700', fontSize:14, marginBottom:12, marginTop:8 }}>⚙️ Settings</Text>
        <View style={{ backgroundColor:'#1a1a35', borderRadius:16, borderWidth:1, borderColor:'#2a2a4a', overflow:'hidden', marginBottom:20 }}>
          {[
            { label:'Sound Effects & TTS', icon:'🔊', val:soundOn, onChange:handleToggleSound },
            { label:'Daily Reminders',     icon:'🔔', val:notifOn, onChange:handleToggleNotif },
          ].map((item,i) => (
            <View key={item.label} style={{ flexDirection:'row', alignItems:'center', padding:14,
              borderBottomWidth:i<1?1:0, borderBottomColor:'#702AE115' }}>
              <Text style={{ fontSize:20, marginRight:12 }}>{item.icon}</Text>
              <Text style={{ color:'#fff', fontWeight:'700', flex:1 }}>{item.label}</Text>
              <Switch value={item.val} onValueChange={item.onChange}
                trackColor={{ false:'#2a2a4a', true:'#702AE1' }} thumbColor='#fff' />
            </View>
          ))}
        </View>

        {/* Danger zone */}
        <TouchableOpacity onPress={handleSignOut}
          style={{ backgroundColor:'#ef444415', borderRadius:14, padding:14, alignItems:'center',
            borderWidth:1, borderColor:'#ef444433' }}>
          <Text style={{ color:'#ef4444', fontWeight:'800', fontSize:15 }}>🚪 Sign Out</Text>
        </TouchableOpacity>

        <Text style={{ color:'#2a2a4a', fontSize:11, textAlign:'center', marginTop:20 }}>
          ReadQuest v1.0.0 · Built with ❤️ for young readers
        </Text>
      </ScrollView>
    </View>
  )
}
