/**
 * Recordings Styles — React Native
 * Mirrors frontend/src/styles/recordings.css
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

export const recordingsStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.nbBg },
  scrollContent: { paddingBottom: 80 },

  // Header
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm, marginBottom: spacing.md },
  backBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: colors.textMuted },
  title: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 26, color: colors.nbText, letterSpacing: -0.78, marginBottom: 4 },
  subtitle: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: 'rgba(204,195,216,0.6)' },

  // Stats pills
  statsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, paddingHorizontal: 18, borderRadius: radii.full, backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)', ...shadows.nbSm },
  statIcon: { fontSize: 21 },
  statVal: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: colors.nbText },
  statLbl: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: 'rgba(204,195,216,0.6)' },

  // Recording card
  card: { backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)', borderRadius: radii.lg, padding: spacing.md, marginHorizontal: spacing.md, marginBottom: spacing.sm, ...shadows.nbSm, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  cardCover: { width: 52, height: 66, borderRadius: radii.sm, overflow: 'hidden', flexShrink: 0, backgroundColor: 'rgba(30,14,70,0.6)' },
  cardCoverImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardCoverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardCoverEmoji: { fontSize: 24 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: colors.nbText, lineHeight: 20, marginBottom: 3 },
  cardMeta: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: 'rgba(204,195,216,0.5)', marginBottom: 4 },
  cardScore: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  scorePill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 99 },
  scorePillText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11 },
  scoreGood: { backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)' },
  scoreGoodText: { color: '#22c55e' },
  scoreAvg: { backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)' },
  scoreAvgText: { color: '#fbbf24' },
  scorePoor: { backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' },
  scorePoorText: { color: '#ef4444' },

  // Audio player
  playerBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  playBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...shadows.purple },
  playBtnText: { fontSize: 16, color: colors.white },
  waveformTrack: { flex: 1, height: 4, backgroundColor: 'rgba(150,110,255,0.2)', borderRadius: 99, overflow: 'hidden' },
  waveformFill: { height: '100%', borderRadius: 99 },
  durationText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: 'rgba(204,195,216,0.5)', flexShrink: 0 },

  // Word chips row
  wordChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  wordChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99 },
  wordChipCorrect: { backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)' },
  wordChipCorrectText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#22c55e' },
  wordChipWrong: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  wordChipWrongText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#f87171' },

  // Actions row
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { flex: 1, paddingVertical: 9, borderRadius: radii.full, borderWidth: 1, alignItems: 'center' },
  actionBtnPrimary: { borderColor: 'rgba(192,132,252,0.3)', backgroundColor: 'rgba(124,58,237,0.1)' },
  actionBtnPrimaryText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#c084fc' },
  actionBtnDanger: { borderColor: 'rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.08)' },
  actionBtnDangerText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#f87171' },

  // Empty state
  empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 20, color: colors.nbText, textAlign: 'center' },
  emptyText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: 'rgba(204,195,216,0.6)', textAlign: 'center' },

  // Section header
  sectionHeader: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  sectionTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: colors.nbText, letterSpacing: -0.32 },
  sectionSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: 'rgba(204,195,216,0.5)', marginTop: 2 },
});
