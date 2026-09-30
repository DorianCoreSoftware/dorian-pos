import { DEFAULT_BRAND_PRIMARY } from '../../theme/brandStyles';

import {
  StyleSheet,
} from 'react-native';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000000',
    },

    camera: {
      ...StyleSheet.absoluteFillObject,
    },

    centerContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 30,
      backgroundColor: '#121212',
    },

    permissionTitle: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: 12,
    },

    permissionText: {
      color: '#BBBBBB',
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 21,
      marginTop: 12,
    },

    permissionButton: {
      backgroundColor: primaryColor,
      paddingHorizontal: 24,
      minHeight: 48,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
    },

    permissionButtonText: {
      color: '#111111',
      fontWeight: '900',
      fontSize: 15,
    },

    cancelButton: {
      marginTop: 15,
      padding: 12,
    },

    cancelButtonText: {
      color: '#AAAAAA',
      fontWeight: '700',
    },

    overlay: {
      ...StyleSheet.absoluteFillObject,
    },

    topOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.65)',
    },

    middleRow: {
      height: 270,
      flexDirection: 'row',
    },

    sideOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.65)',
    },

    scanArea: {
      width: 270,
      height: 270,
      position: 'relative',
    },

    bottomOverlay: {
      flex: 1.3,
      alignItems: 'center',
      paddingTop: 30,
      backgroundColor:
        'rgba(0,0,0,0.65)',
    },

    instructions: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'center',
      paddingHorizontal: 30,
    },

    corner: {
      position: 'absolute',
      width: 45,
      height: 45,
      borderColor: primaryColor,
    },

    topLeft: {
      top: 0,
      left: 0,
      borderTopWidth: 5,
      borderLeftWidth: 5,
      borderTopLeftRadius: 8,
    },

    topRight: {
      top: 0,
      right: 0,
      borderTopWidth: 5,
      borderRightWidth: 5,
      borderTopRightRadius: 8,
    },

    bottomLeft: {
      bottom: 0,
      left: 0,
      borderBottomWidth: 5,
      borderLeftWidth: 5,
      borderBottomLeftRadius: 8,
    },

    bottomRight: {
      bottom: 0,
      right: 0,
      borderBottomWidth: 5,
      borderRightWidth: 5,
      borderBottomRightRadius: 8,
    },

    closeButton: {
      position: 'absolute',
      top: 45,
      right: 22,
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        'rgba(0,0,0,0.70)',
    },

    closeButtonText: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '900',
    },
  });

export let styles =
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
