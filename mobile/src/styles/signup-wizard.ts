/**
 * Signup Wizard Styles — React Native
 * Mirrors frontend/src/styles/signup-wizard.css
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

export const signupWizardStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Step indicator
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md },
  step: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceHighest },
  stepActive: { width: 24, backgroundColor: colors.purple, ...shadows.purple },
  stepDone: { backgroundColor: colors.purple, opacity: 0.5 },

  // Step content
  stepContent: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg },
  stepTitle: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 26, color: colors.text, letterSpacing: -0.78, marginBottom: 4 },
  stepSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, color: colors.textMuted, lineHeight: 23 },

  // Role select cards
  roleGrid: { gap: spacing.sm },
  roleCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md + 4, borderRadius: radii.lg, backgroundColor: colors.surfaceLow, borderWidth: 2, borderColor: colors.surfaceHighest },
  roleCardActive: { borderColor: colors.purple, backgroundColor: colors.cardAlt, ...shadows.sm },
  roleEmoji: { fontSize: 36, flexShrink: 0 },
  roleInfo: { flex: 1 },
  roleName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: colors.text, marginBottom: 2 },
  roleDesc: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  roleCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.surfaceHighest, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  roleCheckActive: { borderColor: colors.purple, backgroundColor: colors.purple },
  roleCheckText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11, color: colors.white },

  // Form inputs
  label: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.72, marginBottom: 6 },
  input: { backgroundColor: colors.surfaceHighest, borderRadius: radii.md, paddingVertical: 13, paddingHorizontal: spacing.md, color: colors.text, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, borderWidth: 2, borderColor: colors.surfaceHighest },
  inputFocused: { borderColor: 'rgba(178,140,255,0.4)', backgroundColor: colors.card },

  // Grade picker
  gradeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gradeChip: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: radii.full, borderWidth: 1.5, borderColor: colors.surfaceHighest, backgroundColor: colors.surfaceLow },
  gradeChipActive: { borderColor: colors.purple, backgroundColor: colors.cardAlt, ...shadows.sm },
  gradeChipText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: colors.textMuted },
  gradeChipTextActive: { color: colors.purple },

  // Navigation row
  navRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.lg + spacing.sm },
  prevBtn: { flex: 1, paddingVertical: 14, borderRadius: radii.full, alignItems: 'center', backgroundColor: colors.surfaceLow, borderWidth: 1.5, borderColor: colors.surfaceHighest },
  prevBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: colors.textMuted },
  nextBtn: { flex: 2, paddingVertical: 14, borderRadius: radii.full, alignItems: 'center', ...shadows.purple },
  nextBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: colors.white },
  nextBtnDisabled: { opacity: 0.5 },

  // Final summary
  summaryCard: { backgroundColor: colors.cardAlt, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm, borderWidth: 1.5, borderColor: 'rgba(178,140,255,0.2)' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surfaceHighest },
  summaryLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: colors.textMuted },
  summaryValue: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: colors.text },
});
