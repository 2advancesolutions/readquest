/**
 * StudentDropdown — child selector (React Native conversion).
 *
 * On phone: tapping the trigger opens a bottom-sheet Modal
 * On tablet: tapping opens an inline dropdown panel (popover style)
 *
 * Replaces:
 * - framer-motion AnimatePresence → Animated + Modal
 * - <img> → expo-image <Image>
 * - CSS position absolute flyout → Modal (phone) / View overlay (tablet)
 */
import { useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, Modal, ScrollView, Animated,
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
  children: Child[]
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
      className={`flex-row items-center px-4 py-3 rounded-rq-md mb-1 ${isSelected ? 'bg-rq-purple/20' : ''}`}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Avatar child={child} color={color} size={36} />
      <View className="flex-1 ml-3">
        <Text className={`font-semibold ${isSelected ? 'text-rq-purple-light' : 'text-white'}`}>
          {child.name}
        </Text>
        <Text className="text-rq-text-muted text-xs">Grade {child.grade_level}</Text>
      </View>
      {isSelected && <Text className="text-rq-purple-light ml-2">✓</Text>}
    </TouchableOpacity>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function StudentDropdown({
  children,
  selected,
  onChange,
  allowAll = true,
  label,
}: Props) {
  const { isTablet } = useDeviceLayout()
  const [open, setOpen] = useState(false)
  const activeIdx = selected ? children.findIndex(c => c.id === selected.id) : -1

  if (children.length === 0) return null

  const handleSelect = (child: Child | null) => {
    setOpen(false)
    onChange(child)
  }

  // ── Trigger button ───────────────────────────────────────────────────────
  const Trigger = (
    <TouchableOpacity
      className="flex-row items-center bg-nb-surface rounded-full px-3 py-1.5 gap-2"
      onPress={() => setOpen(o => !o)}
      activeOpacity={0.8}
    >
      {label && <Text className="text-rq-text-muted text-xs mr-1">{label}</Text>}

      {selected ? (
        <>
          <Avatar
            child={selected}
            color={CHILD_COLORS[activeIdx % CHILD_COLORS.length]}
            size={24}
          />
          <Text className="text-white text-sm font-semibold">{selected.name}</Text>
          <Text className="text-rq-text-muted text-xs">G{selected.grade_level}</Text>
        </>
      ) : (
        <>
          <Text>👥</Text>
          <Text className="text-white text-sm font-semibold">All Students</Text>
        </>
      )}
      <Text className="text-rq-text-muted text-xs ml-1">{open ? '▲' : '▼'}</Text>
    </TouchableOpacity>
  )

  // ── Options list (shared between phone and tablet) ───────────────────────
  const OptionsList = () => (
    <ScrollView bounces={false}>
      {allowAll && (
        <TouchableOpacity
          className={`flex-row items-center px-4 py-3 rounded-rq-md mb-1 ${selected === null ? 'bg-rq-purple/20' : ''}`}
          onPress={() => handleSelect(null)}
          activeOpacity={0.7}
        >
          <Text className="text-2xl mr-3">👥</Text>
          <Text className={`flex-1 font-semibold ${selected === null ? 'text-rq-purple-light' : 'text-white'}`}>
            All Students
          </Text>
          {selected === null && <Text className="text-rq-purple-light">✓</Text>}
        </TouchableOpacity>
      )}
      {children.map((child, i) => (
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

  // ── Phone: bottom sheet Modal ────────────────────────────────────────────
  if (!isTablet) {
    return (
      <View>
        {Trigger}
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <TouchableOpacity
            className="flex-1 bg-black/60 justify-end"
            onPress={() => setOpen(false)}
            activeOpacity={1}
          >
            <View className="bg-nb-card rounded-t-3xl px-4 pt-4"
              style={{ paddingBottom: 40 }}
            >
              <View className="w-12 h-1 bg-rq-text-light rounded-full self-center mb-4" />
              <Text className="text-white text-lg font-bold mb-3 px-2">Select Student</Text>
              <OptionsList />
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    )
  }

  // ── Tablet: inline dropdown panel ───────────────────────────────────────
  return (
    <View style={{ position: 'relative', zIndex: 100 }}>
      {Trigger}
      {open && (
        <>
          {/* Backdrop to close */}
          <TouchableOpacity
            style={{ position: 'absolute', top: -1000, left: -1000, right: -1000, bottom: -1000 }}
            onPress={() => setOpen(false)}
          />
          <View
            className="absolute bg-nb-card rounded-rq-lg p-3"
            style={{ top: 44, right: 0, minWidth: 220, zIndex: 200,
              shadowColor: '#702AE1', shadowOpacity: 0.2, shadowRadius: 12, elevation: 10 }}
          >
            <OptionsList />
          </View>
        </>
      )}
    </View>
  )
}
