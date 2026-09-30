import {
  DEFAULT_BRAND_PRIMARY,
  withAlpha,
} from '../../theme/brandStyles';

import {
  StyleSheet,
} from 'react-native';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'center',
      padding: 18,
      backgroundColor:
        'rgba(0, 0, 0, 0.76)',
    },

    dismissArea: {
      ...StyleSheet.absoluteFillObject,
    },

    modalCard: {
      width: '100%',
      maxWidth: 560,
      maxHeight: '86%',
      alignSelf: 'center',
      overflow: 'hidden',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#3A3A3A',
      backgroundColor: '#1D1D1D',
    },

    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#303030',
    },

    headerText: {
      flex: 1,
      paddingRight: 12,
    },

    title: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '900',
    },

    subtitle: {
      color: '#888888',
      fontSize: 11,
      marginTop: 4,
    },

    closeButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#2A2A2A',
      alignItems: 'center',
      justifyContent: 'center',
    },

    closeButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },

    content: {
      padding: 16,
      paddingBottom: 22,
    },

    label: {
      color: '#AFAFAF',
      fontSize: 10,
      fontWeight: '900',
      marginBottom: 6,
      marginTop: 12,
    },

    typeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    typeButton: {
      minHeight: 38,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#3A3A3A',
      backgroundColor: '#252525',
      alignItems: 'center',
      justifyContent: 'center',
    },

    typeButtonSelected: {
      borderColor: primaryColor,
      backgroundColor: withAlpha(primaryColor, 0.14),
    },

    typeButtonText: {
      color: '#CCCCCC',
      fontSize: 11,
      fontWeight: '800',
    },

    typeButtonTextSelected: {
      color: primaryColor,
    },

    input: {
      width: '100%',
      minHeight: 44,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#242424',
      color: '#FFFFFF',
      paddingHorizontal: 12,
      fontSize: 13,
    },

    messageInput: {
      minHeight: 120,
      paddingTop: 11,
      paddingBottom: 11,
      textAlignVertical: 'top',
    },

    counter: {
      color: '#777777',
      fontSize: 10,
      textAlign: 'right',
      marginTop: 4,
    },

    errorText: {
      color: '#FF7777',
      fontSize: 11,
      lineHeight: 16,
      marginTop: 10,
    },

    primaryButton: {
      minHeight: 46,
      borderRadius: 9,
      backgroundColor: primaryColor,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
    },

    primaryButtonDisabled: {
      opacity: 0.55,
    },

    primaryButtonText: {
      color: '#151515',
      fontSize: 12,
      fontWeight: '900',
    },

    successBox: {
      paddingVertical: 12,
    },

    successTitle: {
      color: '#66D06F',
      fontSize: 18,
      fontWeight: '900',
      textAlign: 'center',
    },

    successText: {
      color: '#CFCFCF',
      fontSize: 12,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 18,
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

