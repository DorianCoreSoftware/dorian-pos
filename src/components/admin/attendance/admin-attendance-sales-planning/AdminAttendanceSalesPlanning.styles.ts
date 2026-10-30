import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    gap: 14,
  },
  loading: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 240,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  settingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  field: {
    flexGrow: 1,
    flexBasis: 170,
    minWidth: 160,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 5,
  },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  primaryButton: {
    minHeight: 42,
    borderRadius: 9,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 180,
    minWidth: 160,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: '900',
  },
  metricLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '900',
  },
  table: {
    minWidth: 980,
  },
  row: {
    minHeight: 54,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRow: {
    minHeight: 38,
  },
  dayCell: {
    width: 190,
    paddingHorizontal: 8,
  },
  smallCell: {
    width: 125,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  moneyCell: {
    width: 145,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  empty: {
    fontSize: 12,
    paddingVertical: 8,
  },
  alertRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertText: {
    flex: 1,
    minWidth: 230,
  },
  alertNumbers: {
    minWidth: 230,
  },
  peakGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  peakCard: {
    flexGrow: 1,
    flexBasis: 230,
    minWidth: 220,
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
  },
  note: {
    fontSize: 11,
    lineHeight: 17,
  },
});
