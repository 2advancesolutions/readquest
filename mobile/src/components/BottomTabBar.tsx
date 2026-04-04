/**
 * BottomTabBar.tsx — Custom animated bottom navigation bar + full route drawer.
 *
 * Inspired by the Google Stitch "Cosmic Storybook" Night-Bloom design:
 * - Floating deep violet glassmorphic bar with 5 primary tabs + "More" button
 * - Active tab: glowing gradient pill indicator with bright white label
 * - Inactive tabs: muted icons at 45% opacity
 * - Animated press & scale on tab switch
 * - "More" opens a slide-up drawer with ALL routes (matching frontend MobileNav)
 */
import React, { useRef, useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native'
import { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'

// ── Primary tabs shown in the bar ─────────────────────────────────────────────
const TAB_CONFIG = [
  { name: 'dashboard', label: 'Home',      emoji: '🏠' },
  { name: 'library',   label: 'Library',   emoji: '📚' },
  { name: 'generate',  label: 'Create',    emoji: '✨' },
  { name: 'community', label: 'Community', emoji: '🌍' },
  { name: 'rewards',   label: 'Rewards',   emoji: '🏆' },
]

// ── All drawer routes (mirrors frontend MobileNav NAV_LINKS) ──────────────────
const DRAWER_LINKS = [
  { id: 'home',              label: 'Home',              emoji: '🏠',  path: '/(app)/dashboard'         },
  { id: 'library',           label: 'Library',           emoji: '📚',  path: '/(app)/library'           },
  { id: 'create-story',      label: 'Create Story',      emoji: '✨',  path: '/(app)/generate',  special: true },
  { id: 'community',         label: 'Community',         emoji: '🌍',  path: '/(app)/community'         },
  { id: 'rewards',           label: 'Rewards',           emoji: '🏆',  path: '/(app)/rewards'           },
  { id: 'spelling',          label: 'Spelling Arena',    emoji: '🔤',  path: '/(app)/spell'             },
  { id: 'games',             label: 'Games Arcade',      emoji: '🎮',  path: '/(app)/games'             },
  { id: 'leaderboard',       label: 'Leaderboard',       emoji: '🥇',  path: '/(app)/leaderboard'       },
  { id: 'exams',             label: 'Exams',             emoji: '📝',  path: '/(app)/exams'            },
  { id: 'scores',            label: 'Scores',            emoji: '📊',  path: '/(app)/scores'            },
  { id: 'recordings',        label: 'Recordings',        emoji: '🎙️', path: '/(app)/recordings'        },
  { id: 'profile',           label: 'Manage Kids',       emoji: '👨‍👧',  path: '/(app)/add-kid'           },
  { id: 'parent-dashboard',  label: 'Parent Dashboard',  emoji: '👪',  path: '/(app)/parent-dashboard'  },
  { id: 'assignments',       label: 'Assignments',       emoji: '📋',  path: '/(app)/assignments'       },
  { id: 'quest',             label: 'Quest Mode',        emoji: '⚔️',  path: '/(app)/quest'             },
  { id: 'movie-studio',      label: 'Movie Studio',      emoji: '🎬',  path: '/(app)/movie-studio'      },
  { id: 'character-studio',  label: 'Character Studio',  emoji: '🎨',  path: '/(app)/character-studio'  },
  { id: 'admin',             label: 'Admin',             emoji: '⚙️',  path: '/(app)/admin'             },
]

// ── Single tab item ───────────────────────────────────────────────────────────
interface TabItemProps {
  config: (typeof TAB_CONFIG)[0]
  isActive: boolean
  onPress: () => void
}

function TabItem({ config, isActive, onPress }: TabItemProps) {
  const scaleAnim     = useRef(new Animated.Value(1)).current
  const opacityAnim   = useRef(new Animated.Value(isActive ? 1 : 0.45)).current
  const emojiScaleAnim = useRef(new Animated.Value(isActive ? 1.15 : 1)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim,      { toValue: isActive ? 1.05 : 1,  useNativeDriver: true, tension: 70, friction: 7 }),
      Animated.timing(opacityAnim,    { toValue: isActive ? 1 : 0.45,  duration: 200, useNativeDriver: true }),
      Animated.spring(emojiScaleAnim, { toValue: isActive ? 1.2 : 1,   useNativeDriver: true, tension: 70, friction: 7 }),
    ]).start()
  }, [isActive])

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.85, useNativeDriver: true, tension: 300, friction: 5 }),
      Animated.spring(scaleAnim, { toValue: isActive ? 1.05 : 1, useNativeDriver: true, tension: 80, friction: 6 }),
    ]).start()
    onPress()
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      style={styles.tabItem}
      accessibilityRole="tab"
      accessibilityLabel={config.label}
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale: scaleAnim }] }]}>
        {isActive && (
          <LinearGradient
            colors={['#9500FF', '#5B00B5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeGradient}
          />
        )}
        {isActive && <View style={styles.activeGlowRing} />}
        <Animated.Text style={[styles.emoji, { transform: [{ scale: emojiScaleAnim }] }]}>
          {config.emoji}
        </Animated.Text>
        <Animated.Text style={[styles.label, isActive && styles.labelActive, { opacity: opacityAnim }]}>
          {config.label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  )
}

// ── Full-route drawer ─────────────────────────────────────────────────────────
function NavDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter()
  const slideAnim = useRef(new Animated.Value(600)).current
  const backdropOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim,    { toValue: 0,   useNativeDriver: true, tension: 70, friction: 9 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim,    { toValue: 600, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start()
    }
  }, [visible])

  const goTo = (path: string) => {
    onClose()
    setTimeout(() => router.push(path as any), 160)
  }

  const handleLogout = async () => {
    onClose()
    await supabase.auth.signOut()
    router.replace('/')
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View style={[drawerStyles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Slide-up panel */}
      <Animated.View style={[drawerStyles.panel, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={['#120b2e', '#0d0a23']}
          style={drawerStyles.panelGradient}
        >
          {/* Handle bar */}
          <View style={drawerStyles.handle} />

          {/* Header */}
          <View style={drawerStyles.header}>
            <View>
              <Text style={drawerStyles.headerTitle}>ReadQuest</Text>
              <Text style={drawerStyles.headerSub}>The Weightless Archive</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={drawerStyles.closeBtn} accessibilityLabel="Close menu">
              <Text style={drawerStyles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Nav links grid */}
          <ScrollView
            style={drawerStyles.scroll}
            contentContainerStyle={drawerStyles.grid}
            showsVerticalScrollIndicator={false}
          >
            {DRAWER_LINKS.map(link => (
              <TouchableOpacity
                key={link.id}
                style={[drawerStyles.navItem, link.special && drawerStyles.navItemSpecial]}
                onPress={() => goTo(link.path)}
                activeOpacity={0.75}
              >
                {link.special && (
                  <LinearGradient
                    colors={['rgba(149,0,255,0.25)', 'rgba(91,0,181,0.15)']}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text style={drawerStyles.navEmoji}>{link.emoji}</Text>
                <Text style={[drawerStyles.navLabel, link.special && drawerStyles.navLabelSpecial]}>
                  {link.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Sign out */}
          <View style={drawerStyles.signOutWrapper}>
            <TouchableOpacity style={drawerStyles.signOut} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={drawerStyles.signOutText}>👋  Sign Out</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    </Modal>
  )
}

// ── Main BottomTabBar ─────────────────────────────────────────────────────────
export default function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <NavDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <View style={styles.outerWrapper} pointerEvents="box-none">
        {/* Ambient glow */}
        <View style={styles.ambientGlow} />

        <View style={styles.bar}>
          {/* Primary 5 tabs */}
          {TAB_CONFIG.map((tab) => {
            const routeIndex = state.routes.findIndex((r) => r.name === tab.name)
            const isActive   = state.index === routeIndex

            return (
              <TabItem
                key={tab.name}
                config={tab}
                isActive={isActive}
                onPress={() => {
                  if (routeIndex < 0) return
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: state.routes[routeIndex].key,
                    canPreventDefault: true,
                  })
                  if (!isActive && !event.defaultPrevented) {
                    navigation.navigate(tab.name)
                  }
                }}
              />
            )
          })}

          {/* More button */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setDrawerOpen(true)}
            activeOpacity={0.8}
            accessibilityLabel="More navigation options"
            accessibilityRole="button"
          >
            <View style={styles.tabInner}>
              <Text style={styles.emoji}>☰</Text>
              <Text style={[styles.label, { opacity: 0.55 }]}>More</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </>
  )
}

// ── Bar styles ────────────────────────────────────────────────────────────────
const BAR_HEIGHT   = 72
const BOTTOM_INSET = Platform.OS === 'ios' ? 28 : 14

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: BOTTOM_INSET,
  },
  ambientGlow: {
    position: 'absolute',
    bottom: BOTTOM_INSET - 8,
    left: 20,
    right: 20,
    height: BAR_HEIGHT + 20,
    borderRadius: 40,
    backgroundColor: 'transparent',
    shadowColor: '#9500FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 32,
    elevation: 0,
  },
  bar: {
    width: '100%',
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(13, 10, 35, 0.95)',
    borderRadius: 38,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(203, 151, 255, 0.14)',
    elevation: 24,
    shadowColor: '#702AE1',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 26,
    minWidth: 52,
    position: 'relative',
  },
  activeGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
  },
  activeGlowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(203, 151, 255, 0.4)',
  },
  emoji: {
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 2,
    zIndex: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7a79a0',
    letterSpacing: 0.2,
    zIndex: 2,
  },
  labelActive: {
    color: '#f0eaff',
  },
})

