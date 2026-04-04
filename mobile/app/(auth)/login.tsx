/**
 * Login screen — converted from web Login.tsx
 * 
 * Adaptive layout:
 * - Phone: full-screen centered card
 * - Tablet: card centered with max-width constraint, more breathing room
 */
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native'
import { Link, router } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { useDeviceLayout } from '../../src/hooks/useDeviceLayout'

export default function LoginScreen() {
  const { isTablet } = useDeviceLayout()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        setError(error.message)
      } else {
        router.replace('/(app)/dashboard')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-nb-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className={`flex-1 items-center justify-center px-6 py-12 ${isTablet ? 'py-20' : ''}`}>

          {/* Logo / Brand */}
          <View className="mb-10 items-center">
            <Text className="text-5xl mb-3">📖</Text>
            <Text className="text-white text-4xl font-bold tracking-tight">ReadQuest</Text>
            <Text className="text-rq-text-muted text-base mt-1">Sign in to continue your adventure</Text>
          </View>

          {/* Card */}
          <View
            className="w-full rounded-rq-xl bg-nb-card p-8"
            style={{ maxWidth: isTablet ? 440 : 9999 }}
          >
            <Text className="text-white text-2xl font-bold mb-6">Welcome back</Text>

            {/* Error */}
            {!!error && (
              <View className="bg-rq-coral/10 border border-rq-coral rounded-rq-md p-3 mb-4">
                <Text className="text-rq-coral text-sm">{error}</Text>
              </View>
            )}

            {/* Email */}
            <View className="mb-4">
              <Text className="text-rq-text-muted text-sm font-semibold mb-2">Email</Text>
              <TextInput
                className="bg-nb-surface text-white rounded-rq-md px-4 py-3 text-base"
                placeholder="your@email.com"
                placeholderTextColor="#69537B"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View className="mb-6">
              <Text className="text-rq-text-muted text-sm font-semibold mb-2">Password</Text>
              <TextInput
                className="bg-nb-surface text-white rounded-rq-md px-4 py-3 text-base"
                placeholder="••••••••"
                placeholderTextColor="#69537B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              className="bg-rq-purple rounded-rq-md py-4 items-center"
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#F8F0FF" />
                : <Text className="text-rq-on-primary font-bold text-base">Sign In</Text>
              }
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View className="flex-row justify-center mt-5">
              <Text className="text-rq-text-muted text-sm">Don't have an account? </Text>
              <Link href="/(auth)/signup">
                <Text className="text-rq-purple-light font-semibold text-sm">Create one</Text>
              </Link>
            </View>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
