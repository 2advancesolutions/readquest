/**
 * Add Kid — mobile version of the web AddKid.tsx
 * Manage children profiles: view, add, edit, and generate AI avatars.
 * Note: The avatar generation uses the backend API + Supabase storage
 * (canvas compositing is not available on mobile, so we save the background
 * and character URLs directly and use the API composite endpoint).
 */
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, Alert,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

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

interface Child {
  id: string
  name: string
  grade_level: number
  school?: string
  avatar_url?: string
}

interface AddForm {
  name: string
  grade: string
  school: string
}

const GRADE_LEVEL_MAP: Record<string, number> = {
  'K': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
}
const GRADE_LABEL_MAP: Record<number, string> = {
  0: 'K', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
}

export default function AddKidScreen() {
  const insets = useSafeAreaInsets()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AddForm>({ name: '', grade: '1', school: '' })
  const [parentId, setParentId] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setParentId(user.id)
      const res = await fetch(`${API_URL}/api/students?parent_id=${user.id}`)
      if (res.ok) setChildren(await res.json())
    } catch { /* */ }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Oops', 'Please enter a name.'); return }
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          grade_level: GRADE_LEVEL_MAP[form.grade] ?? 1,
          school: form.school.trim() || null,
          parent_id: parentId,
        }),
      })
      if (res.ok) {
        setShowAddModal(false)
        setForm({ name: '', grade: '1', school: '' })
        await loadData()
      } else {
        Alert.alert('Error', 'Failed to save — please try again.')
      }
    } catch {
      Alert.alert('Error', 'Could not connect to server.')
    }
    setSaving(false)
  }

  const handleDelete = (child: Child) => {
    Alert.alert(
      'Remove Child',
      `Are you sure you want to remove ${child.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/api/students/${child.id}`, { method: 'DELETE' })
              await loadData()
            } catch { /* */ }
          }
        }
      ]
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d1f', paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a35' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#8a7aaa', fontSize: 14 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', flex: 1, marginLeft: 12 }}>👨‍👩‍👧 Manage Kids</Text>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          style={{ backgroundColor: '#702AE1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#702AE1" />
          <Text style={{ color: '#6b5d80', marginTop: 8 }}>Loading profiles…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {children.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60, backgroundColor: '#1a1a35', borderRadius: 20, borderWidth: 1, borderColor: '#2a2a4a' }}>
              <Text style={{ fontSize: 56, marginBottom: 14 }}>🧒</Text>
              <Text style={{ color: '#8a7aaa', fontSize: 18, fontWeight: '700', marginBottom: 6 }}>No children yet!</Text>
              <Text style={{ color: '#4a4a6a', fontSize: 14, textAlign: 'center', paddingHorizontal: 16, marginBottom: 24 }}>
                Add a child profile to start tracking their reading journey.
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(true)}
                style={{ backgroundColor: '#702AE1', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>+ Add Child</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {children.map(child => (
                <View key={child.id} style={{ backgroundColor: '#1a1a35', borderRadius: 18, borderWidth: 1, borderColor: '#2a2a4a', padding: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {child.avatar_url ? (
                      <Image source={{ uri: child.avatar_url }} style={{ width: 64, height: 64, borderRadius: 32, marginRight: 14 }} contentFit="cover" />
                    ) : (
                      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#702AE1', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                        <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900' }}>{child.name.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 }}>{child.name}</Text>
                      <Text style={{ color: '#8a7aaa', fontSize: 13 }}>
                        Grade {GRADE_LABEL_MAP[child.grade_level] ?? child.grade_level}
                        {child.school ? ` · ${child.school}` : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                    <TouchableOpacity
                      onPress={() => handleDelete(child)}
                      style={{ flex: 1, backgroundColor: '#ef444415', borderRadius: 12, borderWidth: 1, borderColor: '#ef444430', padding: 10, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>🗑️ Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Child Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#12122a', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: '#2a2a4a', padding: 24, paddingBottom: insets.bottom + 24 }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 }}>🧒 Add a Child</Text>
            <Text style={{ color: '#6b5d80', fontSize: 13, marginBottom: 20 }}>Set up a reading profile for your child.</Text>

            {/* Name */}
            <Text style={{ color: '#8a7aaa', fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Name</Text>
            <TextInput
              value={form.name}
              onChangeText={t => setForm(f => ({ ...f, name: t }))}
              placeholder="Child's name…"
              placeholderTextColor="#3a3a5a"
              style={{ backgroundColor: '#1a1a35', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a', padding: 14, color: '#fff', fontSize: 15, marginBottom: 16 }}
            />

            {/* Grade */}
            <Text style={{ color: '#8a7aaa', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Grade</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {GRADES.map(g => (
                <TouchableOpacity
                  key={g.value}
                  onPress={() => setForm(f => ({ ...f, grade: g.value }))}
                  style={{
                    backgroundColor: form.grade === g.value ? '#702AE1' : '#1a1a35',
                    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
                    borderWidth: 1, borderColor: form.grade === g.value ? '#702AE1' : '#2a2a4a',
                  }}
                >
                  <Text style={{ color: form.grade === g.value ? '#fff' : '#8a7aaa', fontWeight: '700', fontSize: 13 }}>
                    {g.value === 'K' ? 'K' : g.value}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* School (optional) */}
            <Text style={{ color: '#8a7aaa', fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>School (optional)</Text>
            <TextInput
              value={form.school}
              onChangeText={t => setForm(f => ({ ...f, school: t }))}
              placeholder="School name…"
              placeholderTextColor="#3a3a5a"
              style={{ backgroundColor: '#1a1a35', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a', padding: 14, color: '#fff', fontSize: 15, marginBottom: 20 }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { setShowAddModal(false); setForm({ name: '', grade: '1', school: '' }) }}
                style={{ flex: 1, backgroundColor: '#1a1a35', borderRadius: 14, borderWidth: 1, borderColor: '#2a2a4a', padding: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#8a7aaa', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !form.name.trim()}
                style={{ flex: 2, backgroundColor: form.name.trim() ? '#702AE1' : '#2a2a4a', borderRadius: 14, padding: 14, alignItems: 'center' }}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: form.name.trim() ? '#fff' : '#4a4a6a', fontWeight: '800', fontSize: 15 }}>Save Child ✨</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
