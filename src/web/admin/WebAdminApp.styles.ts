import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    container: {
      flex: 1,
    },

    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },

    loginContainer: {
      flex: 1,
    },

    loadingText: {
      marginTop: 14,
      fontSize: 14,
      fontWeight: '700',
    },

    accessCard: {
      width: '100%',
      maxWidth: 460,
      borderWidth: 1,
      borderRadius: 18,
      padding: 28,
      alignItems: 'center',
    },

    accessTitle: {
      fontSize: 22,
      fontWeight: '900',
      textAlign: 'center',
    },

    accessText: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },

    primaryButton: {
      minHeight: 46,
      alignSelf: 'stretch',
      marginTop: 22,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },

    primaryButtonText: {
      fontSize: 14,
      fontWeight: '900',
    },

    topBar: {
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      paddingHorizontal: 24,
      paddingVertical: 10,
      gap: 20,
    },

    brandBlock: {
      flex: 1,
      minWidth: 0,
    },

    brandName: {
      fontSize: 17,
      fontWeight: '900',
    },

    brandLabel: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: '700',
    },

    userBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    userTextBlock: {
      maxWidth: 240,
      alignItems: 'flex-end',
    },

    userName: {
      fontSize: 12,
      fontWeight: '900',
    },

    userRole: {
      marginTop: 2,
      fontSize: 10,
      fontWeight: '700',
    },

    logoutButton: {
      minHeight: 38,
      borderRadius: 9,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },

    logoutButtonText: {
      fontSize: 11,
      fontWeight: '900',
    },

    adminContent: {
      flex: 1,
      minHeight: 0,
      overflow: 'scroll',
    },
  });
