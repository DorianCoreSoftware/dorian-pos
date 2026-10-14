import {
  StyleSheet,
} from 'react-native';

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
    },

    header: {
      minHeight: 70,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
    },

    backButton: {
      minHeight: 42,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },

    backButtonText: {
      fontSize: 14,
      fontWeight: '800',
    },

    headerCopy: {
      flex: 1,
    },

    headerTitle: {
      fontSize: 24,
      fontWeight: '900',
    },

    headerSubtitle: {
      fontSize: 13,
      marginTop: 2,
    },

    scroll: {
      flex: 1,
    },

    content: {
      width: '100%',
      maxWidth: 820,
      alignSelf: 'center',
      padding: 20,
      paddingBottom: 48,
    },

    card: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 20,
      marginBottom: 18,
    },

    cardTitle: {
      fontSize: 22,
      fontWeight: '900',
    },

    cardSubtitle: {
      fontSize: 14,
      marginTop: 6,
      lineHeight: 20,
    },

    modeRow: {
      flexDirection: 'row',
      marginTop: 18,
      marginBottom: 14,
    },

    modeButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 4,
    },

    modeButtonText: {
      fontSize: 13,
      fontWeight: '900',
    },

    label: {
      fontSize: 13,
      fontWeight: '800',
      marginTop: 12,
      marginBottom: 6,
    },

    input: {
      minHeight: 46,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 13,
      fontSize: 15,
    },

    primaryButton: {
      minHeight: 48,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      paddingHorizontal: 18,
    },

    primaryButtonText: {
      fontSize: 14,
      fontWeight: '900',
    },

    secondaryButton: {
      minHeight: 44,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      paddingHorizontal: 16,
    },

    secondaryButtonText: {
      fontSize: 13,
      fontWeight: '900',
    },

    error: {
      marginTop: 14,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 19,
    },

    profileName: {
      fontSize: 22,
      fontWeight: '900',
    },

    profileLine: {
      fontSize: 14,
      marginTop: 6,
    },

    sectionTitle: {
      fontSize: 20,
      fontWeight: '900',
      marginBottom: 12,
    },

    emptyText: {
      fontSize: 14,
      lineHeight: 20,
    },

    orderCard: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
    },

    orderTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    orderCode: {
      flex: 1,
      fontSize: 16,
      fontWeight: '900',
    },

    orderStatus: {
      fontSize: 12,
      fontWeight: '900',
    },

    orderMeta: {
      fontSize: 13,
      marginTop: 5,
    },

    orderItem: {
      fontSize: 13,
      marginTop: 5,
    },

    orderTotal: {
      fontSize: 15,
      fontWeight: '900',
      marginTop: 10,
    },

    loadingWrap: {
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default styles;
