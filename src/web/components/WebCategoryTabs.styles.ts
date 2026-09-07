import {
  StyleSheet,
} from 'react-native';

const styles =
  StyleSheet.create({
    wrapper: {
      width: '100%',

      borderBottomWidth: 1,

      borderBottomColor:
        '#262626',

      backgroundColor:
        '#111111',

      alignItems:
        'center',
    },

    scroll: {
      width: '100%',

      maxWidth: 1180,

      alignSelf:
        'center',
    },

    content: {
      paddingHorizontal: 20,

      paddingVertical: 14,

      gap: 10,

      alignItems:
        'center',
    },

    tab: {
      borderWidth: 1,

      borderColor:
        '#343434',

      backgroundColor:
        '#1B1B1B',

      borderRadius: 999,

      paddingHorizontal: 18,

      paddingVertical: 10,
    },

    tabSelected: {
      backgroundColor:
        '#FFB000',

      borderColor:
        '#FFB000',
    },

    tabPressed: {
      opacity: 0.8,
    },

    tabText: {
      color: '#EEEEEE',

      fontSize: 14,

      fontWeight:
        '700',
    },

    tabTextSelected: {
      color: '#101010',
    },
  });

export default styles;