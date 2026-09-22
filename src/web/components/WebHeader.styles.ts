import {
  StyleSheet,
} from 'react-native';

const styles =
  StyleSheet.create({
    header: {
      width: '100%',
      backgroundColor:
        '#151515',
      borderBottomWidth: 1,
      borderBottomColor:
        '#2A2A2A',
    },

    inner: {
      width: '100%',
      maxWidth: 1180,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingVertical: 18,
      flexDirection: 'row',
      alignItems: 'center',
    },

    logo: {
      width: 72,
      height: 72,
      marginRight: 16,
    },

    copy: {
      flex: 1,
    },

    title: {
      color: '#FFB000',
      fontSize: 28,
      fontWeight: '900',
    },

    subtitle: {
      color: '#E7E7E7',
      fontSize: 15,
      marginTop: 3,
    },

    rewardsButton: {
      minHeight: 42,
      paddingHorizontal: 15,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#FFB000',
      backgroundColor: '#241E00',
    },

    rewardsButtonText: {
      color: '#FFB000',
      fontSize: 13,
      fontWeight: '900',
    },
  });

export default styles;
