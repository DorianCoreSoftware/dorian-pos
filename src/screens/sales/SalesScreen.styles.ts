import {
  DEFAULT_BRAND_PRIMARY,
  withAlpha,
} from '../../theme/brandStyles';

import {
  StyleSheet,
} from 'react-native';

const createStyles = (
  primaryColor: string,
) =>
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
      borderColor: primaryColor,
      backgroundColor: '#2A2400',
    },

    refreshButtonText: {
      color: primaryColor,
      fontSize: 13,
      fontWeight: '800',
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
      borderColor: primaryColor,
      backgroundColor: withAlpha(primaryColor, 0.14),
    },

    filterButtonText: {
      color: '#AAAAAA',
      fontSize: 12,
      fontWeight: '700',
    },

    filterButtonTextActive: {
      color: primaryColor,
    },

    customDateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: -6,
      marginBottom: 18,
    },

    customDateContainerSmall: {
      gap: 8,
    },

    dateField: {
      flex: 1,
      minHeight: 64,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#555555',
      backgroundColor: '#1D1D1D',
      justifyContent: 'center',
    },

    dateLabel: {
      color: '#999999',
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 5,
    },

    dateValue: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },

    dateRangeSeparator: {
      color: primaryColor,
      fontSize: 20,
      fontWeight: '900',
    },

    summaryContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 22,
    },

    summaryContainerPhone: {
      flexWrap: 'wrap',
      gap: 10,
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

    summaryCardPhone: {
      flexGrow: 1,
      flexBasis: '47%',
      minWidth: '47%',
      maxWidth: '49%',
      minHeight: 92,
      padding: 12,
    },

    totalCard: {
      borderColor: primaryColor,
      backgroundColor: withAlpha(primaryColor, 0.14),
    },

    netCard: {
      borderColor: primaryColor,
      backgroundColor:
        withAlpha(
          primaryColor,
          0.08,
        ),
    },

    summaryRefundedValue: {
      color: '#E05A5A',
    },

    summaryLabel: {
      color: '#AFAFAF',
      fontSize: 12,
      fontWeight: '600',
    },

    totalValue: {
      color: primaryColor,
      fontSize: 26,
      fontWeight: '900',
    },

    summaryValue: {
      color: '#FFFFFF',
      fontSize: 23,
      fontWeight: '800',
    },

    summaryValueSmall: {
      fontSize: 20,
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

    refundStatusBadge: {
      alignSelf: 'flex-start',
      marginTop: 7,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },

    refundStatusBadgePartial: {
      borderColor: '#D7A83B',
      backgroundColor:
        'rgba(215, 168, 59, 0.13)',
    },

    refundStatusBadgeFull: {
      borderColor: '#E05A5A',
      backgroundColor:
        'rgba(224, 90, 90, 0.13)',
    },

    refundStatusBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
    },

    saleAmount: {
      color: primaryColor,
      fontSize: 20,
      fontWeight: '900',
    },

    separator: {
      height: 1,
      backgroundColor: '#303030',
      marginVertical: 12,
    },

    refundFinancialSummary: {
      marginBottom: 12,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#343434',
      backgroundColor: '#222222',
      flexDirection: 'row',
      gap: 10,
    },

    refundFinancialColumn: {
      flex: 1,
      minWidth: 0,
    },

    refundFinancialLabel: {
      color: '#8F8F8F',
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 4,
    },

    refundFinancialOriginal: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },

    refundFinancialRefunded: {
      color: '#E05A5A',
      fontSize: 13,
      fontWeight: '900',
    },

    refundFinancialNet: {
      color: primaryColor,
      fontSize: 14,
      fontWeight: '900',
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
      backgroundColor: primaryColor,
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

    datePickerOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor:
        'rgba(0, 0, 0, 0.72)',
    },

    datePickerModal: {
      width: '100%',
      maxWidth: 430,
      padding: 18,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#1D1D1D',
    },

    datePickerTitle: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 12,
    },

    datePickerActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },

    datePickerCancelButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#555555',
      backgroundColor: '#292929',
    },

    datePickerCancelText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },

    datePickerConfirmButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: primaryColor,
    },

    datePickerConfirmText: {
      color: '#171717',
      fontSize: 13,
      fontWeight: '900',
    },
    refundHistorySection: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: '#333333',
    },

    refundHistoryToggle: {
      minHeight: 42,
      paddingHorizontal: 12,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: primaryColor,
      backgroundColor:
        withAlpha(
          primaryColor,
          0.09,
        ),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 10,
    },

    refundHistoryToggleText: {
      color: primaryColor,
      fontSize: 12,
      fontWeight: '900',
      textTransform:
        'uppercase',
    },

    refundHistoryChevron: {
      color: primaryColor,
      fontSize: 11,
      fontWeight: '900',
    },

    refundHistoryList: {
      marginTop: 10,
      gap: 8,
    },

    refundHistoryCard: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#3A3A3A',
      backgroundColor: '#222222',
    },

    refundHistoryHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      gap: 12,
    },

    refundHistoryFolio: {
      color: primaryColor,
      fontSize: 13,
      fontWeight: '900',
    },

    refundHistoryDate: {
      marginTop: 3,
      color: '#888888',
      fontSize: 10,
    },

    refundHistoryAmount: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },

    refundHistoryMeta: {
      marginTop: 7,
      color: '#999999',
      fontSize: 11,
      fontWeight: '700',
    },

    refundHistoryReason: {
      marginTop: 7,
      color: '#DDDDDD',
      fontSize: 12,
      fontWeight: '700',
    },

    refundHistoryException: {
      marginTop: 7,
      color: '#FFB36B',
      fontSize: 10,
      fontWeight: '900',
    },

    refundHistoryEmpty: {
      color: '#999999',
      fontSize: 12,
      paddingVertical: 8,
      textAlign: 'center',
    },

    refundReceiptReprintButton: {
      marginTop: 10,
      minHeight: 38,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor:
        primaryColor,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    refundReceiptReprintButtonDisabled: {
      opacity: 0.55,
    },

    refundReceiptReprintButtonText: {
      color: '#121212',
      fontSize: 11,
      fontWeight: '900',
      textTransform:
        'uppercase',
    },



    saleActions: {
  marginTop: 14,
  paddingTop: 14,
  borderTopWidth: 1,
  borderTopColor: '#333333',
},

reprintButton: {
  minHeight: 44,
  paddingHorizontal: 18,
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: primaryColor,
},

reprintButtonDisabled: {
  opacity: 0.6,
},

reprintButtonText: {
  color: '#121212',
  fontSize: 13,
  fontWeight: '900',
  textTransform: 'uppercase',
},

reprintMessage: {
  marginBottom: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderRadius: 8,
  borderWidth: 1,
},

reprintMessageSuccess: {
  backgroundColor:
    'rgba(76, 175, 80, 0.12)',
  borderColor:
    'rgba(76, 175, 80, 0.45)',
},

reprintMessageError: {
  backgroundColor:
    'rgba(244, 67, 54, 0.12)',
  borderColor:
    'rgba(244, 67, 54, 0.45)',
},

reprintMessageText: {
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '700',
},
  });

export let styles =
  createStyles(
    DEFAULT_BRAND_PRIMARY,
  );

export function setBrandPrimaryColor(
  primaryColor: string,
): void {
  styles =
    createStyles(
      primaryColor,
    );
}
