/**
 * Games Arcade Styles — React Native
 * Mirrors frontend/src/styles/games.css (Night-Bloom × Prodigy)
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

const GA = {
  bg:      '#0b0718',
  surface: 'rgba(255,255,255,0.05)',
  border:  'rgba(255,255,255,0.1)',
  text:    '#e9e3f5',
  muted:   'rgba(204,195,216,0.6)',
  purple:  '#702ae1',
  purple2: '#9b5eff',
  gold:    '#f59e0b',
  green:   '#22c55e',
  red:     '#ef4444',
};

export const gamesStyles = StyleSheet.create({
  // ── Arcade hub root ───────────────────────────────────────────────
  root: { flex: 1, backgroundColor: GA.bg },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 80 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md, marginBottom: 36 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: GA.border, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 99 },
  backBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: GA.muted },
  titleWrap: { alignItems: 'center', flex: 1 },
  titleText: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 32, letterSpacing: -0.64, color: '#c084fc', lineHeight: 36, textAlign: 'center' },
  subtitle: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 16, color: GA.muted, marginTop: 4, textAlign: 'center' },
  sfxBtn: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: GA.border, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99 },
  sfxBtnText: { fontSize: 18 },

  // Grade filter
  gradeFilter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center', flexWrap: 'wrap', marginBottom: spacing.xl },
  gradeLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: GA.muted, letterSpacing: 0.56 },
  gradePill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)' },
  gradePillText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: GA.muted },
  gradePillActive: { borderColor: 'transparent', ...shadows.purple },
  gradePillActiveText: { color: colors.white },

  // Game card
  card: { borderRadius: 22, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden', gap: 12, marginBottom: 0 },
  cardEmoji: { fontSize: 44, lineHeight: 52 },
  cardTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 19, color: colors.white, lineHeight: 23 },
  cardDesc: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: GA.muted, lineHeight: 21 },
  cardGradeBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start' },
  cardGradeBadgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  cardLevel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: 'auto' },
  cardLevelText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  cardProgressTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' },
  cardProgressFill: { height: '100%', borderRadius: 99 },
  cardLocked: { opacity: 0.6 },
  lockOverlay: { position: 'absolute', inset: 0, top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(11,7,24,0.7)', borderRadius: 22 },
  lockIcon: { fontSize: 32 },
  lockText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: GA.muted, textAlign: 'center' },

  // ── Gameplay shell ────────────────────────────────────────────────
  gpRoot: { flex: 1, backgroundColor: GA.bg },

  // HUD
  hud: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: spacing.md, backgroundColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)', flexWrap: 'wrap' },
  gpBack: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: GA.border, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 99, flexShrink: 0 },
  gpBackText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: GA.muted },
  gpGameTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: colors.white, flexShrink: 0 },
  levelBadge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 99, flexShrink: 0, ...shadows.purple },
  levelBadgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: colors.white },
  xpBadge: { backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 99, flexShrink: 0 },
  xpBadgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: GA.gold },
  hearts: { flexDirection: 'row', gap: 4, flexShrink: 0 },
  heartText: { fontSize: 18 },
  heartLost: { opacity: 0.2 },

  // Streak bar
  streakBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: spacing.md, backgroundColor: 'rgba(255,255,255,0.02)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  streakLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: GA.muted },
  streakDots: { flexDirection: 'row', gap: 5 },
  streakDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  streakDotLit: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  streakDotFire: { backgroundColor: '#ef4444', borderColor: '#ef4444' },

  // Question progress
  qProgress: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  qTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' },
  qFill: { height: '100%', borderRadius: 99 },
  qLabel: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: GA.muted, marginTop: 4, textAlign: 'right' },

  // Body
  gpBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },

  // Correct flash overlay
  correctFlash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(34,197,94,0.12)', zIndex: 999 },

  // Level complete overlay
  levelComplete: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,7,24,0.92)', alignItems: 'center', justifyContent: 'center', gap: spacing.md, zIndex: 200 },
  lcEmoji: { fontSize: 80 },
  lcTitle: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 40, color: '#fbbf24', textAlign: 'center' },
  lcXp: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 19, color: GA.gold },
  lcStars: { flexDirection: 'row', gap: spacing.sm, fontSize: 40 },
  lcActions: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: spacing.sm },
  lcNext: { borderRadius: 99, paddingVertical: 12, paddingHorizontal: 28, ...shadows.purple },
  lcNextText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: colors.white },
  lcRetry: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 99 },
  lcRetryText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: GA.muted },

  // Failed overlay
  failed: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,7,24,0.92)', alignItems: 'center', justifyContent: 'center', gap: 14, zIndex: 200 },
  failedEmoji: { fontSize: 64 },
  failedTitle: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 32, color: colors.white, textAlign: 'center' },
  failedSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 16, color: GA.muted, textAlign: 'center' },

  // ── Rhyme Time ────────────────────────────────────────────────────
  rtRoot: { alignItems: 'center', gap: spacing.lg, width: '100%', maxWidth: 580 },
  rtWordDisplay: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 64, textAlign: 'center', color: '#FF6B9D', lineHeight: 70 },
  rtPrompt: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16, color: GA.muted, textTransform: 'uppercase', letterSpacing: 1.6 },
  rtChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, width: '100%' },
  rtChoice: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,107,157,0.08)', borderWidth: 2, borderColor: 'rgba(255,107,157,0.2)', borderRadius: 16, paddingVertical: spacing.md, alignItems: 'center' },
  rtChoiceText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: colors.white },
  rtChoiceCorrect: { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: '#22c55e' },
  rtChoiceWrong: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' },

  // ── Sentence Builder ──────────────────────────────────────────────
  sbRoot: { alignItems: 'center', gap: spacing.lg, width: '100%', maxWidth: 700 },
  sbPrompt: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: GA.muted, textTransform: 'uppercase', letterSpacing: 1.4 },
  sbAnswerSlots: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, minHeight: 60, width: '100%', backgroundColor: 'rgba(79,172,254,0.05)', borderWidth: 2, borderColor: 'rgba(79,172,254,0.25)', borderStyle: 'dashed', borderRadius: 16, padding: 14, justifyContent: 'center', alignItems: 'center' },
  sbWordTile: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 2, borderColor: 'transparent' },
  sbWordTileBank: { backgroundColor: 'rgba(79,172,254,0.12)', borderColor: 'rgba(79,172,254,0.3)' },
  sbWordTileBankText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#4facfe' },
  sbWordTilePlaced: { backgroundColor: 'rgba(79,172,254,0.2)', borderColor: 'rgba(79,172,254,0.5)' },
  sbWordTilePlacedText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: colors.white },
  sbWordTileCorrect: { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: '#22c55e' },
  sbWordTileCorrectText: { color: '#22c55e' },
  sbWordTileWrong: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' },
  sbWordTileWrongText: { color: '#ef4444' },
  sbBank: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', width: '100%' },
  sbCheckBtn: { borderRadius: 99, paddingVertical: 12, paddingHorizontal: spacing.xl, ...shadows.purple },
  sbCheckBtnText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: '#0b0718' },
  sbCheckBtnDisabled: { opacity: 0.5 },

  // ── Synonym Showdown ──────────────────────────────────────────────
  ssRoot: { alignItems: 'center', gap: spacing.md, width: '100%', maxWidth: 600 },
  ssModePill: { paddingVertical: 4, paddingHorizontal: 16, borderRadius: 99, borderWidth: 1 },
  ssModePillSynonym: { backgroundColor: 'rgba(240,147,251,0.15)', borderColor: 'rgba(240,147,251,0.35)' },
  ssModePillSynonymText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#f093fb', textTransform: 'uppercase', letterSpacing: 0.96 },
  ssModePillAntonym: { backgroundColor: 'rgba(245,87,108,0.15)', borderColor: 'rgba(245,87,108,0.35)' },
  ssModePillAntonymText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#f5576c', textTransform: 'uppercase', letterSpacing: 0.96 },
  ssTimerBar: { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' },
  ssTimerFill: { height: '100%', borderRadius: 99 },
  ssArena: { width: '100%', backgroundColor: 'rgba(240,147,251,0.05)', borderWidth: 2, borderColor: 'rgba(240,147,251,0.15)', borderRadius: 20, padding: spacing.xl, alignItems: 'center' },
  ssBattleWord: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 48, color: '#F093FB', textAlign: 'center', marginBottom: 0 },
  ssChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%' },
  ssChoice: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(240,147,251,0.08)', borderWidth: 2, borderColor: 'rgba(240,147,251,0.18)', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  ssChoiceText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: colors.white },
  ssChoiceCorrect: { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: '#22c55e' },
  ssChoiceWrong: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' },

  // ── Vocabulary Vault ──────────────────────────────────────────────
  vvRoot: { alignItems: 'center', gap: spacing.md, width: '100%', maxWidth: 700 },
  vvTimerBar: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' },
  vvTimerFill: { height: '100%', borderRadius: 99 },
  vvPairsGrid: { flexDirection: 'row', gap: 10, width: '100%' },
  vvCol: { flex: 1, gap: spacing.sm },
  vvItem: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', alignItems: 'center' },
  vvItemWord: { backgroundColor: 'rgba(67,233,123,0.1)', borderColor: 'rgba(67,233,123,0.25)' },
  vvItemWordText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: '#43e97b', textAlign: 'center' },
  vvItemDef: { backgroundColor: 'rgba(56,249,215,0.07)', borderColor: 'rgba(56,249,215,0.2)' },
  vvItemDefText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 19 },
  vvItemSelected: { opacity: 1 },
  vvItemMatched: { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: '#22c55e', opacity: 0.7 },
  vvItemMatchedText: { color: '#22c55e' },
  vvItemWrong: { borderColor: '#ef4444' },

  // ── Phonics Power ─────────────────────────────────────────────────
  ppRoot: { alignItems: 'center', gap: 22, width: '100%', maxWidth: 580 },
  ppInstruction: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: 'rgba(220,210,255,0.85)', textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center' },
  ppSpeaker: { width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(250,112,154,0.15)', borderWidth: 3, borderColor: 'rgba(250,112,154,0.5)', alignItems: 'center', justifyContent: 'center' },
  ppSpeakerText: { fontSize: 60 },
  ppChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, width: '100%', justifyContent: 'center' },
  ppChoice: { flex: 1, minWidth: '45%', borderWidth: 2, borderRadius: 16, paddingVertical: spacing.md, alignItems: 'center', backgroundColor: 'rgba(250,112,154,0.08)', borderColor: 'rgba(250,112,154,0.2)' },
  ppChoiceText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: colors.white },
  ppChoiceCorrect: { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: '#22c55e' },
  ppChoiceWrong: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' },

  // Shared choice states
  choiceCorrectText: { color: '#22c55e' },
  choiceWrongText: { color: '#ef4444' },
});
