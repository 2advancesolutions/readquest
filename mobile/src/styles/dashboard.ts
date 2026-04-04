/**
 * Dashboard Styles — React Native
 * Mirrors frontend/src/styles/dashboard.css (Night-Bloom theme)
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows, typography } from './tokens';

export const dashStyles = StyleSheet.create({
  // ── Root ──────────────────────────────────────────────────────────
  root: {
    flex:            1,
    backgroundColor: colors.nbBg,
  },

  // ── Top Header bar ────────────────────────────────────────────────
  topHeader: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.md,
    backgroundColor: 'rgba(12, 5, 32, 0.82)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 110, 255, 0.12)',
    gap:             spacing.md,
  },

  greeting: {
    fontFamily:    'PlusJakartaSans_800ExtraBold',
    fontSize:      22,
    letterSpacing: -0.6,
    lineHeight:    26,
    color:         colors.nbText,
  },
  greetingDate: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize:   12,
    color:      colors.nbTextDim,
    marginTop:  2,
  },

  // ── Child pills ───────────────────────────────────────────────────
  childPills: {
    flexDirection: 'row',
    gap:           spacing.sm,
    flex:          1,
    paddingLeft:   spacing.sm,
  },
  childChip: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           7,
    paddingVertical:  6,
    paddingLeft:      8,
    paddingRight:     14,
    borderRadius:     radii.full,
    backgroundColor: 'rgba(30, 14, 70, 0.6)',
    borderWidth:      1,
    borderColor:      'rgba(150, 110, 255, 0.2)',
  },
  childChipActive: {
    borderColor:     'transparent',
    ...shadows.purple,
  },
  childChipAvatar: {
    width:           26,
    height:          26,
    borderRadius:    13,
    alignItems:      'center',
    justifyContent:  'center',
  },
  childChipAvatarText: {
    fontSize:   12,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color:      colors.white,
  },
  childChipLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize:   13,
    color:      'rgba(204, 195, 216, 0.7)',
  },
  childChipLabelActive: {
    color: colors.white,
  },

  // ── Header actions ────────────────────────────────────────────────
  headerActions: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    flexShrink:    0,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    borderRadius:  radii.full,
    paddingHorizontal: spacing.md + 4,
    paddingVertical:   10,
    ...shadows.purple,
  },
  createBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize:   14,
    color:      colors.white,
  },
  headerAvatar: {
    width:           38,
    height:          38,
    borderRadius:    19,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     2,
    borderColor:     'rgba(192, 132, 252, 0.35)',
  },
  headerAvatarText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize:   14,
    color:      colors.white,
  },

  // ── Main scroll content ───────────────────────────────────────────
  feed: {
    flex: 1,
  },
  center: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.lg,
    gap:               spacing.lg + spacing.sm,
  },

  // ── Continue Reading Hero Card ────────────────────────────────────
  continueCard: {
    backgroundColor: 'rgba(20, 10, 50, 0.7)',
    borderWidth:      1,
    borderColor:      'rgba(150, 110, 255, 0.2)',
    borderRadius:     radii.xl,
    padding:          spacing.lg,
    flexDirection:    'row',
    gap:              spacing.md + 4,
    alignItems:       'flex-start',
    ...shadows.nbLg,
    overflow:         'hidden',
  },
  continueCover: {
    width:           110,
    height:          140,
    borderRadius:    radii.lg,
    overflow:        'hidden',
    backgroundColor: 'rgba(30, 14, 70, 0.6)',
    borderWidth:      1,
    borderColor:      'rgba(150, 110, 255, 0.15)',
    flexShrink:       0,
  },
  continueInfo: {
    flex:     1,
    minWidth: 0,
  },
  continueBadge: {
    fontFamily:    'PlusJakartaSans_800ExtraBold',
    fontSize:      10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color:         '#c084fc',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth:   1,
    borderColor:   'rgba(192, 132, 252, 0.25)',
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:  radii.full,
    alignSelf:     'flex-start',
    marginBottom:  10,
    overflow:      'hidden',
  },
  continueTitle: {
    fontFamily:    'PlusJakartaSans_800ExtraBold',
    fontSize:      20,
    color:         'rgba(233, 221, 255, 0.95)',
    letterSpacing: -0.6,
    lineHeight:    23,
    marginBottom:  6,
  },
  continueMeta: {
    fontFamily:   'PlusJakartaSans_500Medium',
    fontSize:     13,
    color:        'rgba(204, 195, 216, 0.55)',
    marginBottom: spacing.md,
  },
  progressLabelRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginBottom:   6,
  },
  progressLabelText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize:   12,
    color:      'rgba(204, 195, 216, 0.55)',
  },
  progressTrack: {
    height:          6,
    backgroundColor: 'rgba(30, 14, 70, 0.8)',
    borderRadius:    99,
    overflow:        'hidden',
    marginBottom:    spacing.md + 4,
  },
  progressFill: {
    height:       '100%',
    borderRadius: 99,
    // Use LinearGradient over this View with gradients.primary
  },

  // ── Keep Reading button (wrap in LinearGradient) ──────────────────
  keepReadingBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    borderRadius:    radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical:   11,
    alignSelf:       'flex-start',
    ...shadows.purple,
  },
  keepReadingText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize:   14,
    color:      colors.white,
  },

  // ── Section ───────────────────────────────────────────────────────
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'baseline',
  },
  sectionTitle: {
    fontFamily:    'PlusJakartaSans_800ExtraBold',
    fontSize:      18,
    color:         'rgba(233, 221, 255, 0.9)',
    letterSpacing: -0.36,
  },
  sectionSub: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize:   13,
    color:      'rgba(204, 195, 216, 0.5)',
    marginTop:  2,
  },
  viewAllBtn: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize:   13,
    color:      '#c084fc',
  },

  // ── Story Card ─────────────────────────────────────────────────────
  storyCard: {
    backgroundColor: 'rgba(20, 10, 50, 0.65)',
    borderWidth:      1,
    borderColor:      'rgba(150, 110, 255, 0.15)',
    borderRadius:     radii.lg,
    overflow:         'hidden',
    ...shadows.nbSm,
  },
  storyCover: {
    width:           '100%',
    aspectRatio:     1,
    overflow:        'hidden',
    backgroundColor: 'rgba(30, 14, 70, 0.5)',
  },
  storyCoverImg: {
    width:     '100%',
    height:    '100%',
    resizeMode:'cover',
  },
  storyCoverPlaceholder: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: 'rgba(30, 14, 70, 0.6)',
  },
  storyCoverEmoji: {
    fontSize: 40,
  },
  storyInfo: {
    padding: 12,
    paddingBottom: 14,
  },
  storyGradeChip: {
    fontFamily:    'PlusJakartaSans_800ExtraBold',
    fontSize:      10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color:         '#c084fc',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth:   1,
    borderColor:   'rgba(192, 132, 252, 0.2)',
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:  radii.full,
    alignSelf:     'flex-start',
    marginBottom:  7,
    overflow:      'hidden',
  },
  storyTitle: {
    fontFamily:    'PlusJakartaSans_800ExtraBold',
    fontSize:      15,
    color:         'rgba(233, 221, 255, 0.9)',
    letterSpacing: -0.15,
    lineHeight:    18,
    marginBottom:  4,
  },
  storyMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
  },
  storyMetaText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize:   12,
    color:      'rgba(204, 195, 216, 0.5)',
  },
  storyMetaDot: {
    color: 'rgba(192, 132, 252, 0.5)',
  },
  storyProgressWrap: {
    marginTop: spacing.sm,
  },
  storyProgressBar: {
    height:          4,
    backgroundColor: 'rgba(30, 14, 70, 0.8)',
    borderRadius:    99,
    overflow:        'hidden',
  },
  storyProgressFill: {
    height:       '100%',
    borderRadius: 99,
  },

  // ── Streak Card (wrap root in LinearGradient) ──────────────────────
  streakCard: {
    borderRadius: radii.xl,
    padding:      22,
    overflow:     'hidden',
    ...shadows.purpleLg,
  },
  streakLabel: {
    fontFamily:    'PlusJakartaSans_800ExtraBold',
    fontSize:      11,
    letterSpacing: 0.77,
    textTransform: 'uppercase',
    color:         'rgba(255,255,255,0.85)',
    marginBottom:  6,
  },
  streakNum: {
    fontFamily:    'PlusJakartaSans_800ExtraBold',
    fontSize:      50,
    color:         colors.white,
    letterSpacing: -2.5,
    lineHeight:    52,
  },
  streakUnit: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize:   16,
    color:      'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  streakSub: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize:   13,
    color:      'rgba(255,255,255,0.9)',
    marginTop:  6,
  },

  // ── Mini/Goal cards ───────────────────────────────────────────────
  miniCard: {
    backgroundColor: 'rgba(20, 10, 50, 0.65)',
    borderWidth:      1,
    borderColor:      'rgba(150, 110, 255, 0.15)',
    borderRadius:     radii.xl,
    padding:          spacing.md + 4,
    ...shadows.nbSm,
  },
  miniCardHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   spacing.md,
  },
  miniCardTitle: {
    fontFamily:    'PlusJakartaSans_800ExtraBold',
    fontSize:      14,
    color:         'rgba(233, 221, 255, 0.85)',
    letterSpacing: -0.28,
  },

  // ── Bar chart ─────────────────────────────────────────────────────
  barChart: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    gap:            5,
    height:         64,
    marginBottom:   10,
  },
  barCol: {
    flex:           1,
    alignItems:     'center',
    gap:            4,
    height:         '100%',
    justifyContent: 'flex-end',
  },
  barFill: {
    width:           '100%',
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderTopLeftRadius:  4,
    borderTopRightRadius: 4,
    minHeight:       4,
  },
  barFillActive: {
    // Use LinearGradient with gradients.primary
  },
  barFillToday: {
    backgroundColor: '#c084fc',
  },
  barDay: {
    fontFamily:    'PlusJakartaSans_700Bold',
    fontSize:       9,
    color:          'rgba(204, 195, 216, 0.4)',
    textTransform: 'uppercase',
  },

  // ── Delete button (story card) ────────────────────────────────────
  deleteBtn: {
    position:        'absolute',
    top:             8,
    right:           8,
    zIndex:          10,
    width:           26,
    height:          26,
    borderRadius:    13,
    backgroundColor: 'rgba(247, 75, 109, 0.9)',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1.5,
    borderColor:     'rgba(255,255,255,0.3)',
  },
  completeBadge: {
    position: 'absolute',
    top:      8,
    left:     8,
    fontSize: 18,
    zIndex:   2,
  },

  // ── Logout button ─────────────────────────────────────────────────
  logoutBtn: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
    paddingHorizontal: 14,
    paddingVertical:   11,
    borderRadius:  radii.full,
  },
  logoutBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize:   14,
    color:      'rgba(204, 195, 216, 0.5)',
  },
});
