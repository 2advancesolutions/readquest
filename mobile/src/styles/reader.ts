/**
 * Reader Styles — React Native
 * Mirrors frontend/src/styles/reader.css (Scholastic Odyssey design)
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

export const readerStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0720' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: '#0d0720' },
  loadingOwl: { fontSize: 56 },
  loadingText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 19, color: '#edd3ff' },

  // Progress bar
  progressBar: { width: '100%', height: 5, backgroundColor: 'rgba(178,140,255,0.15)' },
  progressFill: { height: '100%', borderTopRightRadius: 3, borderBottomRightRadius: 3 },

  // Top bar
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(178,140,255,0.12)', borderWidth: 1, borderColor: 'rgba(178,140,255,0.2)', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, flexShrink: 0 },
  backBtnText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: '#edd3ff' },
  title: { flex: 1, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: '#ffd709', textAlign: 'center', letterSpacing: -0.16 },
  topbarRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  pageCounter: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: 'rgba(237,211,255,0.7)' },
  accBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(112,42,225,0.25)', borderWidth: 1, borderColor: 'rgba(178,140,255,0.3)', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 },
  accBadgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#c09cff' },

  // Phase banner
  phaseBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: spacing.md, marginBottom: spacing.sm, paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: 14, backgroundColor: 'rgba(112,42,225,0.3)', borderWidth: 1, borderColor: 'rgba(178,140,255,0.3)' },
  phaseBannerText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: '#edd3ff' },

  // Book card
  bookContainer: { flex: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  pageCard: { backgroundColor: colors.white, borderRadius: 28, overflow: 'hidden', flex: 1, ...shadows.nbLg },
  cardHeader: { paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: '#ffd709', textAlign: 'center', letterSpacing: -0.16 },

  // Image panel
  imagePanel: { width: '100%', backgroundColor: '#edd3ff', borderBottomWidth: 1, borderBottomColor: 'rgba(112,42,225,0.08)' },
  pageImage: { width: '100%', resizeMode: 'cover' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  imagePlaceholderEmoji: { fontSize: 48 },

  // Text area
  textArea: { flex: 1, padding: 18 },
  bookText: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 19, lineHeight: 35, color: '#3a264b', letterSpacing: 0.19 },

  // Word highlighting
  word: { borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2, overflow: 'hidden' },
  wordCorrect: { color: '#15803d', backgroundColor: 'rgba(34,197,94,0.18)', fontFamily: 'PlusJakartaSans_700Bold' },
  wordWrong: { color: '#b91c1c', backgroundColor: 'rgba(239,68,68,0.16)', fontFamily: 'PlusJakartaSans_700Bold' },
  wordCurrent: { color: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.12)', transform: [{ scale: 1.08 }] },

  // Action bar
  actionBar: { backgroundColor: 'rgba(13,7,32,0.92)', borderTopWidth: 1, borderTopColor: 'rgba(178,140,255,0.2)', paddingTop: 10, paddingBottom: 20, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0 },
  navBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(178,140,255,0.12)', borderWidth: 1.5, borderColor: 'rgba(178,140,255,0.25)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontSize: 18, color: '#edd3ff' },
  pagePill: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(178,140,255,0.08)', borderWidth: 1, borderColor: 'rgba(178,140,255,0.2)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: spacing.md },
  pagePillText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#edd3ff' },
  centerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  micBtn: { height: 44, borderRadius: 999, borderWidth: 2.5, borderColor: 'rgba(178,140,255,0.4)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: 18, ...shadows.purple, flexShrink: 0 },
  micBtnText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: colors.white, textTransform: 'uppercase', letterSpacing: 0.48 },
  micBtnListening: { backgroundColor: '#b91c1c', borderColor: 'rgba(239,68,68,0.5)' },
  ttsBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,215,9,0.12)', borderWidth: 1.5, borderColor: 'rgba(255,215,9,0.3)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ttsBtnText: { fontSize: 18 },
  ttsBtnActive: { backgroundColor: 'rgba(255,215,9,0.25)', borderColor: '#ffd709' },
  nextBtn: { paddingVertical: 11, paddingHorizontal: 20, borderRadius: 999, ...shadows.purple },
  nextBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#f8f0ff' },

  // Quiz panel
  quizPanel: { backgroundColor: colors.white, borderRadius: 28, overflow: 'hidden', flex: 1, ...shadows.nbLg },
  quizHeader: { paddingVertical: 18, paddingHorizontal: spacing.md, alignItems: 'center' },
  quizHeaderTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: '#ffd709', textAlign: 'center' },
  quizHeaderSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: 'rgba(237,211,255,0.85)', marginTop: 4, textAlign: 'center' },
  quizQuestion: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#3a264b', marginHorizontal: 20, marginVertical: 20, lineHeight: 25 },
  quizChoices: { gap: 10, paddingHorizontal: 20, paddingBottom: 16 },
  quizChoice: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, backgroundColor: '#fef3ff', borderWidth: 2, borderColor: '#edd3ff' },
  quizChoiceCorrect: { backgroundColor: '#f0fdf4', borderColor: '#22c55e' },
  quizChoiceWrong: { backgroundColor: '#fef2f2', borderColor: '#ef4444' },
  choiceLetter: { minWidth: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(112,42,225,0.12)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  choiceLetterText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: '#702ae1' },
  choiceLetterCorrect: { backgroundColor: '#22c55e' },
  choiceLetterCorrectText: { color: colors.white },
  choiceLetterWrong: { backgroundColor: '#ef4444' },
  choiceLetterWrongText: { color: colors.white },
  choiceText: { flex: 1, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: '#3a264b', lineHeight: 21 },
  explanation: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: '#fef3ff', borderWidth: 1, borderColor: '#edd3ff' },
  explanationText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: '#69537b', lineHeight: 21 },
  feedback: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 20, marginTop: 12, padding: 14, borderRadius: 14 },
  feedbackCorrect: { backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#22c55e' },
  feedbackWrong: { backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#ef4444' },
  feedbackText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: '#3a264b', lineHeight: 21 },
  continueBtn: { marginHorizontal: 20, marginTop: 16, paddingVertical: 14, borderRadius: 999, alignItems: 'center', ...shadows.purple },
  continueBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#f8f0ff' },

  // Quiz dots
  quizDots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 12 },
  quizDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#edd3ff' },
  quizDotActive: { backgroundColor: '#702ae1' },
  quizDotDone: { backgroundColor: '#22c55e' },

  // Word review
  reviewWordsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: 16 },
  reviewWordCard: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#fef3ff', borderWidth: 2, borderColor: '#edd3ff' },
  reviewWordCardText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#69537b' },
  reviewWordCardActive: { borderColor: '#702ae1' },
  reviewWordCardActiveText: { color: colors.white },
  reviewWordCardCorrect: { backgroundColor: '#f0fdf4', borderColor: '#22c55e' },
  reviewWordCardCorrectText: { color: '#15803d' },
  reviewFocusWord: { fontFamily: 'PlusJakartaSans_900Black', fontSize: 44, color: '#3a264b', letterSpacing: -0.88, textAlign: 'center' },
});
