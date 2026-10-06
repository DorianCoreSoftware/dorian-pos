import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    container: {
      flex: 1,
    },

    content: {
      paddingBottom: 36,
      gap: 16,
    },

    centerState: {
      flex: 1,
      minHeight: 280,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },

    centerStateText: {
      marginTop: 10,
      fontSize: 12,
      textAlign: 'center',
    },

    errorTitle: {
      fontSize: 16,
      fontWeight: '900',
      textAlign: 'center',
    },

    header: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 14,
    },

    headerText: {
      flexGrow: 1,
      flexBasis: 220,
      minWidth: 0,
    },

    periodControl: {
      flexGrow: 1,
      flexBasis: 220,
      maxWidth: 320,
    },

    title: {
      fontSize: 24,
      fontWeight: '900',
    },

    subtitle: {
      marginTop: 5,
      fontSize: 12,
      lineHeight: 17,
    },

    customDateRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },

    dateButton: {
      flexGrow: 1,
      flexBasis: 150,
      minHeight: 56,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: 'center',
    },

    dateLabel: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },

    dateValue: {
      marginTop: 3,
      fontSize: 13,
      fontWeight: '900',
    },

    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },

    kpiCard: {
      flexGrow: 1,
      flexBasis: 145,
      minWidth: 135,
      minHeight: 116,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      justifyContent: 'space-between',
    },

    kpiLabel: {
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },

    kpiValue: {
      marginTop: 8,
      fontSize: 24,
      fontWeight: '900',
    },

    kpiHint: {
      marginTop: 7,
      fontSize: 10,
      lineHeight: 14,
    },

    healthCard: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
    },

    healthHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 14,
    },

    healthHeaderText: {
      flex: 1,
      minWidth: 0,
    },

    healthPercent: {
      fontSize: 24,
      fontWeight: '900',
    },

    progressTrack: {
      height: 10,
      marginTop: 14,
      overflow: 'hidden',
      borderRadius: 999,
    },

    progressFill: {
      height: '100%',
      borderRadius: 999,
    },

    healthFooter: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 10,
    },

    healthMetric: {
      fontSize: 10,
      fontWeight: '700',
    },

    twoColumnGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },

    panel: {
      flexGrow: 1,
      flexBasis: 300,
      minWidth: 0,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
    },

    sectionTitle: {
      fontSize: 15,
      fontWeight: '900',
    },

    sectionSubtitle: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 15,
    },

    emptyText: {
      marginTop: 18,
      fontSize: 11,
      lineHeight: 16,
      textAlign: 'center',
    },

    dailyList: {
      gap: 13,
      marginTop: 16,
    },

    dailyRow: {
      gap: 5,
    },

    dailyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },

    dailyDate: {
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'capitalize',
    },

    dailyBalance: {
      fontSize: 11,
      fontWeight: '900',
    },

    miniTrack: {
      height: 5,
      overflow: 'hidden',
      borderRadius: 999,
    },

    miniBar: {
      height: '100%',
      borderRadius: 999,
    },

    topCategory: {
      marginTop: 14,
      padding: 14,
      borderRadius: 10,
    },

    topCategoryLabel: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },

    topCategoryName: {
      marginTop: 5,
      fontSize: 16,
      fontWeight: '900',
    },

    topCategoryAmount: {
      marginTop: 3,
      fontSize: 21,
      fontWeight: '900',
    },

    categoryList: {
      gap: 13,
      marginTop: 16,
    },

    categoryRow: {
      gap: 5,
    },

    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },

    categoryName: {
      flex: 1,
      minWidth: 0,
      fontSize: 11,
      fontWeight: '800',
    },

    categoryAmount: {
      fontSize: 10,
      fontWeight: '900',
    },

    accountingNote: {
      fontSize: 9,
      lineHeight: 14,
      textAlign: 'center',
      paddingHorizontal: 8,
    },
  });
