import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    container: {
      flex: 1,
    },

    header: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 14,
    },

    title: {
      fontSize: 22,
      fontWeight: '900',
    },

    subtitle: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 16,
      maxWidth: 620,
    },

    periodRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
      marginBottom: 15,
    },

    periodButton: {
      minHeight: 36,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },

    periodText: {
      fontSize: 9,
      fontWeight: '900',
    },

    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },

    heroCard: {
      flexGrow: 1,
      flexBasis: 220,
      minWidth: 170,
      borderWidth: 1,
      borderRadius: 13,
      padding: 14,
    },

    card: {
      flexGrow: 1,
      flexBasis: 175,
      minWidth: 155,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
    },

    cardLabel: {
      fontSize: 8,
      fontWeight: '900',
      textTransform: 'uppercase',
    },

    heroValue: {
      marginTop: 6,
      fontSize: 24,
      fontWeight: '900',
    },

    cardValue: {
      marginTop: 5,
      fontSize: 18,
      fontWeight: '900',
    },

    comparison: {
      marginTop: 5,
      fontSize: 9,
      fontWeight: '800',
    },

    helper: {
      marginTop: 5,
      fontSize: 9,
      lineHeight: 14,
    },

    section: {
      marginTop: 20,
    },

    sectionTitle: {
      marginBottom: 9,
      fontSize: 13,
      fontWeight: '900',
    },

    alertCard: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginTop: 8,
    },

    alertInfo: {
      flexGrow: 1,
      flexShrink: 1,
      minWidth: 160,
    },

    alertTitle: {
      fontSize: 11,
      fontWeight: '900',
    },

    alertText: {
      marginTop: 3,
      fontSize: 9,
      lineHeight: 14,
    },

    badge: {
      minWidth: 40,
      minHeight: 32,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    badgeText: {
      fontSize: 11,
      fontWeight: '900',
    },

    chartCard: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
    },

    chartHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },

    chartTitle: {
      fontSize: 11,
      fontWeight: '900',
    },

    chartHint: {
      fontSize: 8,
      lineHeight: 12,
    },

    barsRow: {
      minHeight: 150,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
    },

    barItem: {
      flex: 1,
      minWidth: 24,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },

    barTrack: {
      width: '100%',
      minHeight: 110,
      justifyContent: 'flex-end',
      borderRadius: 6,
      overflow: 'hidden',
    },

    barFill: {
      width: '100%',
      minHeight: 3,
      borderRadius: 6,
    },

    barLabel: {
      marginTop: 5,
      fontSize: 7,
      textAlign: 'center',
    },

    compareGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },

    comparePill: {
      flexGrow: 1,
      flexBasis: 150,
      minWidth: 130,
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
    },

    compareLabel: {
      fontSize: 8,
      fontWeight: '900',
      textTransform: 'uppercase',
    },

    compareValue: {
      marginTop: 4,
      fontSize: 14,
      fontWeight: '900',
    },

    productRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 9,
      borderBottomWidth: 1,
    },

    productRank: {
      width: 26,
      fontSize: 10,
      fontWeight: '900',
      textAlign: 'center',
    },

    productInfo: {
      flex: 1,
      minWidth: 0,
    },

    productName: {
      fontSize: 10,
      fontWeight: '900',
    },

    productMeta: {
      marginTop: 2,
      fontSize: 8,
    },

    productRevenue: {
      fontSize: 10,
      fontWeight: '900',
    },

    emptyState: {
      paddingVertical: 22,
      alignItems: 'center',
    },

    emptyText: {
      fontSize: 9,
      textAlign: 'center',
      lineHeight: 14,
    },

    footer: {
      marginTop: 16,
      paddingBottom: 30,
    },

    footerText: {
      fontSize: 8,
      lineHeight: 13,
    },

    loading: {
      paddingVertical: 48,
      alignItems: 'center',
    },

    errorBox: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
    },

    errorText: {
      fontSize: 10,
      lineHeight: 16,
    },

    refreshButton: {
      marginTop: 10,
      alignSelf: 'flex-start',
      minHeight: 38,
      paddingHorizontal: 13,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },

    refreshText: {
      fontSize: 9,
      fontWeight: '900',
    },
  });
