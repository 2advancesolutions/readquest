/**
 * Leaderboard Styles — React Native
 * Mirrors frontend/src/styles/leaderboard.css
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

export const lbStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060412' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.md, paddingTop: spacing.lg, flexWrap: 'wrap' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: 99 },
  backBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: 'rgba(204,195,216,0.8)' },
  titleWrap: { alignItems: 'center', flex: 1 },
  title: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 32, letterSpacing: -0.96, lineHeight: 36, textAlign: 'center', color: '#fbbf24' }, // background-clip gradient applied via MaskedView or Text with LinearGradient
  subtitle: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14, color: 'rgba(204,195,216,0.5)', marginTop: 6, letterSpacing: 0.14 },
  refreshBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  // My Rank Banner
  myRank: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap',
    backgroundColor: 'rgba(112,42,225,0.18)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)',
    borderRadius: 18, paddingVertical: 14, paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.md, marginTop: spacing.md, ...shadows.purple,
  },
  myRankLabel: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(192,132,252,0.75)' },
  myRankNum: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 30, color: colors.white, lineHeight: 32 },
  myRankXp: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: '#fbbf24' },
  myRankLevel: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, marginLeft: 'auto', paddingVertical: 3, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  // Podium row
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: spacing.md, marginHorizontal: spacing.md, marginTop: 40, marginBottom: spacing.md, paddingBottom: 4 },
  podium: { alignItems: 'center', gap: 6 },
  podiumCrown: { fontSize: 32, lineHeight: 36, marginBottom: 4 },
  podiumAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)' },
  podiumAvatarLg: { width: 86, height: 86, borderRadius: 43, borderColor: 'rgba(251,191,36,0.6)' },
  podiumMedal: { fontSize: 26, lineHeight: 30 },
  podiumName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: colors.white, textAlign: 'center', maxWidth: 110 },
  podiumXp: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: '#f59e0b', letterSpacing: 0.12 },

  // Podium blocks (wrap in LinearGradient)
  podiumBlock: { width: 110, borderTopLeftRadius: 12, borderTopRightRadius: 12, alignItems: 'center', paddingTop: 12, overflow: 'hidden' },
  podiumBlock1: { height: 100, borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)' },
  podiumBlock2: { height: 72, borderWidth: 1, borderColor: 'rgba(148,163,184,0.3)' },
  podiumBlock3: { height: 52, borderWidth: 1, borderColor: 'rgba(180,120,60,0.3)' },
  podiumBlockNum: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 26, letterSpacing: -0.52 },

  // Section divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, marginVertical: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: 'rgba(204,195,216,0.3)' },

  // Filters
  filters: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.lg },
  searchWrap: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  searchInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 46, color: colors.white,
    fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15,
  },
  searchInputFocused: { borderColor: 'rgba(112,42,225,0.55)', backgroundColor: 'rgba(112,42,225,0.08)' },
  searchIcon: { position: 'absolute', left: spacing.md, fontSize: 16, opacity: 0.5 },
  searchClear: { position: 'absolute', right: 14, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6 },
  searchClearText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: 'rgba(204,195,216,0.7)' },

  gradePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  gradePill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' },
  gradePillText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: 'rgba(204,195,216,0.65)', letterSpacing: 0.26 },
  gradePillActive: { borderColor: 'transparent', ...shadows.purple },
  gradePillTextActive: { color: colors.white },

  // List
  list: { gap: 6, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.065)',
    borderRadius: 16, paddingVertical: 13, paddingHorizontal: 18,
    borderLeftWidth: 3, borderLeftColor: 'transparent',
  },
  rowMe: { backgroundColor: 'rgba(112,42,225,0.14)', borderColor: 'rgba(139,92,246,0.38)' },
  rowTop: { backgroundColor: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.18)' },

  rowRank: { width: 40, alignItems: 'center', flexShrink: 0 },
  rowRankEmoji: { fontSize: 22 },
  rowRankNum: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 13, color: 'rgba(204,195,216,0.4)', letterSpacing: -0.13 },

  rowAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.14)' },
  rowAvatarText: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 16, color: colors.white },

  rowInfo: { flex: 1, minWidth: 0, gap: 3 },
  rowName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#f0eaff', letterSpacing: -0.15 },
  youBadge: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 10, color: colors.white, backgroundColor: colors.purple, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99, letterSpacing: 0.8, ...shadows.purple },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowGrade: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: 'rgba(204,195,216,0.45)', letterSpacing: 0.12 },
  rowLevel: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, letterSpacing: 0.24 },

  xpBarTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden', marginTop: 3 },
  xpBarFill: { height: '100%', borderRadius: 99 },

  rowXp: { alignItems: 'flex-end', flexShrink: 0, gap: 1, minWidth: 70 },
  rowXpNum: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 17, color: '#fbbf24', letterSpacing: -0.34 },
  rowXpLabel: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 10, color: 'rgba(245,158,11,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 },

  // Loading / error / empty
  loading: { alignItems: 'center', justifyContent: 'center', gap: 18, paddingVertical: 80 },
  loadingText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: 'rgba(204,195,216,0.5)' },
  spinner: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'rgba(112,42,225,0.18)', borderTopColor: '#8b5cf6' },
  error: { alignItems: 'center', gap: 14, paddingVertical: 60 },
  errorText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: 'rgba(239,68,68,0.75)', textAlign: 'center' },
  retryBtn: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', paddingVertical: 9, paddingHorizontal: 22, borderRadius: 99 },
  retryBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#f87171' },
  emptyText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: 'rgba(204,195,216,0.35)', textAlign: 'center', paddingVertical: 60 },
  footer: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: 'rgba(204,195,216,0.28)', letterSpacing: 0.36, textAlign: 'center', padding: spacing.md },
});
