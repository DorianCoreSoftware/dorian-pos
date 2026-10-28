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
    countRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    countCard: {
      flexGrow: 1,
      flexBasis: 115,
      borderWidth: 1,
      borderRadius: 11,
      padding: 11,
    },
    countLabel: {
      fontSize: 9,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    countValue: {
      marginTop: 4,
      fontSize: 20,
      fontWeight: '900',
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 9,
      marginBottom: 14,
    },
    tab: {
      minHeight: 40,
      paddingHorizontal: 13,
      borderWidth: 1,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabText: {
      fontSize: 10,
      fontWeight: '900',
    },
    actionButton: {
      minHeight: 40,
      paddingHorizontal: 13,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtonText: {
      fontSize: 10,
      fontWeight: '900',
    },
    list: {
      gap: 9,
    },
    card: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 13,
    },
    unreadCard: {
      borderWidth: 2,
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
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 7,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '900',
    },
    unreadDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
    },
    message: {
      marginTop: 6,
      fontSize: 11,
      lineHeight: 17,
    },
    date: {
      marginTop: 7,
      fontSize: 9,
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
    linkText: {
      fontSize: 10,
      fontWeight: '900',
    },
    empty: {
      paddingVertical: 42,
      alignItems: 'center',
    },
    emptyIcon: {
      fontSize: 34,
      marginBottom: 8,
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: '900',
    },
    emptyText: {
      marginTop: 5,
      fontSize: 11,
      lineHeight: 16,
      textAlign: 'center',
      maxWidth: 420,
    },
  });
