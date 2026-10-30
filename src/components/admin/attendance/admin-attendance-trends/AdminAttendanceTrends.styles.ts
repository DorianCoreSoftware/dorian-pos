import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    gap: 13,
  },
  loading: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
    minWidth: 260,
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
  contextBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  contextText: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  employeeTable: {
    minWidth: 1150,
  },
  row: {
    minHeight: 67,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRow: {
    minHeight: 38,
  },
  employeeCell: {
    width: 220,
    paddingHorizontal: 8,
  },
  trendCell: {
    width: 165,
    paddingHorizontal: 8,
  },
  metricCell: {
    width: 135,
    paddingHorizontal: 8,
  },
  sampleCell: {
    width: 120,
    paddingHorizontal: 8,
  },
  patternHeader: {
    flexDirection: 'row',
    gap: 10,
  },
  patternSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  smallSummary: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 190,
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
  },
  weekdayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayCard: {
    flexGrow: 1,
    flexBasis: 190,
    minWidth: 175,
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
  },
  footer: {
    fontSize: 10,
    lineHeight: 16,
  },
});
