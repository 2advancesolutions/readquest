/**
 * Add Kid — Manage children profiles.
 * View, add, edit, and remove child reading profiles.
 */
import { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

const GRADES = [
  { value: 'K', label: 'Kindergarten' },
  { value: '1', label: '1st' }, { value: '2', label: '2nd' },
  { value: '3', label: '3rd' }, { value: '4', label: '4th' },
  { value: '5', label: '5th' }, { value: '6', label: '6th' },
  { value: '7', label: '7th' }, { value: '8', label: '8th' },
]

const GRADE_LEVEL_MAP: Record<string, number> = {
  K: 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
}
const GRADE_LABEL_MAP: Record<number, string> = {
  0: 'K', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
}

const AVATAR_COLORS = ['#702AE1', '#10B981', '#3B82F6', '#EC4899', '#F97316', '#06B6D4', '#8B5CF6', '#EF4444']

type FormState = { name: string; grade: string; school: string }

interface Child {
  id: string; name: string; grade_level: number; school?: string; avatar_url?: string
}

// ── GradePicker ─────────────────────────────────────────────────────────────
function GradePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
      {GRADES.map(g => (
        <TouchableOpacity
          key={g.value}
          onPress={() => onChange(g.value)}
          style={{
            backgroundColor: value === g.value ? '#702AE1' : '#1a1a35',
            borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9,
            borderWidth: 1.5, borderColor: value === g.value ? '#9d6af0' : '#2a2a4a',
          }}
        >
          <Text style={{ color: value === g.value ? '#fff' : '#6b5d80', fontWeight: '800', fontSize: 13 }}>
            {g.value}
          </Text>
          <Text style={{ color: value === g.value ? 'rgba(255,255,255,0.7)' : '#4a4a6a', fontSize: 9, textAlign: 'center', marginTop: 1 }}>
            {g.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

// ── ChildForm (shared by Add + Edit modals) ──────────────────────────────────
function ChildForm({
  visible, title, subtitle, form, onChange,
  saving, onSave, onClose, saveBtnLabel, saveBtnColor,
  nameInputRef,
}: {
  visible: boolean; title: string; subtitle: string
  form: FormState; onChange: (k: keyof FormState, v: string) => void
  saving: boolean; onSave: () => void; onClose: () => void
  saveBtnLabel: string; saveBtnColor: string
  nameInputRef?: React.RefObject<TextInput | null>
}) {
  const insets = useSafeAreaInsets()
  const canSave = form.name.trim().length > 0 && !saving

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={{
          backgroundColor: '#12112a',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderTopWidth: 1, borderColor: '#702AE150',
          padding: 24, paddingBottom: insets.bottom + 28,
          shadowColor: '#702AE1', shadowOpacity: 0.35, shadowRadius: 30,
        }}>
          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(160,130,255,0.3)', alignSelf: 'center', marginBottom: 18 }} />

          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 3 }}>{title}</Text>
          <Text style={{ color: '#6b5d80', fontSize: 13, marginBottom: 22 }}>{subtitle}</Text>

          {/* Name */}
          <Text style={label}>Name *</Text>
          <TextInput
            ref={nameInputRef}
            value={form.name}
            onChangeText={t => onChange('name', t)}
            placeholder="e.g. Lily, Marcus, Zoe…"
            placeholderTextColor="#3a3a5a"
            style={input}
            autoFocus
            returnKeyType="next"
          />

          {/* Grade */}
          <Text style={label}>Grade</Text>
          <GradePicker value={form.grade} onChange={v => onChange('grade', v)} />

          {/* School */}
          <Text style={label}>School (optional)</Text>
          <TextInput
            value={form.school}
            onChangeText={t => onChange('school', t)}
            placeholder="School name…"
            placeholderTextColor="#3a3a5a"
            style={[input, { marginBottom: 24 }]}
            returnKeyType="done"
            onSubmitEditing={canSave ? onSave : undefined}
          />

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, backgroundColor: '#1a1a35', borderRadius: 14, borderWidth: 1, borderColor: '#2a2a4a', padding: 15, alignItems: 'center' }}
            >
              <Text style={{ color: '#8a7aaa', fontWeight: '700', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSave}
              disabled={!canSave}
              style={{ flex: 2, backgroundColor: canSave ? saveBtnColor : '#2a2a4a', borderRadius: 14, padding: 15, alignItems: 'center' }}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={{ color: canSave ? '#fff' : '#4a4a6a', fontWeight: '900', fontSize: 15 }}>{saveBtnLabel}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function AddKidScreen() {
  const insets = useSafeAreaInsets()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading]   = useState(true)

  // Add form
  const [addOpen, setAddOpen]   = useState(false)
  const [addForm, setAddForm]   = useState<FormState>({ name: '', grade: '1', school: '' })
  const [addSaving, setAddSaving] = useState(false)
  const addNameRef = useRef<TextInput | null>(null)

  // Edit form
  const [editChild, setEditChild]     = useState<Child | null>(null)
  const [editForm, setEditForm]       = useState<FormState>({ name: '', grade: '1', school: '' })
  const [editSaving, setEditSaving]   = useState(false)

  const loadChildren = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const res = await fetch(`${API_URL}/api/students/parent/${user.id}`)
      if (res.ok) setChildren(await res.json())
    } catch { /* */ }
    setLoading(false)
  }

  useEffect(() => { loadChildren() }, [])

  // ── Add ──
  const handleAdd = async () => {
    if (!addForm.name.trim()) { Alert.alert('Name required', 'Please enter a name for your child.'); return }
    setAddSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { Alert.alert('Error', 'Session expired. Please log in again.'); setAddSaving(false); return }

      const res = await fetch(`${API_URL}/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        addForm.name.trim(),
          grade_level: GRADE_LEVEL_MAP[addForm.grade] ?? 1,
          school:      addForm.school.trim() || null,
          parent_id:   user.id,
        }),
      })

      if (res.ok) {
        setAddOpen(false)
        setAddForm({ name: '', grade: '1', school: '' })
        await loadChildren()
      } else {
        const err = await res.json().catch(() => ({}))
        Alert.alert('Could not save', err?.detail ?? 'Please try again.')
      }
    } catch {
      Alert.alert('Connection error', 'Please check your internet and try again.')
    }
    setAddSaving(false)
  }

  // ── Edit ──
  const openEdit = (child: Child) => {
    setEditChild(child)
    setEditForm({ name: child.name, grade: GRADE_LABEL_MAP[child.grade_level] ?? '1', school: child.school ?? '' })
  }

  const handleEditSave = async () => {
    if (!editChild || !editForm.name.trim()) { Alert.alert('Name required', 'Name cannot be empty.'); return }
    setEditSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/students/${editChild.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        editForm.name.trim(),
          grade_level: GRADE_LEVEL_MAP[editForm.grade] ?? editChild.grade_level,
          school:      editForm.school.trim() || null,
        }),
      })
      if (res.ok) { setEditChild(null); await loadChildren() }
      else Alert.alert('Error', 'Could not update profile. Try again.')
    } catch { Alert.alert('Connection error', 'Please try again.') }
    setEditSaving(false)
  }

  // ── Delete ──
  const handleDelete = (child: Child) => {
    Alert.alert(
      'Remove Child',
      `Remove ${child.name} from your account? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/api/students/${child.id}`, { method: 'DELETE' })
              await loadChildren()
            } catch { Alert.alert('Error', 'Could not remove. Try again.') }
          },
        },
      ]
    )
  }

  // ── Render ──
  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d1f', paddingTop: insets.top }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row',
        alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a35',
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ color: '#8a7aaa', fontSize: 14 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', flex: 1, marginLeft: 12 }}>
          👨‍👩‍👧 My Children
        </Text>
        <TouchableOpacity
          onPress={() => { setAddForm({ name: '', grade: '1', school: '' }); setAddOpen(true) }}
          style={{
            backgroundColor: '#702AE1', borderRadius: 14,
            paddingHorizontal: 16, paddingVertical: 9,
            flexDirection: 'row', alignItems: 'center', gap: 5,
            shadowColor: '#702AE1', shadowOpacity: 0.5, shadowRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 18, lineHeight: 20 }}>+</Text>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Add Child</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#702AE1" />
          <Text style={{ color: '#6b5d80', marginTop: 10, fontSize: 14 }}>Loading profiles…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Empty state */}
          {children.length === 0 ? (
            <TouchableOpacity
              onPress={() => { setAddForm({ name: '', grade: '1', school: '' }); setAddOpen(true) }}
              activeOpacity={0.9}
              style={{
                alignItems: 'center', paddingVertical: 52,
                backgroundColor: '#12112a', borderRadius: 24,
                borderWidth: 1.5, borderColor: '#702AE130',
                borderStyle: 'dashed',
                marginTop: 16,
              }}
            >
              <Text style={{ fontSize: 60, marginBottom: 14 }}>🧒</Text>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 }}>No children yet</Text>
              <Text style={{ color: '#6b5d80', fontSize: 14, textAlign: 'center', paddingHorizontal: 24, marginBottom: 24, lineHeight: 20 }}>
                Tap to add your first child and start their reading journey with ReadQuest.
              </Text>
              <View style={{ backgroundColor: '#702AE1', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 13 }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>+ Add Child</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={{ color: '#4a4a6a', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
                {children.length} child{children.length !== 1 ? 'ren' : ''} on your account
              </Text>
              <View style={{ gap: 12 }}>
                {children.map((child, i) => (
                  <View
                    key={child.id}
                    style={{
                      backgroundColor: '#12112a', borderRadius: 20,
                      borderWidth: 1, borderColor: '#2a2a4a', padding: 18,
                      shadowColor: '#702AE1', shadowOpacity: 0.08, shadowRadius: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                      {child.avatar_url ? (
                        <Image source={{ uri: child.avatar_url }} style={{ width: 64, height: 64, borderRadius: 32, marginRight: 14 }} contentFit="cover" />
                      ) : (
                        <View style={{
                          width: 64, height: 64, borderRadius: 32,
                          backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
                          alignItems: 'center', justifyContent: 'center', marginRight: 14,
                        }}>
                          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900' }}>
                            {child.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 3 }}>{child.name}</Text>
                        <Text style={{ color: '#8a7aaa', fontSize: 13 }}>
                          Grade {GRADE_LABEL_MAP[child.grade_level] ?? child.grade_level}
                          {child.school ? ` · ${child.school}` : ''}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => openEdit(child)}
                        style={{
                          flex: 1, backgroundColor: 'rgba(112,42,225,0.12)', borderRadius: 12,
                          borderWidth: 1, borderColor: 'rgba(112,42,225,0.3)',
                          padding: 11, alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: '#a78bfa', fontWeight: '700', fontSize: 13 }}>✏️ Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(child)}
                        style={{
                          flex: 1, backgroundColor: '#ef444415', borderRadius: 12,
                          borderWidth: 1, borderColor: '#ef444430',
                          padding: 11, alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>🗑️ Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {/* Add another */}
              <TouchableOpacity
                onPress={() => { setAddForm({ name: '', grade: '1', school: '' }); setAddOpen(true) }}
                style={{
                  marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#702AE150',
                  borderRadius: 18, padding: 16,
                }}
              >
                <Text style={{ fontSize: 22 }}>➕</Text>
                <Text style={{ color: '#702AE1', fontWeight: '800', fontSize: 14 }}>Add Another Child</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {/* ── Add Child Modal ── */}
      <ChildForm
        visible={addOpen}
        title="🧒 Add a Child"
        subtitle="Create a reading profile for your child."
        form={addForm}
        onChange={(k, v) => setAddForm(f => ({ ...f, [k]: v }))}
        saving={addSaving}
        onSave={handleAdd}
        onClose={() => { setAddOpen(false); setAddForm({ name: '', grade: '1', school: '' }) }}
        saveBtnLabel="Save Child ✨"
        saveBtnColor="#702AE1"
        nameInputRef={addNameRef}
      />

      {/* ── Edit Child Modal ── */}
      <ChildForm
        visible={!!editChild}
        title="✏️ Edit Child"
        subtitle={`Update ${editChild?.name ?? 'child'}'s profile.`}
        form={editForm}
        onChange={(k, v) => setEditForm(f => ({ ...f, [k]: v }))}
        saving={editSaving}
        onSave={handleEditSave}
        onClose={() => setEditChild(null)}
        saveBtnLabel="Save Changes ✓"
        saveBtnColor="#10B981"
      />
    </View>
  )
}

const label = {
  color: '#8a7aaa', fontSize: 11, fontWeight: '700' as const,
  textTransform: 'uppercase' as const, letterSpacing: 1.1, marginBottom: 7,
}
const input = {
  backgroundColor: '#1a1a35', borderRadius: 12, borderWidth: 1,
  borderColor: '#2a2a4a', padding: 14, color: '#fff' as const, fontSize: 15, marginBottom: 16,
}
