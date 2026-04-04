/**
 * Rewards Styles — React Native
 * Mirrors frontend/src/styles/rewards.css
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

export const rewardsStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.nbBg },
  scrollContent: { paddingBottom: 80 },

  // Header
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm, marginBottom: spacing.md },
  backBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: colors.textMuted },
  title: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 28, color: colors.nbText, letterSpacing: -0.84, marginBottom: 4 },
  subtitle: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, color: 'rgba(204,195,216,0.6)' },

  // XP / Level card (wrap in LinearGradient primary)
  xpCard: { borderRadius: radii.xl, padding: spacing.lg, marginHorizontal: spacing.lg, marginBottom: spacing.lg, ...shadows.purpleLg, overflow: 'hidden' },
  xpLevel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.72, marginBottom: 4 },
  xpValue: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 48, color: colors.white, letterSpacing: -1.92, lineHeight: 52, marginBottom: spacing.sm },
  xpLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: spacing.md },
  xpTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 99 },
  xpNextLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 6, textAlign: 'right' },

  // Stats row
  statsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)', borderRadius: radii.lg, padding: spacing.md, alignItems: 'center', gap: 4, ...shadows.nbSm },
  statIcon: { fontSize: 24 },
  statValue: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 22, color: colors.nbText, letterSpacing: -0.88 },
  statLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: 'rgba(204,195,216,0.5)', textAlign: 'center' },

  // Section title
  sectionTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: colors.nbText, letterSpacing: -0.36, paddingHorizontal: spacing.lg, marginBottom: spacing.md },

  // Badge grid
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.xl },
  badgeCard: { width: '47%', backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)', borderRadius: radii.lg, padding: spacing.md, alignItems: 'center', gap: spacing.sm, ...shadows.nbSm, overflow: 'hidden' },
  badgeCardEarned: { borderColor: 'rgba(255,215,9,0.35)', backgroundColor: 'rgba(255,215,9,0.05)' },
  badgeCardLocked: { opacity: 0.5 },
  badgeEmoji: { fontSize: 40 },
  badgeName: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: colors.nbText, textAlign: 'center' },
  badgeDesc: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, color: 'rgba(204,195,216,0.55)', textAlign: 'center', lineHeight: 16 },
  badgeEarnedLabel: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 10, color: '#ffd709', backgroundColor: 'rgba(255,215,9,0.12)', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 99, letterSpacing: 0.4, textTransform: 'uppercase', overflow: 'hidden' },
  badgeLockedLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: 'rgba(204,195,216,0.35)', textTransform: 'uppercase', letterSpacing: 0.4 },

  // Streak section
  streakCard: { borderRadius: radii.xl, padding: spacing.lg, marginHorizontal: spacing.lg, marginBottom: spacing.lg, overflow: 'hidden', ...shadows.purpleLg },
  streakTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: spacing.sm },
  streakNum: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 64, color: colors.white, letterSpacing: -2.56, lineHeight: 68 },
  streakUnit: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18, color: 'rgba(255,255,255,0.75)' },
  streakDots: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  streakDot: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  streakDotActive: { backgroundColor: 'rgba(255,255,255,0.85)' },

  // Empty
  empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 20, color: colors.nbText, textAlign: 'center' },
  emptyText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: 'rgba(204,195,216,0.6)', textAlign: 'center' },
});
