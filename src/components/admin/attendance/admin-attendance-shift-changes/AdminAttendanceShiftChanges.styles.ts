import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 18, gap: 12 },
  center: { minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' },
  title: { fontSize: 18, fontWeight: '900' },
  help: { marginTop: 4, fontSize: 11, lineHeight: 17 },
  subtitle: { marginTop: 8, fontSize: 15, fontWeight: '900' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { minWidth: 150, borderWidth: 1, borderRadius: 10, padding: 11 },
  metricNumber: { fontSize: 22, fontWeight: '900' },
  row: { borderTopWidth: 1, paddingTop: 11, flexDirection: 'row', gap: 10, alignItems: 'center' },
  button: { minHeight: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { width: '100%', maxWidth: 720, maxHeight: '90%', borderWidth: 1, borderRadius: 14, padding: 18 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  offer: { borderWidth: 1, borderRadius: 10, padding: 11, marginTop: 8 },
  input: { minHeight: 80, borderWidth: 1, borderRadius: 9, padding: 10, textAlignVertical: 'top', marginTop: 14 },
  actions: { marginTop: 15, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
});
