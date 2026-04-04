/**
 * Shelf (Library) Styles — React Native
 * Mirrors frontend/src/styles/shelf.css
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows, typography } from './tokens';

export const shelfStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.nbBg },
  hero: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  heroTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 26, color: colors.nbText, letterSpacing: -0.78, textAlign: 'center', marginBottom: 4,
  },
  heroSubtitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: 'rgba(204,195,216,0.6)', textAlign: 'center' },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.lg },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 10, paddingHorizontal: 18, borderRadius: radii.full,
    backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)', ...shadows.nbSm,
  },
  statIcon: { fontSize: 21 },
  statVal: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: colors.nbText },
  statLbl: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: 'rgba(204,195,216,0.6)' },

  // Status badges
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, marginBottom: spacing.sm, alignSelf: 'flex-start' },
  statusBadgeText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11 },
  badgeCompleted: { backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  badgeCompletedText: { color: '#22c55e' },
  badgeActive: { backgroundColor: 'rgba(56,189,248,0.12)', borderWidth: 1, borderColor: 'rgba(56,189,248,0.25)' },
  badgeActiveText: { color: '#38bdf8' },
  badgeCommunity: { backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  badgeCommunityText: { color: '#34d399' },

  // Book card
  card: {
    backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)',
    borderRadius: radii.lg, overflow: 'hidden', padding: 12, ...shadows.nbSm,
  },
  cover: { width: '100%', aspectRatio: 3 / 4, backgroundColor: colors.surfaceLow, borderRadius: radii.md, overflow: 'hidden' },
  coverImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(30,14,70,0.5)' },
  coverEmoji: { fontSize: 64 },

  // Grade badge over cover
  gradeBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.card, paddingHorizontal: 8, paddingVertical: 6, borderRadius: radii.sm, alignItems: 'center', ...shadows.md },
  gradeBadgeLbl: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.48, color: colors.textMuted },
  gradeBadgeVal: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 14, color: colors.purple },

  // Card body
  bookTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: colors.nbText, lineHeight: 21, letterSpacing: -0.16 },
  stars: { flexDirection: 'row', gap: 3 },
  star: { fontSize: 16, color: colors.surfaceHighest },
  starLit: { color: colors.gold },

  // Chips
  chips: { flexDirection: 'row', gap: 6 },
  chip: {
    flex: 1, backgroundColor: 'rgba(30,14,70,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)',
    borderRadius: radii.sm, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', gap: 2,
  },
  chipVal: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 13, color: colors.nbText },
  chipLbl: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 9, color: 'rgba(204,195,216,0.5)', textTransform: 'uppercase', letterSpacing: 0.36 },

  // Progress
  progressTrack: { height: 6, backgroundColor: colors.surfaceHighest, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },

  // Keep reading btn (wrap in LinearGradient)
  keepReadingBtn: { width: '100%', paddingVertical: 9, paddingHorizontal: 12, borderRadius: radii.full, alignItems: 'center', marginTop: 2, ...shadows.purple },
  keepReadingText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: colors.white },

  // Student tabs
  studentTabs: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: spacing.lg + 4, paddingHorizontal: spacing.md },
  studentTab: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
    paddingLeft: 10, paddingRight: spacing.md + 4, borderRadius: radii.full,
    backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1.5, borderColor: 'rgba(150,110,255,0.15)',
  },
  studentTabActive: { borderColor: 'rgba(192,132,252,0.5)', backgroundColor: 'rgba(124,58,237,0.2)', ...shadows.purple },
  tabAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tabAvatarText: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 18, color: colors.white },
  tabName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: colors.nbText },
  tabGrade: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: 'rgba(204,195,216,0.5)' },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: spacing['2xl'], paddingHorizontal: spacing.md, gap: spacing.md, alignSelf: 'center' },
  emptyTitle: { ...typography.h3, color: colors.nbText, textAlign: 'center' },
  emptyText: { ...typography.body, color: 'rgba(204,195,216,0.6)', textAlign: 'center' },
  ctaBtn: { borderRadius: radii.full, paddingHorizontal: spacing.xl, paddingVertical: 14, marginTop: spacing.sm, ...shadows.purple },
  ctaBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: colors.white },

  // Skeleton
  skeleton: { aspectRatio: 3 / 4, borderRadius: radii.lg, backgroundColor: 'rgba(30,14,70,0.8)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.1)' },

  // Avatar modal
  avatarModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  avatarModal: {
    width: '100%', maxWidth: 480, backgroundColor: colors.nbCardSolid,
    borderWidth: 1.5, borderColor: 'rgba(168,85,247,0.3)', borderRadius: 24,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg + 4, ...shadows.nbLg,
  },
  avatarModalTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: '#e9d5ff', marginBottom: 4 },
  avatarModalSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: 'rgba(180,160,220,0.7)', marginBottom: spacing.md },
  avatarPreview: { width: 140, height: 140, borderRadius: 70, overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(168,85,247,0.4)', alignSelf: 'center', marginBottom: spacing.md + 4 },

  // Remove / cancel buttons
  removeBtn: { width: '100%', paddingVertical: 8, paddingHorizontal: 12, borderRadius: radii.full, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', alignItems: 'center' },
  removeBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#f87171' },
  cancelBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: radii.full, backgroundColor: 'rgba(150,110,255,0.1)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.2)', alignItems: 'center' },
  cancelBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: 'rgba(204,195,216,0.7)' },

  // Feedback bubble
  feedbackBubble: { backgroundColor: 'rgba(30,14,70,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.1)', borderTopLeftRadius: 4, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 16, padding: 10 },
  feedbackText: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: 'rgba(204,195,216,0.7)', fontStyle: 'italic', lineHeight: 20 },
  feedbackQuote: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 20, color: colors.purple, fontStyle: 'normal' },
  toggleHint: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: colors.textLight, textAlign: 'center', marginTop: 4 },

  compPct: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 13, color: colors.purple },
  shelfDate: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: colors.textLight, marginTop: 4 },
});
