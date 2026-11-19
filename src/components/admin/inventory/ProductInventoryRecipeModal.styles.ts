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
        'rgba(0,0,0,0.78)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
    },
    card: {
      width: '100%',
      maxWidth: 720,
      maxHeight: '92%',
      borderRadius: 15,
      borderWidth: 1,
      borderColor: '#3E3E3E',
      backgroundColor: '#1D1D1D',
      overflow: 'hidden',
    },
    header: {
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: '#333333',
    },
    title: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '900',
    },
    subtitle: {
      color: '#929292',
      fontSize: 11,
      lineHeight: 16,
      marginTop: 5,
    },
    body: {
      padding: 18,
    },
    enabledRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 14,
      padding: 13,
      borderRadius: 10,
      backgroundColor: '#252525',
      marginBottom: 15,
    },
    enabledTextBox: {
      flex: 1,
    },
    enabledTitle: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '900',
    },
    enabledSubtitle: {
      color: '#888888',
      fontSize: 10,
      marginTop: 3,
      lineHeight: 14,
    },
    sectionTitle: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
      marginBottom: 9,
    },
    ingredientCard: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#383838',
      backgroundColor: '#222222',
      marginBottom: 9,
    },
    ingredientTop: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    ingredientName: {
      flex: 1,
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    ingredientInactive: {
      color: '#FF9F9F',
      fontSize: 9,
      fontWeight: '900',
      marginTop: 3,
    },
    quantityInput: {
      width: 125,
      minHeight: 40,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#292929',
      color: '#FFFFFF',
      paddingHorizontal: 10,
    },
    unitText: {
      width: 46,
      color: primaryColor,
      fontSize: 11,
      fontWeight: '900',
    },
    removeButton: {
      minHeight: 36,
      paddingHorizontal: 10,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: '#713A3A',
      backgroundColor: '#351D1D',
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeText: {
      color: '#FF9898',
      fontSize: 10,
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
      marginTop: 3,
    },
    addButtonText: {
      color: primaryColor,
      fontSize: 11,
      fontWeight: '900',
    },
    emptyText: {
      color: '#858585',
      fontSize: 11,
      lineHeight: 16,
      paddingVertical: 12,
      textAlign: 'center',
    },
    consumptionMap: {
      marginTop: 16,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#3A3A3A',
      backgroundColor: '#202020',
    },
    consumptionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    consumptionHelp: {
      color: '#8E8E8E',
      fontSize: 10,
      lineHeight: 15,
      marginTop: -4,
    },
    mapSection: {
      marginTop: 14,
    },
    mapSectionLabel: {
      color: primaryColor,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.5,
      marginBottom: 7,
    },
    mapEmpty: {
      color: '#858585',
      fontSize: 10,
      lineHeight: 15,
      paddingVertical: 5,
    },
    mapRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 9,
      borderRadius: 8,
      backgroundColor: '#292929',
      marginBottom: 6,
    },
    mapRowWarning: {
      borderWidth: 1,
      borderColor: '#8A5E2A',
      backgroundColor: '#352817',
    },
    mapItemName: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    mapQuantity: {
      color: primaryColor,
      fontSize: 11,
      fontWeight: '900',
    },
    mapWarningText: {
      color: '#F1BC76',
      fontSize: 9,
      lineHeight: 13,
      marginTop: 3,
    },
    optionConsumptionCard: {
      padding: 11,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: '#383838',
      backgroundColor: '#272727',
      marginBottom: 8,
    },
    optionConsumptionTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    optionGroupName: {
      color: '#858585',
      fontSize: 9,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    optionName: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
      marginTop: 2,
    },
    editConsumptionButton: {
      minHeight: 34,
      paddingHorizontal: 10,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: withAlpha(primaryColor, 0.6),
      backgroundColor: withAlpha(primaryColor, 0.1),
      alignItems: 'center',
      justifyContent: 'center',
    },
    editConsumptionText: {
      color: primaryColor,
      fontSize: 9,
      fontWeight: '900',
    },
    optionRecipeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    optionRecipeItem: {
      flex: 1,
      color: '#D5D5D5',
      fontSize: 10,
    },
    optionRecipeQty: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
    },
    optionCost: {
      color: '#AFAFAF',
      fontSize: 9,
      marginTop: 4,
      fontWeight: '700',
    },
    costSummary: {
      marginTop: 16,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#3A3A3A',
      backgroundColor: '#202020',
    },
    costSummaryTitle: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
      marginBottom: 10,
    },
    costGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    costMetric: {
      minWidth: 130,
      flexGrow: 1,
      padding: 10,
      borderRadius: 8,
      backgroundColor: '#292929',
    },
    costMetricLabel: {
      color: '#888888',
      fontSize: 9,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    costMetricValue: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '900',
      marginTop: 4,
    },
    recommendedValue: {
      color: primaryColor,
      fontSize: 17,
      fontWeight: '900',
      marginTop: 4,
    },
    costDetail: {
      color: '#8E8E8E',
      fontSize: 10,
      lineHeight: 15,
      marginTop: 9,
    },
    pricingModeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 6,
    },
    pricingModeButton: {
      flexGrow: 1,
      minWidth: 145,
      minHeight: 40,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#454545',
      backgroundColor: '#292929',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    pricingModeButtonSelected: {
      borderColor: primaryColor,
      backgroundColor:
        withAlpha(
          primaryColor,
          0.12,
        ),
    },
    pricingModeText: {
      color: '#B8B8B8',
      fontSize: 11,
      fontWeight: '800',
    },
    pricingModeTextSelected: {
      color: primaryColor,
    },
    warningBox: {
      marginTop: 12,
      padding: 11,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#825A2F',
      backgroundColor: '#352817',
    },
    warningText: {
      color: '#F1BC76',
      fontSize: 10,
      lineHeight: 15,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 9,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: '#333333',
    },
    button: {
      minHeight: 42,
      minWidth: 120,
      paddingHorizontal: 14,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: '#505050',
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
    pickerOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.82)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
    },
    pickerCard: {
      width: '100%',
      maxWidth: 560,
      maxHeight: '80%',
      borderRadius: 14,
      padding: 16,
      backgroundColor: '#1D1D1D',
      borderWidth: 1,
      borderColor: '#3D3D3D',
    },
    pickerTitle: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '900',
      marginBottom: 10,
    },
    searchInput: {
      minHeight: 42,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#252525',
      color: '#FFFFFF',
      paddingHorizontal: 11,
      marginBottom: 10,
    },
    pickerItem: {
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#3D3D3D',
      backgroundColor: '#242424',
      marginBottom: 8,
    },
    pickerItemName: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    pickerItemMeta: {
      color: '#858585',
      fontSize: 10,
      marginTop: 3,
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
