import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 12,
    },
    metric: {
      flexGrow: 1,
      flexBasis: 150,
      minHeight: 92,
      borderWidth: 1,
      borderRadius: 12,
      padding: 13,
      justifyContent: 'center',
    },
    metricLabel: {
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    metricValue: {
      marginTop: 7,
      fontSize: 21,
      fontWeight: '900',
    },
    card: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    title: {
      fontSize: 14,
      fontWeight: '900',
      marginBottom: 10,
    },
    coverageValue: {
      fontSize: 28,
      fontWeight: '900',
    },
    meta: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 15,
    },
    warning: {
      marginTop: 12,
      borderWidth: 1,
      borderRadius: 9,
      padding: 10,
    },
    warningText: {
      fontSize: 10,
      lineHeight: 15,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    rowLabel: {
      flex: 1,
      fontSize: 11,
    },
    rowValue: {
      fontSize: 11,
      fontWeight: '800',
    },
    rowValueStrong: {
      fontSize: 13,
      fontWeight: '900',
    },
    day: {
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    dayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'center',
    },
    dayDate: {
      fontSize: 11,
      fontWeight: '800',
    },
    dayProfit: {
      fontSize: 13,
      fontWeight: '900',
    },
    empty: {
      paddingVertical: 18,
      textAlign: 'center',
      fontSize: 11,
    },
  });
