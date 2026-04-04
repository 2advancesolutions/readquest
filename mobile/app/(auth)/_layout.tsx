/**
 * (auth)/_layout.tsx — Public auth route group.
 *
 * Logged-in users visiting these screens are redirected to dashboard.
 */
import { Stack } from 'expo-router'
import { useAuth } from '../_layout'
import { Redirect } from 'expo-router'

export default function AuthLayout() {
  const { session } = useAuth()
  if (session) return <Redirect href="/(app)/dashboard" />

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login"  options={{ animation: 'fade' }} />
      <Stack.Screen name="signup" options={{ animation: 'slide_from_right' }} />
    </Stack>
  )
}
