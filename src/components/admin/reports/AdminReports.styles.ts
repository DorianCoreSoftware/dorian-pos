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
            backgroundColor:
                '#151515',
        },

        contentContainer: {
            padding: 16,
            paddingBottom: 40,
        },

        loadingContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent:
                'center',
            backgroundColor:
                '#151515',
        },

        loadingText: {
            marginTop: 12,
            color: '#AAAAAA',
            fontSize: 14,
        },

        errorContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent:
                'center',
            padding: 30,
            backgroundColor:
                '#151515',
        },

        errorTitle: {
            color: '#FF5252',
            fontSize: 18,
            fontWeight: '800',
            marginBottom: 8,
        },

        errorText: {
            color: '#AAAAAA',
            fontSize: 13,
            textAlign: 'center',
        },

        filtersContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 16,
        },

        filterButton: {
            paddingHorizontal: 15,
            paddingVertical: 9,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#3A3A3A',
            backgroundColor:
                '#202020',
        },

        filterButtonActive: {
            borderColor:
                primaryColor,
            backgroundColor:
                primaryColor,
        },

        filterButtonText: {
            color: '#AAAAAA',
            fontSize: 12,
            fontWeight: '800',
        },

        filterButtonTextActive: {
            color: '#111111',
        },

        summaryGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 18,
        },

        summaryCard: {
            flexGrow: 1,
            flexBasis: 150,
            minWidth: 140,
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#303030',
            backgroundColor:
                '#1E1E1E',
        },

        summaryValue: {
            color: primaryColor,
            fontSize: 22,
            fontWeight: '900',
        },

        summaryLabel: {
            color: '#999999',
            fontSize: 12,
            fontWeight: '700',
            marginTop: 5,
        },

        sectionsContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 14,
        },

        sectionButton: {
            paddingHorizontal: 13,
            paddingVertical: 9,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#343434',
            backgroundColor:
                '#202020',
        },

        sectionButtonActive: {
            borderColor:
                primaryColor,
            backgroundColor:
                '#2E2700',
        },

        sectionButtonText: {
            color: '#999999',
            fontSize: 11,
            fontWeight: '800',
        },

        sectionButtonTextActive: {
            color: primaryColor,
        },

        reportCard: {
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#303030',
            backgroundColor:
                '#1D1D1D',
            marginBottom: 14,
        },

        reportTitle: {
            color: '#FFFFFF',
            fontSize: 17,
            fontWeight: '900',
            marginBottom: 12,
        },

        rankingRow: {
            minHeight: 46,
            flexDirection: 'row',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor:
                '#292929',
            paddingVertical: 8,
        },

        rankingRowDimmed: {
            opacity: 0.45,
        },

        rankingPosition: {
            width: 34,
            color: '#777777',
            fontSize: 13,
            fontWeight: '800',
        },

        rankingName: {
            flex: 1,
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '700',
            paddingRight: 8,
        },

        rankingValue: {
            color: primaryColor,
            fontSize: 14,
            fontWeight: '900',
        },

        customDateContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 16,
        },

        dateButton: {
            minWidth: 160,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#3A3A3A',
            backgroundColor: '#202020',
        },

        dateButtonLabel: {
            color: '#888888',
            fontSize: 10,
            fontWeight: '700',
            marginBottom: 3,
        },

        dateButtonValue: {
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '800',
        },

        chartCard: {
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#303030',
            backgroundColor: '#1D1D1D',
            marginBottom: 18,
        },

        chartHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
        },

        chartTitle: {
            color: '#FFFFFF',
            fontSize: 17,
            fontWeight: '900',
        },

        chartSubtitle: {
            color: '#888888',
            fontSize: 11,
            marginTop: 3,
        },

        chartScrollContent: {
            alignItems: 'flex-end',
            paddingRight: 10,
        },

        chartColumn: {
            width: 72,
            alignItems: 'center',
            marginRight: 8,
        },

        chartBarArea: {
            height: 160,
            width: 42,
            justifyContent: 'flex-end',
            alignItems: 'center',
        },

        chartBar: {
            width: 30,
            minHeight: 8,
            borderRadius: 6,
            backgroundColor: primaryColor,
        },

        chartValue: {
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '800',
            marginBottom: 4,
        },

        chartDate: {
            color: '#BBBBBB',
            fontSize: 11,
            fontWeight: '700',
            marginTop: 6,
        },

        chartOrders: {
            color: '#777777',
            fontSize: 9,
            marginTop: 2,
        },

        chartEmpty: {
            minHeight: 120,
            alignItems: 'center',
            justifyContent: 'center',
        },

        chartEmptyText: {
            color: '#777777',
            fontSize: 13,
            fontWeight: '600',
        },

        topProductsCard: {
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#303030',
            backgroundColor: '#1D1D1D',
            marginBottom: 18,
        },

        topProductsList: {
            marginTop: 18,
            gap: 14,
        },

        topProductRow: {
            width: '100%',
        },

        topProductHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
        },

        topProductName: {
            flex: 1,
            color: '#DDDDDD',
            fontSize: 12,
            fontWeight: '700',
            marginRight: 12,
        },

        topProductValue: {
            color: primaryColor,
            fontSize: 12,
            fontWeight: '900',
        },

        topProductBarBackground: {
            width: '100%',
            height: 10,
            borderRadius: 5,
            backgroundColor: '#303030',
            overflow: 'hidden',
        },

        topProductBar: {
            height: '100%',
            borderRadius: 5,
            backgroundColor: primaryColor,
        },

        topProductsTitleRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
        },

        topProductsTitleContainer: {
            flex: 1,
        },

        metricSwitch: {
            flexDirection: 'row',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#3A3A3A',
            overflow: 'hidden',
            backgroundColor: '#202020',
        },

        metricButton: {
            paddingHorizontal: 11,
            paddingVertical: 8,
        },

        metricButtonActive: {
            backgroundColor: primaryColor,
        },

        metricButtonText: {
            color: '#888888',
            fontSize: 10,
            fontWeight: '900',
        },

        metricButtonTextActive: {
            color: '#111111',
        },

        sauceChartCard: {
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#303030',
            backgroundColor: '#1D1D1D',
            marginBottom: 18,
        },

        sauceRanking: {
            marginTop: 18,
            gap: 12,
        },

        sauceRow: {
            width: '100%',
        },

        sauceHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 5,
        },

        sauceName: {
            flex: 1,
            color: '#DDDDDD',
            fontSize: 12,
            fontWeight: '700',
            marginRight: 12,
        },

        sauceUnits: {
            color: primaryColor,
            fontSize: 12,
            fontWeight: '900',
        },

        sauceBarBackground: {
            width: '100%',
            height: 9,
            borderRadius: 5,
            backgroundColor: '#303030',
            overflow: 'hidden',
        },

        sauceBar: {
            height: '100%',
            borderRadius: 5,
            backgroundColor: primaryColor,
        },

        lowRotationContainer: {
            marginTop: 24,
            paddingTop: 18,
            borderTopWidth: 1,
            borderTopColor: '#333333',
        },

        lowRotationTitle: {
            color: primaryColor,
            fontSize: 12,
            fontWeight: '900',
        },

        lowRotationSubtitle: {
            color: '#888888',
            fontSize: 11,
            marginTop: 3,
        },

        lowRotationList: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 12,
        },

        lowRotationBadge: {
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#444444',
            backgroundColor: '#252525',
        },

        lowRotationName: {
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '800',
        },

        lowRotationUnits: {
            color: '#999999',
            fontSize: 10,
            marginTop: 2,
        },

        modifierGroupsCard: {
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#303030',
            backgroundColor: '#1D1D1D',
            marginBottom: 18,
        },

        modifierGroupsContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 16,
            marginTop: 18,
        },

        modifierGroup: {
            flex: 1,
            minWidth: 260,
            padding: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#303030',
            backgroundColor: '#202020',
        },

        modifierGroupTitle: {
            color: primaryColor,
            fontSize: 12,
            fontWeight: '900',
            marginBottom: 14,
        },

        modifierGroupRow: {
            marginBottom: 12,
        },

        modifierGroupHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 5,
        },

        modifierGroupName: {
            flex: 1,
            color: '#DDDDDD',
            fontSize: 12,
            fontWeight: '700',
            marginRight: 10,
        },

        modifierGroupUnits: {
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '900',
        },

        modifierGroupBarBackground: {
            height: 8,
            borderRadius: 4,
            backgroundColor: '#303030',
            overflow: 'hidden',
        },

        modifierGroupBar: {
            height: '100%',
            borderRadius: 4,
            backgroundColor: primaryColor,
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


