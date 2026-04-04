/**
 * useDeviceLayout — React Native-native adaptive layout hook.
 *
 * Replaces ALL CSS @media queries in the app. Every screen uses this
 * hook to conditionally render phone vs. tablet layouts.
 *
 * - Reactive: updates on rotation / window resize (web)
 * - Safe on all platforms: iOS, Android, Web
 */
import { useWindowDimensions, Platform } from 'react-native'

export interface DeviceLayout {
  /** Current window width in density-independent pixels */
  width: number
  /** Current window height in density-independent pixels */
  height: number
  /** true when width >= 768 (iPad / large Android tablet) */
  isTablet: boolean
  /** true when width < 768 (phone / small device) */
  isPhone: boolean
  /** true when width > height */
  isLandscape: boolean
  /** true when height >= width */
  isPortrait: boolean
  /** true on iOS */
  isIOS: boolean
  /** true on Android */
  isAndroid: boolean
  /** true when running in a web browser via Expo web */
  isWeb: boolean
  /** true on iPad specifically (isIOS + isTablet) */
  isIPad: boolean
}

export function useDeviceLayout(): DeviceLayout {
  const { width, height } = useWindowDimensions() // reactive — updates on rotation

  const isTablet    = width >= 768
  const isPhone     = width < 768
  const isLandscape = width > height
  const isPortrait  = height >= width
  const isIOS       = Platform.OS === 'ios'
  const isAndroid   = Platform.OS === 'android'
  const isWeb       = Platform.OS === 'web'
  const isIPad      = isIOS && isTablet

  return {
    width,
    height,
    isTablet,
    isPhone,
    isLandscape,
    isPortrait,
    isIOS,
    isAndroid,
    isWeb,
    isIPad,
  }
}
