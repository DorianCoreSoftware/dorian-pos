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
      marginBottom: 12,
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

    unavailableFilter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    unavailableFilterText: {
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

    filterTabs: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },

    filterButton: {
      minHeight: 36,
      paddingHorizontal: 13,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#1D1D1D',
    },

    filterButtonActive: {
      borderColor: '#FFBF00',
      backgroundColor: '#302800',
    },

    filterButtonText: {
      color: '#AAAAAA',
      fontSize: 11,
      fontWeight: '800',
    },

    filterButtonTextActive: {
      color: '#FFBF00',
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

    modifierCount: {
      color: '#777777',
      fontSize: 12,
    },

    listContent: {
      paddingBottom: 30,
    },

    modifierCard: {
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

    modifierCardInactive: {
      opacity: 0.55,
    },

    modifierInfo: {
      flex: 1,
      paddingRight: 14,
    },

    modifierTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },

    modifierName: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },

    groupBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
    },

    groupBadgeMeat: {
      borderColor: '#FFBF00',
      backgroundColor: '#302800',
    },

    groupBadgeSauce: {
      borderColor: '#FF4D4D',
      backgroundColor: '#321919',
    },

    groupBadgeFlavor: {
      borderColor: '#4DA6FF',
      backgroundColor: '#142A3D',
    },

    groupBadgeOther: {
      borderColor: '#777777',
      backgroundColor: '#292929',
    },

    groupBadgeText: {
      color: '#FFFFFF',
      fontSize: 9,
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

    extraPriceText: {
      color: '#FFBF00',
      fontSize: 12,
      fontWeight: '700',
      marginTop: 6,
    },

    modifierActions: {
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
      maxWidth: 560,
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

    groupsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },

    groupButton: {
      minHeight: 36,
      paddingHorizontal: 12,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#252525',
    },

    groupButtonSelected: {
      borderColor: '#FFBF00',
      backgroundColor: '#302800',
    },

    groupButtonText: {
      color: '#AAAAAA',
      fontSize: 11,
      fontWeight: '700',
    },

    groupButtonTextSelected: {
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