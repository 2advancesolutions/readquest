/**
 * DesktopSidebar.tsx — Night-Bloom glassmorphic sidebar for Expo Web (desktop).
 *
 * Icons: Lucide React Native — crisp vector icons with color-coded square badges.
 */
import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { supabase } from '../lib/supabase'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Home,
  Globe,
  BookOpen,
  Trophy,
  Type,
  Gamepad2,
  BarChart2,
  ClipboardList,
  TrendingUp,
  Mic2,
  Users,
  LayoutDashboard,
  Settings,
  LogOut,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native'

// ── Nav links ─────────────────────────────────────────────────────────────────
const NAV_LINKS: { label: string; Icon: LucideIcon; color: string; path: string }[] = [
  { label: 'Home',              Icon: Home,            color: '#a78bfa', path: '/(app)/dashboard'        },
  { label: 'Community',         Icon: Globe,           color: '#34d399', path: '/(app)/community'        },
  { label: 'Library',           Icon: BookOpen,        color: '#60a5fa', path: '/(app)/library'          },
  { label: 'Rewards',           Icon: Trophy,          color: '#fbbf24', path: '/(app)/rewards'          },
  { label: 'Spelling Arena',    Icon: Type,            color: '#4ade80', path: '/(app)/spell'            },
  { label: 'Games Arcade',      Icon: Gamepad2,        color: '#f87171', path: '/(app)/games'            },
  { label: 'Leaderboard',       Icon: BarChart2,       color: '#fb923c', path: '/(app)/leaderboard'      },
  { label: 'Exams',             Icon: ClipboardList,   color: '#a78bfa', path: '/(app)/exams'            },
  { label: 'Scores',            Icon: TrendingUp,      color: '#38bdf8', path: '/(app)/scores'           },
  { label: 'Recordings',        Icon: Mic2,            color: '#f472b6', path: '/(app)/recordings'       },
  { label: 'Profile / Kids',    Icon: Users,           color: '#34d399', path: '/(app)/add-kid'          },
  { label: 'Parent Dashboard',  Icon: LayoutDashboard, color: '#c084fc', path: '/(app)/parent-dashboard' },
  { label: 'Admin',             Icon: Settings,        color: '#94a3b8', path: '/(app)/admin'            },
]

// ── NavLink ───────────────────────────────────────────────────────────────────
function NavLink({ label, Icon, color, path, active }: {
  label: string; Icon: LucideIcon; color: string; path: string; active: boolean
}) {
  const router = useRouter()
  const [hovered, setHovered] = useState(false)

  return (
    <TouchableOpacity
      onPress={() => router.push(path as any)}
      activeOpacity={0.75}
      // @ts-ignore — web-only hover
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={[
        styles.navLink,
        active  && styles.navLinkActive,
        hovered && !active && styles.navLinkHover,
      ]}
    >
      <View style={[
        styles.iconWrap,
        { backgroundColor: active ? `${color}30` : `${color}18`, borderColor: active ? `${color}55` : `${color}30` },
      ]}>
        <Icon size={15} color={active ? color : `${color}cc`} strokeWidth={active ? 2.5 : 2} />
      </View>
      <Text style={[styles.navLabel, active && { ...styles.navLabelActive, color }]}>{label}</Text>
    </TouchableOpacity>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DesktopSidebar() {
  const router   = useRouter()
  const pathname = usePathname()

  if (Platform.OS !== 'web') return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  return (
    <View style={styles.sidebar}>
      {/* Ambient glow blobs */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      {/* Logo */}
      <TouchableOpacity onPress={() => router.push('/(app)/dashboard' as any)} activeOpacity={0.8}>
        <Text style={styles.logo}>ReadQuest</Text>
        <Text style={styles.logoSub}>The Weightless Archive</Text>
      </TouchableOpacity>

      {/* Scrollable nav */}
      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 2, paddingBottom: 12 }}
      >
        {NAV_LINKS.map(link => (
          <NavLink
            key={link.path}
            label={link.label}
            Icon={link.Icon}
            color={link.color}
            path={link.path}
            active={
              pathname === link.path.replace('/(app)', '') ||
              pathname.startsWith(link.path.replace('/(app)', '') + '/')
            }
          />
        ))}

        {/* Section divider */}
        <View style={styles.divider} />

        {/* Featured: Generate Story */}
        <TouchableOpacity
          onPress={() => router.push('/(app)/generate' as any)}
          activeOpacity={0.85}
          style={styles.featuredWrap}
        >
          <LinearGradient
            colors={['rgba(112,42,225,0.90)', 'rgba(139,92,246,0.78)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.featuredBtn}
          >
            <View style={styles.featuredIconWrap}>
              <Sparkles size={16} color="#fff" strokeWidth={2.5} />
            </View>
            <View>
              <Text style={styles.featuredLabel}>Generate Story</Text>
              <Text style={styles.featuredSub}>AI-powered tales</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>

      {/* Bottom — sign out */}
      <TouchableOpacity onPress={handleLogout} activeOpacity={0.75} style={styles.signOut}>
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.25)' }]}>
          <LogOut size={15} color="#f87171" strokeWidth={2} />
        </View>
        <Text style={styles.signOutLabel}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    flexShrink: 0,
    backgroundColor: 'rgba(12,5,32,0.82)',
    // @ts-ignore web
    backdropFilter: 'blur(24px) saturate(160%)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(150,110,255,0.13)',
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 20,
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    zIndex: 20,
  },
  glowTop: {
    position: 'absolute', top: -120, left: -80,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'transparent',
    shadowColor: 'rgba(124,58,237,0.25)',
    shadowRadius: 80, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1,
    pointerEvents: 'none',
  },
  glowBottom: {
    position: 'absolute', bottom: -60, right: -40,
    width: 260, height: 260, borderRadius: 130,
    shadowColor: 'rgba(236,72,153,0.15)',
    shadowRadius: 60, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1,
    pointerEvents: 'none',
  },
  logo: {
    fontSize: 18, fontWeight: '800', color: '#e9ddff',
    letterSpacing: -0.5, marginBottom: 2, paddingHorizontal: 10,
  },
  logoSub: {
    fontSize: 10, fontWeight: '700', color: 'rgba(192,132,252,0.5)',
    letterSpacing: 1.2, textTransform: 'uppercase',
    paddingHorizontal: 10, marginBottom: 28,
  },
  scrollArea: { flex: 1 },
  navLink: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 12, marginBottom: 1,
  },
  navLinkActive:  { backgroundColor: 'rgba(124,58,237,0.14)' },
  navLinkHover:   { backgroundColor: 'rgba(124,58,237,0.08)' },
  iconWrap: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, flexShrink: 0,
  },
  navLabel: {
    fontSize: 13, fontWeight: '600',
    color: 'rgba(204,195,216,0.60)', flex: 1,
  },
  navLabelActive: {
    fontWeight: '700',
  },
  divider: {
    height: 1, backgroundColor: 'rgba(150,110,255,0.12)',
    marginVertical: 12, marginHorizontal: 6,
  },
  featuredWrap: { marginBottom: 8, borderRadius: 14, overflow: 'hidden' },
  featuredBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14,
  },
  featuredIconWrap: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featuredLabel: {
    fontSize: 13, fontWeight: '800',
    color: 'rgba(255,255,255,0.96)', letterSpacing: -0.2,
  },
  featuredSub: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.55)' },
  signOut: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 10,
    borderRadius: 12, marginTop: 8,
  },
  signOutLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,140,140,0.65)' },
})
