/**
 * Student Dropdown Styles — React Native
 * Mirrors frontend/src/styles/student-dropdown.css
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows } from './tokens';

export const studentDropdownStyles = StyleSheet.create({
  // Trigger button
  trigger: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radii.full, backgroundColor: 'rgba(30,14,70,0.6)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.2)' },
  triggerActive: { borderColor: 'rgba(192,132,252,0.4)', backgroundColor: 'rgba(112,42,225,0.15)' },
  triggerAvatar: { width: 30, height: 30, borderRadius: 15, overflow: 'hidden', flexShrink: 0 },
  triggerAvatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  triggerAvatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  triggerAvatarText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: colors.white },
  triggerLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: 'rgba(204,195,216,0.85)', maxWidth: 100 },
  triggerChevron: { fontSize: 12, color: 'rgba(204,195,216,0.5)' },

  // Dropdown modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  dropdown: { position: 'absolute', top: 60, right: spacing.md, width: 240, backgroundColor: 'rgba(20,10,50,0.97)', borderWidth: 1, borderColor: 'rgba(150,110,255,0.2)', borderRadius: radii.lg, overflow: 'hidden', ...shadows.nbLg },
  dropdownHeader: { paddingVertical: 10, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(150,110,255,0.1)' },
  dropdownHeaderText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: 'rgba(150,110,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.55 },

  // Student item
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(150,110,255,0.07)' },
  itemActive: { backgroundColor: 'rgba(124,58,237,0.12)' },
  itemLast: { borderBottomWidth: 0 },
  itemAvatar: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', flexShrink: 0 },
  itemAvatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  itemAvatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemAvatarText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: colors.white },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: 'rgba(233,221,255,0.9)' },
  itemGrade: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: 'rgba(204,195,216,0.5)', marginTop: 1 },
  itemCheck: { fontSize: 18, color: '#c084fc', flexShrink: 0 },

  // Add child row
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: spacing.md },
  addIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(112,42,225,0.15)', borderWidth: 1.5, borderColor: 'rgba(192,132,252,0.25)', alignItems: 'center', justifyContent: 'center' },
  addIconText: { fontSize: 22, color: '#c084fc' },
  addLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: '#c084fc' },
});
