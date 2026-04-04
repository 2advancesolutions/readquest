/**
 * Admin Dashboard Styles — React Native
 * Mirrors frontend/src/styles/admin.css
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

export const adminStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.nbBg },
  scrollContent: { paddingBottom: 80 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: 'rgba(12,5,32,0.82)', borderBottomWidth: 1, borderBottomColor: 'rgba(150,110,255,0.12)' },
  logoText: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 18, color: colors.white, letterSpacing: -0.54 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingVertical: 7, paddingHorizontal: 14, borderRadius: radii.full },
  logoutBtnText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: 'rgba(204,195,216,0.55)' },

  // Top section
  hero: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  heroTitle: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 26, color: colors.nbText, letterSpacing: -0.78, marginBottom: 4 },
  heroSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: 'rgba(204,195,216,0.5)' },

  // Summary stat cards
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  summaryCard: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)', borderRadius: radii.lg, padding: spacing.md, alignItems: 'center', gap: 4, ...shadows.nbSm },
  summaryIcon: { fontSize: 24 },
  summaryValue: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 28, color: colors.nbText, letterSpacing: -1.12 },
  summaryLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: 'rgba(204,195,216,0.45)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.44 },
  summaryDelta: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#22c55e' },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  sectionTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: colors.nbText, letterSpacing: -0.32 },
  sectionAction: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#c084fc' },

  // Table (list-based)
  tableContainer: { marginHorizontal: spacing.md, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(150,110,255,0.12)', marginBottom: spacing.lg },
  tableHeader: { flexDirection: 'row', backgroundColor: 'rgba(112,42,225,0.1)', paddingVertical: 12, paddingHorizontal: spacing.md },
  tableHeaderText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: 'rgba(192,132,252,0.7)', textTransform: 'uppercase', letterSpacing: 0.55 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', backgroundColor: 'rgba(255,255,255,0.025)' },
  tableRowLast: { borderBottomWidth: 0 },
  tableCellText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: '#e9e3f5' },
  tableCellBold: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#e9e3f5' },
  tableEmpty: { paddingVertical: 40, alignItems: 'center' },
  tableEmptyText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: 'rgba(204,195,216,0.35)', textAlign: 'center' },

  // Status badges
  statusBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99, overflow: 'hidden' },
  statusActive: { backgroundColor: 'rgba(34,197,94,0.13)' },
  statusActiveText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#4ade80' },
  statusInactive: { backgroundColor: 'rgba(148,163,184,0.12)' },
  statusInactiveText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#94a3b8' },
  statusWarning: { backgroundColor: 'rgba(251,191,36,0.12)' },
  statusWarningText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#fbbf24' },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { paddingVertical: 5, paddingHorizontal: 14, borderRadius: radii.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.06)' },
  actionBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: 'rgba(204,195,216,0.7)' },
  actionBtnDanger: { borderColor: 'rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.08)' },
  actionBtnDangerText: { color: '#f87171' },
  actionBtnPrimary: { borderColor: 'rgba(192,132,252,0.3)', backgroundColor: 'rgba(112,42,225,0.12)' },
  actionBtnPrimaryText: { color: '#c084fc' },

  // Search bar
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingHorizontal: spacing.md, marginHorizontal: spacing.md, marginBottom: spacing.md },
  searchIcon: { fontSize: 16, color: 'rgba(204,195,216,0.35)', marginRight: spacing.sm },
  searchInput: { flex: 1, paddingVertical: 12, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, color: '#e9e3f5' },

  // User avatar in table
  userAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(192,132,252,0.2)' },
  userAvatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  userAvatarText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: colors.white },

  // Tab bar (Reports / Users / etc.)
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' },
  tabActive: { borderColor: 'transparent', ...shadows.purple },
  tabText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: 'rgba(204,195,216,0.65)' },
  tabTextActive: { color: colors.white },

  // Chart container
  chartCard: { backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)', borderRadius: radii.xl, padding: spacing.lg, marginHorizontal: spacing.md, marginBottom: spacing.lg, ...shadows.nbSm },
  chartTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: colors.nbText, marginBottom: spacing.md },
});
