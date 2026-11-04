import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  loading: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 8 },
  container: { gap: 18 },
  card: { borderWidth: 1, borderRadius: 14, padding: 18, gap: 14 },
  title: { fontSize: 18, fontWeight: '900' },
  subtitle: { marginTop: 4, fontSize: 12, lineHeight: 18 },
  employeeRow: { gap: 8, paddingVertical: 2 },
  employeeButton: { minWidth: 150, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dayRow: {
    minHeight: 54,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },

  dayRowPhone: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
    paddingVertical: 12,
  },

  dayNameWrap: {
    width: 120,
  },

  dayTopRowPhone: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  dayNameWrapPhone: {
    flex: 1,
    minWidth: 0,
  },

  timeRowPhone: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },

  timeFieldPhone: {
    flex: 1,
    minWidth: 0,
  },

  timeLabel: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 5,
  },

  timeSeparatorPhone: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 1,
  },

  timeInput: {
    width: 82,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    textAlign: 'center',
  },
  saveButton: { alignSelf: 'flex-start', minHeight: 42, borderRadius: 9, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  incidentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  refreshButton: { borderWidth: 1, borderRadius: 8, minHeight: 38, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  incidentRow: { minWidth: 850, minHeight: 58, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },  timeSelector: {
    width: 150,
    minWidth: 130,
  },

});
