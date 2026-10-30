import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    gap: 13,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  help: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
  },
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'flex-end',
  },
  field: {
    minWidth: 150,
    flexGrow: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
  },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  primaryButton: {
    minHeight: 42,
    borderRadius: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  secondaryButton: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  statusBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 7,
  },
  checkRow: {
    minHeight: 48,
    borderTopWidth: 1,
    paddingTop: 7,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  lockBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 9,
  },
  historyHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'flex-start',
  },
  snapshotRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  footer: {
    fontSize: 10,
    lineHeight: 16,
  },
});
