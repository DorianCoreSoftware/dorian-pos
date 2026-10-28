import { StyleSheet } from 'react-native';

import {
  DEFAULT_BRAND_PRIMARY,
  withAlpha,
} from '../../../theme/brandStyles';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.8)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
    },
    card: {
      width: '100%',
      maxWidth: 720,
      maxHeight: '92%',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#404040',
      backgroundColor: '#1D1D1D',
      overflow: 'hidden',
    },
    pickerCard: {
      width: '100%',
      maxWidth: 560,
      maxHeight: '80%',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#404040',
      backgroundColor: '#1D1D1D',
      padding: 16,
    },
    header: {
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: '#333333',
    },
    title: {
      color: '#FFFFFF',
      fontSize: 19,
      fontWeight: '900',
    },
    subtitle: {
      color: '#909090',
      fontSize: 11,
      marginTop: 4,
    },
    loadingBox: {
      minHeight: 260,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      padding: 18,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 9,
      backgroundColor: '#252525',
      marginBottom: 15,
    },
    switchTitle: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '900',
    },
    switchSubtitle: {
      color: '#888888',
      fontSize: 10,
      lineHeight: 14,
      marginTop: 3,
    },
    sectionTitle: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '900',
      marginBottom: 8,
    },
    emptyText: {
      color: '#858585',
      fontSize: 11,
      lineHeight: 16,
      textAlign: 'center',
      paddingVertical: 12,
    },
    lineCard: {
      padding: 11,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: '#383838',
      backgroundColor: '#232323',
      marginBottom: 8,
    },
    lineTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    itemName: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    itemCost: {
      color: '#898989',
      fontSize: 9,
      marginTop: 3,
    },
    quantityInput: {
      width: 105,
      minHeight: 40,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#292929',
      color: '#FFFFFF',
      paddingHorizontal: 9,
    },
    unit: {
      width: 40,
      color: primaryColor,
      fontSize: 10,
      fontWeight: '900',
    },
    removeButton: {
      minHeight: 36,
      paddingHorizontal: 9,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: '#6A3535',
      backgroundColor: '#341B1B',
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeText: {
      color: '#FF9999',
      fontSize: 9,
      fontWeight: '900',
    },
    addButton: {
      minHeight: 40,
      borderRadius: 8,
      borderWidth: 1,
      borderColor:
        withAlpha(
          primaryColor,
          0.65,
        ),
      backgroundColor:
        withAlpha(
          primaryColor,
          0.1,
        ),
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonText: {
      color: primaryColor,
      fontSize: 11,
      fontWeight: '900',
    },
    costPanel: {
      marginTop: 16,
      padding: 13,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#3B3B3B',
      backgroundColor: '#202020',
    },
    costTitle: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
      marginBottom: 9,
    },
    costRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    metric: {
      minWidth: 120,
      flexGrow: 1,
      padding: 9,
      borderRadius: 8,
      backgroundColor: '#292929',
    },
    metricLabel: {
      color: '#888888',
      fontSize: 9,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    metricValue: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '900',
      marginTop: 4,
    },
    negativeValue: {
      color: '#FF8F8F',
      fontSize: 16,
      fontWeight: '900',
      marginTop: 4,
    },
    costDetail: {
      color: '#8C8C8C',
      fontSize: 10,
      lineHeight: 15,
      marginTop: 8,
    },
    warningText: {
      color: '#F0BA72',
      fontSize: 10,
      lineHeight: 15,
      marginTop: 8,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      gap: 9,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: '#333333',
    },
    footerButton: {
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
    cancelText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    saveButton: {
      backgroundColor: primaryColor,
    },
    saveText: {
      color: '#171717',
      fontSize: 11,
      fontWeight: '900',
    },
    disabled: {
      opacity: 0.5,
    },
    searchInput: {
      minHeight: 42,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#252525',
      color: '#FFFFFF',
      paddingHorizontal: 10,
      marginVertical: 10,
    },
    pickerItem: {
      padding: 11,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#3B3B3B',
      backgroundColor: '#242424',
      marginBottom: 8,
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
