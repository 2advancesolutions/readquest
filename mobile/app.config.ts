import { ExpoConfig, ConfigContext } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ReadQuest',
  slug: 'reginaldbellas',   // matches EAS project — change after renaming on expo.dev
  owner: '2advancesolutions',
  version: '1.0.0',
  orientation: 'default',          // allow portrait + landscape
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic', // respect system dark/light mode
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0d0d1a',
  },
  scheme: 'readquest',             // deep-link scheme
  ios: {
    supportsTablet: true,          // tablet support enabled
    bundleIdentifier: 'com.readquest.app',
    infoPlist: {
      NSMicrophoneUsageDescription: 'ReadQuest uses your microphone for reading fluency practice.',
      NSSpeechRecognitionUsageDescription: 'ReadQuest listens to your reading to give you feedback.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#702AE1',
    },
    package: 'com.readquest.app',
    permissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-video',
    'expo-sqlite',
    [
      'expo-av',
      {
        microphonePermission: 'ReadQuest uses your microphone for reading fluency practice.',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0d0d1a',
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
      },
    ],
  ],
  extra: {
    // Env vars — set in .env at project root, accessed via Constants.expoConfig.extra
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    eas: {
      projectId: '7d8c364d-72b9-494e-997a-afe652d01d1a',
    },
  },
})
