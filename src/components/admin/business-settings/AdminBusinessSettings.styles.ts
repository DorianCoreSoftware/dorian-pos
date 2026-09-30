import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    container: {
      flex: 1,
    },

    content: {
      paddingBottom: 40,
    },

    contentPhone: {
      paddingBottom: 28,
    },

    loadingContainer: {
      flex: 1,
      minHeight: 280,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },

    loadingText: {
      marginTop: 12,
      fontSize: 13,
    },

    header: {
      marginBottom: 18,
    },

    title: {
      fontSize: 21,
      fontWeight: '900',
    },

    subtitle: {
      fontSize: 12,
      lineHeight: 18,
      marginTop: 5,
      maxWidth: 760,
    },

    card: {
      borderWidth: 1,
      borderRadius: 13,
      padding: 18,
      marginBottom: 16,
    },

    cardTitle: {
      fontSize: 17,
      fontWeight: '900',
    },

    cardSubtitle: {
      fontSize: 11,
      lineHeight: 16,
      marginTop: 4,
      marginBottom: 16,
    },

    field: {
      marginBottom: 14,
    },

    label: {
      fontSize: 10,
      fontWeight: '800',
      marginBottom: 6,
    },

    input: {
      minHeight: 44,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 13,
      fontWeight: '600',
    },

    twoColumnRow: {
      flexDirection: 'row',
      gap: 12,
    },

    twoColumnRowPhone: {
      flexDirection: 'column',
      gap: 0,
    },

    flexField: {
      flex: 1,
      minWidth: 0,
    },

    colorPreviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 2,
    },

    colorPreview: {
      width: 34,
      height: 34,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#555555',
    },

    previewText: {
      flex: 1,
      fontSize: 10,
      lineHeight: 15,
    },

    featureRow: {
      minHeight: 66,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      borderBottomWidth: 1,
      paddingVertical: 10,
    },

    featureRowLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },

    featureText: {
      flex: 1,
      minWidth: 0,
    },

    featureTitle: {
      fontSize: 13,
      fontWeight: '900',
    },

    featureDescription: {
      fontSize: 10,
      lineHeight: 15,
      marginTop: 3,
    },

    saveButton: {
      minHeight: 48,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },

    saveButtonDisabled: {
      opacity: 0.55,
    },

    saveButtonText: {
      fontSize: 13,
      fontWeight: '900',
    },
  });
