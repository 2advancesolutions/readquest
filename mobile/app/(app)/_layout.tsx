/**
 * (app)/_layout.tsx — Protected route group layout.
 *
 * All screens inside (app)/ require authentication.
 * Unauthenticated users are redirected to /login.
 *
 * This layout also renders the global overlays:
 * - XpBadge (top-right XP counter)
 * - LikesBadge (total community likes)
 * - MuteButton (mute AI voice)
 * - Custom BottomTabBar (phone) — hidden on tablet
 *
 * Bottom tab bar designed via Google Stitch "Cosmic Storybook" Night-Bloom:
 * - Floating dark pill with purple ambient glow shadow
 * - Active tab: glowing gradient pill indicator
 * - Animated spring on tab press
 */
import { Redirect, Tabs, usePathname } from 'expo-router'
import { View, Platform, useWindowDimensions, StyleSheet } from 'react-native'
import { useAuth } from '../_layout'
import { useDeviceLayout } from '../../src/hooks/useDeviceLayout'
import XpBadge from '../../src/components/XpBadge'
import LikesBadge from '../../src/components/LikesBadge'
import MuteButton from '../../src/components/MuteButton'
import BottomTabBar from '../../src/components/BottomTabBar'
import DesktopSidebar from '../../src/components/DesktopSidebar'

export default function AppLayout() {
  const { session } = useAuth()
  const { isTablet } = useDeviceLayout()
  const { width } = useWindowDimensions()
  const pathname = usePathname()

  // Show desktop sidebar on web at >= 1024px width
  const isDesktopWeb = Platform.OS === 'web' && width >= 1024

  // Dashboard embeds XP + Likes inline in its header — hide global overlays there
  const isDashboard = pathname === '/dashboard' || pathname === '/(app)/dashboard'

  if (!session) return <Redirect href="/(auth)/login" />

  return (
    <View style={layoutStyles.root}>
      {/* Global overlays — mobile only; desktop uses inline header chips */}
      {!isDashboard && !isDesktopWeb && <XpBadge />}
      {!isDashboard && !isDesktopWeb && <LikesBadge />}
      {!isDesktopWeb && <MuteButton />}


      {/* Desktop sidebar — web only */}
      {isDesktopWeb && <DesktopSidebar />}

      {/* Main content area */}
      <View style={layoutStyles.content}>
        <Tabs
          tabBar={(props) =>
            isDesktopWeb || isTablet ? undefined : <BottomTabBar {...props} />
          }
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
        <Tabs.Screen name="dashboard"   options={{ title: 'Home'      }} />
        <Tabs.Screen name="library"     options={{ title: 'Library'   }} />
        <Tabs.Screen name="generate"    options={{ title: 'Create'    }} />
        <Tabs.Screen name="community"   options={{ title: 'Community' }} />
        <Tabs.Screen name="rewards"     options={{ title: 'Rewards'   }} />
        <Tabs.Screen name="games"       options={{ title: 'Games', href: null }} />

        {/* Hidden screens */}
        <Tabs.Screen name="read/[storyId]"            options={{ href: null }} />
        <Tabs.Screen name="spell"                      options={{ href: null }} />
        <Tabs.Screen name="exams"                      options={{ href: null }} />
        <Tabs.Screen name="spelling-scores"            options={{ href: null }} />
        <Tabs.Screen name="scores"                     options={{ href: null }} />
        <Tabs.Screen name="quest"                      options={{ href: null }} />
        <Tabs.Screen name="assignments"                options={{ href: null }} />
        <Tabs.Screen name="leaderboard"                options={{ href: null }} />
        <Tabs.Screen name="profile"                    options={{ href: null }} />
        <Tabs.Screen name="add-kid"                    options={{ href: null }} />
        <Tabs.Screen name="parent-dashboard"           options={{ href: null }} />
        <Tabs.Screen name="recordings"                 options={{ href: null }} />
        <Tabs.Screen name="recordings/index"           options={{ href: null }} />
        <Tabs.Screen name="recordings/[bookId]/index"  options={{ href: null }} />
        <Tabs.Screen name="recordings/[bookId]/[recordingId]" options={{ href: null }} />
        <Tabs.Screen name="character-studio"           options={{ href: null }} />
        <Tabs.Screen name="movie-studio"               options={{ href: null }} />
        <Tabs.Screen name="admin"                      options={{ href: null }} />
        <Tabs.Screen name="games/[gameId]"             options={{ href: null }} />
        <Tabs.Screen name="gameplay/[gameId]"          options={{ href: null }} />
        </Tabs>
      </View>
    </View>
  )
}

const layoutStyles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0d0d1a',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
})
