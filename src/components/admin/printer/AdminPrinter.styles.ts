import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    container: {
      flex: 1,
    },

    content: {
      paddingBottom: 24,
    },

    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      color: '#999999',
      marginTop: 12,
      fontSize: 13,
    },

    card: {
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
      padding: 22,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#353535',
      backgroundColor: '#1D1D1D',
    },

    title: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '900',
    },

    subtitle: {
      color: '#999999',
      fontSize: 13,
      marginTop: 5,
      marginBottom: 22,
    },

    label: {
      color: '#DDDDDD',
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 7,
      marginTop: 14,
    },

    input: {
      minHeight: 46,
      paddingHorizontal: 13,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#171717',
      color: '#FFFFFF',
      fontSize: 14,
    },

    readOnlyField: {
      minHeight: 46,
      paddingHorizontal: 13,
      justifyContent: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#333333',
      backgroundColor: '#242424',
    },

    readOnlyText: {
      color: '#BBBBBB',
      fontSize: 14,
      fontWeight: '700',
    },

    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    addressInput: {
      flex: 1,
    },

    searchButton: {
      minHeight: 46,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#FFBF00',
      backgroundColor: '#302800',
    },

    searchButtonText: {
      color: '#FFBF00',
      fontSize: 12,
      fontWeight: '800',
    },

    devicesContainer: {
      marginTop: 16,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#353535',
      backgroundColor: '#171717',
    },

    devicesTitle: {
      color: '#AAAAAA',
      fontSize: 11,
      fontWeight: '800',
      marginBottom: 8,
    },

    deviceRow: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginTop: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#333333',
      backgroundColor: '#202020',
    },

    deviceRowSelected: {
      borderColor: '#FFBF00',
      backgroundColor: '#302800',
    },

    deviceInfo: {
      flex: 1,
    },

    deviceName: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },

    deviceAddress: {
      color: '#888888',
      fontSize: 11,
      marginTop: 3,
    },

    selectedText: {
      color: '#FFBF00',
      fontSize: 20,
      fontWeight: '900',
      marginLeft: 12,
    },

    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 24,
    },

    testButton: {
      minHeight: 46,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#555555',
      backgroundColor: '#282828',
    },

    testButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },

    saveButton: {
      minHeight: 46,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      backgroundColor: '#FFBF00',
    },

    saveButtonText: {
      color: '#111111',
      fontSize: 13,
      fontWeight: '900',
    },

    buttonDisabled: {
      opacity: 0.5,
    },
  });