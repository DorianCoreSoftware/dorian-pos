import {
  StyleSheet,
} from 'react-native';

const styles =
  StyleSheet.create({
    card: {
      overflow: 'hidden',
      backgroundColor:
        '#191919',
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        '#2A2A2A',
    },

    cardPressed: {
      opacity: 0.88,
      transform: [
        {
          scale: 0.995,
        },
      ],
    },

    imageBox: {
      width: '100%',
      aspectRatio: 1.35,
      backgroundColor:
        '#222222',
    },

    image: {
      width: '100%',
      height: '100%',
    },

    imagePlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    placeholderText: {
      color: '#FFB000',
      fontWeight: '900',
      fontSize: 30,
    },

    body: {
      flex: 1,
      padding: 16,
    },

    name: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '800',
    },

    description: {
      color: '#B7B7B7',
      fontSize: 14,
      lineHeight: 20,
      marginTop: 7,
    },

    footer: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 12,
    },

    price: {
      color: '#FFB000',
      fontSize: 20,
      fontWeight: '900',
    },

    addButton: {
      borderRadius: 10,
      backgroundColor:
        '#FFB000',
      paddingHorizontal: 13,
      paddingVertical: 8,
    },

    addButtonText: {
      color: '#111111',
      fontSize: 12,
      fontWeight: '900',
    },
  });

export default styles;
