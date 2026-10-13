

import {
  StyleSheet,
} from 'react-native';
import { DEFAULT_BRAND_PRIMARY } from '../../../theme/brandStyles';

const createStyles = (
  primaryColor: string,
) =>
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
        primaryColor,

      borderColor:
        primaryColor,
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