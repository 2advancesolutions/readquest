/**
 * Quest Mode — ported from web QuestMode.tsx
 * Shows the student's current level progress and the full quest map.
 */
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { storage } from '../../src/lib/storage'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

interface QuestLevel {
  id: string
  level_number: number
  name: string
  description: string
  required_stories: number
  min_accuracy_pct: number
  min_quiz_pct: number
  min_assignment_score: number
  xp_reward: number
  badge_slug?: string
}

interface QuestProgress {
  student_id: string
  current_level: number
  level_name: string
  stories_completed: number
  stories_required: number
  avg_accuracy: number
  min_accuracy_required: number
  avg_quiz_score: number
  min_quiz_required: number
  avg_assignment_score: number
  min_assignment_required: number
}

const LEVEL_ICONS = ['🌱', '📖', '🦅', '📄', '🚀', '🏆', '🌟', '👑']

export default function QuestScreen() {
  const insets = useSafeAreaInsets()
  const [levels, setLevels] = useState<QuestLevel[]>([])
  const [progress, setProgress] = useState<QuestProgress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const sid = await storage.getString('selectedStudentId')
      if (!sid) { setLoading(false); return }
      try {
        const [levelsRes, progressRes] = await Promise.all([
          fetch(`${API_URL}/api/quest/levels`),
          fetch(`${API_URL}/api/quest/progress/${sid}`),
        ])
        const [lvls, prog] = await Promise.all([levelsRes.json(), progressRes.json()])
        setLevels(lvls)
        setProgress(prog)
      } catch (e) {
        console.error('Quest load failed', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const currentLevel = progress?.current_level || 1

  const getLevelStatus = (levelNum: number) => {
    if (levelNum < currentLevel) return 'completed'
    if (levelNum === currentLevel) return 'active'
    return 'locked'
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0d1f', alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚡</Text>
        <ActivityIndicator size="large" color="#702AE1" />
        <Text style={{ color: '#6b5d80', marginTop: 8 }}>Loading your Quest…</Text>
      </View>
    )
  }

  const metrics = progress ? [
    { label: 'Reading Accuracy', value: progress.avg_accuracy, required: progress.min_accuracy_required, color: '#a855f7' },
    { label: 'Quiz Score', value: progress.avg_quiz_score, required: progress.min_quiz_required, color: '#6366f1' },
    { label: 'Assignment Score', value: progress.avg_assignment_score, required: progress.min_assignment_required, color: '#ec4899' },
  ] : []

  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d1f', paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a35' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#8a7aaa', fontSize: 14 }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ marginLeft: 12 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>📜 Reading Quest</Text>
          <Text style={{ color: '#6b5d80', fontSize: 12 }}>Master levels to unlock new powers!</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Active level stats */}
        {progress && (
          <View style={{ backgroundColor: '#702AE110', borderBottomWidth: 1, borderBottomColor: '#702AE125', padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 32, marginRight: 12 }}>{LEVEL_ICONS[currentLevel - 1] || '📚'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                  Level {currentLevel}: {progress.level_name}
                </Text>
                <Text style={{ color: '#8a7aaa', fontSize: 12 }}>Current Quest</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#c084fc', fontSize: 22, fontWeight: '900' }}>
                  {progress.stories_completed}/{progress.stories_required}
                </Text>
                <Text style={{ color: '#6b5d80', fontSize: 11 }}>stories</Text>
              </View>
            </View>

            {/* Metric bars */}
            {metrics.map(m => (
              <View key={m.label} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: '#8a7aaa', fontSize: 12 }}>{m.label}</Text>
                  <Text style={{ color: m.value >= m.required ? '#4ade80' : '#8a7aaa', fontSize: 12 }}>
                    {Math.round(m.value)}% / {m.required}% needed
                    {m.value >= m.required ? ' ✅' : ''}
                  </Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: '#2a2a4a', overflow: 'hidden' }}>
                  <View style={{
                    height: 6, borderRadius: 3,
                    backgroundColor: m.color,
                    width: `${Math.min(100, (m.value / m.required) * 100)}%` as any,
                  }} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Level map */}
        <View style={{ padding: 20 }}>
          <Text style={{ color: '#4a4a6a', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            Quest Map
          </Text>
          <View style={{ gap: 12 }}>
            {levels.map((level, i) => {
              const status = getLevelStatus(level.level_number)
              return (
                <View
                  key={level.id}
                  style={{
                    backgroundColor: status === 'active' ? '#702AE118' : status === 'completed' ? '#4ade8010' : '#1a1a35',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: status === 'active' ? '#702AE155' : status === 'completed' ? '#4ade8030' : '#2a2a4a',
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    opacity: status === 'locked' ? 0.5 : 1,
                  }}
                >
                  <View style={{
                    width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: status === 'completed' ? '#4ade8025' : status === 'active' ? '#702AE130' : '#2a2a4a',
                  }}>
                    <Text style={{ fontSize: 22 }}>
                      {status === 'completed' ? '✅' : status === 'locked' ? '🔒' : LEVEL_ICONS[i] || '📚'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <Text style={{
                        color: status === 'completed' ? '#4ade80' : status === 'active' ? '#c084fc' : '#8a7aaa',
                        fontSize: 15, fontWeight: '700',
                      }}>
                        Level {level.level_number}: {level.name}
                      </Text>
                      {status === 'active' && (
                        <View style={{ backgroundColor: '#702AE130', borderRadius: 10, paddingHorizontal: 6 }}>
                          <Text style={{ color: '#c084fc', fontSize: 9, fontWeight: '800' }}>CURRENT</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: '#6b5d80', fontSize: 12 }}>{level.description}</Text>
                    <Text style={{ color: '#4a4a6a', fontSize: 11, marginTop: 2 }}>
                      {level.required_stories} stories · {level.min_accuracy_pct}% accuracy · +{level.xp_reward} XP
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>

          {/* CTA */}
          <TouchableOpacity
            onPress={() => router.push('/(app)/generate')}
            style={{
              backgroundColor: '#702AE1', borderRadius: 16, padding: 16,
              alignItems: 'center', marginTop: 20,
              shadowColor: '#702AE1', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>📚 Start a Quest Story</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}
