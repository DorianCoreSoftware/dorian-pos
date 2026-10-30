import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    gap: 13,
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
  refreshButton: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 160,
    minWidth: 150,
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  goodBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  checks: {
    gap: 0,
  },
  checkRow: {
    minHeight: 62,
    borderTopWidth: 1,
    paddingVertical: 9,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  statusBadge: {
    minWidth: 78,
    minHeight: 28,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  footer: {
    fontSize: 10,
    lineHeight: 16,
  },
});
