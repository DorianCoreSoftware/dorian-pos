import {
  StyleSheet,
} from 'react-native';

export const reportSelectStyles =
  StyleSheet.create({
    container: {
      flex: 1,
      minWidth: 220,
    },
    label: {
      marginBottom: 6,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    trigger: {
      minHeight: 54,
      borderRadius: 11,
      borderWidth: 1,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    triggerContent: {
      flex: 1,
      minWidth: 0,
    },
    triggerText: {
      fontSize: 14,
      fontWeight: '900',
    },
    triggerDescription: {
      marginTop: 2,
      fontSize: 10,
    },
    chevron: {
      fontSize: 18,
      fontWeight: '900',
    },
    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor:
        'rgba(0, 0, 0, 0.76)',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    modalCard: {
      width: '100%',
      maxWidth: 500,
      maxHeight: '82%',
      borderRadius: 16,
      borderWidth: 1,
      padding: 18,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 14,
      marginBottom: 16,
    },
    modalHeading: {
      flex: 1,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '900',
    },
    modalSubtitle: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
    },
    closeButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      fontSize: 20,
      fontWeight: '700',
    },
    optionsScroll: {
      flexShrink: 1,
    },
    options: {
      gap: 8,
      paddingBottom: 2,
    },
    option: {
      minHeight: 58,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    optionContent: {
      flex: 1,
      minWidth: 0,
    },
    optionText: {
      fontSize: 14,
      fontWeight: '900',
    },
    optionDescription: {
      marginTop: 3,
      fontSize: 11,
      lineHeight: 15,
    },
    check: {
      fontSize: 17,
      fontWeight: '900',
    },
  });
