import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 5,
    marginBottom: 16,
    fontSize: 12,
    lineHeight: 18,
  },
  switchRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  switchText: {
    flex: 1,
    minWidth: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowPhone: {
    flexDirection: 'column',
    gap: 0,
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    marginBottom: 7,
    fontSize: 12,
    fontWeight: '800',
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 14,
  },
  saveButton: {
    minHeight: 48,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  saveText: {
    fontSize: 13,
    fontWeight: '900',
  },
  muted: {
    opacity: 0.55,
  },
  dayRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 9,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dayName: {
    fontSize: 13,
    fontWeight: '900',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  timeInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  blockForm: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  blockActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  secondaryButton: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 12,
    fontWeight: '900',
  },
  blockItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    marginBottom: 9,
  },
  blockTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  blockInfo: {
    flex: 1,
    minWidth: 0,
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  blockMeta: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
