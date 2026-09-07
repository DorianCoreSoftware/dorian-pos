import {
  StyleSheet,
} from 'react-native';

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        '#0F0F0F',
    },

    scroll: {
      flex: 1,
    },

    scrollContent: {
      width: '100%',
      maxWidth: 1180,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingTop: 28,
      paddingBottom: 60,
    },

    scrollContentWithCart: {
      paddingBottom: 120,
    },

    sectionHeader: {
      marginBottom: 20,
      flexDirection: 'row',
      alignItems:
        'flex-end',
      justifyContent:
        'space-between',
      gap: 12,
    },

    sectionTitle: {
      color: '#FFFFFF',
      fontSize: 28,
      fontWeight: '900',
    },

    productCount: {
      color: '#8F8F8F',
      fontSize: 14,
    },

    grid: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      alignItems:
        'stretch',
    },

    centerState: {
      minHeight: 280,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 24,
    },

    stateText: {
      color: '#AFAFAF',
      fontSize: 15,
      textAlign: 'center',
      marginTop: 14,
    },

    errorTitle: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '800',
    },
  });

export default styles;
