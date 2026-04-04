/**
 * Signup screen — 3-step wizard (React Native conversion)
 *
 * Step 1: Parent account creation
 * Step 2: Add children
 * Step 3: Success
 *
 * FIX: Card and ErrorBox moved OUTSIDE SignupScreen so they are not
 * recreated on every render (which caused inputs to lose focus after 1 char).
 */
import { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
} from 'react-native'
import { router, Link } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { useDeviceLayout } from '../../src/hooks/useDeviceLayout'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

// ── Constants ─────────────────────────────────────────────────────────────
const GRADES = [
  { value: 'K', label: 'Kindergarten' },
  { value: '1', label: '1st Grade' },
  { value: '2', label: '2nd Grade' },
  { value: '3', label: '3rd Grade' },
  { value: '4', label: '4th Grade' },
  { value: '5', label: '5th Grade' },
  { value: '6', label: '6th Grade' },
  { value: '7', label: '7th Grade' },
  { value: '8', label: '8th Grade' },
]

const GRADE_EMOJIS: Record<string, string> = {
  K: '🌱', '1': '⭐', '2': '🚀', '3': '📚',
  '4': '🔬', '5': '🌍', '6': '🎯', '7': '💡', '8': '🏆',
}

interface Child {
  id: string
  firstName: string
  lastName: string
  grade: string
  school: string
}

const newChild = (): Child => ({
  id: Math.random().toString(36).slice(2),
  firstName: '', lastName: '', grade: '1', school: '',
})

// ── Step Indicator ─────────────────────────────────────────────────────────
// Defined OUTSIDE the main component so it's a stable reference
function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Account' },
    { n: 2, label: 'Children' },
    { n: 3, label: 'All Set!' },
  ]
  return (
    <View className="flex-row items-center justify-center mb-6">
      {steps.map(({ n, label }, i) => (
        <View key={n} className="flex-row items-center">
          <View className="items-center">
            <View
              className={`w-8 h-8 rounded-full items-center justify-center ${
                step > n ? 'bg-rq-green' : step === n ? 'bg-rq-purple' : 'bg-nb-surface'
              }`}
            >
              <Text className="text-white text-sm font-bold">
                {step > n ? '✓' : n}
              </Text>
            </View>
            <Text className={`text-xs mt-1 ${step >= n ? 'text-rq-purple-light' : 'text-rq-text-light'}`}>
              {label}
            </Text>
          </View>
          {i < 2 && (
            <View
              className={`w-12 h-0.5 mb-4 mx-1 ${step > n ? 'bg-rq-green' : 'bg-nb-surface'}`}
            />
          )}
        </View>
      ))}
    </View>
  )
}

