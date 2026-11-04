import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
  },

  card: {
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    paddingBottom: 32,
    gap: 14,
  },
  loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '900' },
  subtitle: { fontSize: 13, lineHeight: 19, maxWidth: 820 },
  switchRow: { borderWidth: 1, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 16 },
  switchText: { flex: 1, gap: 4 },
  fieldTitle: { fontSize: 14, fontWeight: '900' },
  help: { fontSize: 12, lineHeight: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flexGrow: 1, flexBasis: 260, gap: 6 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12 },
  notes: { minHeight: 86, borderWidth: 1, borderRadius: 10, padding: 12, textAlignVertical: 'top' },
  preview: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  previewText: { fontSize: 12, lineHeight: 18 },
  clabe: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  saveButton: { minHeight: 46, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
