/**
 * BottomTabBar.tsx — Custom animated bottom navigation bar + full route drawer.
 *
 * Night-Bloom design: floating glassmorphic pill bar.
 * Icons: Lucide React Native vector icons — crisp, modern, consistent.
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
import {
  Home,
  BookOpen,
  Sparkles,
  Globe,
  Trophy,
  Type,
  Gamepad2,
  BarChart2,
  ClipboardList,
  TrendingUp,
  Mic2,
  Users,
  LayoutDashboard,
  BookMarked,
  Sword,
  Settings,
  LogOut,
  Grid3x3,
  type LucideIcon,
} from 'lucide-react-native'

// ── Tab config ────────────────────────────────────────────────────────────────
const TAB_CONFIG: { name: string; label: string; Icon: LucideIcon; color: string }[] = [
  { name: 'dashboard', label: 'Home',      Icon: Home,      color: '#a78bfa' },
  { name: 'library',   label: 'Library',   Icon: BookOpen,  color: '#60a5fa' },
  { name: 'generate',  label: 'Create',    Icon: Sparkles,  color: '#c084fc' },
  { name: 'community', label: 'Social',    Icon: Globe,     color: '#34d399' },
  { name: 'rewards',   label: 'Rewards',   Icon: Trophy,    color: '#fbbf24' },
]

// ── Drawer links ───────────────────────────────────────────────────────────────
const DRAWER_LINKS: {
  id: string; label: string; Icon: LucideIcon;
  color: string; path: string; special?: boolean
}[] = [
  { id: 'home',             label: 'Home',             Icon: Home,           color: '#a78bfa', path: '/(app)/dashboard'        },
  { id: 'library',          label: 'Library',          Icon: BookOpen,       color: '#60a5fa', path: '/(app)/library'          },
  { id: 'create-story',     label: 'Create Story',     Icon: Sparkles,       color: '#c084fc', path: '/(app)/generate',  special: true },
  { id: 'community',        label: 'Community',        Icon: Globe,          color: '#34d399', path: '/(app)/community'        },
  { id: 'rewards',          label: 'Rewards',          Icon: Trophy,         color: '#fbbf24', path: '/(app)/rewards'          },
  { id: 'spelling',         label: 'Spelling Arena',   Icon: Type,           color: '#4ade80', path: '/(app)/spell'            },
  { id: 'games',            label: 'Games Arcade',     Icon: Gamepad2,       color: '#f87171', path: '/(app)/games'            },
  { id: 'leaderboard',      label: 'Leaderboard',      Icon: BarChart2,      color: '#fb923c', path: '/(app)/leaderboard'      },
  { id: 'exams',            label: 'Exams',            Icon: ClipboardList,  color: '#a78bfa', path: '/(app)/exams'            },
  { id: 'scores',           label: 'Scores',           Icon: TrendingUp,     color: '#38bdf8', path: '/(app)/scores'           },
  { id: 'recordings',       label: 'Recordings',       Icon: Mic2,           color: '#f472b6', path: '/(app)/recordings'       },
  { id: 'profile',          label: 'Manage Kids',      Icon: Users,          color: '#34d399', path: '/(app)/add-kid'          },
  { id: 'parent-dashboard', label: 'Parent Dashboard', Icon: LayoutDashboard,color: '#c084fc', path: '/(app)/parent-dashboard' },
  { id: 'assignments',      label: 'Assignments',      Icon: BookMarked,     color: '#4ade80', path: '/(app)/assignments'      },
  { id: 'quest',            label: 'Quest Mode',       Icon: Sword,          color: '#f87171', path: '/(app)/quest'            },
  { id: 'admin',            label: 'Admin',            Icon: Settings,       color: '#94a3b8', path: '/(app)/admin'            },
]

// ── Single tab item ───────────────────────────────────────────────────────────
interface TabItemProps {
  config: (typeof TAB_CONFIG)[0]
  isActive: boolean
  onPress: () => void
}

function TabItem({ config, isActive, onPress }: TabItemProps) {
  const scaleAnim   = useRef(new Animated.Value(1)).current
  const opacityAnim = useRef(new Animated.Value(isActive ? 1 : 0.45)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim,   { toValue: isActive ? 1.06 : 1,  useNativeDriver: true, tension: 70, friction: 7 }),
      Animated.timing(opacityAnim, { toValue: isActive ? 1 : 0.45,  duration: 200, useNativeDriver: true }),
    ]).start()
  }, [isActive])

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.84, useNativeDriver: true, tension: 300, friction: 5 }),
      Animated.spring(scaleAnim, { toValue: isActive ? 1.06 : 1, useNativeDriver: true, tension: 80, friction: 6 }),
    ]).start()
    onPress()
  }

  const { Icon, color } = config

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      style={styles.tabItem}
      accessibilityRole="tab"
      accessibilityLabel={config.label}
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
        {isActive && (
          <LinearGradient
            colors={['rgba(149,0,255,0.55)', 'rgba(91,0,181,0.45)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.activeGradient}
          />
        )}
        {isActive && <View style={styles.activeGlowRing} />}
        <Icon
          size={20}
          color={isActive ? '#fff' : color}
          strokeWidth={isActive ? 2.5 : 2}
          style={{ marginBottom: 3, zIndex: 2 }}
        />
        <Animated.Text style={[styles.label, isActive && styles.labelActive]}>
          {config.label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  )
}

// ── Full-route drawer ─────────────────────────────────────────────────────────
function NavDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter()
  const slideAnim       = useRef(new Animated.Value(600)).current
  const backdropOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim,       { toValue: 0,   useNativeDriver: true, tension: 70, friction: 9 }),
        Animated.timing(backdropOpacity, { toValue: 1,   duration: 200, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim,       { toValue: 600, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0,   duration: 220, useNativeDriver: true }),
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
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[drawerStyles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[drawerStyles.panel, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={['#120b2e', '#0d0a23']} style={drawerStyles.panelGradient}>
          <View style={drawerStyles.handle} />

          <View style={drawerStyles.header}>
            <View>
              <Text style={drawerStyles.headerTitle}>ReadQuest</Text>
              <Text style={drawerStyles.headerSub}>The Weightless Archive</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={drawerStyles.closeBtn} accessibilityLabel="Close menu">
              <Text style={drawerStyles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={drawerStyles.scroll} contentContainerStyle={drawerStyles.grid} showsVerticalScrollIndicator={false}>
            {DRAWER_LINKS.map(link => {
              const { Icon, color } = link
              return (
                <TouchableOpacity
                  key={link.id}
                  style={[drawerStyles.navItem, link.special && drawerStyles.navItemSpecial]}
                  onPress={() => goTo(link.path)}
                  activeOpacity={0.75}
                >
                  {link.special && (
                    <LinearGradient
                      colors={['rgba(149,0,255,0.22)', 'rgba(91,0,181,0.12)']}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <View style={[drawerStyles.iconWrap, { backgroundColor: `${color}22`, borderColor: `${color}44` }]}>
                    <Icon size={16} color={color} strokeWidth={2} />
                  </View>
                  <Text style={[drawerStyles.navLabel, link.special && drawerStyles.navLabelSpecial]} numberOfLines={1}>
                    {link.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          <View style={drawerStyles.signOutWrapper}>
            <TouchableOpacity style={drawerStyles.signOut} onPress={handleLogout} activeOpacity={0.8}>
              <View style={[drawerStyles.iconWrap, { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)' }]}>
                <LogOut size={16} color="#f87171" strokeWidth={2} />
              </View>
              <Text style={drawerStyles.signOutText}>Sign Out</Text>
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
        <View style={styles.ambientGlow} />

        <View style={styles.bar}>
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
            <View style={[styles.tabInner, { opacity: 0.5 }]}>
              <Grid3x3 size={20} color="#a78bfa" strokeWidth={2} style={{ marginBottom: 3 }} />
              <Text style={styles.label}>More</Text>
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
    bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: BOTTOM_INSET,
  },
  ambientGlow: {
    position: 'absolute',
    bottom: BOTTOM_INSET - 8, left: 20, right: 20,
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
    backgroundColor: 'rgba(13, 10, 35, 0.97)',
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
    bottom: 0, left: 0, right: 0,
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
    width: 40, height: 4,
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
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#e0d4ff', letterSpacing: 0.4 },
  headerSub: { fontSize: 12, color: 'rgba(180, 160, 255, 0.55)', marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(130, 80, 255, 0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: '#c9b8ff', fontSize: 16, fontWeight: '700' },
  scroll: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 12 },
  navItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 13,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(203, 151, 255, 0.1)',
    overflow: 'hidden',
  },
  navItemSpecial: { borderColor: 'rgba(203, 151, 255, 0.35)' },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, flexShrink: 0,
  },
  navLabel: { fontSize: 12, fontWeight: '600', color: '#c9b8ff', flex: 1 },
  navLabelSpecial: { color: '#e8d7ff', fontWeight: '800' },
  signOutWrapper: { paddingBottom: Platform.OS === 'ios' ? 28 : 14 },
  signOut: {
    marginTop: 8, marginBottom: 8,
    paddingVertical: 13, paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 80, 80, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 100, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#f87171', letterSpacing: 0.3 },
})
