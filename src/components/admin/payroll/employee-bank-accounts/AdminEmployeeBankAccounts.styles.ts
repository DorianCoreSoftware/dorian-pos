import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { gap: 12 },
  title: { fontSize: 18, fontWeight: '900' },
  subtitle: { fontSize: 12, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { flexGrow: 1, flexBasis: 300, maxWidth: 430, borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  employeeName: { fontSize: 15, fontWeight: '900' },
  role: { fontSize: 10, fontWeight: '800' },
  field: { gap: 5 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  input: { minHeight: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10 },
  saveButton: { minHeight: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
