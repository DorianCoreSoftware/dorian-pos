import {
  StyleSheet,
} from 'react-native';

export const styles =
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
        '#FFBF00',
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
        '#FFBF00',

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
        '#FFBF00',

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
        '#FFBF00',
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
      opacity:
        0.55,
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
        '#FFBF00',

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
        '#FFBF00',

      backgroundColor:
        '#292300',
    },

    editButtonText: {
      color:
        '#FFBF00',

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
        '#315F35',

      backgroundColor:
        '#17331A',
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
        '#FFBF00',
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