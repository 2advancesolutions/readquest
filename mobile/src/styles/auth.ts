/**
 * Auth Styles — React Native
 * Mirrors frontend/src/styles/auth.css
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows, typography } from './tokens';

export const authStyles = StyleSheet.create({
  // ── Root ──────────────────────────────────────────────────────────
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // ── Scroll / Form side ────────────────────────────────────────────
  formSide: {
    flex: 1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.xl,
  },

  // ── Card ──────────────────────────────────────────────────────────
  card: {
    width:           '100%',
    maxWidth:        460,
    backgroundColor: colors.card,
    borderRadius:    radii.xl,
    paddingHorizontal: 44,
    paddingVertical:   48,
    ...shadows.lg,
  },
  cardCompact: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.lg,
  },

  // ── Mascot ────────────────────────────────────────────────────────
  mascot: {
    textAlign:   'center',
    fontSize:    56,
    marginBottom: spacing.sm,
    lineHeight:  64,
  },

  // ── Logo ──────────────────────────────────────────────────────────
  logo: {
    ...typography.h3,
    color:       colors.purple,
    textAlign:   'center',
    marginBottom: spacing.xs,
    letterSpacing: -0.4,
  },
  logoAccent: {
    color: colors.goldDark,
  },

  // ── Tagline ───────────────────────────────────────────────────────
  tagline: {
    ...typography.body,
    color:        colors.textMuted,
    textAlign:    'center',
    marginBottom: spacing.lg + spacing.sm,
  },

  // ── Headings ──────────────────────────────────────────────────────
  title: {
    ...typography.h2,
    color:        colors.text,
    textAlign:    'center',
    marginBottom: spacing.xs,
  },
  sub: {
    ...typography.body,
    color:        colors.textMuted,
    textAlign:    'center',
    marginBottom: spacing.lg,
  },
  link: {
    color:       colors.purple,
    fontFamily:  'PlusJakartaSans_600SemiBold',
  },

  // ── Form ──────────────────────────────────────────────────────────
  form: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap:           12,
  },
  field: {
    gap: 6,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.surfaceHighest,
    borderRadius:    radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical:   13,
    color:           colors.text,
    fontFamily:      'PlusJakartaSans_400Regular',
    fontSize:        15,
  },
  inputFocused: {
    backgroundColor: colors.card,
    // Focus ring via borderWidth + borderColor toggled in component state
    borderWidth:  2.5,
    borderColor:  'rgba(178, 140, 255, 0.4)',
  },

  // ── Error ─────────────────────────────────────────────────────────
  error: {
    backgroundColor: 'rgba(247, 75, 109, 0.08)',
    borderRadius:    radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical:   12,
  },
  errorText: {
    ...typography.body,
    color: colors.coral,
  },

  // ── Submit Button ( wrap with <LinearGradient gradients.primaryBtn> ) ──
  btn: {
    borderRadius:    radii.full,
    paddingVertical: 14,
    alignItems:      'center',
    justifyContent:  'center',
    flexDirection:   'row',
    gap:             10,
    marginTop:       spacing.xs,
    ...shadows.purple,
  },
  btnText: {
    ...typography.h4,
    color:    colors.onPrimary,
    fontSize: 16,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // ── Spinner ───────────────────────────────────────────────────────
  spinner: {
    width:         16,
    height:        16,
    borderWidth:   2,
    borderColor:   'rgba(248, 240, 255, 0.4)',
    borderTopColor:'#FFF',
    borderRadius:  8,
  },

  // ── Divider ───────────────────────────────────────────────────────
  divider: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            12,
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex:            1,
    height:          1,
    backgroundColor: colors.surfaceHighest,
  },
  dividerText: {
    ...typography.bodySm,
    color: colors.textLight,
  },

  // ── Forgot password ───────────────────────────────────────────────
  forgot: {
    alignItems: 'flex-end',
    marginTop:  -8,
  },
  forgotText: {
    ...typography.bodySm,
    color: colors.textMuted,
  },

  // ── Hero panel (desktop → shown as top panel in responsive mobile) ──
  hero: {
    alignItems:  'center',
    gap:         spacing.md,
    paddingVertical:   60,
    paddingHorizontal: 48,
  },
  heroEmoji: {
    fontSize:   96,
    lineHeight: 108,
  },
  heroTitle: {
    ...typography.h1,
    color:    colors.white,
    textAlign:'center',
  },
  heroSub: {
    ...typography.bodyLg,
    color:     'rgba(255,255,255,0.8)',
    textAlign: 'center',
    maxWidth:  320,
  },

  // ── Character hero panel ──────────────────────────────────────────
  charCard: {
    alignItems: 'center',
    gap:        10,
    paddingVertical: spacing.xl,
  },
  charEmojiWrap: {
    width:          120,
    height:         120,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   spacing.sm,
  },
  charEmojiRing: {
    position:     'absolute',
    top:          0,
    left:         0,
    right:        0,
    bottom:       0,
    borderRadius: 60,
    borderWidth:  2,
    borderColor:  'rgba(255,255,255,0.3)',
    opacity:      0.5,
  },
  charEmoji: {
    fontSize:   88,
    lineHeight: 100,
  },
  charName: {
    fontFamily:    'PlusJakartaSans_800ExtraBold',
    fontSize:      22,
    letterSpacing: -0.4,
    lineHeight:    26,
    color:         colors.white,
    textAlign:     'center',
  },
  charTitle: {
    fontFamily:    'PlusJakartaSans_700Bold',
    fontSize:      12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color:         'rgba(255,255,255,0.5)',
    textAlign:     'center',
  },
  charDesc: {
    ...typography.body,
    color:    'rgba(255,255,255,0.75)',
    maxWidth: 260,
    textAlign:'center',
    marginTop: spacing.xs,
  },
  charDots: {
    flexDirection: 'row',
    gap:           7,
    marginTop:     spacing.md + 4,
  },
  charDot: {
    width:           7,
    height:          7,
    borderRadius:    3.5,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  charDotActive: {
    backgroundColor: colors.white,
    transform:       [{ scale: 1.4 }],
  },
});
