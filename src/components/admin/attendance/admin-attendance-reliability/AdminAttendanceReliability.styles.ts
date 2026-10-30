import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    gap: 13,
  },
  loading: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    minWidth: 250,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  help: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
  },
  button: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 150,
    minWidth: 145,
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  formulaBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  formulaText: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 17,
  },
  table: {
    minWidth: 1240,
  },
  row: {
    minHeight: 68,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRow: {
    minHeight: 38,
  },
  employeeCell: {
    width: 230,
    paddingHorizontal: 8,
  },
  indexCell: {
    width: 90,
    paddingHorizontal: 8,
  },
  rateCell: {
    width: 120,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  incidentCell: {
    width: 260,
    paddingHorizontal: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 900,
    maxHeight: '90%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  detailMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  detailMetric: {
    minWidth: 140,
    borderWidth: 1,
    borderRadius: 9,
    padding: 10,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  detailRow: {
    borderTopWidth: 1,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 10,
  },
  detailDelta: {
    width: 100,
    alignItems: 'flex-end',
  },
});
