/**
 * DesktopSidebar.tsx — Night-Bloom glassmorphic sidebar for Expo Web (desktop).
 *
 * Shown only when Platform.OS === 'web' and width >= 1024px.
 * Mirrors the frontend's dash-sidebar design:
 *   - Sticky dark glass panel on the left
 *   - ReadQuest logo + subtitle
 *   - Nav links with active highlight
 *   - Featured gradient CTA buttons (Generate Story, Movie Studio)
 *   - Sign Out at the bottom
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

// ── Nav links ─────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: 'Home',              emoji: '🏠',  path: '/(app)/dashboard'        },
  { label: 'Community',         emoji: '🌍',  path: '/(app)/community'        },
  { label: 'Library',           emoji: '📚',  path: '/(app)/library'          },
  { label: 'Rewards',           emoji: '🏆',  path: '/(app)/rewards'          },
  { label: 'Spelling Arena',    emoji: '🔤',  path: '/(app)/spell'            },
  { label: 'Games Arcade',      emoji: '🎮',  path: '/(app)/games'            },
  { label: 'Leaderboard',       emoji: '🥇',  path: '/(app)/leaderboard'      },
  { label: 'Exams',             emoji: '📝',  path: '/(app)/exams'            },
  { label: 'Scores',            emoji: '📊',  path: '/(app)/scores'           },
  { label: 'Recordings',        emoji: '🎙️', path: '/(app)/recordings'       },
  { label: 'Profile / Kids',    emoji: '👨‍👧',  path: '/(app)/add-kid'          },
  { label: 'Parent Dashboard',  emoji: '👪',  path: '/(app)/parent-dashboard' },
  { label: 'Character Studio',  emoji: '🎨',  path: '/(app)/character-studio' },
  { label: 'Admin',             emoji: '⚙️',  path: '/(app)/admin'            },
]

// ── NavLink ───────────────────────────────────────────────────────────────────
function NavLink({ label, emoji, path, active }: {
  label: string; emoji: string; path: string; active: boolean
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
      <Text style={styles.navEmoji}>{emoji}</Text>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
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
            emoji={link.emoji}
            path={link.path}
            active={pathname === link.path.replace('/(app)', '') || pathname.startsWith(link.path.replace('/(app)', '') + '/')}
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
            colors={['rgba(112,42,225,0.88)', 'rgba(139,92,246,0.75)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.featuredBtn}
          >
            <Text style={styles.featuredEmoji}>✨</Text>
            <View>
              <Text style={styles.featuredLabel}>Generate Story</Text>
              <Text style={styles.featuredSub}>AI-powered tales</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Featured: Movie Studio */}
        <TouchableOpacity
          onPress={() => router.push('/(app)/movie-studio' as any)}
          activeOpacity={0.85}
          style={styles.featuredWrap}
        >
          <LinearGradient
            colors={['rgba(180,100,0,0.82)', 'rgba(234,179,8,0.72)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.featuredBtn}
          >
            <Text style={styles.featuredEmoji}>🎬</Text>
            <View>
              <Text style={styles.featuredLabel}>Movie Studio</Text>
              <Text style={styles.featuredSub}>Create your film</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom — sign out */}
      <TouchableOpacity onPress={handleLogout} activeOpacity={0.75} style={styles.signOut}>
        <Text style={styles.signOutEmoji}>👋</Text>
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
    position: 'absolute',
    top: -120,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'transparent',
    // @ts-ignore web
    boxShadow: '0 0 0 0 transparent',
    shadowColor: 'rgba(124,58,237,0.25)',
    shadowRadius: 80,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    pointerEvents: 'none',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -60,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    shadowColor: 'rgba(236,72,153,0.15)',
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    pointerEvents: 'none',
  },
  logo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#e9ddff',
    letterSpacing: -0.5,
    marginBottom: 2,
    paddingHorizontal: 10,
  },
  logoSub: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(192,132,252,0.5)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    marginBottom: 28,
  },
  scrollArea: {
    flex: 1,
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 9999,
    marginBottom: 2,
  },
  navLinkActive: {
    backgroundColor: 'rgba(124,58,237,0.22)',
  },
  navLinkHover: {
    backgroundColor: 'rgba(124,58,237,0.13)',
  },
  navEmoji: {
    fontSize: 16,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(204,195,216,0.65)',
    flex: 1,
  },
  navLabelActive: {
    color: '#c084fc',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150,110,255,0.12)',
    marginVertical: 12,
    marginHorizontal: 14,
  },
  featuredWrap: {
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  featuredEmoji: {
    fontSize: 22,
  },
  featuredLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: -0.2,
  },
  featuredSub: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 9999,
    marginTop: 8,
  },
  signOutEmoji: {
    fontSize: 16,
  },
  signOutLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(204,195,216,0.5)',
  },
})
