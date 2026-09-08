import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#151515',
    },

    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: '#151515',
    },

    centerText: {
      color: '#AAAAAA',
      fontSize: 12,
      marginTop: 10,
      textAlign: 'center',
    },

    errorTitle: {
      color: '#FF7777',
      fontSize: 16,
      fontWeight: '900',
    },

    reloadButton: {
      marginTop: 14,
      paddingHorizontal: 14,
      minHeight: 40,
      borderRadius: 8,
      backgroundColor: '#FFBF00',
      alignItems: 'center',
      justifyContent: 'center',
    },

    reloadButtonText: {
      color: '#151515',
      fontSize: 11,
      fontWeight: '900',
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 10,
    },

    title: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '900',
    },

    subtitle: {
      color: '#888888',
      fontSize: 11,
      marginTop: 3,
    },

    counterBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: '#302800',
      borderWidth: 1,
      borderColor: '#5A4A00',
    },

    counterBadgeText: {
      color: '#FFBF00',
      fontSize: 10,
      fontWeight: '900',
    },

    content: {
      padding: 16,
      paddingTop: 6,
      paddingBottom: 40,
    },

    emptyText: {
      color: '#777777',
      textAlign: 'center',
      paddingVertical: 40,
      fontSize: 12,
    },

    card: {
      padding: 14,
      marginBottom: 10,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: '#333333',
      backgroundColor: '#1D1D1D',
    },

    cardNew: {
      borderColor: '#5A4A00',
      backgroundColor: '#211C0B',
    },

    cardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },

    cardInfo: {
      flex: 1,
    },

    type: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '900',
    },

    date: {
      color: '#777777',
      fontSize: 10,
      marginTop: 3,
    },

    status: {
      fontSize: 10,
      fontWeight: '900',
    },

    statusNew: {
      color: '#FFBF00',
    },

    statusReviewed: {
      color: '#69A9FF',
    },

    statusResolved: {
      color: '#66D06F',
    },

    message: {
      color: '#DDDDDD',
      fontSize: 13,
      lineHeight: 19,
      marginTop: 12,
    },

    customerBox: {
      marginTop: 10,
      paddingTop: 9,
      borderTopWidth: 1,
      borderTopColor: '#303030',
    },

    customerText: {
      color: '#999999',
      fontSize: 10,
      lineHeight: 15,
    },

    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },

    secondaryButton: {
      minHeight: 38,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#444444',
      alignItems: 'center',
      justifyContent: 'center',
    },

    secondaryButtonText: {
      color: '#DDDDDD',
      fontSize: 10,
      fontWeight: '900',
    },

    primaryButton: {
      minHeight: 38,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: '#FFBF00',
      alignItems: 'center',
      justifyContent: 'center',
    },

    primaryButtonText: {
      color: '#151515',
      fontSize: 10,
      fontWeight: '900',
    },
  });