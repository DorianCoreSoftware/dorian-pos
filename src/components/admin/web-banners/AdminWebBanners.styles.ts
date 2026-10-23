import {
  DEFAULT_BRAND_PRIMARY,
  withAlpha,
} from '../../../theme/brandStyles';

import {
  StyleSheet,
} from 'react-native';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },

    centerContainer: {
      flex: 1,
      minHeight: 260,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },

    loadingText: {
      color: '#CCCCCC',
      fontSize: 14,
      marginTop: 12,
    },

    errorTitle: {
      color: '#FF6B6B',
      fontSize: 18,
      fontWeight: '900',
    },

    errorMessage: {
      color: '#AAAAAA',
      marginTop: 8,
      textAlign: 'center',
    },

    retryButton: {
      marginTop: 18,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: primaryColor,
    },

    retryButtonText: {
      color: '#171717',
      fontWeight: '900',
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      marginBottom: 18,
    },

    headerText: {
      flex: 1,
    },

    title: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '900',
    },

    subtitle: {
      color: '#909090',
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
    },

    createButton: {
      minHeight: 42,
      paddingHorizontal: 16,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: primaryColor,
    },

    createButtonText: {
      color: '#171717',
      fontSize: 12,
      fontWeight: '900',
    },

    listContent: {
      paddingBottom: 34,
    },

    emptyCard: {
      minHeight: 180,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      borderWidth: 1,
      borderColor: '#343434',
      borderRadius: 12,
      backgroundColor: '#1A1A1A',
    },

    emptyIcon: {
      fontSize: 34,
    },

    emptyTitle: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '900',
      marginTop: 8,
    },

    emptyText: {
      color: '#888888',
      fontSize: 12,
      marginTop: 5,
      textAlign: 'center',
    },

    bannerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      marginBottom: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#343434',
      backgroundColor: '#1D1D1D',
    },

    bannerCardCompact: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 12,
      padding: 12,
    },

    bannerMain: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },

    bannerMainCompact: {
      width: '100%',
      alignItems: 'center',
      gap: 10,
    },

    bannerCardInactive: {
      opacity: 0.58,
    },

    bannerCardDragging: {
      opacity: 0.42,
      borderColor: primaryColor,
    },

    reorderControls: {
      width: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },

    dragHandleButton: {
      width: 34,
      minHeight: 52,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#252525',
    },

    dragHandleButtonActive: {
      borderColor: primaryColor,
      backgroundColor: withAlpha(primaryColor, 0.14),
    },

    dragHandle: {
      color: primaryColor,
      fontSize: 26,
      fontWeight: '900',
      lineHeight: 28,
    },

    thumbnailBox: {
      width: 150,
      aspectRatio: 16 / 7,
      borderRadius: 9,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#3A3A3A',
      backgroundColor: '#141414',
    },

    thumbnailBoxCompact: {
      width: 126,
      flexShrink: 0,
    },

    thumbnail: {
      width: '100%',
      height: '100%',
    },

    bannerInfo: {
      flex: 1,
      minWidth: 0,
    },

    bannerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },

    bannerTitle: {
      flexShrink: 1,
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },

    statusBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
    },

    statusBadgeActive: {
      borderColor: '#4CAF50',
      backgroundColor: '#17331A',
    },

    statusBadgeInactive: {
      borderColor: '#666666',
      backgroundColor: '#292929',
    },

    statusText: {
      fontSize: 9,
      fontWeight: '900',
    },

    statusTextActive: {
      color: '#4CAF50',
    },

    statusTextInactive: {
      color: '#AAAAAA',
    },

    descriptionText: {
      color: '#999999',
      fontSize: 12,
      lineHeight: 17,
      marginTop: 5,
    },

    linkText: {
      color: primaryColor,
      fontSize: 10,
      marginTop: 6,
    },

    metaText: {
      color: '#777777',
      fontSize: 10,
      marginTop: 6,
    },

    actions: {
      minWidth: 105,
      gap: 7,
    },

    actionsCompact: {
      width: '100%',
      minWidth: 0,
      flexDirection: 'row',
      gap: 7,
    },

    actionButtonCompact: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: 6,
    },

    editButton: {
      minHeight: 34,
      paddingHorizontal: 12,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: primaryColor,
      backgroundColor: withAlpha(primaryColor, 0.11),
    },

    editButtonText: {
      color: primaryColor,
      fontSize: 11,
      fontWeight: '800',
    },

    stateButton: {
      minHeight: 34,
      paddingHorizontal: 12,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },

    deactivateButton: {
      borderColor: '#633333',
      backgroundColor: '#321919',
    },

    activateButton: {
      borderColor: '#315F35',
      backgroundColor: '#17331A',
    },

    deleteButton: {
      minHeight: 34,
      paddingHorizontal: 12,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#6C3030',
      backgroundColor: '#2D1717',
    },

    actionText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },

    modalOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor: 'rgba(0,0,0,0.78)',
    },

    modalContent: {
      width: '100%',
      maxWidth: 650,
      maxHeight: '92%',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#404040',
      backgroundColor: '#1D1D1D',
      overflow: 'hidden',
    },

    modalScrollContent: {
      padding: 20,
    },

    modalTitle: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '900',
      marginBottom: 14,
    },

    inputLabel: {
      color: '#CCCCCC',
      fontSize: 12,
      fontWeight: '700',
      marginTop: 10,
      marginBottom: 6,
    },

    input: {
      minHeight: 44,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#444444',
      color: '#FFFFFF',
      backgroundColor: '#252525',
      fontSize: 14,
    },

    descriptionInput: {
      minHeight: 82,
      paddingTop: 10,
      textAlignVertical: 'top',
    },

    fieldHint: {
      color: '#777777',
      fontSize: 10,
      lineHeight: 15,
      marginTop: 5,
    },

    dateFieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    datePickerButton: {
      flex: 1,
      minHeight: 44,
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

    datePickerText: {
      flex: 1,
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },

    datePickerPlaceholder: {
      flex: 1,
      color: '#777777',
      fontSize: 14,
    },

    datePickerIcon: {
      fontSize: 16,
    },

    clearDateButton: {
      minHeight: 44,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#555555',
      backgroundColor: '#292929',
    },

    clearDateButtonText: {
      color: '#CCCCCC',
      fontSize: 11,
      fontWeight: '800',
    },

    imagePickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 6,
    },

    imagePreviewBox: {
      width: 180,
      aspectRatio: 16 / 7,
      borderRadius: 10,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#252525',
      borderWidth: 1,
      borderColor: '#444444',
    },

    imagePreview: {
      width: '100%',
      height: '100%',
    },

    imagePreviewPlaceholder: {
      color: primaryColor,
      fontSize: 28,
      fontWeight: '900',
    },

    imagePickerActions: {
      flex: 1,
      gap: 7,
    },

    imagePickerButton: {
      minHeight: 40,
      paddingHorizontal: 14,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: primaryColor,
      backgroundColor: withAlpha(primaryColor, 0.11),
    },

    imagePickerButtonText: {
      color: primaryColor,
      fontSize: 12,
      fontWeight: '900',
    },

    imageHint: {
      color: '#888888',
      fontSize: 10,
    },

    row: {
      flexDirection: 'row',
      gap: 12,
    },

    rowField: {
      flex: 1,
    },

    activeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      marginTop: 16,
      padding: 12,
      borderRadius: 9,
      backgroundColor: '#252525',
    },

    activeTitle: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },

    activeSubtitle: {
      color: '#888888',
      fontSize: 10,
      marginTop: 3,
    },

    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 20,
    },

    modalButton: {
      minHeight: 42,
      minWidth: 120,
      paddingHorizontal: 14,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cancelButton: {
      borderWidth: 1,
      borderColor: '#555555',
      backgroundColor: '#292929',
    },

    cancelButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },

    saveButton: {
      backgroundColor: primaryColor,
    },

    saveButtonText: {
      color: '#171717',
      fontSize: 12,
      fontWeight: '900',
    },

    buttonDisabled: {
      opacity: 0.5,
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
