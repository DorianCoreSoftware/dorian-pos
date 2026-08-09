import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 12,
      backgroundColor: '#121212',
    },

    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#121212',
      padding: 24,
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
      marginTop: 3,
    },

    refreshButton: {
      minHeight: 40,
      paddingHorizontal: 14,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#FFBF00',
      backgroundColor: '#2A2400',
    },

    refreshButtonText: {
      color: '#FFBF00',
      fontSize: 13,
      fontWeight: '800',
    },

    summaryContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 22,
    },

    summaryCard: {
      flex: 1,
      minHeight: 95,
      padding: 14,
      borderRadius: 12,
      justifyContent:
        'space-between',
      borderWidth: 1,
      borderColor: '#353535',
      backgroundColor: '#1D1D1D',
    },

    totalCard: {
      borderColor: '#FFBF00',
      backgroundColor: '#302800',
    },

    summaryLabel: {
      color: '#AFAFAF',
      fontSize: 12,
      fontWeight: '600',
    },

    totalValue: {
      color: '#FFBF00',
      fontSize: 26,
      fontWeight: '900',
    },

    summaryValue: {
      color: '#FFFFFF',
      fontSize: 23,
      fontWeight: '800',
    },

    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 10,
    },

    listTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '800',
    },

    listCount: {
      color: '#888888',
      fontSize: 12,
    },

    salesList: {
      paddingBottom: 24,
    },

    saleCard: {
      padding: 15,
      marginBottom: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#343434',
      backgroundColor: '#1C1C1C',
    },

    saleCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    ticketNumber: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },

    saleDate: {
      color: '#888888',
      fontSize: 11,
      marginTop: 3,
    },

    saleAmount: {
      color: '#FFBF00',
      fontSize: 20,
      fontWeight: '900',
    },

    separator: {
      height: 1,
      backgroundColor: '#303030',
      marginVertical: 12,
    },

    paymentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    paymentLabel: {
      color: '#AAAAAA',
      fontSize: 12,
    },

    paymentBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
    },

    cashBadge: {
      borderColor: '#4CAF50',
      backgroundColor: '#17331A',
    },

    cardBadge: {
      borderColor: '#4DA6FF',
      backgroundColor: '#142A3D',
    },

    paymentBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },

    cashDetails: {
      marginTop: 12,
      padding: 10,
      borderRadius: 8,
      backgroundColor: '#242424',
    },

    detailRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      marginVertical: 2,
    },

    detailLabel: {
      color: '#999999',
      fontSize: 12,
    },

    detailValue: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },

    changeValue: {
      color: '#4CAF50',
      fontSize: 14,
      fontWeight: '900',
    },

    loadingText: {
      color: '#CCCCCC',
      fontSize: 14,
      marginTop: 12,
    },

    errorTitle: {
      color: '#FF6B6B',
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
    },

    errorMessage: {
      color: '#CCCCCC',
      fontSize: 13,
      textAlign: 'center',
      marginTop: 8,
      maxWidth: 460,
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

    inlineError: {
      marginBottom: 10,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#633333',
      backgroundColor: '#321919',
    },

    inlineErrorText: {
      color: '#FF9A9A',
      fontSize: 12,
    },

    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 60,
    },

    emptyIcon: {
      fontSize: 42,
      marginBottom: 10,
    },

    emptyTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '800',
    },

    emptyText: {
      color: '#888888',
      fontSize: 13,
      textAlign: 'center',
      marginTop: 5,
    },

    filtersContainer: {
  flexDirection: 'row',
  gap: 10,
  marginBottom: 16,
},

filterButton: {
  minHeight: 38,
  paddingHorizontal: 14,
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#444444',
  backgroundColor: '#1D1D1D',
},

filterButtonActive: {
  borderColor: '#FFBF00',
  backgroundColor: '#302800',
},

filterButtonText: {
  color: '#AAAAAA',
  fontSize: 12,
  fontWeight: '700',
},

filterButtonTextActive: {
  color: '#FFBF00',
},
  });

  