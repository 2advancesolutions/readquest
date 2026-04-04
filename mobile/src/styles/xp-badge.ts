/**
 * XP & Level Badge Styles — React Native
 * Mirrors frontend/src/styles/xp-badge.css (global floating badge)
 */
import { StyleSheet } from 'react-native';
import { colors, shadows } from './tokens';

export const xpBadgeStyles = StyleSheet.create({
  // Floating badge
  container: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(12,5,32,0.88)', borderWidth: 1, borderColor: 'rgba(255,215,9,0.25)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, ...shadows.gold },
  icon: { fontSize: 16 },
  xpText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#ffd709' },
  levelText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: 'rgba(255,215,9,0.6)' },

  // Popup toast
  popup: { position: 'absolute', backgroundColor: 'rgba(12,5,32,0.95)', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', gap: 2, borderWidth: 1, borderColor: 'rgba(255,215,9,0.25)', ...shadows.gold },
  popupTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#ffd709' },
  popupSub: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: 'rgba(255,215,9,0.7)' },
  levelUpTitle: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 18, color: colors.white, letterSpacing: -0.36 },
  levelUpSub: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: 'rgba(204,195,216,0.7)' },
});
