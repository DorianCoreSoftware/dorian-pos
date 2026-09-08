import {
  StyleSheet,
} from 'react-native';

export const styles =
  StyleSheet.create({
    selectButton: {
      minHeight: 42,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#252525',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },

    selectButtonDisabled: {
      opacity: 0.55,
    },

    selectButtonText: {
      flex: 1,
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },

    selectPlaceholder: {
      color: '#777777',
      fontWeight: '600',
    },

    selectChevron: {
      color: '#FFBF00',
      fontSize: 12,
      fontWeight: '900',
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor:
        'rgba(0, 0, 0, 0.72)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
    },

    modalDismissArea: {
      ...StyleSheet.absoluteFillObject,
    },

    calendarModal: {
      width: '100%',
      maxWidth: 390,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#3A3A3A',
      backgroundColor: '#191919',
      padding: 14,
    },

    calendarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },

    calendarArrowButton: {
      width: 38,
      height: 38,
      borderRadius: 8,
      backgroundColor: '#282828',
      alignItems: 'center',
      justifyContent: 'center',
    },

    calendarArrow: {
      color: '#FFBF00',
      fontSize: 28,
      lineHeight: 30,
      fontWeight: '700',
    },

    calendarTitle: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
      textTransform: 'capitalize',
    },

    calendarWeekRow: {
      flexDirection: 'row',
      marginBottom: 5,
    },

    calendarWeekDay: {
      width: '14.2857%',
      color: '#777777',
      fontSize: 10,
      fontWeight: '800',
      textAlign: 'center',
      paddingVertical: 5,
    },

    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },

    calendarDayCell: {
      width: '14.2857%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },

    calendarDayCellSelected: {
      backgroundColor: '#FFBF00',
    },

    calendarDayText: {
      color: '#D8D8D8',
      fontSize: 12,
      fontWeight: '700',
    },

    calendarDayTextSelected: {
      color: '#151515',
      fontWeight: '900',
    },

    todayButton: {
      minHeight: 40,
      marginTop: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#FFBF00',
      alignItems: 'center',
      justifyContent: 'center',
    },

    todayButtonText: {
      color: '#FFBF00',
      fontSize: 12,
      fontWeight: '900',
    },

    timeModal: {
      width: '100%',
      maxWidth: 360,
      maxHeight: '78%',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#3A3A3A',
      backgroundColor: '#191919',
      overflow: 'hidden',
    },

    timeModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: '#303030',
    },

    timeModalTitle: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },

    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#292929',
      alignItems: 'center',
      justifyContent: 'center',
    },

    closeButtonText: {
      color: '#FFFFFF',
      fontSize: 22,
      lineHeight: 24,
    },

    timeOptionsScroll: {
      flexGrow: 0,
    },

    timeOptionsContent: {
      padding: 10,
    },

    timeOption: {
      minHeight: 44,
      paddingHorizontal: 13,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 5,
      backgroundColor: '#232323',
    },

    timeOptionSelected: {
      backgroundColor: '#302800',
      borderWidth: 1,
      borderColor: '#FFBF00',
    },

    timeOptionText: {
      color: '#E0E0E0',
      fontSize: 13,
      fontWeight: '800',
    },

    timeOptionTextSelected: {
      color: '#FFBF00',
    },

    timeOption24h: {
      color: '#777777',
      fontSize: 10,
      fontWeight: '700',
    },
    wheelModal: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#3A3A3A',
      backgroundColor: '#191919',
      overflow: 'hidden',
    },

    wheelContainer: {
      height:
        220,
      flexDirection: 'row',
      position: 'relative',
      paddingHorizontal: 14,
      paddingVertical: 8,
    },

    wheelSelection: {
      position: 'absolute',
      left: 14,
      right: 14,
      top: 96,
      height: 44,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: '#FFBF00',
      backgroundColor: '#302800',
      opacity: 0.75,
    },

    wheelColumn: {
      flex: 1,
      height: 220,
      overflow: 'hidden',
    },

    wheelColumnLabel: {
      position: 'absolute',
      top: 4,
      left: 0,
      right: 0,
      zIndex: 2,
      color: '#777777',
      fontSize: 9,
      fontWeight: '900',
      textAlign: 'center',
    },

    wheelItem: {
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },

    wheelItemText: {
      color: '#777777',
      fontSize: 18,
      fontWeight: '700',
    },

    wheelItemTextSelected: {
      color: '#FFBF00',
      fontSize: 23,
      fontWeight: '900',
    },

    wheelPreview: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 4,
      paddingBottom: 12,
    },

    wheelPreviewText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },

    wheelConfirmButton: {
      minHeight: 46,
      marginHorizontal: 14,
      marginBottom: 14,
      borderRadius: 10,
      backgroundColor: '#FFBF00',
      alignItems: 'center',
      justifyContent: 'center',
    },

    wheelConfirmButtonText: {
      color: '#151515',
      fontSize: 13,
      fontWeight: '900',
    },

  });