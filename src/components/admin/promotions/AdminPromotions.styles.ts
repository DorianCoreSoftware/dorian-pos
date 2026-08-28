import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#151515',
    },

    header: {
      marginBottom: 18,
    },

    title: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '900',
    },

    subtitle: {
      color: '#888888',
      fontSize: 12,
      marginTop: 4,
    },

    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#151515',
    },

    loadingText: {
      color: '#AAAAAA',
      fontSize: 13,
      marginTop: 10,
    },

    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: '#151515',
    },

    errorTitle: {
      color: '#FF5252',
      fontSize: 17,
      fontWeight: '900',
      marginBottom: 8,
    },

    errorText: {
      color: '#AAAAAA',
      textAlign: 'center',
      fontSize: 12,
    },

    card: {
      padding: 16,
      marginBottom: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#303030',
      backgroundColor: '#1D1D1D',
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
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '900',
    },

    cardDescription: {
      color: '#888888',
      fontSize: 11,
      marginTop: 4,
      lineHeight: 16,
    },

    fieldContainer: {
      marginTop: 18,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: '#303030',
    },

    fieldLabel: {
      color: '#CCCCCC',
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
      borderColor: '#444444',
      backgroundColor: '#242424',
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },

    inputDisabled: {
      opacity: 0.4,
    },

    fieldHelp: {
      color: '#777777',
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
      color: '#FFBF00',
      fontSize: 13,
      fontWeight: '900',
    },

    currencySymbol: {
      color: '#FFBF00',
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
      borderColor: '#444444',
      backgroundColor: '#242424',
    },

    selectorText: {
      flex: 1,
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },

    selectorPlaceholder: {
      color: '#777777',
      fontWeight: '700',
    },

    selectorArrow: {
      color: '#FFBF00',
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
      color: '#888888',
      fontSize: 10,
      fontWeight: '800',
      marginBottom: 6,
    },

    dateInput: {
      width: '100%',
      minWidth: 140,
    },

    weeklySaucePreview: {
      marginTop: 18,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#5A4A00',
      backgroundColor: '#302800',
    },

    weeklySaucePreviewTitle: {
      color: '#FFBF00',
      fontSize: 14,
      fontWeight: '900',
    },

    weeklySaucePreviewText: {
      color: '#D6C98A',
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
      backgroundColor: '#FFBF00',
    },

    saveButtonDisabled: {
      opacity: 0.5,
    },

    saveButtonText: {
      color: '#111111',
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
      backgroundColor: 'rgba(0, 0, 0, 0.76)',
    },

    modalCard: {
      width: '100%',
      maxWidth: 520,
      maxHeight: '80%',
      alignSelf: 'center',
      overflow: 'hidden',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#3A3A3A',
      backgroundColor: '#1D1D1D',
    },

    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#303030',
    },

    modalHeaderText: {
      flex: 1,
      paddingRight: 12,
    },

    modalTitle: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '900',
    },

    modalSubtitle: {
      color: '#888888',
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
      backgroundColor: '#2A2A2A',
    },

    modalCloseText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },

    sauceList: {
      flexGrow: 0,
    },

    sauceListContent: {
      padding: 12,
    },

    sauceOption: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      marginBottom: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#303030',
      backgroundColor: '#242424',
    },

    sauceOptionSelected: {
      borderColor: '#FFBF00',
      backgroundColor: '#302800',
    },

    sauceOptionText: {
      flex: 1,
      color: '#DDDDDD',
      fontSize: 13,
      fontWeight: '800',
    },

    sauceOptionTextSelected: {
      color: '#FFBF00',
    },

    sauceOptionCheck: {
      color: '#FFBF00',
      fontSize: 15,
      fontWeight: '900',
      marginLeft: 12,
    },
  });