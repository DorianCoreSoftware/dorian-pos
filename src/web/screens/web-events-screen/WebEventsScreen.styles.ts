import {
  StyleSheet,
} from 'react-native';

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
    },

    content: {
      width: '100%',
      maxWidth: 980,
      alignSelf: 'center',
      paddingHorizontal: 18,
      paddingBottom: 70,
    },

    header: {
      paddingTop: 24,
      paddingBottom: 22,
    },

    backButton: {
      alignSelf: 'flex-start',
      marginBottom: 18,
    },

    backButtonText: {
      fontSize: 14,
      fontWeight: '800',
    },

    brand: {
      fontSize: 15,
      fontWeight: '900',
      textTransform: 'uppercase',
    },

    title: {
      fontSize: 36,
      fontWeight: '900',
      marginTop: 4,
    },

    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      marginTop: 6,
    },

    loadingContainer: {
      flex: 1,
      minHeight: 500,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },

    loadingText: {
      marginTop: 12,
      fontSize: 14,
    },

    card: {
      borderWidth: 1,
      borderRadius: 18,
      padding: 20,
      marginBottom: 16,
    },

    sectionTitle: {
      fontSize: 20,
      fontWeight: '900',
    },

    sectionSubtitle: {
      fontSize: 13,
      lineHeight: 19,
      marginTop: 5,
      marginBottom: 16,
    },

    optionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },

    typeOption: {
      minWidth: 150,
      flexGrow: 1,
      flexBasis: 180,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },

    typeName: {
      fontSize: 14,
      fontWeight: '900',
    },

    typeDescription: {
      fontSize: 11,
      lineHeight: 16,
      marginTop: 4,
    },

    packageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },

    packageCard: {
      flexGrow: 1,
      flexBasis: 260,
      minWidth: 240,
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
    },

    packageName: {
      fontSize: 17,
      fontWeight: '900',
    },

    packageDescription: {
      fontSize: 12,
      lineHeight: 18,
      marginTop: 5,
    },

    packageMeta: {
      fontSize: 12,
      lineHeight: 18,
      marginTop: 11,
      fontWeight: '700',
    },

    packagePrice: {
      fontSize: 22,
      fontWeight: '900',
      marginTop: 12,
    },

    fieldLabel: {
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 7,
    },

    input: {
      minHeight: 48,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      fontSize: 15,
    },

    helperText: {
      fontSize: 11,
      lineHeight: 16,
      marginTop: 7,
    },

    guestRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    stepperButton: {
      width: 46,
      height: 46,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    stepperText: {
      fontSize: 22,
      fontWeight: '900',
    },

    guestValue: {
      width: 96,
      height: 46,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      fontSize: 17,
      fontWeight: '900',
      textAlign: 'center',
    },

    extrasList: {
      gap: 10,
    },

    extraRow: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
    },

    extraRowTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },

    checkbox: {
      width: 24,
      height: 24,
      borderWidth: 1,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },

    checkboxText: {
      fontSize: 14,
      fontWeight: '900',
    },

    extraContent: {
      flex: 1,
      minWidth: 0,
    },

    extraName: {
      fontSize: 14,
      fontWeight: '900',
    },

    extraDescription: {
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },

    extraPrice: {
      fontSize: 12,
      fontWeight: '800',
      marginTop: 6,
    },

    unitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      marginLeft: 36,
    },

    smallStepperButton: {
      width: 36,
      height: 36,
      borderWidth: 1,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },

    smallStepperText: {
      fontSize: 18,
      fontWeight: '900',
    },

    unitValue: {
      minWidth: 42,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '900',
    },

    summaryRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      paddingVertical: 7,
    },

    summaryLabel: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
    },

    summaryValue: {
      fontSize: 13,
      fontWeight: '800',
      textAlign: 'right',
    },

    divider: {
      height: 1,
      marginVertical: 10,
    },

    totalLabel: {
      fontSize: 17,
      fontWeight: '900',
    },

    totalValue: {
      fontSize: 24,
      fontWeight: '900',
      textAlign: 'right',
    },

    disclaimer: {
      fontSize: 11,
      lineHeight: 17,
      marginTop: 14,
    },

    terms: {
      fontSize: 11,
      lineHeight: 17,
      marginTop: 10,
    },

    slotLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 44,
    },

    slotGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },

    slotButton: {
      minWidth: 104,
      minHeight: 54,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },

    slotButtonText: {
      fontSize: 14,
      fontWeight: '900',
    },

    slotEndText: {
      marginTop: 2,
      fontSize: 10,
      fontWeight: '700',
    },

    emptyText: {
      fontSize: 13,
      lineHeight: 19,
    },

    errorText: {
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '700',
    },

    phoneTitle: {
      fontSize: 30,
    },

    phoneCard: {
      padding: 16,
      borderRadius: 14,
    },

    phonePackageCard: {
      flexBasis: '100%',
      minWidth: '100%',
    },
  });

export default styles;
