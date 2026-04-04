/**
 * Comprehension / Quiz Result Styles — React Native
 * Mirrors frontend/src/styles/comprehension.css
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

export const comprehensionStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 80 },

  // Header
  headerBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: spacing.md, backgroundColor: '#0d0720' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(178,140,255,0.12)', borderWidth: 1, borderColor: 'rgba(178,140,255,0.2)', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  backBtnText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: '#edd3ff' },
  headerTitle: { flex: 1, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: '#ffd709', textAlign: 'center', letterSpacing: -0.16 },

  // Score card
  scoreCard: { backgroundColor: colors.white, borderRadius: 24, padding: spacing.xl, marginHorizontal: spacing.md, marginVertical: spacing.lg, alignItems: 'center', gap: spacing.md, ...shadows.lg },
  scoreEmoji: { fontSize: 64 },
  scoreTitle: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 26, color: colors.text, letterSpacing: -0.52, textAlign: 'center' },
  scoreSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  scoreBig: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 72, color: colors.purple, letterSpacing: -2.88, lineHeight: 76 },
  scoreUnit: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: colors.textMuted },
  scoreBar: { width: '100%', height: 8, backgroundColor: colors.surfaceHighest, borderRadius: 99, overflow: 'hidden', marginTop: spacing.sm },
  scoreBarFill: { height: '100%', borderRadius: 99 },

  // Result breakdown
  breakdown: { paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.lg },
  breakdownTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.56, paddingHorizontal: 4, marginBottom: 4 },
  breakdownItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.surfaceHighest },
  itemNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemNumText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: colors.white },
  itemNumCorrect: { backgroundColor: '#22c55e' },
  itemNumWrong: { backgroundColor: '#ef4444' },
  itemNumSkipped: { backgroundColor: colors.textLight },
  itemBody: { flex: 1, minWidth: 0 },
  itemQuestion: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 4 },
  itemAnswer: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  itemAnswerCorrect: { color: '#15803d' },
  itemAnswerWrong: { color: '#b91c1c' },

  // Explanation
  explanation: { padding: 10, marginTop: 6, borderRadius: 10, backgroundColor: '#fef3ff', borderWidth: 1, borderColor: '#edd3ff' },
  explanationText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: '#69537b', lineHeight: 18 },

  // Return button (wrap in LinearGradient)
  returnBtn: { marginHorizontal: spacing.md, paddingVertical: 14, borderRadius: radii.full, alignItems: 'center', ...shadows.purple },
  returnBtnText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: colors.white },

  // Excellent / Perfect star
  starRow: { flexDirection: 'row', gap: spacing.sm },
  star: { fontSize: 30, color: '#ffd709' },
  starDim: { color: colors.surfaceHighest },

  // Word accuracy section
  wordAccuracyTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.56, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  wordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.md },
  wordChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  wordChipCorrect: { backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#22c55e' },
  wordChipCorrectText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#15803d' },
  wordChipWrong: { backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#ef4444' },
  wordChipWrongText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#b91c1c' },
});
