import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 7,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  notesInput: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  twoColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  column: {
    flexGrow: 1,
    flexBasis: 260,
    minWidth: 220,
  },
  preview: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 2,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  previewValue: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 3,
  },
  previewHint: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 5,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 18,
  },
  buttonMuted: {
    opacity: 0.58,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '900',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900',
  },
  successFolio: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 12,
  },
  successText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  successTotal: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 14,
  },
});

export default styles;
