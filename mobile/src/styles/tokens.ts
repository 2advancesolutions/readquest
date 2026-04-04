/**
 * ReadQuest Design Tokens — React Native
 * Mirrors frontend/src/styles/design-tokens.css
 *
 * Usage:
 *   import { colors, spacing, radii, shadows, gradients, typography } from '../styles/tokens';
 */
import { Platform } from 'react-native';

// ── Brand Colors ─────────────────────────────────────────────────────────────
export const colors = {
  // Purple
  purple:        '#702AE1',
  purpleLight:   '#B28CFF',
  purpleLight2:  '#EDE9FE',
  purpleDark:    '#5B1BB8',
  purpleDim:     '#6411D5',

  // Gold / Yellow
  gold:          '#FFD709',
  goldDark:      '#6C5A00',
  yellow:        '#FFB623',
  yellowLight:   '#FFC96F',

  // Accent
  coral:         '#F74B6D',
  coralLight:    '#FF8EAC',
  green:         '#007439',
  greenLight:    '#6DFE9C',

  // Surface hierarchy (light theme)
  bg:            '#FFFFFF',
  surfaceLow:    '#F9F9FB',
  surface:       '#F3F0FA',
  surfaceHigh:   '#EDE9F6',
  surfaceHighest:'#E7E2F2',
  card:          '#FFFFFF',
  cardAlt:       '#F7F3FF',

  // Text (light theme)
  text:          '#322C3D',
  textMuted:     '#69537B',
  textLight:     '#ADA3B8',
  onPrimary:     '#F8F0FF',

  // Night-Bloom dark theme
  nbBg:          '#080418',
  nbBgMid:       '#110729',
  nbBgDeep:      '#0d0520',
  nbCard:        'rgba(20, 10, 50, 0.7)',
  nbCardSolid:   '#1a1033',
  nbBorder:      'rgba(150, 110, 255, 0.15)',
  nbBorderHover: 'rgba(192, 132, 252, 0.3)',
  nbText:        'rgba(233, 221, 255, 0.9)',
  nbTextMuted:   'rgba(204, 195, 216, 0.6)',
  nbTextDim:     'rgba(204, 195, 216, 0.4)',

  // Games / Arcade
  gaText:        '#e9e3f5',
  gaMuted:       'rgba(204, 195, 216, 0.6)',
  gaPurple:      '#702ae1',
  gaPurple2:     '#9b5eff',
  gaGold:        '#f59e0b',
  gaGreen:       '#22c55e',
  gaRed:         '#ef4444',

  // Utility
  white:         '#FFFFFF',
  black:         '#000000',
  transparent:   'transparent',
} as const;

// ── Spacing ───────────────────────────────────────────────────────────────────
export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  40,
  '2xl': 64,
} as const;

// ── Border Radii ──────────────────────────────────────────────────────────────
export const radii = {
  sm:   12,
  md:   16,
  lg:   24,
  xl:   32,
  full: 9999,
} as const;

// ── Platform-correct Shadows ──────────────────────────────────────────────────
type ShadowStyle = {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
};

const makeShadow = (
  color: string,
  offsetY: number,
  radius: number,
  opacity: number,
  elevation: number,
): ShadowStyle =>
  Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation },
    default: {},
  }) as ShadowStyle;

export const shadows = {
  sm:   makeShadow('#702AE1', 4,  16,  0.06, 2),
  md:   makeShadow('#702AE1', 8,  32,  0.08, 4),
  lg:   makeShadow('#702AE1', 20, 40,  0.10, 8),
  card: makeShadow('#322C3D', 4,  24,  0.06, 3),
  gold: makeShadow('#FFD709', 4,  20,  0.40, 6),

  // Night-Bloom dark shadows
  nbSm:   makeShadow('#0a041c', 4,  16,  0.40, 3),
  nbMd:   makeShadow('#0a041c', 8,  32,  0.50, 6),
  nbLg:   makeShadow('#0a041c', 20, 48,  0.60, 10),
  purple: makeShadow('#702AE1', 4,  20,  0.45, 8),
  purpleLg: makeShadow('#702AE1', 8, 28,  0.60, 12),
} as const;

// ── Gradient Configs (for expo-linear-gradient <LinearGradient>) ──────────────
export type GradientConfig = {
  colors: string[];
  start:  { x: number; y: number };
  end:    { x: number; y: number };
  locations?: number[];
};

