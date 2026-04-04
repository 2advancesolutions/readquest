/**
 * Spelling Scores Styles — React Native
 * Mirrors frontend/src/styles/spelling-scores.css
 * (Leaderboard-style screen for spelling game results)
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

export const spellingScoresStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0718' },
  scrollContent: { paddingBottom: 80 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 99 },
  backBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: 'rgba(204,195,216,0.8)' },
  titleWrap: { alignItems: 'center', flex: 1 },
  title: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 22, color: '#e9e3f5', letterSpacing: -0.44 },
  subtitle: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: 'rgba(204,195,216,0.45)', marginTop: 2 },

  // Personal best card (wrap in LinearGradient)
  pbCard: { borderRadius: radii.xl, padding: spacing.lg, marginHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.md, gap: spacing.sm, overflow: 'hidden', ...shadows.purpleLg },
  pbLabel: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.77, color: 'rgba(255,255,255,0.8)' },
  pbScore: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 56, color: colors.white, letterSpacing: -2.24, lineHeight: 60 },
  pbSub: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: 'rgba(255,255,255,0.8)' },

  // Stats row
  statsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)', borderRadius: radii.lg, padding: 14, alignItems: 'center', gap: 4, ...shadows.nbSm },
  statValue: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 22, color: '#e9e3f5', letterSpacing: -0.88 },
  statLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, color: 'rgba(204,195,216,0.45)', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },

  // Filters
  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.md, flexWrap: 'wrap' },
  filterPill: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' },
  filterPillActive: { borderColor: 'transparent', ...shadows.purple },
  filterPillText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: 'rgba(204,195,216,0.65)' },
  filterPillTextActive: { color: colors.white },

  // Score entries list
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.065)', borderRadius: 16, paddingVertical: 13, paddingHorizontal: spacing.md, marginHorizontal: spacing.md, marginBottom: 6 },
  entryRank: { width: 36, alignItems: 'center', flexShrink: 0 },
  entryRankText: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 16, color: 'rgba(204,195,216,0.5)' },
  entryRankTop: { color: '#fbbf24' },
  entryInfo: { flex: 1, minWidth: 0 },
  entryWord: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: '#f0eaff' },
  entryDate: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: 'rgba(204,195,216,0.4)', marginTop: 2 },
  entryMeta: { flexDirection: 'row', gap: 8, marginTop: 3 },
  entryMetaText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: 'rgba(204,195,216,0.45)' },
  entryScore: { alignItems: 'flex-end', flexShrink: 0 },
  entryScoreNum: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 20, color: '#fbbf24', letterSpacing: -0.8 },
  entryScoreLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: 'rgba(245,158,11,0.5)', textTransform: 'uppercase', letterSpacing: 0.6 },
  entryCorrect: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99, backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)' },
  entryCorrectText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#22c55e' },

  // Grade section headers
  sectionHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  sectionTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: 'rgba(192,132,252,0.6)', textTransform: 'uppercase', letterSpacing: 0.7 },

  // Empty / loading
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.md },
  emptyEmoji: { fontSize: 52 },
  emptyText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: 'rgba(204,195,216,0.35)', textAlign: 'center' },
  spinner: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'rgba(112,42,225,0.18)', borderTopColor: '#8b5cf6' },
});
