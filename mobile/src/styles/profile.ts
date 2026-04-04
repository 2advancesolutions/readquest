/**
 * Profile Styles — React Native
 * Mirrors frontend/src/styles/profile.css
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

export const profileStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.nbBg },
  scrollContent: { paddingBottom: 80 },

  // Header
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm, marginBottom: spacing.md },
  backBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: colors.textMuted },

  // Profile hero card
  profileCard: { backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)', borderRadius: radii.xl, padding: spacing.lg, marginHorizontal: spacing.md, marginBottom: spacing.lg, alignItems: 'center', ...shadows.nbMd },
  avatarWrap: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(192,132,252,0.4)', marginBottom: spacing.md, ...shadows.purple },
  avatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: colors.white },
  profileName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: colors.nbText, letterSpacing: -0.44, textAlign: 'center', marginBottom: 4 },
  profileEmail: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: 'rgba(204,195,216,0.5)', textAlign: 'center', marginBottom: spacing.md },
  profileBadge: { paddingVertical: 5, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(192,132,252,0.25)', backgroundColor: 'rgba(124,58,237,0.12)' },
  profileBadgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#c084fc', letterSpacing: 0.24 },

  // Stats
  statsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)', borderRadius: radii.lg, padding: spacing.md, alignItems: 'center', gap: 4, ...shadows.nbSm },
  statValue: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 24, color: colors.nbText, letterSpacing: -0.96 },
  statLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: 'rgba(204,195,216,0.5)', textAlign: 'center' },

  // Settings section
  sectionTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: 'rgba(204,195,216,0.4)', textTransform: 'uppercase', letterSpacing: 0.84, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  settingsCard: { backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)', borderRadius: radii.lg, marginHorizontal: spacing.md, marginBottom: spacing.lg, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(150,110,255,0.08)' },
  settingsRowLast: { borderBottomWidth: 0 },
  settingsLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: colors.nbText },
  settingsValue: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: 'rgba(204,195,216,0.5)' },
  settingsChevron: { fontSize: 16, color: 'rgba(204,195,216,0.35)' },

  // Logout button
  logoutBtn: { marginHorizontal: spacing.md, paddingVertical: 14, borderRadius: radii.full, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', alignItems: 'center' },
  logoutBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#f87171' },

  // Edit field input
  inputField: { backgroundColor: 'rgba(30,14,70,0.6)', borderRadius: radii.md, paddingVertical: 12, paddingHorizontal: spacing.md, color: colors.nbText, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, borderWidth: 1, borderColor: 'rgba(150,110,255,0.2)', marginBottom: spacing.sm },
  inputFocused: { borderColor: 'rgba(192,132,252,0.5)' },
  saveBtn: { borderRadius: radii.full, paddingVertical: 12, paddingHorizontal: spacing.xl, alignItems: 'center', ...shadows.purple },
  saveBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: colors.white },
});
