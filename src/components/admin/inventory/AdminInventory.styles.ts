import { StyleSheet } from 'react-native';

import {
  DEFAULT_BRAND_PRIMARY,
  withAlpha,
} from '../../../theme/brandStyles';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingBottom: 40,
    },
    centerContainer: {
      minHeight: 320,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    loadingText: {
      color: '#AAAAAA',
      marginTop: 12,
    },
    errorTitle: {
      color: '#FF7B7B',
      fontSize: 18,
      fontWeight: '900',
    },
    errorText: {
      color: '#AAAAAA',
      marginTop: 8,
      textAlign: 'center',
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
      color: '#8D8D8D',
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
    },
    primaryButton: {
      minHeight: 42,
      paddingHorizontal: 16,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: primaryColor,
    },
    primaryButtonText: {
      color: '#171717',
      fontSize: 12,
      fontWeight: '900',
    },
    disabled: {
      opacity: 0.5,
    },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    statCard: {
      minWidth: 145,
      flexGrow: 1,
      padding: 14,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: '#343434',
      backgroundColor: '#1D1D1D',
    },
    statLabel: {
      color: '#8A8A8A',
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    statValue: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '900',
      marginTop: 4,
    },
    lowStatValue: {
      color: '#FFB36B',
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    toolbarPhone: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    searchInput: {
      flex: 1,
      minHeight: 44,
      paddingHorizontal: 13,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: '#3B3B3B',
      color: '#FFFFFF',
      backgroundColor: '#222222',
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    switchText: {
      color: '#B5B5B5',
      fontSize: 11,
      fontWeight: '700',
    },
    sectionTitle: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '900',
      marginTop: 8,
      marginBottom: 10,
    },
    itemCard: {
      padding: 15,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#343434',
      backgroundColor: '#1D1D1D',
      marginBottom: 10,
    },
    itemInactive: {
      borderColor: '#4A4A4A',
      backgroundColor: '#181818',
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '900',
    },
    itemSku: {
      color: '#888888',
      fontSize: 10,
      marginTop: 3,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    activeBadge: {
      borderColor: '#3D764A',
      backgroundColor: '#17331D',
    },
    inactiveBadge: {
      borderColor: '#555555',
      backgroundColor: '#292929',
    },
    lowBadge: {
      borderColor: '#9B632B',
      backgroundColor: '#392410',
    },
    badgeText: {
      color: '#CFCFCF',
      fontSize: 9,
      fontWeight: '900',
    },
    stockBlock: {
      minWidth: 125,
      alignItems: 'flex-end',
    },
    stockValue: {
      color: primaryColor,
      fontSize: 18,
      fontWeight: '900',
    },
    stockLow: {
      color: '#FFB36B',
    },
    stockMin: {
      color: '#888888',
      fontSize: 10,
      marginTop: 3,
    },
    itemNotes: {
      color: '#A8A8A8',
      fontSize: 11,
      marginTop: 10,
      lineHeight: 16,
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 13,
    },
    secondaryButton: {
      minHeight: 36,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#484848',
      backgroundColor: '#282828',
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    movementButton: {
      borderColor: withAlpha(primaryColor, 0.6),
      backgroundColor: withAlpha(primaryColor, 0.1),
    },
    movementButtonText: {
      color: primaryColor,
    },
    dangerButton: {
      borderColor: '#713A3A',
      backgroundColor: '#351D1D',
    },
    dangerButtonText: {
      color: '#FF9898',
    },
    activateButton: {
      borderColor: '#66BB6A',
      backgroundColor: '#2E7D32',
    },
    activateButtonText: {
      color: '#FFFFFF',
      fontWeight: '900',
    },
    emptyBox: {
      minHeight: 160,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#303030',
      backgroundColor: '#191919',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      marginBottom: 16,
    },
    emptyTitle: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },
    emptyText: {
      color: '#888888',
      fontSize: 11,
      marginTop: 5,
      textAlign: 'center',
    },
    costSettingsCard: {
      padding: 15,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#343434',
      backgroundColor: '#1D1D1D',
      marginBottom: 16,
    },
    costSettingsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    costSettingsTitle: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },
    costSettingsSubtitle: {
      color: '#888888',
      fontSize: 10,
      lineHeight: 15,
      marginTop: 4,
    },
    costSettingsFields: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      alignItems: 'flex-end',
      marginTop: 10,
    },
    costField: {
      minWidth: 180,
      flexGrow: 1,
    },
    stockCost: {
      color: '#B8B8B8',
      fontSize: 9,
      marginTop: 3,
    },
    historyCard: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#2D2D2D',
      backgroundColor: '#1B1B1B',
    },
    historyTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    historyItem: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
      flex: 1,
    },
    historyDelta: {
      fontSize: 12,
      fontWeight: '900',
    },
    positive: {
      color: '#7AD88C',
    },
    negative: {
      color: '#FF9090',
    },
    historyMeta: {
      color: '#868686',
      fontSize: 10,
      marginTop: 4,
      lineHeight: 15,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.78)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
    },
    modalCard: {
      width: '100%',
      maxWidth: 600,
      maxHeight: '100%',
      borderRadius: 15,
      borderWidth: 1,
      borderColor: '#3A3A3A',
      backgroundColor: '#1D1D1D',
      overflow: 'hidden',
    },
    modalHeader: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#303030',
    },
    modalBodyScroll: {
      flex: 1,
      minHeight: 0,
    },
    modalBodyContent: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 22,
    },
    modalTitle: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '900',
    },
    modalSubtitle: {
      color: '#909090',
      fontSize: 11,
      marginTop: 5,
      marginBottom: 14,
      lineHeight: 16,
    },
    label: {
      color: '#CECECE',
      fontSize: 11,
      fontWeight: '800',
      marginTop: 11,
      marginBottom: 5,
    },
    input: {
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#404040',
      color: '#FFFFFF',
      backgroundColor: '#252525',
    },
    multiline: {
      minHeight: 78,
      textAlignVertical: 'top',
    },
    unitRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    optionButton: {
      minHeight: 38,
      paddingHorizontal: 13,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#252525',
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionButtonSelected: {
      borderColor: primaryColor,
      backgroundColor: withAlpha(primaryColor, 0.12),
    },
    optionText: {
      color: '#BEBEBE',
      fontSize: 11,
      fontWeight: '800',
    },
    optionTextSelected: {
      color: primaryColor,
    },
    helpText: {
      color: '#777777',
      fontSize: 10,
      lineHeight: 15,
      marginTop: 5,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 9,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: '#303030',
      backgroundColor: '#1D1D1D',
    },
    modalActionButton: {
      flex: 1,
      minWidth: 0,
    },
    costPreviewCard: {
      marginTop: 12,
      padding: 12,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: withAlpha(primaryColor, 0.45),
      backgroundColor: withAlpha(primaryColor, 0.08),
    },
    costPreviewLabel: {
      color: '#9C9C9C',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    costPreviewValue: {
      color: primaryColor,
      fontSize: 20,
      fontWeight: '900',
      marginTop: 4,
    },
    costPreviewHelp: {
      color: '#8B8B8B',
      fontSize: 9,
      lineHeight: 14,
      marginTop: 4,
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
