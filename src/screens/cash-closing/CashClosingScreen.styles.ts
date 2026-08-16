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

    cashTabs: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      padding: 4,
      marginBottom: 18,
      borderRadius: 9,
      backgroundColor: '#242424',
    },

    cashTab: {
      minWidth: 130,
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: 7,
      alignItems: 'center',
    },

    cashTabActive: {
      backgroundColor: '#FFBF00',
    },

    cashTabText: {
      color: '#888888',
      fontSize: 12,
      fontWeight: '800',
    },

    cashTabTextActive: {
      color: '#171717',
    },

    historyScroll: {
      flex: 1,
    },

    historyContent: {
      paddingBottom: 30,
    },

    historyCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 30,
    },

    historyLoadingText: {
      color: '#AAAAAA',
      fontSize: 13,
      marginTop: 10,
    },

    historyEmptyIcon: {
      fontSize: 42,
    },

    historyEmptyTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '900',
      marginTop: 8,
    },

    historyEmptyText: {
      color: '#888888',
      fontSize: 12,
      marginTop: 5,
    },

    historyCard: {
      padding: 16,
      marginBottom: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#343434',
      backgroundColor: '#1D1D1D',
    },

    historyCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    historyDate: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },

    historyOpenedAt: {
      color: '#777777',
      fontSize: 11,
      marginTop: 4,
    },

    closedBadge: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#555555',
      backgroundColor: '#292929',
    },

    closedBadgeText: {
      color: '#AAAAAA',
      fontSize: 9,
      fontWeight: '900',
    },

    historySalesRow: {
      flexDirection: 'row',
      marginTop: 16,
      gap: 8,
    },

    historyMetric: {
      flex: 1,
      padding: 10,
      borderRadius: 8,
      backgroundColor: '#252525',
    },

    historyMetricLabel: {
      color: '#888888',
      fontSize: 10,
      fontWeight: '700',
    },

    historyMetricValue: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
      marginTop: 5,
    },

    historyTotalValue: {
      color: '#FFBF00',
      fontSize: 16,
      fontWeight: '900',
      marginTop: 5,
    },

    historyDivider: {
      height: 1,
      marginVertical: 14,
      backgroundColor: '#333333',
    },

    historyCashGrid: {
      flexDirection: 'row',
      gap: 8,
    },

    historyCashItem: {
      flex: 1,
    },

    historyCashLabel: {
      color: '#777777',
      fontSize: 10,
      marginBottom: 4,
    },

    historyCashValue: {
      color: '#DDDDDD',
      fontSize: 13,
      fontWeight: '700',
    },

    historyDifference: {
      fontSize: 13,
      fontWeight: '900',
    },

    historyFilters: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },

    historyFilterButton: {
      minHeight: 38,
      paddingHorizontal: 14,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#1D1D1D',
    },

    historyFilterButtonActive: {
      borderColor: '#FFBF00',
      backgroundColor: '#302800',
    },

    historyFilterText: {
      color: '#AAAAAA',
      fontSize: 11,
      fontWeight: '800',
    },

    historyFilterTextActive: {
      color: '#FFBF00',
    },

    historyDateRange: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },

    historyDateField: {
      flex: 1,
      minHeight: 58,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: '#555555',
      backgroundColor: '#1D1D1D',
      justifyContent: 'center',
    },

    historyDateLabel: {
      color: '#888888',
      fontSize: 9,
      fontWeight: '800',
      marginBottom: 4,
    },

    historyDateValue: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },

    historyDateSeparator: {
      color: '#FFBF00',
      fontSize: 18,
      fontWeight: '900',
    },

    historyListHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },

    historyListTitle: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '900',
    },

    historyListCount: {
      color: '#777777',
      fontSize: 11,
    },

    historyCardRight: {
      alignItems: 'flex-end',
      gap: 8,
    },

    historyDetailHint: {
      color: '#FFBF00',
      fontSize: 10,
      fontWeight: '700',
    },

    historyModalOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 22,
      backgroundColor:
        'rgba(0, 0, 0, 0.82)',
    },

    historyModalContent: {
      width: '100%',
      maxWidth: 650,
      maxHeight: '90%',
      padding: 20,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#424242',
      backgroundColor: '#1D1D1D',
    },

    historyModalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 14,
    },

    historyModalTitle: {
      color: '#FFFFFF',
      fontSize: 23,
      fontWeight: '900',
    },

    historyModalSubtitle: {
      color: '#999999',
      fontSize: 12,
      marginTop: 4,
    },

    historyModalClose: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#292929',
    },

    historyModalCloseText: {
      color: '#CCCCCC',
      fontSize: 15,
      fontWeight: '900',
    },

    historyModalScroll: {
      flexGrow: 0,
    },

    historyModalStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },

    historyModalId: {
      color: '#666666',
      fontSize: 10,
      fontWeight: '700',
    },

    historyModalSection: {
      marginBottom: 14,
    },

    historyModalSectionTitle: {
      color: '#FFBF00',
      fontSize: 12,
      fontWeight: '900',
      marginBottom: 7,
      textTransform: 'uppercase',
    },

    historyModalSectionBody: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#343434',
      backgroundColor: '#242424',
    },

    historyModalDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 34,
      borderBottomWidth: 1,
      borderBottomColor: '#303030',
    },

    historyModalDetailLabel: {
      color: '#999999',
      fontSize: 12,
    },

    historyModalDetailValue: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'right',
    },

    historyModalDetailValueHighlighted: {
      color: '#FFBF00',
      fontSize: 14,
      fontWeight: '900',
      textAlign: 'right',
    },

    historyModalDifferenceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 42,
      marginTop: 4,
    },

    historyModalDifferenceLabel: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },

    historyModalDifferenceValue: {
      fontSize: 18,
      fontWeight: '900',
    },

    historyModalDoneButton: {
      minHeight: 44,
      marginTop: 14,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFBF00',
    },

    historyModalDoneButtonText: {
      color: '#171717',
      fontSize: 13,
      fontWeight: '900',
    },
  });