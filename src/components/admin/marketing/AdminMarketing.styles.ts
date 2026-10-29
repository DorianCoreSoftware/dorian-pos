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
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 18,
    },
    title: {
      fontSize: 22,
      fontWeight: '900',
    },
    subtitle: {
      marginTop: 4,
      fontSize: 11,
      lineHeight: 17,
      maxWidth: 620,
    },
    toolbar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 11,
      marginBottom: 18,
    },
    button: {
      minHeight: 40,
      paddingHorizontal: 13,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: 9,
      fontWeight: '900',
    },
    filter: {
      minHeight: 34,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: {
      gap: 15,
      paddingBottom: 34,
    },
    card: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 17,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    cardInfo: {
      flex: 1,
    },
    campaignName: {
      fontSize: 15,
      fontWeight: '900',
    },
    meta: {
      marginTop: 4,
      fontSize: 9,
      lineHeight: 14,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    chip: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    chipText: {
      fontSize: 8,
      fontWeight: '900',
    },
    metrics: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 15,
    },
    metric: {
      minWidth: 120,
      flexBasis: 120,
      flexGrow: 1,
      borderWidth: 1,
      borderRadius: 9,
      padding: 11,
    },
    metricLabel: {
      fontSize: 8,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    metricValue: {
      marginTop: 3,
      fontSize: 12,
      fontWeight: '900',
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 16,
    },
    secondaryButton: {
      minHeight: 38,
      borderWidth: 1,
      borderRadius: 9,
      paddingHorizontal: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      padding: 18,
    },
    modal: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: 760,
      maxHeight: '92%',
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 10,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '900',
    },
    close: {
      fontSize: 18,
      fontWeight: '900',
    },
    label: {
      marginTop: 10,
      marginBottom: 5,
      fontSize: 9,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    input: {
      minHeight: 42,
      borderWidth: 1,
      borderRadius: 9,
      paddingHorizontal: 11,
      fontSize: 11,
    },
    multiline: {
      minHeight: 90,
      paddingTop: 10,
      textAlignVertical: 'top',
    },
    selectorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },
    selector: {
      minHeight: 34,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: {
      alignItems: 'center',
      paddingVertical: 42,
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: '900',
    },
    emptyText: {
      marginTop: 5,
      fontSize: 10,
      lineHeight: 16,
      textAlign: 'center',
      maxWidth: 460,
    },
  });
