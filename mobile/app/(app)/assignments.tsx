/**
 * Assignments — ported from web Assignments.tsx
 * Lists and completes AI-generated personalized assignments.
 */
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { storage } from '../../src/lib/storage'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Task {
  type: string
  prompt: string
  options?: string[]
  correct_answer?: string
  hint?: string
}

interface Assignment {
  id: string
  title: string
  description: string
  assignment_type: string
  status: 'pending' | 'completed' | 'reviewed'
  difficulty_level: number
  created_at: string
}

interface AssignmentDetail extends Assignment {
  content: Task[]
}

const TYPE_ICONS: Record<string, string> = {
  vocabulary: '📚', fluency: '🎤', comprehension: '🔍', mixed: '⭐',
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: '#fbbf2418', color: '#fbbf24', label: 'To Do' },
  completed: { bg: '#4ade8018', color: '#4ade80', label: 'Done · Needs Review' },
  reviewed:  { bg: '#c084fc18', color: '#c084fc', label: '⭐ Reviewed' },
}

export default function AssignmentsScreen() {
  const insets = useSafeAreaInsets()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [active, setActive] = useState<AssignmentDetail | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showHintIdx, setShowHintIdx] = useState<number | null>(null)
  const [studentId, setStudentId] = useState('')

  useEffect(() => {
    storage.getString('selectedStudentId').then(id => {
      if (id) { setStudentId(id); loadAssignments(id) }
      else setLoading(false)
    })
  }, [])

  const loadAssignments = async (sid: string) => {
    try {
      const res = await fetch(`${API_URL}/api/assignments/${sid}`)
      if (res.ok) setAssignments(await res.json())
    } catch { /* */ }
    setLoading(false)
  }

  const handleGenerate = async () => {
    if (!studentId) return
    setGenerating(true)
    try {
      const res = await fetch(`${API_URL}/api/assignments/generate/${studentId}`, { method: 'POST' })
      if (res.ok) await loadAssignments(studentId)
    } catch { /* */ }
    setGenerating(false)
  }

  const openAssignment = async (id: string) => {
    const res = await fetch(`${API_URL}/api/assignments/detail/${id}`)
    if (res.ok) {
      setActive(await res.json())
      setAnswers({})
      setSubmitted(false)
      setScore(null)
    }
  }

  const handleSubmit = async () => {
    if (!active || !studentId) return
    const res = await fetch(`${API_URL}/api/assignments/${active.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-student-id': studentId },
      body: JSON.stringify({ answers }),
    })
    if (res.ok) {
      const data = await res.json()
      setScore(data.score_pct)
      setSubmitted(true)
      await loadAssignments(studentId)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0d1f', alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#702AE1" />
        <Text style={{ color: '#6b5d80', marginTop: 8 }}>Loading assignments…</Text>
      </View>
    )
  }

  // ── Assignment detail view ──────────────────────────────────────────
  if (active) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0d1f', paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a35' }}>
          <TouchableOpacity onPress={() => setActive(null)}>
            <Text style={{ color: '#8a7aaa', fontSize: 14 }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginLeft: 12 }}>📝 Assignment</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* Header card */}
          <View style={{ backgroundColor: '#702AE115', borderRadius: 16, borderWidth: 1, borderColor: '#702AE133', padding: 16, marginBottom: 20 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 }}>{active.title}</Text>
            <Text style={{ color: '#8a7aaa', fontSize: 13 }}>{active.description}</Text>
          </View>

          {/* Tasks */}
          {active.content.map((task, idx) => (
            <View key={idx} style={{ backgroundColor: '#1a1a35', borderRadius: 16, borderWidth: 1, borderColor: '#2a2a4a', padding: 16, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                <View style={{ backgroundColor: '#702AE130', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ color: '#B28CFF', fontSize: 10, fontWeight: '700' }}>
                    {(task.type || '').replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                <Text style={{ color: '#4a4a6a', fontSize: 11 }}>Task {idx + 1}</Text>
              </View>

              <Text style={{ color: '#f0eaff', fontSize: 15, lineHeight: 22, marginBottom: 12 }}>{task.prompt}</Text>

              {/* Multiple choice */}
              {task.options && task.type === 'multiple_choice' && (
                <View style={{ gap: 8 }}>
                  {task.options.map((opt, oi) => {
                    const isSelected = answers[idx] === opt
                    const isCorrect = submitted && opt === task.correct_answer
                    const isWrong = submitted && isSelected && !isCorrect
                    return (
                      <TouchableOpacity
                        key={oi}
                        onPress={() => !submitted && setAnswers(a => ({ ...a, [idx]: opt }))}
                        style={{
                          backgroundColor: isCorrect ? '#4ade8020' : isWrong ? '#ef444420' : isSelected ? '#702AE120' : '#12122a',
                          borderRadius: 10, borderWidth: 1,
                          borderColor: isCorrect ? '#4ade8066' : isWrong ? '#ef444466' : isSelected ? '#702AE166' : '#2a2a4a',
                          padding: 12,
                        }}
                        disabled={submitted}
                      >
                        <Text style={{ color: '#f0eaff', fontSize: 14 }}>{opt}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}

              {/* Open text */}
              {(!task.options || task.type !== 'multiple_choice') && (
                <TextInput
                  value={answers[idx] || ''}
                  onChangeText={t => !submitted && setAnswers(a => ({ ...a, [idx]: t }))}
                  editable={!submitted}
                  multiline
                  numberOfLines={3}
                  placeholder="Write your answer here…"
                  placeholderTextColor="#3a3a5a"
                  style={{
                    backgroundColor: '#12122a', borderRadius: 10, borderWidth: 1,
                    borderColor: '#2a2a4a', padding: 12, color: '#f0eaff', fontSize: 14,
                    textAlignVertical: 'top', minHeight: 80,
                  }}
                />
              )}

              {/* Hint */}
              {task.hint && !submitted && (
                <TouchableOpacity onPress={() => setShowHintIdx(showHintIdx === idx ? null : idx)} style={{ marginTop: 8 }}>
                  <Text style={{ color: '#702AE1', fontSize: 12 }}>
                    {showHintIdx === idx ? '▲ Hide hint' : '💡 Show hint'}
                  </Text>
                </TouchableOpacity>
              )}
              {showHintIdx === idx && task.hint && (
                <Text style={{ color: '#8a7aaa', fontSize: 13, fontStyle: 'italic', marginTop: 6 }}>{task.hint}</Text>
              )}
            </View>
          ))}

          {/* Submit or Score */}
          {!submitted ? (
            <TouchableOpacity
              onPress={handleSubmit}
              style={{ backgroundColor: '#702AE1', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Submit Answers 🚀</Text>
            </TouchableOpacity>
          ) : (
            <View style={{
              backgroundColor: score !== null && score >= 70 ? '#4ade8015' : '#fbbf2415',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: score !== null && score >= 70 ? '#4ade8033' : '#fbbf2433',
              padding: 24, alignItems: 'center',
            }}>
              <Text style={{ fontSize: 48, marginBottom: 8 }}>{score !== null && score >= 70 ? '🎉' : '💪'}</Text>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 4 }}>
                {score !== null ? `${score}%` : '—'}
              </Text>
              <Text style={{ color: '#8a7aaa', fontSize: 13, textAlign: 'center' }}>
                {score !== null && score >= 70
                  ? 'Amazing work! Your parent will see this soon! ⭐'
                  : "Good effort! Keep practicing — you'll get better! 📚"}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    )
  }

  // ── Assignment list view ────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d1f', paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a35' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#8a7aaa', fontSize: 14 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', flex: 1, marginLeft: 12 }}>📝 My Assignments</Text>
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={generating || !studentId}
          style={{ backgroundColor: '#702AE1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, opacity: generating ? 0.6 : 1 }}
        >
          {generating
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>+ New</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {assignments.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, backgroundColor: '#1a1a35', borderRadius: 20, borderWidth: 1, borderColor: '#2a2a4a' }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📝</Text>
            <Text style={{ color: '#8a7aaa', fontSize: 16, fontWeight: '700', marginBottom: 6 }}>No assignments yet!</Text>
            <Text style={{ color: '#4a4a6a', fontSize: 13, textAlign: 'center', paddingHorizontal: 16 }}>
              Tap "+ New" to get personalized practice.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {assignments.map(a => {
              const badge = STATUS_CONFIG[a.status] || STATUS_CONFIG.pending
              return (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => openAssignment(a.id)}
                  style={{ backgroundColor: '#1a1a35', borderRadius: 16, borderWidth: 1, borderColor: '#2a2a4a', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <View style={{ width: 48, height: 48, backgroundColor: '#702AE120', borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{TYPE_ICONS[a.assignment_type] || '📝'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 6 }}>{a.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ backgroundColor: badge.bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: badge.color, fontSize: 10, fontWeight: '700' }}>{badge.label}</Text>
                      </View>
                      <Text style={{ color: '#4a4a6a', fontSize: 11 }}>Level {a.difficulty_level}</Text>
                    </View>
                  </View>
                  <Text style={{ color: '#4a4a6a', fontSize: 20 }}>›</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
