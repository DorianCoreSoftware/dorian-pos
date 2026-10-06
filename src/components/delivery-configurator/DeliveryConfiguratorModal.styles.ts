import { DEFAULT_BRAND_PRIMARY } from '../../theme/brandStyles';

import {
  StyleSheet,
} from 'react-native';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
    overlay: {
      flex:
        1,

      justifyContent:
        'center',

      alignItems:
        'center',

      padding:
        20,

      backgroundColor:
        'rgba(0, 0, 0, 0.78)',
    },

    modalContainer: {
      width:
        '92%',

      maxWidth:
        680,

      maxHeight:
        '92%',

      backgroundColor:
        '#151515',

      borderRadius:
        18,

      overflow:
        'hidden',
    },

    header: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      paddingVertical:
        16,

      paddingHorizontal:
        18,

      borderBottomWidth:
        1,

      borderBottomColor:
        '#333333',
    },

    headerTextContainer: {
      flex:
        1,

      paddingRight:
        12,
    },

    title: {
      color:
        '#FFFFFF',

      fontSize:
        20,

      fontWeight:
        '700',
    },

    subtitle: {
      color:
        '#AAAAAA',

      fontSize:
        13,

      marginTop:
        3,
    },

    closeButton: {
      width:
        38,

      height:
        38,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        19,

      backgroundColor:
        '#292929',
    },

    closeButtonText: {
      color:
        '#FFFFFF',

      fontSize:
        17,

      fontWeight:
        '700',
    },

    scrollView: {
      flexGrow:
        0,

      flexShrink:
        1,
    },

    scrollContent: {
      padding:
        20,

      /*
       * Solo dejamos espacio normal.
       * Ya no necesitamos 180px.
       */
      paddingBottom:
        32,
    },

    sectionTitle: {
      color:
        primaryColor,

      fontSize:
        15,

      fontWeight:
        '700',

      marginTop:
        8,

      marginBottom:
        12,
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

    inputContainer: {
      marginBottom:
        14,
    },

    inputLabel: {
      color:
        '#FFFFFF',

      fontSize:
        13,

      fontWeight:
        '600',

      marginBottom:
        7,
    },

    inputLabelDisabled: {
      color:
        '#777777',
    },

    input: {
      minHeight:
        46,

      paddingVertical:
        10,

      paddingHorizontal:
        12,

      borderRadius:
        8,

      borderWidth:
        1,

      borderColor:
        '#4A4A4A',

      backgroundColor:
        '#252525',

      color:
        '#FFFFFF',

      fontSize:
        14,
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

    multilineInput: {
      minHeight:
        90,
    },

    inputError: {
      borderColor:
        '#FF5252',
    },

    errorText: {
      color:
        '#FF6B6B',

      fontSize:
        11,

      marginTop:
        5,
    },

    characterCounter: {
      color:
        '#777777',

      fontSize:
        10,

      marginTop:
        4,

      textAlign:
        'right',
    },

    footer: {
      flexDirection:
        'row',

      gap:
        12,

      padding:
        16,

      borderTopWidth:
        1,

      borderTopColor:
        '#333333',

      backgroundColor:
        '#1C1C1C',
    },

    cancelButton: {
      flex:
        1,

      minHeight:
        46,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        8,

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
        14,

      fontWeight:
        '600',
    },

    confirmButton: {
      flex:
        1.4,

      minHeight:
        46,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        8,

      backgroundColor:
        primaryColor,
    },

    confirmButtonDisabled: {
      backgroundColor:
        '#4A4A4A',
    },

    confirmButtonText: {
      color:
        '#1B1B1B',

      fontSize:
        14,

      fontWeight:
        '800',
    },

    confirmButtonTextDisabled: {
      color:
        '#999999',
    },

    quotingBox: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        8,

      marginTop:
        12,

      marginBottom:
        12,

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
