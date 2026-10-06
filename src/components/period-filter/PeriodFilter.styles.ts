import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    container: {
      width: '100%',
      marginBottom: 16,
    },

    label: {
      marginBottom: 6,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },

    trigger: {
      minHeight: 46,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 10,
    },

    triggerText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '800',
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
        'rgba(0, 0, 0, 0.75)',
    },

    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },

    modalCard: {
      width: '100%',
      maxWidth: 440,
      borderRadius: 16,
      borderWidth: 1,
      padding: 18,
    },

    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      gap: 16,
      marginBottom: 16,
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

    options: {
      gap: 8,
    },

    option: {
      minHeight: 48,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    optionText: {
      fontSize: 14,
      fontWeight: '800',
    },

    check: {
      fontSize: 17,
      fontWeight: '900',
    },
  });
