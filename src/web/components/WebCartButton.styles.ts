import { DEFAULT_BRAND_PRIMARY } from '../../theme/brandStyles';

import {
  StyleSheet,
} from 'react-native';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
    button: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      minWidth: 245,
      backgroundColor:
        primaryColor,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 20,
      shadowColor: '#000000',
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: {
        width: 0,
        height: 6,
      },
      elevation: 8,
    },

    buttonPressed: {
      opacity: 0.9,
      transform: [
        {
          scale: 0.99,
        },
      ],
    },

    title: {
      color: '#111111',
      fontSize: 15,
      fontWeight: '900',
    },

    subtitle: {
      color: '#3C3000',
      fontSize: 12,
      fontWeight: '700',
      marginTop: 2,
    },

    total: {
      color: '#111111',
      fontSize: 18,
      fontWeight: '900',
    },
  });

let styles =
  createStyles(
    DEFAULT_BRAND_PRIMARY,
  );

export function setBrandPrimaryColor(
  primaryColor: string,
): void {
  styles =
    createStyles(
      primaryColor,
    );
}

export { styles as default };
