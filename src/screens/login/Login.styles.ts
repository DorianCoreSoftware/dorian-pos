import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    container: {
      flex: 1,

      justifyContent:
        'center',

      alignItems:
        'center',
    },

    card: {
      width:
        '90%',

      maxWidth:
        450,

      borderRadius:
        16,

      padding:
        32,

      alignItems:
        'center',

      shadowOffset: {
        width:
          0,

        height:
          4,
      },

      shadowOpacity:
        0.3,

      shadowRadius:
        10,

      elevation:
        8,
    },

    logo: {
      fontSize:
        32,

      fontWeight:
        'bold',

      marginBottom:
        8,
    },

    subtitle: {
      fontSize:
        16,

      marginBottom:
        32,
    },

    input: {
      width:
        '100%',

      height:
        54,

      borderRadius:
        8,

      paddingHorizontal:
        16,

      fontSize:
        16,

      marginBottom:
        16,

      borderWidth:
        1,
    },

    button: {
      width:
        '100%',

      height:
        54,

      borderRadius:
        8,

      justifyContent:
        'center',

      alignItems:
        'center',

      marginTop:
        8,
    },

    buttonText: {
      fontSize:
        18,

      fontWeight:
        'bold',
    },
  });