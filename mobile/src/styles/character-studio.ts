/**
 * Character Studio Styles — React Native
 * Mirrors frontend/src/styles/character-studio.css
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

export const characterStudioStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08041c' },
  scrollContent: { paddingBottom: 80 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: 'rgba(8,4,28,0.9)', borderBottomWidth: 1, borderBottomColor: 'rgba(150,110,255,0.12)' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 99 },
  backBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: 'rgba(204,195,216,0.8)' },
  titleWrap: { alignItems: 'center', flex: 1 },
  title: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 18, color: '#e9e3f5', letterSpacing: -0.36 },
  subtitle: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: 'rgba(204,195,216,0.45)', marginTop: 2 },

  // Hero
  hero: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, gap: spacing.md },
  heroBadge: { backgroundColor: 'rgba(112,42,225,0.18)', borderWidth: 1, borderColor: 'rgba(150,100,255,0.3)', paddingVertical: 5, paddingHorizontal: 18, borderRadius: 99 },
  heroBadgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: '#c084fc' },
  heroTitle: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 30, color: '#e9e3f5', letterSpacing: -0.9, textAlign: 'center', lineHeight: 34 },
  heroSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, color: 'rgba(204,195,216,0.6)', textAlign: 'center', lineHeight: 23 },

  // Canvas / preview area
  canvasWrap: { marginHorizontal: spacing.md, borderRadius: 22, overflow: 'hidden', backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.2)', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, ...shadows.nbLg },
  canvasImg: { width: '100%', height: '100%', resizeMode: 'contain' },
  canvasPlaceholder: { alignItems: 'center', gap: spacing.md },
  canvasPlaceholderEmoji: { fontSize: 72 },
  canvasPlaceholderText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: 'rgba(204,195,216,0.5)', textAlign: 'center' },

  // Generation spinner overlay
  genOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,4,28,0.78)', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  genSpinner: { width: 56, height: 56, borderRadius: 28, borderWidth: 4, borderColor: 'rgba(192,132,252,0.18)', borderTopColor: '#c084fc' },
  genText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: 'rgba(204,195,216,0.8)', textAlign: 'center' },

  // Form section
  formSection: { paddingHorizontal: spacing.lg, gap: spacing.lg, marginBottom: spacing.lg },
  label: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: 'rgba(204,195,216,0.5)', textTransform: 'uppercase', letterSpacing: 0.72, marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 18, color: '#e9e3f5', fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 },
  inputFocused: { borderColor: 'rgba(192,132,252,0.45)', backgroundColor: 'rgba(112,42,225,0.08)' },
  textarea: { minHeight: 88, textAlignVertical: 'top', paddingTop: 13 },

  // Character class chips
  classChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  classChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  classChipActive: { borderColor: 'rgba(192,132,252,0.5)', backgroundColor: 'rgba(112,42,225,0.15)', ...shadows.purple },
  classChipEmoji: { fontSize: 18 },
  classChipText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: 'rgba(204,195,216,0.7)' },
  classChipTextActive: { color: '#c084fc' },

  // Background palette grid
  bgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  bgSwatch: { width: 52, height: 52, borderRadius: radii.md, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  bgSwatchSelected: { borderColor: '#c084fc', ...shadows.purple },
  bgSwatchImg: { width: '100%', height: '100%', resizeMode: 'cover' },

  // Style toggles (art style)
  styleRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  stylePill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' },
  stylePillActive: { borderColor: 'transparent', ...shadows.purple },
  stylePillText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: 'rgba(204,195,216,0.65)' },
  stylePillTextActive: { color: colors.white },

  // Generate button (wrap in LinearGradient)
  generateBtn: { borderRadius: 99, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.sm, ...shadows.purpleLg },
  generateBtnText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: colors.white },
  generateBtnDisabled: { opacity: 0.5 },

  // Save / download buttons
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.sm },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 99, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(192,132,252,0.3)', backgroundColor: 'rgba(112,42,225,0.12)' },
  saveBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#c084fc' },
  downloadBtn: { flex: 1, paddingVertical: 12, borderRadius: 99, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,215,9,0.3)', backgroundColor: 'rgba(255,215,9,0.07)' },
  downloadBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#ffd709' },

  // Portrait gallery
  galleryTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: colors.nbText, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.md },
  galleryCard: { width: '31%', borderRadius: radii.md, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)' },
  galleryCardSelected: { borderColor: '#c084fc', ...shadows.purple },
  galleryImg: { width: '100%', aspectRatio: 1, resizeMode: 'cover' },
  galleryLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, color: 'rgba(204,195,216,0.7)', textAlign: 'center', paddingVertical: 5, backgroundColor: 'rgba(20,10,50,0.8)' },
});
