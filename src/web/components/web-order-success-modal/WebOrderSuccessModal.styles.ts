

import {
  StyleSheet,
} from 'react-native';
import { DEFAULT_BRAND_PRIMARY } from '../../../theme/brandStyles';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.76)',
      alignItems: 'center',
      justifyContent:
        'center',
      padding: 20,
    },

    card: {
      width: '100%',
      maxWidth: 430,
      backgroundColor:
        '#171717',
      borderWidth: 1,
      borderColor:
        '#303030',
      borderRadius: 20,
      padding: 28,
      alignItems: 'center',
    },

    iconCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor:
        primaryColor,
      alignItems: 'center',
      justifyContent:
        'center',
      marginBottom: 18,
    },

    icon: {
      color: '#111111',
      fontSize: 34,
      fontWeight: '900',
    },

    title: {
      color: '#FFFFFF',
      fontSize: 25,
      fontWeight: '900',
      textAlign: 'center',
    },

    message: {
      color: '#B2B2B2',
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 8,
    },

    orderBox: {
      width: '100%',
      backgroundColor:
        '#222222',
      borderRadius: 13,
      padding: 14,
      alignItems: 'center',
      marginTop: 22,
    },

    orderLabel: {
      color: '#8E8E8E',
      fontSize: 11,
      fontWeight: '700',
      textTransform:
        'uppercase',
    },

    orderId: {
      color: primaryColor,
      fontSize: 24,
      fontWeight: '900',
      marginTop: 3,
    },

    hint: {
      color: '#7F7F7F',
      fontSize: 11,
      lineHeight: 16,
      textAlign: 'center',
      marginTop: 13,
    },

    transferBox: {
      width: '100%',
      marginTop: 16,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#3A3A3A',
      backgroundColor: '#202020',
    },

    transferTitle: {
      color: primaryColor,
      fontSize: 11,
      fontWeight: '900',
      marginBottom: 8,
    },

    transferText: {
      color: '#D8D8D8',
      fontSize: 13,
      lineHeight: 19,
    },

    transferClabe: {
      color: '#FFFFFF',
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '900',
      marginVertical: 3,
    },

    transferHint: {
      color: '#929292',
      fontSize: 11,
      lineHeight: 16,
      marginTop: 6,
    },

    button: {
      width: '100%',
      backgroundColor:
        primaryColor,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 22,
    },

    buttonPressed: {
      opacity: 0.9,
    },

    buttonText: {
      color: '#111111',
      fontSize: 14,
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
