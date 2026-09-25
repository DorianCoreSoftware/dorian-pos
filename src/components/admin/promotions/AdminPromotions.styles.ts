import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    container: {
      flex: 1,
    },

    header: {
      marginBottom: 18,
    },

    title: {
      fontSize: 22,
      fontWeight: '900',
    },

    subtitle: {
      fontSize: 12,
      marginTop: 4,
    },

    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      fontSize: 13,
      marginTop: 10,
    },

    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },

    errorTitle: {
      fontSize: 17,
      fontWeight: '900',
      marginBottom: 8,
      textAlign: 'center',
    },

    errorText: {
      textAlign: 'center',
      fontSize: 12,
    },

    card: {
      padding: 16,
      marginBottom: 14,
      borderRadius: 12,
      borderWidth: 1,
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },

    cardHeaderText: {
      flex: 1,
    },

    cardTitle: {
      fontSize: 17,
      fontWeight: '900',
    },

    cardDescription: {
      fontSize: 11,
      marginTop: 4,
      lineHeight: 16,
    },

    fieldContainer: {
      marginTop: 18,
      paddingTop: 16,
      borderTopWidth: 1,
    },

    fieldLabel: {
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 7,
    },

    input: {
      width: 110,
      minHeight: 44,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      fontSize: 15,
      fontWeight: '800',
    },

    inputDisabled: {
      opacity: 0.4,
    },

    fieldHelp: {
      fontSize: 10,
      marginTop: 7,
      lineHeight: 15,
    },

    inlineFieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },

    compactInput: {
      width: 90,
    },

    inlineSuffix: {
      fontSize: 13,
      fontWeight: '900',
    },

    currencySymbol: {
      fontSize: 18,
      fontWeight: '900',
    },

    discountInput: {
      width: 100,
    },

    selector: {
      minHeight: 46,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
    },

    selectorText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '800',
    },

    selectorPlaceholder: {
      color: '#777777',
      fontWeight: '700',
    },

    selectorArrow: {
      fontSize: 12,
      marginLeft: 12,
    },

    dateRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },

    dateField: {
      flexGrow: 1,
      flexBasis: 160,
      minWidth: 140,
    },

    dateLabel: {
      fontSize: 10,
      fontWeight: '800',
      marginBottom: 6,
    },

    dateInput: {
      width: '100%',
      minWidth: 140,
    },

    modifierPromotionPreview: {
      marginTop: 18,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
    },

    modifierPromotionPreviewTitle: {
      fontSize: 14,
      fontWeight: '900',
    },

    modifierPromotionPreviewText: {
      fontSize: 11,
      lineHeight: 16,
      marginTop: 5,
    },

    saveButton: {
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      borderRadius: 10,
    },

    saveButtonDisabled: {
      opacity: 0.5,
    },

    saveButtonText: {
      fontSize: 13,
      fontWeight: '900',
    },

    scrollContent: {
      padding: 16,
      paddingBottom: 50,
    },

    modalBackdrop: {
      flex: 1,
      justifyContent: 'center',
      padding: 18,
      backgroundColor:
        'rgba(0, 0, 0, 0.76)',
    },

    modalCard: {
      width: '100%',
      maxWidth: 520,
      maxHeight: '80%',
      alignSelf: 'center',
      overflow: 'hidden',
      borderRadius: 14,
      borderWidth: 1,
    },

    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
    },

    modalHeaderText: {
      flex: 1,
      paddingRight: 12,
    },

    modalTitle: {
      fontSize: 17,
      fontWeight: '900',
    },

    modalSubtitle: {
      fontSize: 11,
      marginTop: 4,
      lineHeight: 16,
    },

    modalCloseButton: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 17,
    },

    modalCloseText: {
      fontSize: 15,
      fontWeight: '900',
    },

    modifierList: {
      flexGrow: 0,
    },

    modifierListContent: {
      padding: 12,
    },

    modifierOption: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      marginBottom: 8,
      borderRadius: 8,
      borderWidth: 1,
    },

    modifierOptionSelected: {
      borderWidth: 1,
    },

    modifierOptionText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '800',
    },

    modifierOptionTextSelected: {
      fontWeight: '900',
    },

    modifierOptionCheck: {
      fontSize: 15,
      fontWeight: '900',
      marginLeft: 12,
    },
  });
