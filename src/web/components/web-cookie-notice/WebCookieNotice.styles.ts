import {
  StyleSheet,
} from 'react-native';

const styles =
  StyleSheet.create({
    wrapper: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 16,
      paddingBottom: 16,
      alignItems: 'center',
      zIndex: 9999,
    },

    card: {
      width: '100%',
      maxWidth: 920,
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,

      shadowColor: '#000000',
      shadowOpacity: 0.28,
      shadowRadius: 18,
      shadowOffset: {
        width: 0,
        height: 6,
      },

      elevation: 10,
    },

    copy: {
      flex: 1,
      minWidth: 0,
    },

    title: {
      fontSize: 15,
      fontWeight: '900',
      marginBottom: 4,
    },

    description: {
      fontSize: 13,
      lineHeight: 18,
      opacity: 0.82,
    },

    button: {
      minHeight: 42,
      paddingHorizontal: 18,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },

    buttonText: {
      fontSize: 13,
      fontWeight: '900',
    },
  });

export default styles;