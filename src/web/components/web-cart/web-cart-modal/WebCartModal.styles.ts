import { DEFAULT_BRAND_PRIMARY } from '../../../../theme/brandStyles';

import {
  StyleSheet,
} from 'react-native';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor:
        'rgba(0, 0, 0, 0.68)',
      flexDirection: 'row',
      justifyContent:
        'flex-end',
    },

    dismissArea: {
      flex: 1,
    },

    panel: {
      width: '100%',
      maxWidth: 480,
      height: '100%',
      backgroundColor:
        '#141414',
      borderLeftWidth: 1,
      borderLeftColor:
        '#2B2B2B',
    },

    header: {
      paddingHorizontal: 22,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor:
        '#292929',
      flexDirection: 'row',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
      gap: 16,
    },

    title: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '900',
    },

    subtitle: {
      color: '#999999',
      fontSize: 13,
      marginTop: 4,
    },

    closeButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        '#252525',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    closeText: {
      color: '#FFFFFF',
      fontSize: 26,
      lineHeight: 28,
      fontWeight: '500',
    },

    itemsScroll: {
      flex: 1,
    },

    itemsContent: {
      padding: 18,
      gap: 12,
    },

    item: {
      backgroundColor:
        '#1D1D1D',
      borderWidth: 1,
      borderColor:
        '#2C2C2C',
      borderRadius: 14,
      padding: 15,
    },

    itemTop: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
      gap: 12,
    },

    itemInfo: {
      flex: 1,
    },

    itemName: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },

    itemPrice: {
      color: primaryColor,
      fontSize: 15,
      fontWeight: '900',
      marginTop: 4,
    },

    removeButton: {
      paddingVertical: 4,
      paddingHorizontal: 4,
    },

    removeText: {
      color: '#FF7777',
      fontSize: 12,
      fontWeight: '700',
    },

    detailText: {
      color: '#C8C8C8',
      fontSize: 13,
      lineHeight: 18,
      marginTop: 10,
    },

    component: {
      marginTop: 9,
      paddingLeft: 10,
      borderLeftWidth: 2,
      borderLeftColor:
        '#4A4A4A',
    },

    componentText: {
      color: '#DCDCDC',
      fontSize: 12,
      lineHeight: 17,
    },

    componentModifierText: {
      color: '#AFAFAF',
      fontSize: 11,
      lineHeight: 16,
      marginTop: 2,
    },

    noteText: {
      color: '#B5B5B5',
      fontSize: 12,
      fontStyle: 'italic',
      marginTop: 7,
    },

    quantityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 14,
      gap: 10,
    },

    quantityButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor:
        '#303030',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    quantityButtonText: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '800',
    },

    quantityText: {
      minWidth: 28,
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
      textAlign: 'center',
    },

    summary: {
      borderTopWidth: 1,
      borderTopColor:
        '#292929',
      paddingHorizontal: 22,
      paddingVertical: 18,
    },

    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 9,
    },

    summaryLabel: {
      color: '#B5B5B5',
      fontSize: 14,
    },

    summaryValue: {
      color: '#E7E7E7',
      fontSize: 14,
      fontWeight: '700',
    },

    discountLabel: {
      color: '#E5C05A',
      fontSize: 14,
      fontWeight: '700',
    },

    discountValue: {
      color: '#E5C05A',
      fontSize: 14,
      fontWeight: '800',
    },

    totalRow: {
      borderTopWidth: 1,
      borderTopColor:
        '#303030',
      paddingTop: 12,
      marginTop: 4,
      marginBottom: 14,
    },

    totalLabel: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '900',
    },

    totalValue: {
      color: primaryColor,
      fontSize: 21,
      fontWeight: '900',
    },

    clearButton: {
      alignItems: 'center',
      paddingVertical: 10,
      marginBottom: 10,
    },

    clearButtonText: {
      color: '#D0D0D0',
      fontSize: 13,
      fontWeight: '700',
      textDecorationLine:
        'underline',
    },

    closedNotice: {
      marginBottom: 12,
      paddingHorizontal: 13,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#633333',
      backgroundColor:
        '#2A1717',
    },

    closedNoticeTitle: {
      color: '#FF8A80',
      fontSize: 12,
      fontWeight: '900',
    },

    closedNoticeText: {
      color: '#D0B8B8',
      fontSize: 11,
      lineHeight: 16,
      marginTop: 4,
    },

    checkoutButton: {
      backgroundColor:
        primaryColor,
      borderRadius: 12,
      alignItems: 'center',
      paddingVertical: 14,
    },

    checkoutButtonPressed: {
      opacity: 0.9,
    },

    checkoutButtonDisabled: {
      backgroundColor:
        '#2C2C2C',
      borderWidth: 1,
      borderColor:
        '#404040',
    },

    checkoutButtonText: {
      color: '#111111',
      fontSize: 14,
      fontWeight: '900',
    },

    checkoutButtonTextDisabled: {
      color: '#777777',
    },
  });

let styles =
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

export { styles as default };