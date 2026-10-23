import {
  DEFAULT_BRAND_PRIMARY,
  withAlpha,
} from '../../../theme/brandStyles';

import {
  StyleSheet,
} from 'react-native';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
    container: {
      width: '100%',
      marginBottom: 16,
    },

    frame: {
      width: '100%',
      position: 'relative',
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#303030',
      backgroundColor: '#151515',
    },

    bannerLink: {
      width: '100%',
      height: '100%',
    },

    image: {
      width: '100%',
      height: '100%',
    },

    overlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 18,
      paddingTop: 42,
      paddingBottom: 16,
      backgroundColor:
        'rgba(0,0,0,0.55)',
    },

    title: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '900',
    },

    description: {
      color: '#E0E0E0',
      fontSize: 13,
      lineHeight: 18,
      marginTop: 5,
      maxWidth: 760,
    },

    arrowButton: {
      position: 'absolute',
      top: '50%',
      width: 38,
      height: 38,
      marginTop: -19,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor:
        withAlpha(
          primaryColor,
          0.55,
        ),
      backgroundColor:
        'rgba(12,12,12,0.78)',
    },

    arrowLeft: {
      left: 12,
    },

    arrowRight: {
      right: 12,
    },

    arrowPressed: {
      opacity: 0.76,
    },

    arrowText: {
      color: primaryColor,
      fontSize: 25,
      fontWeight: '900',
      lineHeight: 28,
      marginTop: -2,
    },

    indicators: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 7,
      marginTop: 10,
    },

    indicator: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#555555',
    },

    indicatorActive: {
      width: 20,
      backgroundColor: primaryColor,
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

export {
  styles as default,
};
