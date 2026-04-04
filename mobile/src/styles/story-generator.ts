/**
 * Story Generator Styles — React Native
 * Mirrors frontend/src/styles/story-generator.css
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

export const storyGeneratorStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080418' },
  scrollContent: { paddingBottom: 80 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(150,110,255,0.12)', backgroundColor: 'rgba(8,4,24,0.85)' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 99 },
  backBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: 'rgba(204,195,216,0.8)' },
  title: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 18, color: '#e9e3f5', letterSpacing: -0.36 },

  // Form body
  formSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg },
  label: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: 'rgba(204,195,216,0.5)', textTransform: 'uppercase', letterSpacing: 0.72, marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 18, color: '#e9e3f5', fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 },
  inputFocused: { borderColor: 'rgba(192,132,252,0.45)', backgroundColor: 'rgba(112,42,225,0.08)' },
  textarea: { minHeight: 88, textAlignVertical: 'top', paddingTop: 13 },

  // Chips / pills
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' },
  chipText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: 'rgba(204,195,216,0.7)' },
  chipActive: { borderColor: 'rgba(192,132,252,0.5)', backgroundColor: 'rgba(112,42,225,0.15)', ...shadows.purple },
  chipActiveText: { color: '#c084fc' },

  // Character cards (portrait gallery)
  portraitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  portraitCard: { width: 90, borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(20,10,50,0.7)' },
  portraitCardSelected: { borderColor: '#c084fc', ...shadows.purple },
  portraitImg: { width: '100%', aspectRatio: 3 / 4, resizeMode: 'cover' },
  portraitPlaceholder: { width: '100%', aspectRatio: 3 / 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(30,14,70,0.5)' },
  portraitEmoji: { fontSize: 36 },
  portraitName: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: 'rgba(204,195,216,0.8)', textAlign: 'center', padding: 6 },
  portraitCheck: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#c084fc', alignItems: 'center', justifyContent: 'center' },
  portraitCheckText: { fontSize: 10, color: colors.white, fontFamily: 'PlusJakartaSans_800ExtraBold' },

  // Settings panel
  settingsCard: { backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)', borderRadius: 18, padding: spacing.lg, gap: spacing.md },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  settingsLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: 'rgba(204,195,216,0.8)' },
  settingsValueText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: 'rgba(192,132,252,0.8)' },

  // Generate button (wrap in LinearGradient)
  generateBtn: { borderRadius: 99, paddingVertical: 15, paddingHorizontal: spacing.xl + spacing.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, marginHorizontal: spacing.lg, marginTop: spacing.lg, ...shadows.purpleLg },
  generateBtnText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: colors.white },
  generateBtnDisabled: { opacity: 0.5 },

  // Generating placeholder
  generatingPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xl * 2 },
  generatingSpinner: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: 'rgba(192,132,252,0.18)', borderTopColor: '#c084fc' },
  generatingTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 20, color: '#e9e3f5', textAlign: 'center' },
  generatingSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: 'rgba(204,195,216,0.55)', textAlign: 'center', lineHeight: 22 },

  // Cover image / preview
  coverPreview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 18, overflow: 'hidden', marginBottom: spacing.md },
  coverPreviewImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,10,50,0.7)', gap: spacing.sm },
  coverPlaceholderEmoji: { fontSize: 64 },
  coverPlaceholderText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: 'rgba(204,195,216,0.5)', textAlign: 'center' },

  // Story preview card
  storyCard: { backgroundColor: 'rgba(20,10,50,0.8)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.2)', borderRadius: 22, padding: spacing.lg, marginHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.md, ...shadows.nbMd },
  storyTitle: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 22, color: '#e9e3f5', letterSpacing: -0.44 },
  storySynopsis: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: 'rgba(204,195,216,0.75)', lineHeight: 22 },
  storyActions: { flexDirection: 'row', gap: spacing.sm },
  storyActionBtn: { flex: 1, paddingVertical: 11, borderRadius: 99, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(192,132,252,0.3)', backgroundColor: 'rgba(112,42,225,0.12)' },
  storyActionBtnPrimary: { borderColor: 'transparent', ...shadows.purple },
  storyActionBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#c084fc' },
  storyActionBtnPrimaryText: { color: colors.white },

  // Metadata chips row
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 99, backgroundColor: 'rgba(30,14,70,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)' },
  metaChipText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: 'rgba(204,195,216,0.6)' },
});
