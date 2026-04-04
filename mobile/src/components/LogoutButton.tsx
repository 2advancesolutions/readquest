/**
 * LogoutButton — Sign out with haptic confirmation (React Native).
 *
 * Replaces the web version's simple onClick handler with:
 * - Expo Haptics for tactile feedback
 * - Alert confirmation dialog (replaces browser confirm())
 * - AsyncStorage clear on logout
 * - Expo Router replace() instead of navigate()
 */
import { TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { supabase } from '../lib/supabase'
import { storage } from '../lib/storage'

interface Props {
  label?: string
  compact?: boolean  // show icon only
}

export default function LogoutButton({ label = 'Sign Out', compact = false }: Props) {
  const [loading, setLoading] = useState(false)

  const handleLogout = () => {
    // Native confirmation dialog (replaces browser confirm())
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
            setLoading(true)
            try {
              // Clear user-specific local data
              await storage.multiRemove([
                'readquest_student_id',
                'readquest_student_xp',
                'readquest_muted',
              ])
              await supabase.auth.signOut()
              router.replace('/(auth)/login')
            } catch {
              // Signout rarely fails — navigate anyway
              router.replace('/(auth)/login')
            } finally {
              setLoading(false)
            }
          },
        },
      ]
    )
  }

  return (
    <TouchableOpacity
      onPress={handleLogout}
      disabled={loading}
      className="flex-row items-center gap-2 px-4 py-2 rounded-rq-md bg-nb-surface"
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#F74B6D" />
      ) : (
        <>
          <Text className="text-rq-coral text-lg">↩️</Text>
          {!compact && <Text className="text-rq-coral font-semibold text-sm">{label}</Text>}
        </>
      )}
    </TouchableOpacity>
  )
}
