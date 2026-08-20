import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      backgroundColor: '#121212',
    },

    header: {
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

    tabsContainer: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 18,
    },

    sectionTab: {
      minHeight: 42,
      paddingHorizontal: 18,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#1D1D1D',
    },

    sectionTabActive: {
      borderColor: '#FFBF00',
      backgroundColor: '#302800',
    },

    sectionTabText: {
      color: '#AAAAAA',
      fontSize: 12,
      fontWeight: '800',
    },

    sectionTabTextActive: {
      color: '#FFBF00',
    },

    content: {
      flex: 1,
    },

    placeholderCard: {
      flex: 1,
      minHeight: 250,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#353535',
      backgroundColor: '#1D1D1D',
      padding: 24,
    },

    placeholderIcon: {
      fontSize: 46,
      marginBottom: 12,
    },

    placeholderTitle: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '900',
    },

    placeholderText: {
      color: '#999999',
      fontSize: 13,
      textAlign: 'center',
      marginTop: 7,
      maxWidth: 420,
      lineHeight: 20,
    },

    tabsContainerPhone: {
      flexWrap: 'wrap',
      gap: 8,
    },

    sectionTabPhone: {
      width: '48%',
      minWidth: 0,
      paddingHorizontal: 8,
    },

    sectionTabTextSmall: {
      fontSize: 10,
    },

    containerPhone: {
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 10,
    },
  });