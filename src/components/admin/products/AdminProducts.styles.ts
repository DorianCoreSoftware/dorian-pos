import {
  StyleSheet,
} from 'react-native';

export const styles =
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
      backgroundColor: '#FFBF00',
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
      backgroundColor: '#FFBF00',
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
      opacity: 0.55,
    },

    productInfo: {
      flex: 1,
      paddingRight: 14,
    },

    productTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    productName: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
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

    categoryText: {
      color: '#FFBF00',
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
      minWidth: 100,
    },

    editButton: {
      minHeight: 34,
      paddingHorizontal: 12,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#FFBF00',
      backgroundColor: '#292300',
    },

    editButtonText: {
      color: '#FFBF00',
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
      borderColor: '#FFBF00',
      backgroundColor: '#302800',
    },

    categoryButtonText: {
      color: '#AAAAAA',
      fontSize: 11,
      fontWeight: '700',
    },

    categoryButtonTextSelected: {
      color: '#FFBF00',
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
      backgroundColor: '#FFBF00',
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