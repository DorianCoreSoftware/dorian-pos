import {
  StyleSheet,
} from 'react-native';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor:
      'rgba(0, 0, 0, 0.78)',
  },

  modalContainer: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '94%',
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#444444',
    backgroundColor: '#181818',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },

  subtitle: {
    color: '#AAAAAA',
    fontSize: 13,
    marginTop: 3,
  },

  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: '#292929',
  },

  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  scrollView: {
    flexGrow: 0,
  },

  scrollContent: {
    padding: 18,
    paddingBottom: 24,
  },

  sectionTitle: {
    color: '#FFBF00',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  rowField: {
    flex: 1,
  },

  inputContainer: {
    marginBottom: 14,
  },

  inputLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
  },

  input: {
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A4A4A',
    backgroundColor: '#252525',
    color: '#FFFFFF',
    fontSize: 14,
  },

  multilineInput: {
    minHeight: 90,
  },

  inputError: {
    borderColor: '#FF5252',
  },

  errorText: {
    color: '#FF6B6B',
    fontSize: 11,
    marginTop: 5,
  },

  characterCounter: {
    color: '#777777',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },

  mapPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#555555',
    backgroundColor: '#222222',
  },

  mapIcon: {
    fontSize: 24,
    marginRight: 12,
  },

  mapTextContainer: {
    flex: 1,
  },

  mapTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  mapDescription: {
    color: '#999999',
    fontSize: 11,
    marginTop: 3,
  },

  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    backgroundColor: '#1C1C1C',
  },

  cancelButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555555',
    backgroundColor: '#292929',
  },

  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  confirmButton: {
    flex: 1.4,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#FFBF00',
  },

  confirmButtonDisabled: {
    backgroundColor: '#4A4A4A',
  },

  confirmButtonText: {
    color: '#1B1B1B',
    fontSize: 14,
    fontWeight: '800',
  },

  confirmButtonTextDisabled: {
    color: '#999999',
  },
});