// ── Grade Picker Modal ──────────────────────────────────────────────────────
// Defined OUTSIDE the main component — stable reference
function GradePicker({
  visible, selected, onSelect, onClose,
}: {
  visible: boolean; selected: string; onSelect: (g: string) => void; onClose: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/60 justify-end" onPress={onClose} activeOpacity={1}>
        <View className="bg-nb-card rounded-t-3xl px-4 pt-4 pb-8">
          <View className="w-12 h-1 bg-rq-text-light rounded-full self-center mb-4" />
          <Text className="text-white text-lg font-bold mb-4 text-center">Select Grade</Text>
          {GRADES.map(g => (
            <TouchableOpacity
              key={g.value}
              className={`flex-row items-center py-3 px-4 rounded-rq-md mb-1 ${selected === g.value ? 'bg-rq-purple/20' : ''}`}
              onPress={() => { onSelect(g.value); onClose() }}
            >
              <Text className="text-xl mr-3">{GRADE_EMOJIS[g.value]}</Text>
              <Text className={`text-base flex-1 ${selected === g.value ? 'text-rq-purple-light font-semibold' : 'text-white'}`}>
                {g.label}
              </Text>
              {selected === g.value && <Text className="text-rq-purple-light">✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

// ── Shared Card wrapper ─────────────────────────────────────────────────────
// Defined OUTSIDE the main component — stable reference, prevents focus loss
function Card({ children: content, isTablet }: { children: React.ReactNode; isTablet: boolean }) {
  return (
    <View
      className="w-full bg-nb-card rounded-rq-xl p-6"
      style={{ maxWidth: isTablet ? 480 : 9999 }}
    >
      {content}
    </View>
  )
}

// ── Error Box ───────────────────────────────────────────────────────────────
// Defined OUTSIDE — same reason
function ErrorBox({ error }: { error: string }) {
  if (!error) return null
  return (
    <View className="bg-rq-coral/10 border border-rq-coral rounded-rq-md p-3 mb-4">
      <Text className="text-rq-coral text-sm">⚠️ {error}</Text>
    </View>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function SignupScreen() {
  const { isTablet } = useDeviceLayout()

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1 — Parent
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPw,    setShowPw]    = useState(false)

  // Step 2 — Children
  const [children,      setChildren]      = useState<Child[]>([newChild()])
  const [gradePickerFor, setGradePickerFor] = useState<string | null>(null)

  // Shared
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const parentIdRef = useRef<string | null>(null)

  // ── Step 1 submit ──────────────────────────────────────────────────────
  const handleParentSubmit = async () => {
    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all fields.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: firstName, last_name: lastName } },
      })
      if (authError) throw authError

      const userId = authData.user?.id
      if (!userId) { setStep(3); return }

      parentIdRef.current = userId

      // Register parent in backend
      try {
        await fetch(`${API_URL}/api/parents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: userId, first_name: firstName, last_name: lastName }),
        })
      } catch { /* non-fatal */ }

      setStep(2)
    } catch (err: any) {
      setError(err.message || 'Error creating account')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2 submit ──────────────────────────────────────────────────────
  const handleChildrenSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      let parentId = parentIdRef.current
      if (!parentId) {
        const { data: { session } } = await supabase.auth.getSession()
        parentId = session?.user?.id ?? null
      }
      if (!parentId) throw new Error('Could not identify your account.')

      const results = await Promise.all(
        children.map(child =>
          fetch(`${API_URL}/api/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parent_id: parentId,
              name: `${child.firstName} ${child.lastName}`.trim(),
              grade_level: child.grade === 'K' ? 0 : parseInt(child.grade),
              school: child.school || null,
            }),
          })
        )
      )
      const failed = results.filter(r => !r.ok)
      if (failed.length > 0) throw new Error(`Failed to save ${failed.length} child(ren).`)
      setStep(3)
    } catch (err: any) {
      setError(err.message || 'Error saving children')
    } finally {
      setLoading(false)
    }
  }

  // ── Child helpers ──────────────────────────────────────────────────────
  const updateChild = (id: string, field: keyof Child, value: string) =>
    setChildren(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))

  const addChild = () => setChildren(prev => [...prev, newChild()])

  const removeChild = (id: string) => {
    if (children.length === 1) return
    setChildren(prev => prev.filter(c => c.id !== id))
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 1 — Parent Account
  // ═══════════════════════════════════════════════════════════════════
  if (step === 1) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-nb-bg"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className={`flex-1 items-center justify-center px-5 py-12 ${isTablet ? 'py-16' : ''}`}>
            {/* Header */}
            <Text className="text-5xl mb-2">✨</Text>
            <Text className="text-white text-3xl font-bold mb-1">ReadQuest</Text>
            <Text className="text-rq-text-muted text-sm mb-6">AI-powered reading adventures</Text>

            <Card isTablet={isTablet}>
              <StepIndicator step={1} />
              <Text className="text-white text-2xl font-bold mb-1">Create Your Account</Text>
              <View className="flex-row mb-5">
                <Text className="text-rq-text-muted text-sm">Already have one? </Text>
                <Link href="/(auth)/login">
                  <Text className="text-rq-purple-light text-sm font-semibold">Log in</Text>
                </Link>
              </View>

              <ErrorBox error={error} />

              {/* Name row */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-rq-text-muted text-xs font-semibold mb-1.5">First Name</Text>
                  <TextInput
                    className="bg-nb-surface text-white rounded-rq-md px-4 py-3"
                    placeholder="Jane" placeholderTextColor="#69537B"
                    value={firstName} onChangeText={setFirstName}
                    returnKeyType="next" autoCapitalize="words"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-rq-text-muted text-xs font-semibold mb-1.5">Last Name</Text>
                  <TextInput
                    className="bg-nb-surface text-white rounded-rq-md px-4 py-3"
                    placeholder="Doe" placeholderTextColor="#69537B"
                    value={lastName} onChangeText={setLastName}
                    returnKeyType="next" autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Email */}
              <View className="mb-4">
                <Text className="text-rq-text-muted text-xs font-semibold mb-1.5">Email Address</Text>
                <TextInput
                  className="bg-nb-surface text-white rounded-rq-md px-4 py-3"
                  placeholder="jane@example.com" placeholderTextColor="#69537B"
                  value={email} onChangeText={setEmail}
                  autoCapitalize="none" keyboardType="email-address" returnKeyType="next"
                />
              </View>

              {/* Password */}
              <View className="mb-6">
                <Text className="text-rq-text-muted text-xs font-semibold mb-1.5">Password</Text>
                <View className="relative">
                  <TextInput
                    className="bg-nb-surface text-white rounded-rq-md px-4 py-3 pr-12"
                    placeholder="Min. 8 characters" placeholderTextColor="#69537B"
                    value={password} onChangeText={setPassword}
                    secureTextEntry={!showPw} returnKeyType="done"
                    onSubmitEditing={handleParentSubmit}
                  />
                  <TouchableOpacity
                    className="absolute right-4 top-3"
                    onPress={() => setShowPw(v => !v)}
                  >
                    <Text className="text-xl">{showPw ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                className="bg-rq-purple rounded-rq-md py-4 items-center"
                onPress={handleParentSubmit} disabled={loading} activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#F8F0FF" />
                  : <Text className="text-rq-on-primary font-bold text-base">Continue → Add Children</Text>
                }
              </TouchableOpacity>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 2 — Add Children
  // ═══════════════════════════════════════════════════════════════════
  if (step === 2) {
    const activeChild = children.find(c => c.id === gradePickerFor)
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-nb-bg"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className={`flex-1 items-center px-5 py-10 ${isTablet ? 'py-14' : ''}`}>
            <Text className="text-4xl mb-1">👨‍👩‍👧‍👦</Text>
            <Text className="text-white text-xl font-bold mb-5">Add Your Children</Text>

            <View className="w-full" style={{ maxWidth: isTablet ? 480 : 9999 }}>
              <View className="bg-nb-card rounded-rq-xl p-5 mb-3">
                <StepIndicator step={2} />
                <Text className="text-white text-xl font-bold mb-1">Add Your Children</Text>
                <Text className="text-rq-text-muted text-sm mb-5">
                  Reading adapts automatically to each child's grade
                </Text>
                <ErrorBox error={error} />

                {children.map((child, idx) => (
                  <View key={child.id} className="bg-nb-surface rounded-rq-lg p-4 mb-3">
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-rq-purple-light font-semibold">
                        {GRADE_EMOJIS[child.grade] ?? '📚'} Child {idx + 1}
                      </Text>
                      {children.length > 1 && (
                        <TouchableOpacity onPress={() => removeChild(child.id)}>
                          <Text className="text-rq-coral text-sm">✕ Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Name row */}
                    <View className="flex-row gap-2 mb-3">
                      <View className="flex-1">
                        <Text className="text-rq-text-muted text-xs mb-1">First Name</Text>
                        <TextInput
                          className="bg-nb-card text-white rounded-rq-md px-3 py-2.5 text-sm"
                          placeholder="Alex" placeholderTextColor="#69537B"
                          value={child.firstName}
                          onChangeText={v => updateChild(child.id, 'firstName', v)}
                          autoCapitalize="words"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-rq-text-muted text-xs mb-1">Last Name</Text>
                        <TextInput
                          className="bg-nb-card text-white rounded-rq-md px-3 py-2.5 text-sm"
                          placeholder="Doe" placeholderTextColor="#69537B"
                          value={child.lastName}
                          onChangeText={v => updateChild(child.id, 'lastName', v)}
                          autoCapitalize="words"
                        />
                      </View>
                    </View>

                    {/* Grade + School row */}
                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <Text className="text-rq-text-muted text-xs mb-1">Grade</Text>
                        <TouchableOpacity
                          className="bg-nb-card rounded-rq-md px-3 py-2.5 flex-row items-center justify-between"
                          onPress={() => setGradePickerFor(child.id)}
                        >
                          <Text className="text-white text-sm">
                            {GRADE_EMOJIS[child.grade]} {GRADES.find(g => g.value === child.grade)?.label}
                          </Text>
                          <Text className="text-rq-text-muted text-xs">▼</Text>
                        </TouchableOpacity>
                      </View>
                      <View className="flex-1">
                        <Text className="text-rq-text-muted text-xs mb-1">School (optional)</Text>
                        <TextInput
                          className="bg-nb-card text-white rounded-rq-md px-3 py-2.5 text-sm"
                          placeholder="Lincoln Elementary" placeholderTextColor="#69537B"
                          value={child.school}
                          onChangeText={v => updateChild(child.id, 'school', v)}
                        />
                      </View>
                    </View>
                  </View>
                ))}

                {/* Add child button */}
                <TouchableOpacity
                  className="border border-dashed border-rq-purple rounded-rq-lg py-3 items-center mb-5"
                  onPress={addChild}
                >
                  <Text className="text-rq-purple-light font-semibold">＋ Add Another Child</Text>
                </TouchableOpacity>

                {/* Actions */}
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 border border-nb-surface rounded-rq-md py-3 items-center"
                    onPress={() => setStep(3)}
                  >
                    <Text className="text-rq-text-muted text-sm">Skip for now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-2 bg-rq-purple rounded-rq-md py-3 px-6 items-center"
                    onPress={handleChildrenSubmit} disabled={loading} activeOpacity={0.85}
                    style={{ flex: 2 }}
                  >
                    {loading
                      ? <ActivityIndicator color="#F8F0FF" />
                      : <Text className="text-rq-on-primary font-bold text-sm">
                          Save {children.length > 1 ? `${children.length} Children` : 'Child'} →
                        </Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Grade picker bottom sheet */}
        {activeChild && (
          <GradePicker
            visible={!!gradePickerFor}
            selected={activeChild.grade}
            onSelect={g => updateChild(activeChild.id, 'grade', g)}
            onClose={() => setGradePickerFor(null)}
          />
        )}
      </KeyboardAvoidingView>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 3 — Success
  // ═══════════════════════════════════════════════════════════════════
  return (
    <View className="flex-1 bg-nb-bg items-center justify-center px-6">
      <View
        className="bg-nb-card rounded-rq-xl p-8 w-full items-center"
        style={{ maxWidth: isTablet ? 440 : 9999 }}
      >
        <StepIndicator step={3} />
        <Text className="text-6xl mb-4">🎉</Text>
        <Text className="text-white text-2xl font-bold mb-3">You're all set!</Text>
        <Text className="text-rq-text-muted text-sm text-center mb-8" style={{ maxWidth: 280 }}>
          {children.length > 0 && children[0].firstName
            ? `${children.map(c => c.firstName).join(', ')} ${children.length > 1 ? 'are' : 'is'} ready to read!`
            : 'Your account is ready. Add children anytime from the dashboard.'}
        </Text>
        <TouchableOpacity
          className="bg-rq-purple rounded-rq-md py-4 px-10 items-center w-full"
          onPress={() => router.replace('/(app)/dashboard')}
          activeOpacity={0.85}
        >
          <Text className="text-rq-on-primary font-bold text-base">Go to Dashboard 🚀</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
