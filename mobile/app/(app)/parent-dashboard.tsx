/**
 * Parent Dashboard — Profile + Children monitoring
 *
 * TOP: Parent profile card (name · email · phone) with edit phone + Unsubscribe
 * BOTTOM: Children's reading progress, fluency sessions, assignments
 */
import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, Alert, Linking,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { storage } from '../../src/lib/storage'
import { supabase } from '../../src/lib/supabase'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

// ── Types ──────────────────────────────────────────────────────────────────
interface FluencySession {
  session_id: string; story_id: string; page_number: number
  accuracy_pct: number; words_per_minute: number | null; feedback: string; recorded_at: string
}
interface ChildSummary {
  student_id: string; name: string; grade_level: number; avatar_url?: string
  fluency_summary: { session_count: number; avg_accuracy_pct: number | null; avg_wpm: number | null; recent_sessions: FluencySession[] }
  assignments: { id: string; title: string; status: string; assignment_type: string; created_at: string }[]
  recent_reviews: { id: string; star_grade: number; comment?: string; reviewed_at: string }[]
}
interface ParentProfile { firstName: string; lastName: string; email: string; phone: string; createdAt: string }

const STAR_COLORS: Record<number, string> = {
  1: '#ef4444', 2: '#f97316', 3: '#fbbf24', 4: '#84cc16', 5: '#4ade80',
}

