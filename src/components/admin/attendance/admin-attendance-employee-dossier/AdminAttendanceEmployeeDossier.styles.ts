import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 18, gap: 12 },
  title: { fontSize: 22, fontWeight: '900' },
  subtitle: { fontSize: 12, lineHeight: 18 },
  employeeRow: { gap: 8, paddingVertical: 2 },
  employeeButton: { minWidth: 180, borderWidth: 1, borderRadius: 10, padding: 10, gap: 3 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' },
  dateField: { width: 150, gap: 4 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  input: { minHeight: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10 },
  primaryButton: { minHeight: 42, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  profile: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  employeeName: { fontSize: 18, fontWeight: '900' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { minWidth: 145, flexGrow: 1, borderWidth: 1, borderRadius: 10, padding: 10, gap: 5 },
  sectionTitle: { marginTop: 4, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  row: { borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  detail: { fontSize: 11, lineHeight: 17 },
});
