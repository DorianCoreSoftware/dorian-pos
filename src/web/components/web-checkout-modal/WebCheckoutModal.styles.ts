

import {
  StyleSheet,
} from 'react-native';
import { withAlpha, DEFAULT_BRAND_PRIMARY } from '../../../theme/brandStyles';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,

      backgroundColor:
        'rgba(0,0,0,0.72)',

      flexDirection:
        'row',

      justifyContent:
        'center',

      alignItems:
        'center',

      padding: 16,
    },

    dismissArea: {
      ...StyleSheet.absoluteFillObject,
    },

    modal: {
      width:
        '100%',

      maxWidth:
        680,

      maxHeight:
        '94%',

      backgroundColor:
        '#151515',

      borderRadius:
        18,

      overflow:
        'hidden',

      borderWidth:
        1,

      borderColor:
        '#303030',
    },

    header: {
      paddingHorizontal:
        22,

      paddingVertical:
        19,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      borderBottomWidth:
        1,

      borderBottomColor:
        '#292929',

      gap: 16,
    },

    title: {
      color:
        '#FFFFFF',

      fontSize:
        24,

      fontWeight:
        '900',
    },

    subtitle: {
      color:
        '#9A9A9A',

      fontSize:
        13,

      marginTop:
        4,
    },

    closeButton: {
      width:
        38,

      height:
        38,

      borderRadius:
        19,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#252525',
    },

    closeText: {
      color:
        '#FFFFFF',

      fontSize:
        26,

      lineHeight:
        28,
    },

    scroll: {
      flex:
        1,

      minHeight:
        0,

      overflow:
        'scroll',
    },

    content: {
      width:
        '100%',

      padding:
        22,

      paddingBottom:
        28,
    },

    deliveryModeRow: {
      flexDirection:
        'row',

      gap:
        12,
    },

    choiceButton: {
      flex:
        1,

      minHeight:
        82,

      padding:
        14,

      borderRadius:
        14,

      borderWidth:
        1,

      borderColor:
        '#343434',

      backgroundColor:
        '#1C1C1C',

      justifyContent:
        'center',
    },

    choiceButtonSelected: {
      borderColor:
        primaryColor,

      backgroundColor:
        withAlpha(primaryColor, 0.12),
    },

    choiceButtonPressed: {
      opacity:
        0.9,
    },

    choiceButtonDisabled: {
      opacity:
        0.48,

      backgroundColor:
        '#171717',

      borderColor:
        '#2A2A2A',
    },

    choiceTitle: {
      color:
        '#FFFFFF',

      fontSize:
        16,

      fontWeight:
        '900',
    },

    choiceTitleSelected: {
      color:
        primaryColor,
    },

    choiceTitleDisabled: {
      color:
        '#777777',
    },

    choiceSubtitle: {
      color:
        '#929292',

      fontSize:
        12,

      marginTop:
        4,
    },

    choiceSubtitleSelected: {
      color:
        '#D8C174',
    },

    choiceSubtitleDisabled: {
      color:
        '#666666',
    },

    fulfillmentUnavailableBox: {
      marginTop: 14,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#7D3030',
      backgroundColor: '#2A1717',
    },

    fulfillmentUnavailableTitle: {
      color: '#FF8A8A',
      fontSize: 13,
      fontWeight: '900',
    },

    fulfillmentUnavailableText: {
      color: '#D0D0D0',
      fontSize: 12,
      marginTop: 4,
    },

    sectionTitle: {
      color:
        '#FFFFFF',

      fontSize:
        17,

      fontWeight:
        '900',

      marginTop:
        25,

      marginBottom:
        13,
    },

    field: {
      marginBottom:
        14,
    },

    label: {
      color:
        '#D5D5D5',

      fontSize:
        13,

      fontWeight:
        '700',

      marginBottom:
        7,
    },

    labelDisabled: {
      color:
        '#777777',
    },

    input: {
      width:
        '100%',

      minHeight:
        46,

      backgroundColor:
        '#202020',

      borderWidth:
        1,

      borderColor:
        '#343434',

      borderRadius:
        10,

      color:
        '#FFFFFF',

      fontSize:
        15,

      paddingHorizontal:
        13,

      paddingVertical:
        10,
    },

    inputDisabled: {
      backgroundColor:
        '#181818',

      borderColor:
        '#292929',

      color:
        '#7E7E7E',

      opacity:
        0.85,
    },

    inputMultiline: {
      minHeight:
        92,

      textAlignVertical:
        'top',
    },

    inputError: {
      borderColor:
        '#D96868',
    },

    fieldError: {
      color:
        '#E78080',

      fontSize:
        11,

      marginTop:
        5,
    },

    row: {
      flexDirection:
        'row',

      gap:
        12,
    },

    rowField: {
      flex:
        1,
    },

    quotingBox: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        8,

      marginBottom:
        14,

      paddingVertical:
        4,
    },

    quotingText: {
      color:
        '#BDBDBD',

      fontSize:
        13,
    },

    deliveryAvailableBox: {
      backgroundColor:
        '#142218',

      borderWidth:
        1,

      borderColor:
        '#2E6B3A',

      borderRadius:
        12,

      padding:
        14,

      marginBottom:
        14,
    },

    deliveryUnavailableBox: {
      backgroundColor:
        '#2A1717',

      borderWidth:
        1,

      borderColor:
        '#7D3030',

      borderRadius:
        12,

      padding:
        14,

      marginBottom:
        14,
    },

    deliveryAvailableTitle: {
      color:
        '#73D887',

      fontSize:
        15,

      fontWeight:
        '800',

      marginBottom:
        4,
    },

    deliveryUnavailableTitle: {
      color:
        '#FF8A8A',

      fontSize:
        15,

      fontWeight:
        '800',

      marginBottom:
        4,
    },

    deliveryInfoText: {
      color:
        '#D0D0D0',

      fontSize:
        13,

      marginTop:
        3,
    },

    deliveryExtraText: {
      color:
        primaryColor,

      fontSize:
        13,

      fontWeight:
        '700',

      marginTop:
        3,
    },

    deliveryFreeExtraText: {
      color:
        '#73D887',

      fontSize:
        13,

      marginTop:
        3,
    },

    deliveryTotalText: {
      color:
        '#FFFFFF',

      fontSize:
        15,

      fontWeight:
        '800',

      marginTop:
        6,
    },

    deliveryErrorBox: {
      backgroundColor:
        '#2A1717',

      borderWidth:
        1,

      borderColor:
        '#7D3030',

      borderRadius:
        10,

      padding:
        12,

      marginBottom:
        14,
    },

    deliveryErrorText: {
      color:
        '#FF8A8A',

      fontSize:
        13,

      lineHeight:
        18,
    },

    summaryBox: {
      backgroundColor:
        '#1D1D1D',

      borderWidth:
        1,

      borderColor:
        '#2C2C2C',

      borderRadius:
        14,

      padding:
        15,
    },

    summaryRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        16,

      marginBottom:
        9,
    },

    summaryLabel: {
      color:
        '#B9B9B9',

      fontSize:
        13,
    },

    summaryValue: {
      color:
        '#E9E9E9',

      fontSize:
        13,

      fontWeight:
        '700',
    },

    discountText: {
      color:
        '#E2C15B',
    },

    totalDivider: {
      height:
        1,

      backgroundColor:
        '#343434',

      marginVertical:
        7,
    },

    totalText: {
      color:
        '#FFFFFF',

      fontSize:
        17,

      fontWeight:
        '900',
    },

    totalValue: {
      color:
        primaryColor,

      fontSize:
        19,

      fontWeight:
        '900',
    },

    serverPriceHint: {
      color:
        '#777777',

      fontSize:
        10,

      lineHeight:
        15,

      marginTop:
        5,
    },

    errorBox: {
      marginTop:
        16,

      backgroundColor:
        '#351D1D',

      borderWidth:
        1,

      borderColor:
        '#6B3535',

      borderRadius:
        10,

      padding:
        12,
    },

    errorBoxText: {
      color:
        '#F0A0A0',

      fontSize:
        12,

      lineHeight:
        17,
    },

    savedAddressCard: {
      marginBottom: 14,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: withAlpha(primaryColor, 0.48),
      backgroundColor: withAlpha(primaryColor, 0.08),
    },

    savedAddressCardPressed: {
      opacity: 0.88,
    },

    savedAddressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },

    savedAddressTitle: {
      flex: 1,
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },

    savedAddressAction: {
      color: primaryColor,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
    },

    savedAddressText: {
      color: '#AFAFAF',
      fontSize: 12,
      lineHeight: 18,
      marginTop: 8,
    },

    saveAddressRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginTop: 6,
      marginBottom: 8,
      padding: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#343434',
      backgroundColor: '#1B1B1B',
    },

    saveAddressRowPressed: {
      opacity: 0.88,
    },

    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#666666',
      backgroundColor: '#111111',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },

    checkboxChecked: {
      borderColor: primaryColor,
      backgroundColor: primaryColor,
    },

    checkboxMark: {
      color: '#111111',
      fontSize: 14,
      fontWeight: '900',
      lineHeight: 16,
    },

    saveAddressTextBox: {
      flex: 1,
    },

    saveAddressTitle: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },

    saveAddressHint: {
      color: '#8F8F8F',
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },

    footer: {
      borderTopWidth:
        1,

      borderTopColor:
        '#292929',

      padding:
        18,

      backgroundColor:
        '#151515',
    },

    confirmButton: {
      minHeight:
        50,

      borderRadius:
        12,

      backgroundColor:
        primaryColor,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        16,
    },

    confirmButtonPressed: {
      opacity:
        0.9,
    },

    confirmButtonDisabled: {
      opacity:
        0.65,
    },

    confirmButtonText: {
      color:
        '#111111',

      fontSize:
        15,

      fontWeight:
        '900',
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