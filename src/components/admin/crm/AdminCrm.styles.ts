import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      minHeight: 0,
    },

    mainScroll: {
      flex: 1,
      minHeight: 0,
    },

    mainContent: {
      flexGrow: 1,
      paddingBottom: 20,
    },

    mainContentPhone: {
      paddingBottom: 36,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 18,
    },
    headerText: {
      flex: 1,
      minWidth: 220,
    },

    headerPhone: {
      marginBottom: 10,
    },
    title: {
      fontSize: 22,
      fontWeight: '900',
    },
    subtitle: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 18,
    },
    toolbar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
      marginBottom: 18,
    },

    toolbarPhone: {
      gap: 7,
      marginBottom: 10,
    },

    toolbarActionPhone: {
      minHeight: 36,
      flexGrow: 1,
      paddingHorizontal: 10,
    },
    search: {
      flexGrow: 1,
      minWidth: 220,
      minHeight: 42,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      fontSize: 12,
    },

    searchPhone: {
      width: '100%',
      minWidth: '100%',
      minHeight: 40,
    },
    button: {
      minHeight: 42,
      paddingHorizontal: 14,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: 10,
      fontWeight: '900',
    },
    toggle: {
      minHeight: 42,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentBar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },

    segmentBarPhone: {
      flexWrap: 'nowrap',
      gap: 7,
      paddingRight: 10,
      marginBottom: 10,
    },

    segmentScrollPhone: {
      flexGrow: 0,
      flexShrink: 0,
    },
    segmentButton: {
      minHeight: 34,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentButtonText: {
      fontSize: 9,
      fontWeight: '900',
    },
    list: {
      gap: 14,
      paddingBottom: 32,
    },
    card: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    info: {
      flex: 1,
    },
    customerName: {
      fontSize: 15,
      fontWeight: '900',
    },
    meta: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 15,
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
      fontSize: 9,
      fontWeight: '800',
    },
    metrics: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 14,
      marginBottom: 2,
    },

    metricsPhone: {
      flexWrap: 'nowrap',
      gap: 6,
      marginTop: 6,
      marginBottom: 10,
    },
    metric: {
      flexGrow: 1,
      flexBasis: 100,
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
      fontSize: 13,
      fontWeight: '900',
    },
    empty: {
      alignItems: 'center',
      paddingVertical: 44,
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: '900',
    },
    emptyText: {
      marginTop: 5,
      fontSize: 11,
      textAlign: 'center',
      lineHeight: 16,
      maxWidth: 420,
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
      maxWidth: 820,
      maxHeight: '92%',
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 14,
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
      fontSize: 12,
    },
    notes: {
      minHeight: 90,
      textAlignVertical: 'top',
      paddingTop: 10,
    },
    section: {
      marginTop: 14,
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '900',
      marginBottom: 7,
    },
    row: {
      paddingVertical: 9,
      borderBottomWidth: 1,
    },
    rowTitle: {
      fontSize: 11,
      fontWeight: '800',
    },
    rowMeta: {
      marginTop: 3,
      fontSize: 9,
      lineHeight: 14,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      gap: 9,
      marginTop: 16,
      paddingBottom: 8,
    },
    secondary: {
      minHeight: 42,
      borderWidth: 1,
      borderRadius: 9,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inactive: {
      opacity: 0.55,
    },
  });
