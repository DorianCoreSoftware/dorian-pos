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
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
        },

        searchContainer: {
            flex: 1,
            minWidth: 220,
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
            justifyContent: 'space-between',
            marginBottom: 10,
        },

        listTitle: {
            color: '#FFFFFF',
            fontSize: 17,
            fontWeight: '900',
        },

        userCount: {
            color: '#777777',
            fontSize: 12,
        },

        listContent: {
            paddingBottom: 30,
        },

        userCard: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 14,
            marginBottom: 9,
            borderRadius: 11,
            borderWidth: 1,
            borderColor: '#343434',
            backgroundColor: '#1D1D1D',
        },

        userCardInactive: {
            borderColor: '#4A4A4A',
      backgroundColor: '#181818',
        },

        avatar: {
            width: 52,
            height: 52,
            marginRight: 12,
            borderRadius: 26,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#5A4B00',
            backgroundColor: withAlpha(primaryColor, 0.14),
        },

        avatarText: {
            color: primaryColor,
            fontSize: 17,
            fontWeight: '900',
        },

        userInfo: {
            flex: 1,
            paddingRight: 14,
        },

        userTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
        },

        userName: {
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: '800',
        },

        roleText: {
            color: primaryColor,
            fontSize: 11,
            fontWeight: '700',
            marginTop: 4,
        },

        userMetaText: {
            color: '#999999',
            fontSize: 11,
            marginTop: 3,
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

        userActions: {
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
            borderColor: '#66BB6A',
            backgroundColor: '#2E7D32',
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
            textAlign: 'center',
        },

        modalOverlay: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.78)',
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

        helperText: {
            color: '#888888',
            fontSize: 10,
            marginTop: 5,
        },

        rolesContainer: {
            gap: 8,
        },

        roleButton: {
            padding: 12,
            borderRadius: 9,
            borderWidth: 1,
            borderColor: '#444444',
            backgroundColor: '#252525',
        },

        roleButtonSelected: {
            borderColor: primaryColor,
            backgroundColor: withAlpha(primaryColor, 0.14),
        },

        roleButtonDisabled: {
            opacity: 0.35,
        },

        roleButtonTitle: {
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: '900',
        },

        roleButtonTitleSelected: {
            color: primaryColor,
        },

        roleButtonDescription: {
            color: '#888888',
            fontSize: 10,
            marginTop: 3,
            lineHeight: 15,
        },

        editHint: {
            color: '#888888',
            fontSize: 10,
            marginTop: 12,
        },

        modalActions: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
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

