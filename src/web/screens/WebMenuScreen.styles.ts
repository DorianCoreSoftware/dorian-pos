import { DEFAULT_BRAND_PRIMARY } from '../../theme/brandStyles';

import {
  StyleSheet,
} from 'react-native';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        '#0F0F0F',
    },

    scroll: {
      flex: 1,
    },

    scrollContent: {
      width: '100%',
      maxWidth: 1180,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 60,
    },

    scrollContentWithCart: {
      paddingBottom: 120,
    },

    topArea: {
      width: '100%',
      marginBottom: 12,
    },

    recentOrdersBlock: {
      width: '100%',
      marginBottom: 10,
    },

    recentOrdersLabel: {
      color: '#777777',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.6,
      marginBottom: 6,
    },

    recentOrdersRow: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    recentOrderButton: {
      minHeight: 36,
      paddingHorizontal: 12,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#151515',
      alignItems: 'center',
      justifyContent: 'center',
    },

    recentOrderButtonPressed: {
      backgroundColor: '#242424',
    },

    recentOrderButtonText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '900',
    },

    topActionsRow: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },

    topActionPrimary: {
      minHeight: 38,
      paddingHorizontal: 13,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: '#FFB000',
      backgroundColor: '#151515',
      alignItems: 'center',
      justifyContent: 'center',
    },

    topActionSecondary: {
      minHeight: 38,
      paddingHorizontal: 13,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#151515',
      alignItems: 'center',
      justifyContent: 'center',
    },

    topActionPressed: {
      backgroundColor: '#242424',
    },

    topActionPrimaryText: {
      color: '#FFB000',
      fontSize: 12,
      fontWeight: '900',
    },

    topActionSecondaryText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },

    businessStatusOuter: {
      width: '100%',
      paddingTop: 0,
      paddingBottom: 12,
    },

    businessStatusCard: {
      width: '100%',
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },

    businessStatusCardOpen: {
      borderColor:
        '#315F35',
      backgroundColor:
        '#142517',
    },

    businessStatusCardClosed: {
      borderColor:
        '#633333',
      backgroundColor:
        '#2A1717',
    },

    businessStatusMain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    businessStatusIcon: {
      fontSize: 18,
    },

    businessStatusTextBox: {
      flex: 1,
    },

    businessStatusTitle: {
      fontSize: 13,
      fontWeight: '900',
    },

    businessStatusTitleOpen: {
      color:
        '#66D06F',
    },

    businessStatusTitleClosed: {
      color:
        '#FF8A80',
    },

    businessStatusSubtitle: {
      color:
        '#C7C7C7',
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },

    businessStatusNotice: {
      color:
        '#B9B9B9',
      fontSize: 10,
      lineHeight: 15,
      marginTop: 9,
      paddingTop: 9,
      borderTopWidth: 1,
      borderTopColor:
        '#4A2A2A',
    },

    categorySticky: {
      marginHorizontal: -20,
      backgroundColor: '#0F0F0F',
      zIndex: 10,
      elevation: 10,
    },

    productSection: {
      paddingTop: 24,
    },

    sectionHeader: {
      marginBottom: 20,
      flexDirection: 'row',
      alignItems:
        'flex-end',
      justifyContent:
        'space-between',
      gap: 12,
    },

    sectionTitle: {
      color: '#FFFFFF',
      fontSize: 28,
      fontWeight: '900',
    },

    productCount: {
      color: '#8F8F8F',
      fontSize: 14,
    },

    grid: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      alignItems:
        'stretch',
    },

    centerState: {
      minHeight: 280,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 24,
    },

    stateText: {
      color: '#AFAFAF',
      fontSize: 15,
      textAlign: 'center',
      marginTop: 14,
    },

    errorTitle: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '800',
    },

    scrollTopButton: {
      position: 'absolute',
      right: 18,
      bottom: 90,
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#5A4A00',
      backgroundColor: primaryColor,
      zIndex: 50,
      elevation: 8,
    },

    scrollTopButtonPressed: {
      opacity: 0.8,
    },

    scrollTopButtonText: {
      color: '#151515',
      fontSize: 24,
      fontWeight: '900',
      marginTop: -2,
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