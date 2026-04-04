/**
 * Recording Playback — mobile screen for playing a specific recording session.
 * Route: /recordings/[bookId]/[recordingId]
 * Uses expo-av for audio playback.
 */
import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native'
import { Audio } from 'expo-av'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

interface RecordingDetail {
  id: string
  page_number: number
  accuracy_pct: number
  words_per_minute: number | null
  duration_sec: number
  feedback: string
  recorded_at: string
  audio_url?: string
  transcript?: string
  errors?: string[]
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function AccuracyGauge({ pct }: { pct: number }) {
  const color = pct >= 80 ? '#4ade80' : pct >= 60 ? '#fbbf24' : '#f87171'
  const emoji = pct >= 80 ? '⭐' : pct >= 60 ? '📈' : '💪'
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{
        width: 100, height: 100, borderRadius: 50, borderWidth: 8,
        borderColor: color + '40', backgroundColor: color + '15',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 24 }}>{emoji}</Text>
        <Text style={{ color, fontSize: 22, fontWeight: '900' }}>{Math.round(pct)}%</Text>
      </View>
      <Text style={{ color: '#8a7aaa', fontSize: 12, marginTop: 8 }}>Reading Accuracy</Text>
    </View>
  )
}

export default function RecordingPlaybackScreen() {
  const insets = useSafeAreaInsets()
  const { bookId, recordingId } = useLocalSearchParams<{ bookId: string; recordingId: string }>()
  const [recording, setRecording] = useState<RecordingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/fluency/recordings/detail/${recordingId}`)
        if (res.ok) setRecording(await res.json())
      } catch { /* */ }
      setLoading(false)
    }
    load()
    return () => { cleanupSound() }
  }, [recordingId])

  const cleanupSound = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (sound) {
      await sound.stopAsync()
      await sound.unloadAsync()
      setSound(null)
      setPlaying(false)
    }
  }

  const handlePlayPause = async () => {
    if (!recording?.audio_url) return

    if (sound) {
      if (playing) {
        await sound.pauseAsync()
        setPlaying(false)
        if (intervalRef.current) clearInterval(intervalRef.current)
      } else {
        await sound.playAsync()
        setPlaying(true)
        intervalRef.current = setInterval(async () => {
          const status = await sound.getStatusAsync()
          if (status.isLoaded) {
            setPosition(status.positionMillis / 1000)
            if (status.didJustFinish) {
              setPlaying(false)
              setPosition(0)
              if (intervalRef.current) clearInterval(intervalRef.current)
            }
          }
        }, 250)
      }
    } else {
      // Load audio
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true })
      const { sound: newSound, status } = await Audio.Sound.createAsync({ uri: recording.audio_url })
      if (status.isLoaded) setDuration(status.durationMillis! / 1000)
      setSound(newSound)
      await newSound.playAsync()
      setPlaying(true)
      intervalRef.current = setInterval(async () => {
        const s = await newSound.getStatusAsync()
        if (s.isLoaded) {
          setPosition(s.positionMillis / 1000)
          if (s.didJustFinish) {
            setPlaying(false)
            setPosition(0)
            if (intervalRef.current) clearInterval(intervalRef.current)
          }
        }
      }, 250)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0d1f', alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#702AE1" />
        <Text style={{ color: '#6b5d80', marginTop: 8 }}>Loading session…</Text>
      </View>
    )
  }

  if (!recording) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0d1f', alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>😕</Text>
        <Text style={{ color: '#8a7aaa', fontSize: 16 }}>Recording not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#702AE1', fontWeight: '700' }}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const accColor = recording.accuracy_pct >= 80 ? '#4ade80' : recording.accuracy_pct >= 60 ? '#fbbf24' : '#f87171'
  const playProgress = duration > 0 ? (position / duration) * 100 : 0

  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d1f', paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a35' }}>
        <TouchableOpacity onPress={() => { cleanupSound(); router.back() }}>
          <Text style={{ color: '#8a7aaa', fontSize: 14 }}>← Sessions</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', flex: 1, marginLeft: 12 }}>
          🎧 Page {recording.page_number}
        </Text>
        <Text style={{ color: '#4a4a6a', fontSize: 12 }}>
          {new Date(recording.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Accuracy gauge */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <AccuracyGauge pct={recording.accuracy_pct} />
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Duration', value: formatDuration(recording.duration_sec), icon: '⏱' },
            { label: 'Speed', value: recording.words_per_minute ? `${recording.words_per_minute} WPM` : '—', icon: '⚡' },
            { label: 'Accuracy', value: `${Math.round(recording.accuracy_pct)}%`, icon: '🎯' },
          ].map(stat => (
            <View key={stat.label} style={{ flex: 1, backgroundColor: '#1a1a35', borderRadius: 14, borderWidth: 1, borderColor: '#2a2a4a', padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 18, marginBottom: 4 }}>{stat.icon}</Text>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{stat.value}</Text>
              <Text style={{ color: '#6b5d80', fontSize: 10, marginTop: 1 }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Audio player */}
        {recording.audio_url ? (
          <View style={{ backgroundColor: '#702AE115', borderRadius: 18, borderWidth: 1, borderColor: '#702AE133', padding: 20, marginBottom: 24 }}>
            <Text style={{ color: '#8a7aaa', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Recording Playback</Text>

            {/* Progress bar */}
            <View style={{ height: 6, backgroundColor: '#2a2a4a', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: '#702AE1', width: `${playProgress}%` as any }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: '#6b5d80', fontSize: 11 }}>{formatDuration(position)}</Text>
              <Text style={{ color: '#6b5d80', fontSize: 11 }}>{formatDuration(duration || recording.duration_sec)}</Text>
            </View>

            {/* Play/Pause */}
            <TouchableOpacity
              onPress={handlePlayPause}
              style={{
                backgroundColor: '#702AE1', borderRadius: 50, width: 60, height: 60,
                alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
                shadowColor: '#702AE1', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
              }}
            >
              <Text style={{ fontSize: 24 }}>{playing ? '⏸' : '▶️'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ backgroundColor: '#1a1a35', borderRadius: 16, borderWidth: 1, borderColor: '#2a2a4a', padding: 16, marginBottom: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 28, marginBottom: 6 }}>🎤</Text>
            <Text style={{ color: '#8a7aaa', fontSize: 13, textAlign: 'center' }}>Audio file not available for this session.</Text>
          </View>
        )}

        {/* AI Feedback */}
        {recording.feedback && (
          <View style={{ backgroundColor: '#1a1a35', borderRadius: 16, borderWidth: 1, borderColor: '#2a2a4a', padding: 16, marginBottom: 20 }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 10 }}>🤖 AI Feedback</Text>
            <Text style={{ color: '#c4b5fd', fontSize: 14, lineHeight: 21, fontStyle: 'italic' }}>"{recording.feedback}"</Text>
          </View>
        )}

        {/* Errors / missed words */}
        {recording.errors && recording.errors.length > 0 && (
          <View style={{ backgroundColor: '#ef444410', borderRadius: 16, borderWidth: 1, borderColor: '#ef444425', padding: 16 }}>
            <Text style={{ color: '#f87171', fontSize: 14, fontWeight: '700', marginBottom: 10 }}>
              🔤 Words to Practice ({recording.errors.length})
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {recording.errors.map((word, i) => (
                <View key={i} style={{ backgroundColor: '#ef444420', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: '#f87171', fontWeight: '700', fontSize: 13 }}>{word}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  )
}
