/**
 * App Shell / Navigation Styles — React Native
 * Mirrors frontend/src/styles/app-shell.css
 */
import { StyleSheet, Platform } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

export const shellStyles = StyleSheet.create({
  // ── Tab Bar ───────────────────────────────────────────────────────
  tabBar: {
    flexDirection:   'row',
    backgroundColor: 'rgba(12,5,32,0.92)',
    borderTopWidth:   1,
    borderTopColor:   'rgba(150,110,255,0.12)',
    paddingBottom:    Platform.OS === 'ios' ? 24 : spacing.sm,
    paddingTop:       spacing.sm,
    paddingHorizontal: spacing.sm,
    gap:              4,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, gap: 4, borderRadius: radii.md },
  tabItemActive: { backgroundColor: 'rgba(124,58,237,0.15)' },
  tabIcon: { fontSize: 22 },
  tabLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, color: 'rgba(204,195,216,0.5)', letterSpacing: 0.2 },
  tabLabelActive: { color: '#c084fc' },
  tabIndicator: { position: 'absolute', top: 0, height: 2, width: 24, backgroundColor: '#c084fc', borderRadius: 1 },

  // ── Pill-style tab indicator ───────────────────────────────────────
  tabPill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radii.full },
  tabPillActive: { borderRadius: radii.full, ...shadows.purple },
  tabPillLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: 'rgba(204,195,216,0.5)', marginTop: 3 },
  tabPillLabelActive: { color: colors.white },

  // ── Header bar ────────────────────────────────────────────────────
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: 'rgba(12,5,32,0.82)', borderBottomWidth: 1, borderBottomColor: 'rgba(150,110,255,0.12)' },
  headerLogo: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: colors.white, letterSpacing: -0.54 },
  headerLogoSub: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: 'rgba(192,132,252,0.5)', letterSpacing: 0.7, textTransform: 'uppercase', marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },

  // ── FAB (Floating Action Button) ──────────────────────────────────
  fab: { position: 'absolute', bottom: 90, right: spacing.md, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadows.purpleLg, zIndex: 100 },
  fabText: { fontSize: 26, color: colors.white },
  fabLabel: { position: 'absolute', bottom: 62, right: 0, backgroundColor: 'rgba(12,5,32,0.92)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: radii.sm, borderWidth: 1, borderColor: 'rgba(150,110,255,0.2)' },
  fabLabelText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: colors.nbText },

  // ── Sidebar nav (used in dashboard) ──────────────────────────────
  sidebar: { width: 240, flexShrink: 0, backgroundColor: 'rgba(12,5,32,0.75)', borderRightWidth: 1, borderRightColor: 'rgba(150,110,255,0.13)', paddingHorizontal: spacing.md, paddingTop: 28, paddingBottom: spacing.lg },
  sidebarLogoText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: colors.white, paddingHorizontal: 10, marginBottom: 4, letterSpacing: -0.54 },
  sidebarLogoSub: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: 'rgba(192,132,252,0.5)', paddingHorizontal: 10, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 32 },
  nav: { gap: 2, flex: 1 },
  navLink: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderRadius: radii.full },
  navLinkActive: { backgroundColor: 'rgba(124,58,237,0.2)' },
  navLinkText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: 'rgba(204,195,216,0.6)', letterSpacing: -0.14 },
  navLinkTextActive: { color: '#c084fc', fontFamily: 'PlusJakartaSans_700Bold' },
  navSectionLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: 'rgba(150,110,255,0.4)', letterSpacing: 0.9, textTransform: 'uppercase', paddingVertical: 18, paddingTop: 18, paddingBottom: 6, paddingHorizontal: 14 },
  navDivider: { height: 1, backgroundColor: 'rgba(150,110,255,0.12)', marginVertical: 8, marginHorizontal: 14 },

  // Featured nav buttons (Generate Story, Movie Studio)
  featuredGroup: { gap: 8, paddingVertical: 16 },
  featuredBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  featuredBtnStory: { borderColor: 'rgba(192,132,252,0.3)', ...shadows.purple },
  featuredBtnStudio: { borderColor: 'rgba(251,191,36,0.35)', ...shadows.gold },
  featuredIcon: { fontSize: 22, flexShrink: 0 },
  featuredTextWrap: { gap: 2 },
  featuredLabel: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: 'rgba(255,255,255,0.95)', letterSpacing: -0.14, lineHeight: 16 },
  featuredSub: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.11 },

  // Mute button (global)
  muteBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(15,10,40,0.82)', borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.35)', alignItems: 'center', justifyContent: 'center', ...shadows.nbMd },
  muteBtnText: { fontSize: 20 },
  muteBtnActive: { borderColor: 'rgba(248,113,113,0.4)' },

  // XP Badge (global floating)
  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(12,5,32,0.88)', borderWidth: 1, borderColor: 'rgba(255,215,9,0.25)', borderRadius: radii.full, paddingVertical: 6, paddingHorizontal: 12, ...shadows.gold },
  xpBadgeIcon: { fontSize: 16 },
  xpBadgeText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#ffd709' },
  xpBadgeSub: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: 'rgba(255,215,9,0.6)' },
});
