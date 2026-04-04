/**
 * app/index.tsx — Root redirect.
 *
 * - Authenticated users  → go straight to dashboard
 * - Guests               → go to the landing/marketing page
 */
import { Redirect } from 'expo-router'
import { useAuth } from './_layout'

export default function Index() {
  const { session } = useAuth()
  return <Redirect href={session ? '/(app)/dashboard' : '/(auth)/landing'} />
}