// ── Section label ──────────────────────────────────────────────────────────
function SectionLabel({ title }: { title: string }) {
  return (
    <Text style={{ color: '#4a4a6a', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
      {title}
    </Text>
  )
}

// ── Unsubscribe confirm modal ──────────────────────────────────────────────
function UnsubscribeModal({ visible, onClose, onConfirm }: { visible: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: '#12112a', borderRadius: 22, borderWidth: 1, borderColor: '#ef444440', padding: 28, width: '100%', maxWidth: 360 }}>
          <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 10 }}>⚠️</Text>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>Cancel Subscription?</Text>
          <Text style={{ color: '#8a7aaa', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            Your children will lose access to all ReadQuest features at the end of your billing period. This action cannot be undone.
          </Text>
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              onPress={onConfirm}
              style={{ backgroundColor: '#ef4444', borderRadius: 14, padding: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Yes, Unsubscribe</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={{ backgroundColor: '#1a1a35', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a4a' }}
            >
              <Text style={{ color: '#8a7aaa', fontWeight: '700', fontSize: 14 }}>Keep My Subscription</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function ParentDashboardScreen() {
  const insets = useSafeAreaInsets()

  // Profile state
  const [profile, setProfile]             = useState<ParentProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [editingPhone, setEditingPhone]   = useState(false)
  const [phone, setPhone]                 = useState('')
  const [savingPhone, setSavingPhone]     = useState(false)
  const [unsubModal, setUnsubModal]       = useState(false)

  // Children state
  const [children, setChildren]       = useState<ChildSummary[]>([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState<ChildSummary | null>(null)
  const [reviewModal, setReviewModal] = useState<{ assignmentId: string; studentId: string } | null>(null)
  const [starGrade, setStarGrade]     = useState(0)
  const [comment, setComment]         = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // ── Load parent profile from Supabase auth + backend ──────────────────
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setProfileLoading(false); return }

        const parentId = await storage.getString('parentId')
        let firstName = '', lastName = '', createdAt = '', storedPhone = ''

        if (parentId) {
          try {
            const res = await fetch(`${API_URL}/api/parents/${parentId}`)
            if (res.ok) {
              const data = await res.json()
              firstName  = data.first_name  ?? ''
              lastName   = data.last_name   ?? ''
              createdAt  = data.created_at  ?? ''
            }
          } catch { /* fallback to auth metadata */ }
        }

        // Fall back to Supabase user_metadata if backend has no name
        if (!firstName) {
          const meta = user.user_metadata ?? {}
          firstName = meta.first_name ?? meta.full_name?.split(' ')[0] ?? ''
          lastName  = meta.last_name  ?? meta.full_name?.split(' ').slice(1).join(' ') ?? ''
        }
        // Phone from Supabase auth
        storedPhone = user.phone ?? user.user_metadata?.phone ?? ''

        setProfile({
          firstName,
          lastName,
          email: user.email ?? '',
          phone: storedPhone,
          createdAt,
        })
        setPhone(storedPhone)
      } catch { /* */ }
      setProfileLoading(false)
    }
    loadProfile()
  }, [])

  // ── Load children dashboard ────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const parentId = await storage.getString('parentId')
      if (!parentId) { setLoading(false); return }
      try {
        const res = await fetch(`${API_URL}/api/parents/dashboard/${parentId}`)
        if (res.ok) {
          const data = await res.json()
          setChildren(data.children || [])
          if (data.children?.length > 0) setSelected(data.children[0])
        }
      } catch { /* */ }
      setLoading(false)
    }
    load()
  }, [])

  // ── Save phone ─────────────────────────────────────────────────────────
  const handleSavePhone = useCallback(async () => {
    setSavingPhone(true)
    try {
      await supabase.auth.updateUser({ phone })
      setProfile(p => p ? { ...p, phone } : p)
      setEditingPhone(false)
    } catch {
      Alert.alert('Error', 'Could not save phone number. Try again.')
    }
    setSavingPhone(false)
  }, [phone])

  // ── Unsubscribe ────────────────────────────────────────────────────────
  const handleUnsubscribe = useCallback(async () => {
    setUnsubModal(false)
    // Deep link to billing portal — adjust URL for your payment provider
    const billingUrl = 'https://billing.stripe.com/p/login/00g000000000000'
    const supported = await Linking.canOpenURL(billingUrl)
    if (supported) {
      await Linking.openURL(billingUrl)
    } else {
      Alert.alert(
        'Unsubscribe',
        'To cancel your subscription, please email support@readquest.app\nor visit your account settings on the web.',
        [
          { text: 'Email Support', onPress: () => Linking.openURL('mailto:support@readquest.app?subject=Cancel%20Subscription') },
          { text: 'Close', style: 'cancel' },
        ]
      )
    }
  }, [])

  // ── Star review ────────────────────────────────────────────────────────
  const handleStarReview = async () => {
    if (!reviewModal || starGrade === 0) return
    setSubmittingReview(true)
    const parentId = await storage.getString('parentId')
    try {
      await fetch(`${API_URL}/api/parents/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: parentId, student_id: reviewModal.studentId,
          assignment_id: reviewModal.assignmentId, star_grade: starGrade,
          comment: comment.trim() || null,
        }),
      })
      setReviewModal(null); setStarGrade(0); setComment('')
    } catch { /* */ }
    setSubmittingReview(false)
  }

  // ── Profile Info Row ───────────────────────────────────────────────────
  function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#ffffff08' }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#702AE118', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#702AE130' }}>
          <Text style={{ fontSize: 16 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#4a4a6a', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</Text>
          <Text style={{ color: '#e0d4ff', fontSize: 14, fontWeight: '600', marginTop: 1 }}>{value || '—'}</Text>
        </View>
      </View>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d1f', paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a35' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#8a7aaa', fontSize: 14 }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ marginLeft: 12 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>👨‍👩‍👧 Parent Dashboard</Text>
          <Text style={{ color: '#6b5d80', fontSize: 12 }}>Your account & children's progress</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── PARENT PROFILE CARD ─────────────────────────────────── */}
        <View style={{
          backgroundColor: '#12112a', borderRadius: 20, borderWidth: 1,
          borderColor: '#702AE140', marginBottom: 24,
          // glow
          shadowColor: '#702AE1', shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        }}>
          {/* Card header */}
          <View style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: '#ffffff08' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#702AE1', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 26 }}>
                {profile ? (profile.firstName?.[0] ?? '').toUpperCase() + (profile.lastName?.[0] ?? '').toUpperCase() : '👤'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              {profileLoading ? (
                <ActivityIndicator size="small" color="#702AE1" />
              ) : (
                <>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>
                    {profile ? `${profile.firstName} ${profile.lastName}`.trim() || 'Parent Account' : 'Parent Account'}
                  </Text>
                  {profile?.createdAt ? (
                    <Text style={{ color: '#4a4a6a', fontSize: 11, marginTop: 2 }}>
                      Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          </View>

          {/* Info rows */}
          <View style={{ paddingHorizontal: 18, paddingBottom: 4 }}>
            {profile && <InfoRow icon="📧" label="Email" value={profile.email} />}

            {/* Phone row — editable */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#ffffff08' }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#702AE118', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#702AE130' }}>
                <Text style={{ fontSize: 16 }}>📱</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#4a4a6a', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>Phone</Text>
                {editingPhone ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      placeholder="+1 555 000 0000"
                      placeholderTextColor="#3a3a5a"
                      style={{
                        flex: 1, backgroundColor: '#1a1a35', borderRadius: 10, borderWidth: 1,
                        borderColor: '#702AE1', color: '#fff', fontSize: 14, padding: 8,
                      }}
                    />
                    <TouchableOpacity
                      onPress={handleSavePhone}
                      disabled={savingPhone}
                      style={{ backgroundColor: '#702AE1', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{savingPhone ? '…' : 'Save'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setEditingPhone(false); setPhone(profile?.phone ?? '') }}
                      style={{ backgroundColor: '#1a1a35', borderRadius: 10, paddingHorizontal: 10, justifyContent: 'center', borderWidth: 1, borderColor: '#2a2a4a' }}
                    >
                      <Text style={{ color: '#8a7aaa', fontWeight: '600', fontSize: 13 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 1 }}>
                    <Text style={{ color: '#e0d4ff', fontSize: 14, fontWeight: '600', flex: 1 }}>
                      {profile?.phone || 'Not set'}
                    </Text>
                    <TouchableOpacity onPress={() => setEditingPhone(true)}>
                      <Text style={{ color: '#702AE1', fontSize: 12, fontWeight: '700' }}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Plan management buttons */}
          <View style={{ padding: 16, paddingTop: 12 }}>
            <TouchableOpacity
              onPress={() => router.push('/(app)/subscription')}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16,
                backgroundColor: '#702AE1',
                shadowColor: '#702AE1', shadowOpacity: 0.4, shadowRadius: 10,
              }}
            >
              <Text style={{ fontSize: 16 }}>✨</Text>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>View / Change Plan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── CHILDREN SECTION ────────────────────────────────────── */}
        <SectionLabel title="👶 Children's Progress" />

        {loading ? (
          <View style={{ alignItems: 'center', padding: 32 }}>
            <ActivityIndicator size="large" color="#702AE1" />
            <Text style={{ color: '#6b5d80', marginTop: 8 }}>Loading…</Text>
          </View>
        ) : children.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 24, backgroundColor: '#12112a', borderRadius: 16, borderWidth: 1, borderColor: '#2a2a4a' }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📚</Text>
            <Text style={{ color: '#8a7aaa', fontSize: 16, fontWeight: '700', marginBottom: 6 }}>No children found</Text>
            <Text style={{ color: '#4a4a6a', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
              Add a child profile to see their reading progress here.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(app)/add-kid')}
              style={{ backgroundColor: '#702AE1', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>+ Add Child</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Child tabs */}
            {children.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                {children.map(child => (
                  <TouchableOpacity
                    key={child.student_id}
                    onPress={() => setSelected(child)}
                    style={{
                      paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
                      backgroundColor: selected?.student_id === child.student_id ? '#702AE1' : '#1a1a35',
                      borderWidth: 1, borderColor: '#2a2a4a',
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                      {child.avatar_url ? child.avatar_url : '🧒'} {child.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {selected && (
              <>
                {/* Child card */}
                <View style={{ backgroundColor: '#702AE110', borderRadius: 18, borderWidth: 1, borderColor: '#702AE130', padding: 18, marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#702AE1', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                      <Text style={{ fontSize: 26 }}>{selected.avatar_url || '🧒'}</Text>
                    </View>
                    <View>
                      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{selected.name}</Text>
                      <Text style={{ color: '#8a7aaa', fontSize: 12 }}>
                        Grade {selected.grade_level} · {selected.fluency_summary.session_count} reading sessions
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[
                      { label: 'Avg Accuracy', value: selected.fluency_summary.avg_accuracy_pct !== null ? `${selected.fluency_summary.avg_accuracy_pct}%` : '—', icon: '🎯' },
                      { label: 'Avg Speed',    value: selected.fluency_summary.avg_wpm ? `${selected.fluency_summary.avg_wpm} WPM` : '—', icon: '⚡' },
                      { label: 'Assignments',  value: `${selected.assignments.length}`, icon: '📝' },
                    ].map(m => (
                      <View key={m.label} style={{ flex: 1, backgroundColor: '#ffffff08', borderRadius: 12, padding: 10, alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, marginBottom: 4 }}>{m.icon}</Text>
                        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{m.value}</Text>
                        <Text style={{ color: '#4a4a6a', fontSize: 10 }}>{m.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Fluency sessions */}
                {selected.fluency_summary.recent_sessions.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <SectionLabel title="Recent Reading Sessions" />
                    <View style={{ gap: 8 }}>
                      {selected.fluency_summary.recent_sessions.map(session => {
                        const pct   = Math.round(session.accuracy_pct)
                        const color = pct >= 80 ? '#4ade80' : pct >= 60 ? '#fbbf24' : '#f87171'
                        return (
                          <View key={session.session_id} style={{ backgroundColor: '#1a1a35', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ color, fontSize: 14, fontWeight: '800' }}>{pct}%</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: '#f0eaff', fontSize: 13, marginBottom: 2 }}>
                                Page {session.page_number}{session.words_per_minute ? ` · ${session.words_per_minute} WPM` : ''}
                              </Text>
                              <Text style={{ color: '#6b5d80', fontSize: 11, fontStyle: 'italic' }} numberOfLines={1}>
                                {session.feedback.slice(0, 60)}…
                              </Text>
                            </View>
                          </View>
                        )
                      })}
                    </View>
                  </View>
                )}

                {/* Assignments to grade */}
                {selected.assignments.filter(a => a.status === 'completed').length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <SectionLabel title="⭐ Ready to Star Grade" />
                    {selected.assignments.filter(a => a.status === 'completed').map(a => (
                      <View key={a.id} style={{ backgroundColor: '#fbbf2410', borderRadius: 12, borderWidth: 1, borderColor: '#fbbf2430', padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 }}>{a.title}</Text>
                          <Text style={{ color: '#8a7aaa', fontSize: 11 }}>Completed · Waiting for your review</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setReviewModal({ assignmentId: a.id, studentId: selected.student_id })}
                          style={{ backgroundColor: '#fbbf2425', borderRadius: 10, borderWidth: 1, borderColor: '#fbbf2450', paddingHorizontal: 14, paddingVertical: 8 }}
                        >
                          <Text style={{ color: '#fbbf24', fontSize: 13, fontWeight: '700' }}>⭐ Grade</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Recent reviews */}
                {selected.recent_reviews.length > 0 && (
                  <View>
                    <SectionLabel title="Your Recent Feedback" />
                    {selected.recent_reviews.map(r => (
                      <View key={r.id} style={{ backgroundColor: '#1a1a35', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <Text style={{ fontSize: 20, color: STAR_COLORS[r.star_grade] || '#fbbf24' }}>
                          {'★'.repeat(r.star_grade)}{'☆'.repeat(5 - r.star_grade)}
                        </Text>
                        <View>
                          {r.comment && <Text style={{ color: '#f0eaff', fontSize: 13, marginBottom: 2 }}>"{r.comment}"</Text>}
                          <Text style={{ color: '#4a4a6a', fontSize: 11 }}>{new Date(r.reviewed_at).toLocaleDateString()}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>



      {/* ── STAR GRADE MODAL ────────────────────────────────────────── */}
      <Modal visible={!!reviewModal} transparent animationType="fade" onRequestClose={() => setReviewModal(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#12122a', borderRadius: 20, borderWidth: 1, borderColor: '#fbbf2440', padding: 24, width: '100%', maxWidth: 360 }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 }}>⭐ Star Grade</Text>
            <Text style={{ color: '#8a7aaa', fontSize: 13, marginBottom: 20 }}>
              How did your child do? Your feedback motivates them!
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setStarGrade(star)}>
                  <Text style={{ fontSize: 36, color: star <= starGrade ? STAR_COLORS[star] : '#2a2a4a' }}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Leave an encouraging note (optional)…"
              placeholderTextColor="#3a3a5a"
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: '#ffffff08', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a',
                padding: 12, color: '#fff', fontSize: 13, textAlignVertical: 'top', marginBottom: 16,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setReviewModal(null)}
                style={{ flex: 1, backgroundColor: '#ffffff08', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a', padding: 12, alignItems: 'center' }}
              >
                <Text style={{ color: '#8a7aaa', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleStarReview}
                disabled={starGrade === 0 || submittingReview}
                style={{ flex: 2, backgroundColor: starGrade > 0 ? '#fbbf24' : '#2a2a4a', borderRadius: 12, padding: 12, alignItems: 'center', opacity: starGrade === 0 ? 0.5 : 1 }}
              >
                <Text style={{ color: starGrade > 0 ? '#0f1117' : '#4a4a6a', fontWeight: '800', fontSize: 14 }}>
                  {submittingReview ? 'Sending…' : 'Send Grade ⭐'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
