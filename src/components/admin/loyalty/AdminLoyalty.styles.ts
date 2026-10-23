import { DEFAULT_BRAND_PRIMARY } from '../../../theme/brandStyles';

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

    contentContainer: {
      paddingBottom: 40,
    },

    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },

    header: {
      marginBottom: 20,
    },

    title: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '900',
    },

    subtitle: {
      color: '#999999',
      marginTop: 4,
      fontSize: 13,
    },

    errorText: {
      color: '#FF5252',
      marginBottom: 15,
      fontWeight: '700',
    },

    card: {
      backgroundColor: '#1D1D1D',
      borderColor: '#353535',
      borderWidth: 1,
      borderRadius: 14,
      padding: 18,
      marginBottom: 25,
    },

    cardTitle: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '900',
    },

    cardSubtitle: {
      color: '#999999',
      fontSize: 12,
      marginTop: 4,
    },

    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 15,
      marginBottom: 15,
    },

    switchTextContainer: {
      flex: 1,
    },

    fieldsRow: {
      flexDirection: 'row',
      gap: 14,
    },

    fieldsRowPhone: {
      flexDirection: 'column',
    },

    field: {
      flex: 1,
    },

    label: {
      color: '#BBBBBB',
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 6,
      marginTop: 10,
    },

    input: {
      minHeight: 45,
      borderWidth: 1,
      borderColor: '#444444',
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: '#151515',
      color: '#FFFFFF',
      fontSize: 14,
    },

    multilineInput: {
      minHeight: 85,
      paddingTop: 12,
      textAlignVertical: 'top',
    },

    primaryButton: {
      minHeight: 45,
      paddingHorizontal: 20,
      borderRadius: 8,
      backgroundColor: primaryColor,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
    },

    primaryButtonText: {
      color: '#111111',
      fontSize: 13,
      fontWeight: '900',
    },

    rewardsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 15,
      marginBottom: 15,
    },

    rewardsHeaderPhone: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },

    sectionTitle: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '900',
    },

    sectionSubtitle: {
      color: '#888888',
      fontSize: 12,
      marginTop: 3,
    },

    addButton: {
      minHeight: 42,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: primaryColor,
      alignItems: 'center',
      justifyContent: 'center',
    },

    addButtonPhone: {
      width: '100%',
      marginTop: 4,
    },

    addButtonText: {
      color: '#111111',
      fontWeight: '900',
      fontSize: 12,
    },

    rewardCard: {
      backgroundColor: '#1D1D1D',
      borderColor: '#363636',
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
    },

    rewardCardDragging: {
      opacity: 0.92,
      borderColor: primaryColor,
    },

    rewardDragColumn: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    dragHandleButton: {
      width: 44,
      minHeight: 54,
      borderWidth: 1,
      borderColor: '#454545',
      borderRadius: 9,
      backgroundColor: '#232323',
      alignItems: 'center',
      justifyContent: 'center',
    },

    dragHandleButtonActive: {
      borderColor: primaryColor,
      backgroundColor: '#2B2718',
    },

    dragHandle: {
      color: primaryColor,
      fontSize: 24,
      fontWeight: '900',
      lineHeight: 26,
    },

    rewardInfo: {
      flex: 1,
      minWidth: 0,
    },

    rewardName: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '900',
    },

    rewardDescription: {
      color: '#999999',
      fontSize: 12,
      marginTop: 4,
    },

    rewardVisits: {
      color: primaryColor,
      fontSize: 13,
      fontWeight: '900',
      marginTop: 7,
    },

    rewardActions: {
      alignItems: 'center',
      gap: 8,
    },

    editButton: {
      borderWidth: 1,
      borderColor: primaryColor,
      borderRadius: 7,
      paddingVertical: 7,
      paddingHorizontal: 12,
    },

    editButtonText: {
      color: primaryColor,
      fontSize: 11,
      fontWeight: '900',
    },

    emptyCard: {
      borderWidth: 1,
      borderColor: '#333333',
      borderRadius: 12,
      padding: 30,
    },

    emptyText: {
      color: '#777777',
      textAlign: 'center',
    },

    modalOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.75)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },

    modalCard: {
      width: '100%',
      maxWidth: 520,
      maxHeight: '90%',
      borderRadius: 14,
      backgroundColor: '#202020',
      padding: 20,
      borderWidth: 1,
      borderColor: '#444444',
    },

    modalTitle: {
      color: '#FFFFFF',
      fontSize: 21,
      fontWeight: '900',
      marginBottom: 10,
    },

    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 15,
    },

    cancelButton: {
      minHeight: 45,
      paddingHorizontal: 20,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#555555',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
    },

    warningBox: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: '#D79B24',
      borderRadius: 8,
      backgroundColor: '#2B2415',
      paddingHorizontal: 12,
      paddingVertical: 10,
    },

    warningText: {
      color: '#FFD36A',
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 18,
    },

    cancelButtonText: {
      color: '#DDDDDD',
      fontWeight: '800',
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
