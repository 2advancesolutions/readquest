/**
 * Spelling Game Styles — React Native
 * Mirrors frontend/src/styles/spelling.css
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

export const spellingStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0718' },
  scrollContent: { paddingBottom: 80 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(11,7,24,0.9)' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 99 },
  backBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: 'rgba(204,195,216,0.8)' },
  titleWrap: { alignItems: 'center', flex: 1 },
  titleText: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 20, color: '#e9e3f5', letterSpacing: -0.4 },
  subtitle: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: 'rgba(204,195,216,0.5)', marginTop: 2 },

  // HUD — score/lives/timer
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: 12, gap: spacing.sm },
  hudBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1 },
  hudBadgeScore: { backgroundColor: 'rgba(112,42,225,0.15)', borderColor: 'rgba(112,42,225,0.3)' },
  hudBadgeScoreText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#c084fc' },
  hudBadgeLives: { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.25)' },
  hudBadgeLivesText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#f87171' },
  hudBadgeTimer: { backgroundColor: 'rgba(251,191,36,0.12)', borderColor: 'rgba(251,191,36,0.25)' },
  hudBadgeTimerText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#fbbf24' },

  // Question body
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  wordCard: { backgroundColor: 'rgba(20,10,50,0.8)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.2)', borderRadius: radii.xl, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg + spacing.md, alignItems: 'center', gap: spacing.md, width: '100%', ...shadows.nbMd },
  wordText: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 48, color: '#e9e3f5', letterSpacing: -1.92, textAlign: 'center' },
  wordHint: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, color: 'rgba(204,195,216,0.6)', textAlign: 'center', fontStyle: 'italic', lineHeight: 22 },
  playWordBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(192,132,252,0.12)', borderWidth: 1, borderColor: 'rgba(192,132,252,0.25)', paddingVertical: 10, paddingHorizontal: 22, borderRadius: 99 },
  playWordText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#c084fc' },

  // Letter tiles
  letterTiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', width: '100%' },
  letterTile: { width: 52, height: 60, borderRadius: 12, backgroundColor: 'rgba(30,14,70,0.8)', borderWidth: 1.5, borderColor: 'rgba(150,110,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  letterTileText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: 'rgba(204,195,216,0.9)' },
  letterTileFilled: { borderColor: 'rgba(192,132,252,0.5)', backgroundColor: 'rgba(112,42,225,0.2)' },
  letterTileFilledText: { color: '#c084fc' },
  letterTileCorrect: { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.15)' },
  letterTileCorrectText: { color: '#22c55e' },
  letterTileWrong: { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.15)' },
  letterTileWrongText: { color: '#ef4444' },

  // Keyboard
  keyboard: { gap: 8, paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  key: { minWidth: 36, height: 46, borderRadius: 8, backgroundColor: 'rgba(30,14,70,0.8)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  keyText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#e9e3f5' },
  keySpecial: { minWidth: 52 },
  keyDisabled: { opacity: 0.35 },

  // Check / submit
  checkBtn: { borderRadius: 99, paddingVertical: 14, paddingHorizontal: spacing.xl + spacing.md, alignItems: 'center', marginHorizontal: spacing.lg, marginBottom: spacing.sm, ...shadows.purple },
  checkBtnText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: colors.white },
  checkBtnDisabled: { opacity: 0.5 },

  // Result feedback
  resultCorrect: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 12, paddingHorizontal: 18, backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)', borderRadius: radii.md, marginHorizontal: spacing.lg },
  resultCorrectText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#22c55e' },
  resultWrong: { paddingVertical: 12, paddingHorizontal: 18, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: radii.md, marginHorizontal: spacing.lg },
  resultWrongText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#f87171' },
  resultAnswer: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, color: 'rgba(204,195,216,0.6)', marginTop: 4 },

  // Progress bar
  progressRow: { paddingHorizontal: spacing.lg, gap: 6, marginBottom: spacing.sm },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  progressLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: 'rgba(204,195,216,0.5)', textAlign: 'right' },

  // Completion overlay
  completionOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,7,24,0.92)', alignItems: 'center', justifyContent: 'center', gap: spacing.md, zIndex: 200 },
  completionEmoji: { fontSize: 80 },
  completionTitle: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 36, color: '#fbbf24', textAlign: 'center' },
  completionScore: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: 'rgba(204,195,216,0.8)', textAlign: 'center' },
  completionBtn: { borderRadius: 99, paddingVertical: 14, paddingHorizontal: spacing.xl + spacing.md, alignItems: 'center', ...shadows.purple },
  completionBtnText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: colors.white },
});
