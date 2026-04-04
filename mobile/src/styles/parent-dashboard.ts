/**
 * Parent Dashboard + Add Kid Dashboard Styles — React Native
 * Mirrors frontend/src/styles/parent-dashboard.css
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

export const parentStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.nbBg },
  scrollContent: { paddingBottom: 80 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: 'rgba(12,5,32,0.82)', borderBottomWidth: 1, borderBottomColor: 'rgba(150,110,255,0.12)' },
  logoText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: colors.white, letterSpacing: -0.54 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.full },
  logoutBtnText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: 'rgba(204,195,216,0.55)' },

  // Hero  
  hero: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  heroTitle: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 26, color: colors.nbText, letterSpacing: -0.78, marginBottom: 4 },
  heroSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: 'rgba(204,195,216,0.5)' },

  // Add child button (wrap in LinearGradient)
  addChildBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.full, paddingVertical: 11, paddingHorizontal: spacing.lg, alignSelf: 'flex-start', marginHorizontal: spacing.lg, marginBottom: spacing.lg, ...shadows.purple },
  addChildBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: colors.white },

  // Student card
  studentCard: { backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)', borderRadius: radii.xl, padding: spacing.lg, marginHorizontal: spacing.md, marginBottom: spacing.md, ...shadows.nbMd, overflow: 'hidden' },
  studentCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  studentAvatar: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(192,132,252,0.3)', flexShrink: 0 },
  studentAvatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  studentAvatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  studentAvatarText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: colors.white },
  studentName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: colors.nbText, letterSpacing: -0.36, marginBottom: 2 },
  studentGrade: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: 'rgba(204,195,216,0.5)' },
  studentActions: { flexDirection: 'row', gap: spacing.sm, marginLeft: 'auto' },
  studentActionBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(150,110,255,0.1)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  studentActionText: { fontSize: 16 },

  // Stats mini cards
  miniStats: { flexDirection: 'row', gap: spacing.sm },
  miniStat: { flex: 1, backgroundColor: 'rgba(30,14,70,0.6)', borderRadius: radii.md, padding: 12, alignItems: 'center', gap: 4 },
  miniStatValue: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 20, color: colors.nbText, letterSpacing: -0.8 },
  miniStatLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, color: 'rgba(204,195,216,0.45)', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },

  // Recent activity
  activitySection: { paddingHorizontal: spacing.md, marginTop: spacing.sm },
  activityTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: 'rgba(204,195,216,0.55)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: spacing.sm },
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(150,110,255,0.07)' },
  activityIcon: { fontSize: 22, width: 36, textAlign: 'center', flexShrink: 0 },
  activityText: { flex: 1, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: 'rgba(204,195,216,0.8)', lineHeight: 19 },
  activityTime: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, color: 'rgba(204,195,216,0.35)', flexShrink: 0 },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: spacing['2xl'], gap: spacing.md },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: colors.nbText, textAlign: 'center' },
  emptyText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: 'rgba(204,195,216,0.6)', textAlign: 'center' },

  // Add Kid form
  formSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md },
  formTitle: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 22, color: colors.nbText, letterSpacing: -0.44, marginBottom: spacing.sm },
  label: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: 'rgba(204,195,216,0.5)', textTransform: 'uppercase', letterSpacing: 0.72, marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 18, color: '#e9e3f5', fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 },
  inputFocused: { borderColor: 'rgba(192,132,252,0.45)' },
  submitBtn: { borderRadius: 99, paddingVertical: 14, alignItems: 'center', marginTop: spacing.sm, ...shadows.purple },
  submitBtnText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: colors.white },
  submitBtnLoading: { opacity: 0.6 },
});
