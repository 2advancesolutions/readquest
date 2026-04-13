/**
 * StudentDropdown — child selector (React Native).
 *
 * Phone:  tapping opens a bottom-sheet Modal (always above content)
 * Tablet: tapping opens an inline dropdown panel with high z-index
 */
import { useState } from 'react'
import {
  View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet,
} from 'react-native'
import { Image } from 'expo-image'
import { useDeviceLayout } from '../hooks/useDeviceLayout'

export type Child = {
  id: string
  name: string
  grade_level: number
  school?: string
  avatar_url?: string
}

export const CHILD_COLORS = [
  '#702AE1', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#F97316',
]

interface Props {
  students: Child[]
  selected: Child | null
  onChange: (child: Child | null) => void
  allowAll?: boolean
  label?: string
}

// ── Avatar circle ──────────────────────────────────────────────────────────
function Avatar({ child, color, size = 32 }: { child: Child; color: string; size?: number }) {
  if (child.avatar_url) {
    return (
      <Image
        source={{ uri: child.avatar_url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    )
  }
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color, alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.45 }}>
        {child.name.charAt(0).toUpperCase()}
      </Text>
    </View>
  )
}

// ── Child list item ────────────────────────────────────────────────────────
function ChildItem({
  child, color, isSelected, onPress,
}: {
  child: Child; color: string; isSelected: boolean; onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[s.childItem, isSelected && s.childItemSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Avatar child={child} color={color} size={36} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[s.childName, isSelected && s.childNameSelected]}>
          {child.name}
        </Text>
        <Text style={s.childGrade}>Grade {child.grade_level}</Text>
      </View>
      {isSelected && <Text style={{ color: '#B28CFF', marginLeft: 8 }}>✓</Text>}
    </TouchableOpacity>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function StudentDropdown({
  students,
  selected,
  onChange,
  allowAll = true,
  label,
}: Props) {
  const { isTablet } = useDeviceLayout()
  const [open, setOpen] = useState(false)
  const activeIdx = selected ? students.findIndex(c => c.id === selected.id) : -1

  if (students.length === 0) return null

  const handleSelect = (child: Child | null) => {
    setOpen(false)
    onChange(child)
  }

  // ── Trigger button ───────────────────────────────────────────────────────
  const Trigger = (
    <TouchableOpacity
      style={s.trigger}
      onPress={() => setOpen(o => !o)}
      activeOpacity={0.8}
    >
      {label && <Text style={s.triggerLabel}>{label}</Text>}
      {selected ? (
        <>
          <Avatar
            child={selected}
            color={CHILD_COLORS[activeIdx % CHILD_COLORS.length]}
            size={24}
          />
          <Text style={s.triggerName}>{selected.name}</Text>
          <Text style={s.triggerGrade}>G{selected.grade_level}</Text>
        </>
      ) : (
        <>
          <Text>👥</Text>
          <Text style={s.triggerName}>All Students</Text>
        </>
      )}
      <Text style={s.triggerCaret}>{open ? '▲' : '▼'}</Text>
    </TouchableOpacity>
  )

  // ── Options list (shared) ────────────────────────────────────────────────
  const OptionsList = () => (
    <ScrollView bounces={false}>
      {allowAll && (
        <TouchableOpacity
          style={[s.childItem, selected === null && s.childItemSelected]}
          onPress={() => handleSelect(null)}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 24, marginRight: 12 }}>👥</Text>
          <Text style={[s.childName, selected === null && s.childNameSelected, { flex: 1 }]}>
            All Students
          </Text>
          {selected === null && <Text style={{ color: '#B28CFF' }}>✓</Text>}
        </TouchableOpacity>
      )}
      {students.map((child, i) => (
        <ChildItem
          key={child.id}
          child={child}
          color={CHILD_COLORS[i % CHILD_COLORS.length]}
          isSelected={selected?.id === child.id}
          onPress={() => handleSelect(child)}
        />
      ))}
    </ScrollView>
  )

  // ── Phone: Modal bottom-sheet — always floats above everything ───────────
  if (!isTablet) {
    return (
      <View style={{ zIndex: 100, elevation: 100 }}>
        {Trigger}
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
          statusBarTranslucent
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}
            onPress={() => setOpen(false)}
            activeOpacity={1}
          >
            <View style={s.sheet}>
              <View style={s.sheetHandle} />
              <Text style={s.sheetTitle}>Select Student</Text>
              <OptionsList />
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    )
  }

  // ── Tablet / Web: inline dropdown – high z-index stack ───────────────────
  return (
    <View style={{ position: 'relative', zIndex: 200, elevation: 200 }}>
      {Trigger}
      {open && (
        <>
          {/* Invisible backdrop to close on outside tap */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: -2000, left: -2000, right: -2000, bottom: -2000,
              zIndex: 190, elevation: 190,
            }}
            onPress={() => setOpen(false)}
          />
          {/* Panel itself — must be above backdrop */}
          <View style={s.panel}>
            <OptionsList />
          </View>
        </>
      )}
    </View>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1a1a35',
    borderRadius: 100, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(112,42,225,0.5)',
  },
  triggerLabel: { color: '#6b5d80', fontSize: 12, marginRight: 4 },
  triggerName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  triggerGrade: { color: '#6b5d80', fontSize: 12 },
  triggerCaret: { color: '#6b5d80', fontSize: 11, marginLeft: 4 },

  childItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 12, marginBottom: 4,
  },
  childItemSelected: { backgroundColor: 'rgba(112,42,225,0.2)' },
  childName: { color: '#fff', fontWeight: '600', fontSize: 14 },
  childNameSelected: { color: '#B28CFF' },
  childGrade: { color: '#6b5d80', fontSize: 12, marginTop: 1 },

  // Bottom-sheet (phone)
  sheet: {
    backgroundColor: '#16103a',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48,
  },
  sheetHandle: {
    width: 48, height: 4, backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: {
    color: '#fff', fontSize: 18, fontWeight: '700',
    marginBottom: 12, paddingHorizontal: 8,
  },

  // Inline panel (tablet/web)
  panel: {
    position: 'absolute', top: 44, right: 0, minWidth: 220,
    backgroundColor: '#16103a',
    borderRadius: 16, padding: 12,
    zIndex: 300, elevation: 300,
    shadowColor: '#702AE1', shadowOpacity: 0.4,
    shadowRadius: 20, shadowOffset: { width: 0, height: 6 },
    borderWidth: 1, borderColor: 'rgba(112,42,225,0.35)',
  },
})
