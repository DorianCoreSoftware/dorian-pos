import {
  StyleSheet,
} from 'react-native';

import {
  DEFAULT_BRAND_PRIMARY,
} from '../../../theme/brandStyles';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      padding: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        'rgba(0,0,0,0.78)',
    },

    card: {
      width: '100%',
      maxWidth: 620,
      maxHeight: '92%',
      borderWidth: 1,
      borderRadius: 22,
      padding: 18,
      gap: 14,
      shadowColor: '#000000',
      shadowOpacity: 0.35,
      shadowRadius: 20,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      elevation: 16,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },

    eyebrow: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.2,
      marginBottom: 4,
    },

    title: {
      fontSize: 22,
      fontWeight: '900',
    },

    closeButton: {
      width: 40,
      height: 40,
      borderWidth: 1,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },

    closeText: {
      fontSize: 27,
      lineHeight: 29,
    },

    imageButton: {
      width: '100%',
      aspectRatio: 16 / 7,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: '#111111',
    },

    image: {
      width: '100%',
      height: '100%',
    },

    description: {
      fontSize: 13,
      lineHeight: 19,
    },

    pagination: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },

    navButton: {
      minHeight: 40,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    disabled: {
      opacity: 0.35,
    },

    counter: {
      fontSize: 11,
      fontWeight: '800',
    },

    cta: {
      minHeight: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },

    ctaText: {
      color: '#111111',
      fontSize: 13,
      fontWeight: '900',
    },

    dismiss: {
      minHeight: 46,
      borderWidth: 1,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },

    dismissText: {
      fontSize: 13,
      fontWeight: '800',
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
