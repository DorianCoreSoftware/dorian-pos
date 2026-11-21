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

    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },

    searchContainer: {
      flex: 1,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: '#404040',
      backgroundColor: '#1D1D1D',
    },

    searchIcon: {
      fontSize: 15,
      marginRight: 8,
    },

    searchInput: {
      flex: 1,
      color: '#FFFFFF',
      fontSize: 14,
    },

    clearSearchText: {
      color: '#AAAAAA',
      fontSize: 16,
      paddingHorizontal: 8,
    },

    inactiveFilter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    inactiveFilterText: {
      color: '#AAAAAA',
      fontSize: 12,
      fontWeight: '700',
    },

    createButton: {
      minHeight: 44,
      paddingHorizontal: 16,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: primaryColor,
    },

    createButtonText: {
      color: '#171717',
      fontSize: 13,
      fontWeight: '900',
    },

    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 10,
    },

    listTitle: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '900',
    },

    productCount: {
      color: '#777777',
      fontSize: 12,
    },

    listContent: {
      paddingBottom: 30,
    },

    productCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      padding: 14,
      marginBottom: 9,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: '#343434',
      backgroundColor: '#1D1D1D',
    },

    productCardInactive: {
      borderColor: '#4A4A4A',
      backgroundColor: '#181818',
    },

    inactiveCardContent: {
      opacity: 0.42,
    },

    inactiveSecondaryAction: {
      opacity: 0.38,
    },

    productInfo: {
      flex: 1,
      minWidth: 0,
      paddingRight: 14,
    },

    productTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
    },

    productName: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
      flexShrink: 1,
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

    statusBadgePhone: {
      alignSelf: 'flex-start',
      marginTop: 6,
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

    categoryText: {
      color: primaryColor,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 4,
    },

    descriptionText: {
      color: '#999999',
      fontSize: 12,
      marginTop: 4,
    },

    productMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginTop: 7,
    },

    priceText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },

    availableText: {
      color: '#4CAF50',
      fontSize: 11,
      fontWeight: '700',
    },

    unavailableText: {
      color: '#FF8A80',
      fontSize: 11,
      fontWeight: '700',
    },

    productActions: {
      gap: 7,
      width: 100,
      minWidth: 100,
      flexShrink: 0,
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
      borderColor: '#43A047',
      backgroundColor: '#2E7D32',
      opacity: 1,
    },

    stateButtonText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },

    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyIcon: {
      fontSize: 42,
    },

    emptyTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '900',
      marginTop: 8,
    },

    emptyText: {
      color: '#888888',
      fontSize: 12,
      marginTop: 5,
    },

    modalOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor:
        'rgba(0, 0, 0, 0.78)',
    },

    modalContent: {
      width: '100%',
      maxWidth: 620,
      maxHeight: '90%',
      padding: 20,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#404040',
      backgroundColor: '#1D1D1D',
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
      minHeight: 74,
      paddingTop: 10,
      textAlignVertical: 'top',
    },

    categoriesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },

    categoryButton: {
      minHeight: 36,
      paddingHorizontal: 11,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#252525',
    },

    categoryButtonSelected: {
      borderColor: primaryColor,
      backgroundColor: withAlpha(primaryColor, 0.14),
    },

    categoryButtonText: {
      color: '#AAAAAA',
      fontSize: 11,
      fontWeight: '700',
    },

    categoryButtonTextSelected: {
      color: primaryColor,
    },


    cookingMethodsCard: {
      marginTop: 16,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#3D3D3D',
      backgroundColor: '#202020',
    },

    cookingMethodsTitle: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },

    cookingMethodsSubtitle: {
      color: '#888888',
      fontSize: 10,
      lineHeight: 15,
      marginTop: 4,
      marginBottom: 8,
    },

    cookingMethodRow: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: '#303030',
    },

    cookingMethodText: {
      flex: 1,
      minWidth: 0,
    },

    availableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginTop: 16,
      padding: 12,
      borderRadius: 9,
      backgroundColor: '#252525',
    },

    availableTitle: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },

    availableSubtitle: {
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

    productThumbnailBox: {
      width: 64,
      height: 64,
      marginRight: 12,
      borderRadius: 9,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#252525',
      borderWidth: 1,
      borderColor: '#343434',
    },

    productThumbnail: {
      width: '100%',
      height: '100%',
    },

    productThumbnailPlaceholder: {
      color: primaryColor,
      fontSize: 18,
      fontWeight: '900',
    },

    imagePickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 6,
    },

    imagePreviewBox: {
      width: 110,
      height: 82,
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
      fontSize: 26,
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
