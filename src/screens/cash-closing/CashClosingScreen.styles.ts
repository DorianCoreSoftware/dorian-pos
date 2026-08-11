import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: '#121212',
    },

    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: '#121212',
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 18,
    },

    title: {
      color: '#FFFFFF',
      fontSize: 26,
      fontWeight: '900',
    },

    subtitle: {
      color: '#999999',
      fontSize: 13,
      marginTop: 4,
    },

    loadingText: {
      color: '#CCCCCC',
      marginTop: 12,
    },

    errorTitle: {
      color: '#FF6B6B',
      fontSize: 18,
      fontWeight: '800',
    },

    errorMessage: {
      color: '#CCCCCC',
      marginTop: 8,
      textAlign: 'center',
    },

    retryButton: {
      marginTop: 18,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: '#FFBF00',
    },

    retryButtonText: {
      color: '#171717',
      fontWeight: '900',
    },

    openCashCard: {
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      marginTop: 40,
      padding: 22,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#3A3A3A',
      backgroundColor: '#1D1D1D',
    },

    inputLabel: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
      marginTop: 20,
      marginBottom: 7,
    },

    input: {
      minHeight: 50,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#555555',
      color: '#FFFFFF',
      backgroundColor: '#252525',
      fontSize: 20,
      fontWeight: '800',
    },

    primaryButton: {
      marginTop: 18,
      minHeight: 48,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFBF00',
    },

    primaryButtonText: {
      color: '#171717',
      fontSize: 14,
      fontWeight: '900',
    },

    buttonDisabled: {
      opacity: 0.45,
    },

    openBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: '#17331A',
      borderWidth: 1,
      borderColor: '#4CAF50',
    },

    openBadgeText: {
      color: '#4CAF50',
      fontSize: 12,
      fontWeight: '800',
    },

    summaryContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },

    summaryCard: {
      flex: 1,
      minHeight: 90,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#353535',
      backgroundColor: '#1D1D1D',
      justifyContent:
        'space-between',
    },

    summaryLabel: {
      color: '#AAAAAA',
      fontSize: 12,
      fontWeight: '600',
    },

    summaryValue: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '900',
    },

    closingCard: {
      flex: 1,
      padding: 18,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#3A3A3A',
      backgroundColor: '#1D1D1D',
    },

    closingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 18,
    },

    closingTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '900',
    },

    totalSales: {
      color: '#FFBF00',
      fontSize: 16,
      fontWeight: '900',
    },

    cashCalculation: {
      padding: 14,
      borderRadius: 10,
      backgroundColor: '#242424',
    },

    calculationRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      marginVertical: 4,
    },

    calculationLabel: {
      color: '#AAAAAA',
      fontSize: 13,
    },

    calculationValue: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },

    calculationSeparator: {
      height: 1,
      backgroundColor: '#3A3A3A',
      marginVertical: 10,
    },

    expectedLabel: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },

    expectedValue: {
      color: '#FFBF00',
      fontSize: 20,
      fontWeight: '900',
    },

    differenceContainer: {
      marginTop: 14,
      padding: 14,
      borderRadius: 10,
      backgroundColor: '#242424',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    differenceLabel: {
      color: '#CCCCCC',
      fontSize: 14,
      fontWeight: '700',
    },

    differenceValue: {
      fontSize: 22,
      fontWeight: '900',
    },

    differenceNeutral: {
      color: '#FFFFFF',
    },

    differencePositive: {
      color: '#4CAF50',
    },

    differenceNegative: {
      color: '#FF6B6B',
    },

    closeButton: {
      marginTop: 18,
      minHeight: 50,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#D84343',
    },

    closeButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },
  });