export const gradients = {
  primary: {
    colors: ['#702AE1', '#6411D5'],
    start:  { x: 0, y: 0 },
    end:    { x: 1, y: 1 },
  },
  primaryBtn: {
    colors:    ['#702AE1', '#6411D5'],
    start:     { x: 0.15, y: 0 },
    end:       { x: 0.85, y: 1 },
    locations: [0, 1],
  },
  nightBloom: {
    colors:    ['#080418', '#110729', '#0d0520'],
    start:     { x: 0, y: 0 },
    end:       { x: 0.6, y: 1 },
    locations: [0, 0.45, 1],
  },
  gold: {
    colors: ['#FFD709', '#FFB623'],
    start:  { x: 0.15, y: 0 },
    end:    { x: 0.85, y: 1 },
  },
  goldDark: {
    colors: ['#B46400', '#EAB308'],
    start:  { x: 0.15, y: 0 },
    end:    { x: 0.85, y: 1 },
  },
  studioGold: {
    colors: ['rgba(180,100,0,0.9)', 'rgba(234,179,8,0.85)'],
    start:  { x: 0.15, y: 0 },
    end:    { x: 0.85, y: 1 },
  },
  purpleCard: {
    colors: ['rgba(20,10,50,0.85)', 'rgba(30,14,70,0.7)'],
    start:  { x: 0, y: 0 },
    end:    { x: 0, y: 1 },
  },
  arcadeTitle: {
    colors: ['#c084fc', '#702ae1', '#f472b6'],
    start:  { x: 0.15, y: 0 },
    end:    { x: 0.85, y: 1 },
  },
  lbTitle: {
    colors: ['#ffe066', '#f59e0b', '#ff9c40', '#fbbf24'],
    start:  { x: 0.15, y: 0 },
    end:    { x: 0.85, y: 1 },
  },
  silverPodium: {
    colors: ['rgba(148,163,184,0.2)', 'rgba(148,163,184,0.05)'],
    start:  { x: 0, y: 0 },
    end:    { x: 0, y: 1 },
  },
  bronzePodium: {
    colors: ['rgba(180,120,60,0.2)', 'rgba(180,120,60,0.05)'],
    start:  { x: 0, y: 0 },
    end:    { x: 0, y: 1 },
  },
  goldPodium: {
    colors: ['rgba(251,191,36,0.22)', 'rgba(245,158,11,0.06)'],
    start:  { x: 0, y: 0 },
    end:    { x: 0, y: 1 },
  },
  levelComplete: {
    colors: ['#fbbf24', '#f59e0b', '#d97706'],
    start:  { x: 0.15, y: 0 },
    end:    { x: 0.85, y: 1 },
  },
  readerBg: {
    colors: ['#0b0820', '#08051a'],
    start:  { x: 0, y: 0 },
    end:    { x: 0, y: 1 },
  },
  green: {
    colors: ['#22c55e', '#16a34a'],
    start:  { x: 0, y: 0 },
    end:    { x: 1, y: 0 },
  },
} as const satisfies Record<string, GradientConfig>;

// ── Typography ────────────────────────────────────────────────────────────────
// Assumes @expo-google-fonts/plus-jakarta-sans is loaded in _layout.tsx
// Font family names match what expo-google-fonts registers
export const typography = {
  h1: {
    fontFamily:    'PlusJakartaSans_800ExtraBold',
    fontSize:      32,
    lineHeight:    37,
    letterSpacing: -0.64,
  },
  h2: {
    fontFamily:    'PlusJakartaSans_800ExtraBold',
    fontSize:      24,
    lineHeight:    28,
    letterSpacing: -0.48,
  },
  h3: {
    fontFamily:    'PlusJakartaSans_800ExtraBold',
    fontSize:      20,
    lineHeight:    23,
    letterSpacing: -0.3,
  },
  h4: {
    fontFamily:    'PlusJakartaSans_700Bold',
    fontSize:      18,
    lineHeight:    21,
  },
  bodyLg: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize:   16,
    lineHeight: 27,
  },
  body: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize:   14,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize:   12,
    lineHeight: 20,
  },
  label: {
    fontFamily:    'PlusJakartaSans_700Bold',
    fontSize:      11,
    letterSpacing: 0.66,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize:   10,
    lineHeight: 14,
  },
} as const;

// ── Z-Index ───────────────────────────────────────────────────────────────────
export const zIndex = {
  overlay: 900,
  modal:   1000,
  toast:   1100,
} as const;
