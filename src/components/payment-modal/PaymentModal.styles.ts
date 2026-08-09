import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor:
        'rgba(0, 0, 0, 0.78)',
    },

    container: {
      width: '100%',
      maxWidth: 520,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#181818',
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#333333',
    },

    title: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '800',
    },

    closeButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#292929',
    },

    closeButtonText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '700',
    },

    totalSection: {
      alignItems: 'center',
      paddingVertical: 22,
    },

    totalLabel: {
      color: '#AAAAAA',
      fontSize: 13,
    },

    totalAmount: {
      color: '#FFBF00',
      fontSize: 34,
      fontWeight: '900',
      marginTop: 4,
    },

    sectionLabel: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
      marginHorizontal: 18,
      marginBottom: 10,
    },

    paymentMethodRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 18,
    },

    paymentMethodButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#555555',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#242424',
    },

    paymentMethodButtonSelected: {
      borderColor: '#FFBF00',
      backgroundColor: '#3A3100',
    },

    paymentMethodText: {
      color: '#BBBBBB',
      fontSize: 14,
      fontWeight: '700',
    },

    paymentMethodTextSelected: {
      color: '#FFBF00',
    },

    cashSection: {
      paddingHorizontal: 18,
      paddingTop: 18,
    },

    inputLabel: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 7,
    },

    input: {
      minHeight: 48,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#555555',
      paddingHorizontal: 12,
      color: '#FFFFFF',
      backgroundColor: '#252525',
      fontSize: 20,
      fontWeight: '700',
    },

    insufficientText: {
      color: '#FF6B6B',
      fontSize: 12,
      marginTop: 6,
    },

    changeSection: {
      marginTop: 16,
      padding: 14,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      backgroundColor: '#222222',
    },

    changeLabel: {
      color: '#CCCCCC',
      fontSize: 14,
      fontWeight: '600',
    },

    changeAmount: {
      color: '#4CAF50',
      fontSize: 24,
      fontWeight: '900',
    },

    cardMessage: {
      marginHorizontal: 18,
      marginTop: 18,
      padding: 14,
      borderRadius: 8,
      backgroundColor: '#222222',
      borderWidth: 1,
      borderColor: '#444444',
    },

    cardMessageText: {
      color: '#CCCCCC',
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },

    footer: {
      flexDirection: 'row',
      gap: 12,
      padding: 18,
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#333333',
    },

    cancelButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#555555',
      backgroundColor: '#292929',
    },

    cancelButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },

    confirmButton: {
      flex: 1.4,
      minHeight: 46,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFBF00',
    },

    confirmButtonDisabled: {
      backgroundColor: '#444444',
    },

    confirmButtonText: {
      color: '#181818',
      fontSize: 14,
      fontWeight: '900',
    },

    confirmButtonTextDisabled: {
      color: '#888888',
    },
  });