// ── Drawer styles ─────────────────────────────────────────────────────────────
const DRAWER_RADIUS = 32

const drawerStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 3, 18, 0.72)',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '88%',
    borderTopLeftRadius: DRAWER_RADIUS,
    borderTopRightRadius: DRAWER_RADIUS,
    overflow: 'hidden',
  },
  panelGradient: {
    flex: 1,
    borderTopLeftRadius: DRAWER_RADIUS,
    borderTopRightRadius: DRAWER_RADIUS,
    borderTopWidth: 1,
    borderColor: 'rgba(203, 151, 255, 0.18)',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(203, 151, 255, 0.3)',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#e0d4ff',
    letterSpacing: 0.4,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(180, 160, 255, 0.55)',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(130, 80, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#c9b8ff',
    fontSize: 16,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 12,
  },
  navItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(203, 151, 255, 0.1)',
    overflow: 'hidden',
  },
  navItemSpecial: {
    borderColor: 'rgba(203, 151, 255, 0.35)',
  },
  navEmoji: {
    fontSize: 20,
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c9b8ff',
    flex: 1,
  },
  navLabelSpecial: {
    color: '#e8d7ff',
    fontWeight: '800',
  },
  signOutWrapper: {
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
  },
  signOut: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 80, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 100, 0.2)',
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ff8888',
    letterSpacing: 0.3,
  },
})
