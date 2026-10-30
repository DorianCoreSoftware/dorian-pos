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
    borderRadius: 9,
    paddingHorizontal: 13,
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
    minWidth: 150,
    flexGrow: 1,
    flexBasis: 160,
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  table: {
    minWidth: 1280,
  },
  tableRow: {
    minHeight: 72,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableHeader: {
    minHeight: 38,
  },
  employeeCell: {
    width: 210,
    paddingHorizontal: 8,
  },
  dateCell: {
    width: 110,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  timeCell: {
    width: 180,
    paddingHorizontal: 8,
  },
  statusCell: {
    width: 210,
    paddingHorizontal: 8,
  },
  deltaCell: {
    width: 150,
    paddingHorizontal: 8,
  },
  actionCell: {
    width: 260,
    paddingHorizontal: 8,
  },
  noteInput: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
    fontSize: 11,
  },
  reviewButton: {
    marginTop: 5,
    minHeight: 30,
    borderWidth: 1,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    fontSize: 10,
    lineHeight: 16,
  },
});
