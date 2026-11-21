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
      flex:
        1,
    },

    content: {
      paddingBottom:
        40,
    },

    centerContainer: {
      flex:
        1,

      minHeight:
        300,

      alignItems:
        'center',

      justifyContent:
        'center',

      padding:
        24,
    },

    loadingText: {
      color:
        '#CCCCCC',

      fontSize:
        14,

      marginTop:
        12,
    },

    errorTitle: {
      color:
        '#FF6B6B',

      fontSize:
        18,

      fontWeight:
        '900',
    },

    errorMessage: {
      color:
        '#AAAAAA',

      marginTop:
        8,

      textAlign:
        'center',
    },

    retryButton: {
      marginTop:
        18,

      paddingHorizontal:
        18,

      paddingVertical:
        10,

      borderRadius:
        8,

      backgroundColor:
        primaryColor,
    },

    retryButtonText: {
      color:
        '#171717',

      fontWeight:
        '900',
    },

    sectionHeader: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'center',

      marginBottom:
        16,
    },

    sectionHeaderText: {
      flex:
        1,
    },

    title: {
      color:
        '#FFFFFF',

      fontSize:
        21,

      fontWeight:
        '900',
    },

    subtitle: {
      color:
        '#888888',

      fontSize:
        12,

      marginTop:
        4,
    },

    card: {
      padding:
        18,

      borderRadius:
        13,

      borderWidth:
        1,

      borderColor:
        '#343434',

      backgroundColor:
        '#1D1D1D',

      marginBottom:
        24,
    },

    cardHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        16,

      marginBottom:
        18,
    },

    cardHeaderText: {
      flex:
        1,
    },

    cardTitle: {
      color:
        '#FFFFFF',

      fontSize:
        17,

      fontWeight:
        '900',
    },

    cardSubtitle: {
      color:
        '#888888',

      fontSize:
        11,

      marginTop:
        4,

      lineHeight:
        16,
    },

    switchRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,
    },

    enabledText: {
      color:
        '#4CAF50',

      fontSize:
        10,

      fontWeight:
        '900',
    },

    disabledText: {
      color:
        '#FF8A80',

      fontSize:
        10,

      fontWeight:
        '900',
    },

    fulfillmentModeCard: {
      marginTop: 14,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#343434',
      backgroundColor: '#181818',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 14,
    },

    fulfillmentModeInfo: {
      flex: 1,
    },

    fulfillmentModeTitle: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },

    fulfillmentModeSubtitle: {
      color: '#888888',
      fontSize: 10,
      marginTop: 3,
    },

    fulfillmentSwitches: {
      gap: 7,
    },

    compactSwitchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
    },

    compactSwitchLabel: {
      color: '#BBBBBB',
      fontSize: 10,
      fontWeight: '700',
    },

    scheduleBuilder: {
      marginTop: 18,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: '#343434',
    },

    scheduleTypeRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 6,
    },

    scheduleTypeButton: {
      flex: 1,
      minHeight: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#252525',
    },

    scheduleTypeButtonActive: {
      borderColor: primaryColor,
      backgroundColor: withAlpha(primaryColor, 0.12),
    },

    scheduleTypeButtonText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },

    dayButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 12,
    },

    dayButton: {
      minWidth: 44,
      minHeight: 34,
      paddingHorizontal: 9,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#444444',
      backgroundColor: '#252525',
    },

    dayButtonActive: {
      borderColor: primaryColor,
      backgroundColor: withAlpha(primaryColor, 0.12),
    },

    dayButtonText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
    },

    scheduleList: {
      marginTop: 18,
      gap: 8,
    },

    scheduleEmpty: {
      color: '#888888',
      fontSize: 11,
      lineHeight: 16,
    },

    scheduleWindowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      padding: 11,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: '#343434',
      backgroundColor: '#181818',
    },

    scheduleWindowInfo: {
      flex: 1,
    },

    scheduleWindowTitle: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },

    scheduleWindowTime: {
      color: primaryColor,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 3,
    },

    scheduleDeleteButton: {
      minHeight: 34,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 7,
      borderWidth: 1,
      borderColor: '#793838',
      backgroundColor: '#351B1B',
    },

    scheduleDeleteButtonText: {
      color: '#FF8A80',
      fontSize: 10,
      fontWeight: '800',
    },

    coordinatesRow: {
      flexDirection:
        'row',

      gap:
        12,
    },

    coordinatesRowPhone: {
      flexDirection:
        'column',
    },

    coordinateField: {
      flex:
        1,
    },

    inputLabel: {
      color:
        '#CCCCCC',

      fontSize:
        12,

      fontWeight:
        '700',

      marginTop:
        10,

      marginBottom:
        6,
    },

    input: {
      minHeight:
        44,

      paddingHorizontal:
        12,

      borderRadius:
        8,

      borderWidth:
        1,

      borderColor:
        '#444444',

      color:
        '#FFFFFF',

      backgroundColor:
        '#252525',

      fontSize:
        14,
    },

    locationHint: {
      marginTop:
        14,

      padding:
        12,

      borderRadius:
        9,

      borderWidth:
        1,

      borderColor:
        '#343434',

      backgroundColor:
        '#181818',
    },

    locationHintTitle: {
      color:
        primaryColor,

      fontSize:
        11,

      fontWeight:
        '800',
    },

    locationHintText: {
      color:
        '#AAAAAA',

      fontSize:
        11,

      marginTop:
        4,
    },

    primaryButton: {
      minHeight:
        44,

      marginTop:
        16,

      paddingHorizontal:
        18,

      borderRadius:
        9,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        primaryColor,

      alignSelf:
        'flex-start',
    },

    primaryButtonText: {
      color:
        '#171717',

      fontSize:
        12,

      fontWeight:
        '900',
    },

    buttonDisabled: {
      opacity:
        0.5,
    },

    zonesHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        16,

      marginBottom:
        12,
    },

    createButton: {
      minHeight:
        42,

      paddingHorizontal:
        16,

      borderRadius:
        9,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        primaryColor,
    },

    createButtonText: {
      color:
        '#171717',

      fontSize:
        12,

      fontWeight:
        '900',
    },

    zoneCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        14,

      padding:
        14,

      marginBottom:
        9,

      borderRadius:
        11,

      borderWidth:
        1,

      borderColor:
        '#343434',

      backgroundColor:
        '#1D1D1D',
    },

    zoneCardInactive: {
      borderColor: '#4A4A4A',
      backgroundColor: '#181818',
    },

    zoneInfo: {
      flex:
        1,
    },

    zoneTitleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      flexWrap:
        'wrap',

      gap:
        8,
    },

    zoneName: {
      color:
        '#FFFFFF',

      fontSize:
        15,

      fontWeight:
        '800',
    },

    statusBadge: {
      paddingHorizontal:
        7,

      paddingVertical:
        3,

      borderRadius:
        10,

      borderWidth:
        1,
    },

    statusBadgeActive: {
      borderColor:
        '#4CAF50',

      backgroundColor:
        '#17331A',
    },

    statusBadgeInactive: {
      borderColor:
        '#666666',

      backgroundColor:
        '#292929',
    },

    statusText: {
      fontSize:
        9,

      fontWeight:
        '900',
    },

    statusTextActive: {
      color:
        '#4CAF50',
    },

    statusTextInactive: {
      color:
        '#AAAAAA',
    },

    zoneRange: {
      color:
        primaryColor,

      fontSize:
        12,

      fontWeight:
        '700',

      marginTop:
        6,
    },

    zoneMetaRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      flexWrap:
        'wrap',

      gap:
        14,

      marginTop:
        7,
    },

    zoneFee: {
      color:
        '#FFFFFF',

      fontSize:
        13,

      fontWeight:
        '900',
    },

    zoneOrder: {
      color:
        '#888888',

      fontSize:
        11,
    },

    zoneActions: {
      minWidth:
        100,

      gap:
        7,
    },

    zoneActionsPhone: {
      minWidth:
        90,
    },

    editButton: {
      minHeight:
        34,

      paddingHorizontal:
        12,

      borderRadius:
        7,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        primaryColor,

      backgroundColor:
        withAlpha(primaryColor, 0.11),
    },

    editButtonText: {
      color:
        primaryColor,

      fontSize:
        11,

      fontWeight:
        '800',
    },

    stateButton: {
      minHeight:
        34,

      paddingHorizontal:
        12,

      borderRadius:
        7,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,
    },

    activateButton: {
      borderColor:
        '#66BB6A',

      backgroundColor:
        '#2E7D32',
    },

    deactivateButton: {
      borderColor:
        '#633333',

      backgroundColor:
        '#321919',
    },

    stateButtonText: {
      color:
        '#FFFFFF',

      fontSize:
        11,

      fontWeight:
        '800',
    },

    deleteButton: {
      minHeight:
        34,

      paddingHorizontal:
        12,

      borderRadius:
        7,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        '#793838',

      backgroundColor:
        '#351B1B',
    },

    deleteButtonText: {
      color:
        '#FF8A80',

      fontSize:
        11,

      fontWeight:
        '800',
    },

    emptyContainer: {
      minHeight:
        220,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        12,

      borderWidth:
        1,

      borderColor:
        '#303030',

      backgroundColor:
        '#1A1A1A',
    },

    emptyIcon: {
      fontSize:
        40,
    },

    emptyTitle: {
      color:
        '#FFFFFF',

      fontSize:
        17,

      fontWeight:
        '900',

      marginTop:
        8,
    },

    emptyText: {
      color:
        '#888888',

      fontSize:
        12,

      marginTop:
        5,
    },

    heroCard: {
      padding: 20,
      marginBottom: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#3A3A3A',
      backgroundColor: '#191919',
    },

    heroHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
    },

    heroTitleWrap: {
      flex: 1,
      minWidth: 220,
    },

    heroEyebrow: {
      color: primaryColor,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.2,
      marginBottom: 6,
    },

    heroTitle: {
      color: '#FFFFFF',
      fontSize: 23,
      fontWeight: '900',
    },

    heroSubtitle: {
      color: '#929292',
      fontSize: 12,
      lineHeight: 18,
      marginTop: 6,
      maxWidth: 620,
    },

    overallStatusBadge: {
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
    },

    overallStatusBadgeOn: {
      backgroundColor: '#17331A',
      borderColor: '#315F35',
    },

    overallStatusBadgeOff: {
      backgroundColor: '#351B1B',
      borderColor: '#793838',
    },

    overallStatusText: {
      fontSize: 9,
      fontWeight: '900',
    },

    overallStatusTextOn: {
      color: '#63D16D',
    },

    overallStatusTextOff: {
      color: '#FF8A80',
    },

    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 18,
    },

    summaryCard: {
      flexGrow: 1,
      flexBasis: 150,
      minWidth: 140,
      padding: 13,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: '#303030',
      backgroundColor: '#202020',
    },

    summaryIcon: {
      fontSize: 18,
      marginBottom: 7,
    },

    summaryLabel: {
      color: '#888888',
      fontSize: 10,
      fontWeight: '700',
    },

    summaryValue: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
      marginTop: 3,
    },

    summaryValueOn: {
      color: '#63D16D',
    },

    summaryValueOff: {
      color: '#FF8A80',
    },

    accordionCard: {
      marginBottom: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#343434',
      backgroundColor: '#1C1C1C',
      overflow: 'hidden',
    },

    accordionHeader: {
      minHeight: 76,
      paddingHorizontal: 16,
      paddingVertical: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },

    accordionHeaderLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    accordionIconBox: {
      width: 42,
      height: 42,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(primaryColor, 0.11),
      borderWidth: 1,
      borderColor: withAlpha(primaryColor, 0.35),
    },

    accordionIcon: {
      fontSize: 19,
    },

    accordionHeaderText: {
      flex: 1,
      minWidth: 0,
    },

    accordionTitle: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },

    accordionSubtitle: {
      color: '#8C8C8C',
      fontSize: 10,
      lineHeight: 15,
      marginTop: 3,
    },

    accordionChevron: {
      color: primaryColor,
      fontSize: 22,
      fontWeight: '700',
      width: 28,
      textAlign: 'center',
    },

    accordionBody: {
      padding: 16,
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: '#2D2D2D',
    },

    modeGrid: {
      flexDirection: 'row',
      gap: 10,
    },

    modeGridPhone: {
      flexDirection: 'column',
    },

    modeCard: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#353535',
      backgroundColor: '#202020',
    },

    modeCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },

    modeTitle: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },

    modeDescription: {
      color: '#888888',
      fontSize: 10,
      marginTop: 3,
    },

    modeScheduleRow: {
      marginTop: 13,
      paddingTop: 11,
      borderTopWidth: 1,
      borderTopColor: '#333333',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },

    modeScheduleTextWrap: {
      flex: 1,
    },

    modeScheduleLabel: {
      color: '#CCCCCC',
      fontSize: 10,
      fontWeight: '800',
    },

    modeScheduleHint: {
      color: '#777777',
      fontSize: 9,
      marginTop: 2,
    },

    subsectionBox: {
      marginTop: 14,
      padding: 14,
      borderRadius: 11,
      backgroundColor: '#181818',
      borderWidth: 1,
      borderColor: '#303030',
    },

    subsectionTitle: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '900',
    },

    subsectionSubtitle: {
      color: '#858585',
      fontSize: 10,
      lineHeight: 15,
      marginTop: 3,
    },

    secondaryPrimaryButton: {
      marginTop: 14,
      minHeight: 40,
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: primaryColor,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(primaryColor, 0.10),
    },

    secondaryPrimaryButtonText: {
      color: primaryColor,
      fontSize: 11,
      fontWeight: '900',
    },

    inlineEmptyState: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 13,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#303030',
      backgroundColor: '#181818',
    },

    inlineEmptyIcon: {
      fontSize: 22,
    },

    inlineEmptyTextWrap: {
      flex: 1,
    },

    inlineEmptyTitle: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },

    inlineEmptyText: {
      color: '#858585',
      fontSize: 9,
      marginTop: 2,
      lineHeight: 14,
    },

    primaryButtonFull: {
      minHeight: 44,
      marginTop: 16,
      width: '100%',
      paddingHorizontal: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: primaryColor,
    },

    infoCallout: {
      marginBottom: 14,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: withAlpha(primaryColor, 0.30),
      backgroundColor: withAlpha(primaryColor, 0.07),
    },

    infoCalloutTitle: {
      color: primaryColor,
      fontSize: 10,
      fontWeight: '900',
    },

    infoCalloutText: {
      color: '#A7A7A7',
      fontSize: 10,
      lineHeight: 15,
      marginTop: 3,
    },

    locationSelectedCard: {
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#66BB6A',
      backgroundColor: '#2E7D32',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },

    locationSelectedCheck: {
      color: '#63D16D',
      fontSize: 16,
      fontWeight: '900',
    },

    locationSelectedTextWrap: {
      flex: 1,
    },

    locationSelectedTitle: {
      color: '#63D16D',
      fontSize: 10,
      fontWeight: '900',
    },

    locationSelectedText: {
      color: '#D5D5D5',
      fontSize: 10,
      lineHeight: 15,
      marginTop: 3,
    },

    zonesToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      marginBottom: 12,
    },

    zonesToolbarPhone: {
      alignItems: 'stretch',
      flexDirection: 'column',
    },

    zonesToolbarText: {
      flex: 1,
    },

    zoneList: {
      gap: 9,
    },

    zoneCardModern: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#353535',
      backgroundColor: '#202020',
    },

    zoneCardTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },

    zoneRangeLarge: {
      color: primaryColor,
      fontSize: 13,
      fontWeight: '900',
      marginTop: 7,
    },

    zonePricePill: {
      minWidth: 82,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: '#181818',
      borderWidth: 1,
      borderColor: '#333333',
      alignItems: 'flex-end',
    },

    zonePriceLabel: {
      color: '#777777',
      fontSize: 8,
      fontWeight: '800',
      textTransform: 'uppercase',
    },

    zonePriceValue: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '900',
      marginTop: 2,
    },

    zoneDivider: {
      height: 1,
      backgroundColor: '#303030',
      marginVertical: 12,
    },

    zoneActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },

    zoneActionRowPhone: {
      alignItems: 'stretch',
      flexDirection: 'column',
    },

    zoneOrderCompact: {
      color: '#777777',
      fontSize: 9,
      fontWeight: '700',
    },

    zoneActionButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },

    editButtonCompact: {
      minHeight: 32,
      paddingHorizontal: 10,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: primaryColor,
      backgroundColor: withAlpha(primaryColor, 0.10),
    },

    stateButtonCompact: {
      minHeight: 32,
      paddingHorizontal: 10,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },

    deleteButtonCompact: {
      minHeight: 32,
      paddingHorizontal: 10,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#793838',
      backgroundColor: '#351B1B',
    },

    emptyActionButton: {
      marginTop: 14,
      minHeight: 38,
      paddingHorizontal: 14,
      borderRadius: 8,
      backgroundColor: primaryColor,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyActionButtonText: {
      color: '#171717',
      fontSize: 10,
      fontWeight: '900',
    },

    modalOverlay: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      padding:
        20,

      backgroundColor:
        'rgba(0,0,0,0.78)',
    },

    modalScroll: {
      width:
        '100%',
    },

    modalScrollContent: {
      flexGrow:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    modalContent: {
      width:
        '100%',

      maxWidth:
        620,

      padding:
        20,

      borderRadius:
        14,

      borderWidth:
        1,

      borderColor:
        '#404040',

      backgroundColor:
        '#1D1D1D',
    },

    modalTitle: {
      color:
        '#FFFFFF',

      fontSize:
        20,

      fontWeight:
        '900',

      marginBottom:
        8,
    },

    modalRow: {
      flexDirection:
        'row',

      gap:
        12,
    },

    modalRowPhone: {
      flexDirection:
        'column',

      gap:
        0,
    },

    modalField: {
      flex:
        1,
    },

    activeRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        20,

      marginTop:
        18,

      padding:
        12,

      borderRadius:
        9,

      backgroundColor:
        '#252525',
    },

    activeTitle: {
      color:
        '#FFFFFF',

      fontSize:
        13,

      fontWeight:
        '800',
    },

    activeSubtitle: {
      color:
        '#888888',

      fontSize:
        10,

      marginTop:
        3,
    },

    modalActions: {
      flexDirection:
        'row',

      justifyContent:
        'flex-end',

      gap:
        10,

      marginTop:
        20,
    },

    modalButton: {
      minHeight:
        42,

      minWidth:
        120,

      paddingHorizontal:
        14,

      borderRadius:
        8,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    cancelButton: {
      borderWidth:
        1,

      borderColor:
        '#555555',

      backgroundColor:
        '#292929',
    },

    cancelButtonText: {
      color:
        '#FFFFFF',

      fontSize:
        12,

      fontWeight:
        '700',
    },

    saveButton: {
      backgroundColor:
        primaryColor,
    },

    saveButtonText: {
      color:
        '#171717',

      fontSize:
        12,

      fontWeight:
        '900',
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
