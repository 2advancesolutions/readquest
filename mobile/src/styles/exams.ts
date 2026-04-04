/**
 * Exams Styles — React Native
 * Mirrors frontend/src/styles/exams.css (Night-Bloom Design System)
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

export const examStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0718' },
  scrollContent: { paddingBottom: 64 },

  // Nav
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: spacing.lg, backgroundColor: 'rgba(11,7,24,0.85)', borderBottomWidth: 1, borderBottomColor: 'rgba(150,100,255,0.12)' },
  navBack: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 99 },
  navBackText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: 'rgba(204,195,216,0.8)' },
  navTab: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 99 },
  navTabText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: 'rgba(204,195,216,0.8)' },
  navTabActive: { backgroundColor: 'rgba(192,132,252,0.2)', borderColor: 'rgba(192,132,252,0.5)' },
  navTabTextActive: { color: '#c084fc' },

  // Voice tutorial button
  voiceBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(192,132,252,0.12)', borderWidth: 1, borderColor: 'rgba(192,132,252,0.25)', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 99 },
  voiceBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#c084fc' },
  voiceDot: { width: 8, height: 8, backgroundColor: '#c084fc', borderRadius: 4 },

  // Hub
  hub: { paddingHorizontal: spacing.lg, paddingTop: 48, paddingBottom: 0 },
  hubHero: { alignItems: 'center', marginBottom: 44 },
  hubBadge: { backgroundColor: 'rgba(112,42,225,0.18)', borderWidth: 1, borderColor: 'rgba(150,100,255,0.3)', paddingVertical: 6, paddingHorizontal: 20, borderRadius: 99, marginBottom: 18 },
  hubBadgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: '#c084fc' },
  hubTitle: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 32, color: colors.nbText, lineHeight: 36, letterSpacing: -0.64, textAlign: 'center', marginBottom: 12 },
  hubSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 16, color: 'rgba(204,195,216,0.62)', lineHeight: 26, textAlign: 'center' },

  // Readiness banner
  readinessBanner: { backgroundColor: 'rgba(112,42,225,0.12)', borderWidth: 1, borderColor: 'rgba(112,42,225,0.25)', borderRadius: 20, paddingVertical: 22, paddingHorizontal: 28, marginBottom: 40, flexDirection: 'row', alignItems: 'center', gap: 18 },
  readinessBannerReady: { backgroundColor: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.35)' },
  readinessIcon: { fontSize: 38, flexShrink: 0 },
  readinessInfo: { flex: 1 },
  readinessLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#e9e3f5', marginBottom: 10 },
  readinessBarWrap: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 7 },
  readinessBar: { height: '100%', borderRadius: 99 },
  readinessMeta: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, color: 'rgba(204,195,216,0.55)' },
  readyBadge: { paddingVertical: 9, paddingHorizontal: 22, borderRadius: 99, flexShrink: 0 },
  readyBadgeText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: '#0a200d' },

  // Section card
  sectionCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(150,100,255,0.13)', borderRadius: 22, padding: 28, marginBottom: 18, overflow: 'hidden' },
  sectionEmoji: { fontSize: 38, marginBottom: 14 },
  sectionName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: '#e9e3f5', marginBottom: 7, letterSpacing: -0.16 },
  sectionDesc: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, color: 'rgba(204,195,216,0.58)', lineHeight: 20, marginBottom: 18 },
  sectionBadges: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  sectionScorePassed: { backgroundColor: 'rgba(74,222,128,0.13)', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 99 },
  sectionScorePassedText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#4ade80' },
  sectionScoreFailed: { backgroundColor: 'rgba(248,113,113,0.13)', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 99 },
  sectionScoreFailedText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#f87171' },
  sectionStartBtn: { borderRadius: 12, paddingVertical: 9, paddingHorizontal: 22, alignItems: 'center' },
  sectionStartBtnText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: colors.white },

  // Generating screen
  generatingContainer: { alignItems: 'center', justifyContent: 'center', gap: 22, padding: spacing.xl, flex: 1 },
  generatingSpinner: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: 'rgba(192,132,252,0.18)', borderTopColor: '#c084fc' },
  generatingTitle: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 24, color: '#e9e3f5', letterSpacing: -0.48, textAlign: 'center' },
  generatingSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, color: 'rgba(204,195,216,0.58)', textAlign: 'center', lineHeight: 26, maxWidth: 380 },
  genEncourage: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#e9e3f5', backgroundColor: 'rgba(112,42,225,0.14)', borderWidth: 1, borderColor: 'rgba(192,132,252,0.22)', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 22, textAlign: 'center', lineHeight: 25, maxWidth: 360 },
  genCharImg: { width: 140, height: 180, resizeMode: 'contain' },
  genCharName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, letterSpacing: 0.52, textTransform: 'uppercase', color: 'rgba(192,132,252,0.9)', textAlign: 'center' },

  // Exam test header
  testRoot: { flex: 1, backgroundColor: '#080614' },
  testHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 28, backgroundColor: 'rgba(8,6,20,0.9)', borderBottomWidth: 1, borderBottomColor: 'rgba(150,100,255,0.12)', gap: spacing.md },
  sectionLabel: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#c084fc', letterSpacing: -0.15 },
  questionCounter: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: 'rgba(192,132,252,0.7)' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', borderRadius: 12, paddingVertical: 7, paddingHorizontal: 16 },
  timerText: { fontFamily: 'Courier', fontSize: 18, fontWeight: '800', color: '#e9e3f5' },
  timerWarning: { backgroundColor: 'rgba(251,191,36,0.07)', borderColor: 'rgba(251,191,36,0.3)' },
  timerWarningText: { color: '#fbbf24' },
  timerDanger: { backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.35)' },
  timerDangerText: { color: '#f87171' },

  // Progress
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.06)' },
  progressFill: { height: '100%' },

  // Test body
  testBody: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: 36 },
  questionCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(150,100,255,0.15)', borderRadius: 22, padding: 30, marginBottom: 24 },
  qMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22, flexWrap: 'wrap' },
  qNum: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 13, color: colors.white, paddingVertical: 4, paddingHorizontal: 14, borderRadius: 99, ...shadows.purple },
  qStrand: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: 'rgba(192,132,252,0.6)', textTransform: 'uppercase', letterSpacing: 0.96 },
  qTypeBadge: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.1)', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99 },
  qDiffEasy: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#4ade80', backgroundColor: 'rgba(74,222,128,0.11)', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99 },
  qDiffMedium: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.11)', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99 },
  qDiffHard: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#f87171', backgroundColor: 'rgba(248,113,113,0.11)', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99 },

  passage: { backgroundColor: 'rgba(112,42,225,0.07)', borderLeftWidth: 3, borderLeftColor: 'rgba(192,132,252,0.45)', borderRadius: 14, padding: 18, marginBottom: 22 },
  passageText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, lineHeight: 27, color: 'rgba(204,195,216,0.82)', fontStyle: 'italic' },
  qText: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 17, lineHeight: 28, color: '#e9e3f5', marginBottom: 24 },

  choices: { gap: 11 },
  choice: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 2, borderColor: 'rgba(150,100,255,0.12)', borderRadius: 15, paddingVertical: 15, paddingHorizontal: 18 },
  choiceSelected: { backgroundColor: 'rgba(112,42,225,0.2)', borderColor: '#702ae1' },
  choiceLetter: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 2, borderColor: 'rgba(150,100,255,0.2)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  choiceLetterText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#c084fc' },
  choiceLetterSelected: { backgroundColor: '#702ae1', borderColor: '#702ae1' },
  choiceLetterSelectedText: { color: colors.white },
  choiceText: { flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, lineHeight: 23, color: 'rgba(204,195,216,0.9)', paddingTop: 4 },

  // Nav row
  testNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  navPrev: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, paddingHorizontal: 22, borderRadius: 99 },
  navPrevText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: 'rgba(204,195,216,0.7)' },
  navNext: { borderRadius: 99, paddingVertical: 12, paddingHorizontal: 28, ...shadows.purple },
  navNextText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: colors.white },

  // History rows (replacing table)
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  historyText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: '#e9e3f5' },
  resultPass: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#4ade80', backgroundColor: 'rgba(74,222,128,0.13)', paddingVertical: 3, paddingHorizontal: 12, borderRadius: 99, overflow: 'hidden' },
  resultFail: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#f87171', backgroundColor: 'rgba(248,113,113,0.13)', paddingVertical: 3, paddingHorizontal: 12, borderRadius: 99, overflow: 'hidden' },
  tableActionBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 5, paddingHorizontal: 14, borderRadius: 9 },
  tableActionBtnText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: 'rgba(204,195,216,0.7)' },
});
