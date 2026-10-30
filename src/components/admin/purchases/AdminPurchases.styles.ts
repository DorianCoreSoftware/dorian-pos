import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingBottom: 30,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 14,
    },
    headerText: {
      flex: 1,
      minWidth: 220,
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
    tabs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    tab: {
      minHeight: 40,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabText: {
      fontSize: 11,
      fontWeight: '900',
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 14,
    },
    searchInput: {
      minHeight: 44,
      flexGrow: 1,
      flexBasis: 240,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      fontSize: 14,
    },
    addButton: {
      minHeight: 44,
      paddingHorizontal: 15,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonText: {
      fontSize: 11,
      fontWeight: '900',
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    switchText: {
      fontSize: 10,
      fontWeight: '800',
    },
    list: {
      gap: 9,
    },
    card: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 13,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    cardInfo: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '900',
    },
    cardMeta: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 15,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
      borderRadius: 999,
    },
    badgeText: {
      fontSize: 9,
      fontWeight: '900',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 10,
    },
    actionText: {
      fontSize: 10,
      fontWeight: '900',
    },
    empty: {
      paddingVertical: 36,
      alignItems: 'center',
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
    },
    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
      backgroundColor:
        'rgba(0,0,0,0.76)',
    },
    modal: {
      width: '100%',
      maxWidth: 600,
      maxHeight: '92%',
      borderWidth: 1,
      borderRadius: 16,
      padding: 18,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 10,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '900',
    },
    closeText: {
      fontSize: 20,
      fontWeight: '700',
    },
    label: {
      marginTop: 10,
      marginBottom: 6,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    input: {
      minHeight: 44,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      fontSize: 14,
    },
    notesInput: {
      minHeight: 80,
      paddingTop: 11,
      textAlignVertical: 'top',
    },
    optionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    option: {
      minHeight: 38,
      paddingHorizontal: 11,
      borderWidth: 1,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionText: {
      fontSize: 10,
      fontWeight: '800',
    },
    formSwitch: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 14,
      padding: 11,
      borderRadius: 10,
    },
    formSwitchText: {
      flex: 1,
    },
    formSwitchTitle: {
      fontSize: 12,
      fontWeight: '900',
    },
    formSwitchSubtitle: {
      marginTop: 3,
      fontSize: 10,
      lineHeight: 14,
    },
    preview: {
      marginTop: 14,
      padding: 12,
      borderWidth: 1,
      borderRadius: 10,
    },
    previewTitle: {
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    previewValue: {
      marginTop: 4,
      fontSize: 16,
      fontWeight: '900',
    },
    previewMeta: {
      marginTop: 3,
      fontSize: 10,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 18,
    },
    secondaryButton: {
      minHeight: 42,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButton: {
      minHeight: 42,
      paddingHorizontal: 16,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: 11,
      fontWeight: '900',
    },
  });
