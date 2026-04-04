/**
 * Movie Studio Styles — React Native
 * Mirrors frontend/src/styles/movie-studio.css
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

export const movieStudioStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050212' },
  scrollContent: { paddingBottom: 80 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: 'rgba(5,2,18,0.9)', borderBottomWidth: 1, borderBottomColor: 'rgba(150,110,255,0.12)' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 99 },
  backBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: 'rgba(204,195,216,0.8)' },
  titleWrap: { alignItems: 'center', flex: 1 },
  title: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 18, color: '#e9e3f5', letterSpacing: -0.36 },
  subtitle: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: 'rgba(204,195,216,0.45)', marginTop: 2 },

  // Hero
  hero: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, gap: spacing.md },
  heroBadge: { backgroundColor: 'rgba(180,100,0,0.18)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.3)', paddingVertical: 5, paddingHorizontal: 18, borderRadius: 99 },
  heroBadgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#eab308' },
  heroTitle: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 28, color: '#e9e3f5', letterSpacing: -0.84, textAlign: 'center', lineHeight: 32 },
  heroSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, color: 'rgba(204,195,216,0.55)', textAlign: 'center', lineHeight: 23 },

  // Video preview
  videoWrap: { marginHorizontal: spacing.md, borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(5,2,18,0.9)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.18)', aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, ...shadows.nbLg },
  videoPlaceholder: { alignItems: 'center', gap: spacing.md },
  videoPlaceholderEmoji: { fontSize: 56 },
  videoPlaceholderText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: 'rgba(204,195,216,0.45)', textAlign: 'center' },
  videoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  playButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(112,42,225,0.7)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(192,132,252,0.5)', ...shadows.purple },
  playButtonText: { fontSize: 28, color: colors.white },

  // Scene cards
  sceneCard: { backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)', borderRadius: radii.lg, overflow: 'hidden', marginBottom: spacing.sm, ...shadows.nbSm },
  sceneCardHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.md, gap: spacing.md },
  sceneNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(112,42,225,0.2)', borderWidth: 1, borderColor: 'rgba(192,132,252,0.3)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sceneNumText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: '#c084fc' },
  sceneTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#e9e3f5', flex: 1 },
  sceneDuration: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: 'rgba(204,195,216,0.4)' },
  sceneThumbnail: { width: '100%', aspectRatio: 16 / 9, backgroundColor: 'rgba(20,10,50,0.8)', alignItems: 'center', justifyContent: 'center' },
  sceneThumbnailImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  sceneBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  sceneText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, color: 'rgba(204,195,216,0.75)', lineHeight: 20 },

  // Timeline bar
  timeline: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  timelineSegment: { height: 4, borderRadius: 99, backgroundColor: 'rgba(112,42,225,0.3)' },
  timelineSegmentActive: { backgroundColor: '#c084fc' },
  timelineSegmentDone: { backgroundColor: '#7c3aed' },
  timecodeText: { fontFamily: 'Courier', fontSize: 11, color: 'rgba(204,195,216,0.4)' },

  // Style / voice controls
  controlsCard: { backgroundColor: 'rgba(20,10,50,0.7)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.15)', borderRadius: radii.lg, padding: spacing.lg, marginHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.md },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  controlLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: 'rgba(204,195,216,0.8)' },
  controlPills: { flexDirection: 'row', gap: spacing.sm },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' },
  pillActive: { borderColor: 'rgba(192,132,252,0.5)', backgroundColor: 'rgba(112,42,225,0.15)', ...shadows.purple },
  pillText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: 'rgba(204,195,216,0.65)' },
  pillTextActive: { color: '#c084fc' },

  // Generate button (wrap in LinearGradient studioGold)
  generateBtn: { borderRadius: 99, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.sm, ...shadows.gold },
  generateBtnText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: '#0a0a0a' },
  generateBtnDisabled: { opacity: 0.5 },

  // Generation progress
  genProgress: { alignItems: 'center', paddingVertical: spacing.xl * 2, gap: spacing.lg },
  genSpinner: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: 'rgba(234,179,8,0.15)', borderTopColor: '#eab308' },
  genTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 20, color: '#e9e3f5', textAlign: 'center' },
  genSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: 'rgba(204,195,216,0.5)', textAlign: 'center', lineHeight: 22 },
  genProgressTrack: { width: '80%', height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' },
  genProgressFill: { height: '100%', borderRadius: 99, backgroundColor: '#eab308' },

  // Download row
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.sm },
  shareBtn: { flex: 1, paddingVertical: 12, borderRadius: 99, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(192,132,252,0.3)', backgroundColor: 'rgba(112,42,225,0.12)' },
  shareBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#c084fc' },
  downloadBtn: { flex: 1, paddingVertical: 12, borderRadius: 99, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(234,179,8,0.3)', backgroundColor: 'rgba(234,179,8,0.07)' },
  downloadBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#eab308' },

  // Credits / info chip
  creditChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 99, backgroundColor: 'rgba(234,179,8,0.1)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.2)', alignSelf: 'center' },
  creditChipText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: 'rgba(234,179,8,0.8)' },
});
