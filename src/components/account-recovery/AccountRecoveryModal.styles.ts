import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor:
        'rgba(0, 0, 0, 0.78)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      width: '100%',
      maxWidth: 480,
      borderRadius: 16,
      borderWidth: 1,
      padding: 22,
      paddingTop: 26,
      position: 'relative',
    },
    title: {
      fontSize: 22,
      fontWeight: '900',
      marginBottom: 7,
    },
    description: {
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 18,
    },
    label: {
      fontSize: 12,
      fontWeight: '800',
      marginTop: 8,
      marginBottom: 6,
    },
    input: {
      minHeight: 46,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 13,
      fontSize: 15,
    },
    codeInput: {
      textAlign: 'center',
      letterSpacing: 6,
      fontSize: 20,
      fontWeight: '800',
    },
    error: {
      fontSize: 12,
      marginTop: 10,
      lineHeight: 17,
    },
    message: {
      fontSize: 12,
      marginTop: 10,
      lineHeight: 17,
    },
    actions: {
      marginTop: 22,
      alignItems: 'stretch',
      gap: 18,
    },
    button: {
      minHeight: 44,
      minWidth: 118,
      borderRadius: 10,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButton: {
      borderWidth: 1,
    },
    buttonText: {
      fontSize: 13,
      fontWeight: '900',
    },
    successIcon: {
      fontSize: 42,
      textAlign: 'center',
      marginBottom: 8,
    },

    closeButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },

    closeButtonText: {
      fontSize: 20,
      fontWeight: '700',
    },

    resendText: {
      fontSize: 13,
      fontWeight: '700',
      textDecorationLine:
        'underline',
      textAlign: 'center',
    },

    primaryButton: {
      alignSelf: 'stretch',
      width: '100%',
    },
  });
