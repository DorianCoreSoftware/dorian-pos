import { DEFAULT_BRAND_PRIMARY } from '../../theme/brandStyles';

import {
  StyleSheet,
} from 'react-native';

const createStyles = (
  primaryColor: string,
) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor:
        'rgba(0, 0, 0, 0.72)',
      justifyContent:
        'center',
      alignItems:
        'center',
      padding: 18,
    },

    container: {
      width:
        '100%',
      maxWidth:
        620,
      maxHeight:
        '92%',
      borderRadius:
        18,
      backgroundColor:
        '#151515',
      borderWidth:
        1,
      borderColor:
        '#333',
      overflow:
        'hidden',
    },

    header: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'flex-start',
      gap:
        16,
      padding:
        20,
      borderBottomWidth:
        1,
      borderBottomColor:
        '#2C2C2C',
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
        '#AFAFAF',
      fontSize:
        14,
      marginTop:
        5,
    },

    closeButton: {
      width:
        36,
      height:
        36,
      borderRadius:
        18,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#242424',
    },

    closeButtonText: {
      color:
        '#FFFFFF',
      fontSize:
        24,
      lineHeight:
        26,
    },

    content: {
      padding:
        20,
      gap:
        18,
    },

    searchRow: {
      flexDirection:
        'row',
      gap:
        10,
      flexWrap:
        'wrap',
    },

    input: {
      flexGrow:
        1,
      flexBasis:
        220,
      minHeight:
        48,
      borderRadius:
        10,
      borderWidth:
        1,
      borderColor:
        '#444',
      backgroundColor:
        '#202020',
      color:
        '#FFFFFF',
      paddingHorizontal:
        14,
      fontSize:
        16,
      fontWeight:
        '800',
      letterSpacing:
        1.5,
    },

    searchButton: {
      minHeight:
        48,
      paddingHorizontal:
        18,
      borderRadius:
        10,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        primaryColor,
    },

    searchButtonDisabled: {
      opacity:
        0.6,
    },

    searchButtonText: {
      color:
        '#151515',
      fontWeight:
        '900',
    },

    centerState: {
      paddingVertical:
        28,
      alignItems:
        'center',
      gap:
        12,
    },

    loadingText: {
      color:
        '#BDBDBD',
    },

    errorBox: {
      borderWidth:
        1,
      borderColor:
        '#7A2B2B',
      backgroundColor:
        '#2D1717',
      borderRadius:
        10,
      padding:
        14,
    },

    errorText: {
      color:
        '#FFB5B5',
      fontWeight:
        '700',
    },

    orderHeader: {
      borderRadius:
        12,
      borderWidth:
        1,
      borderColor:
        '#3B3B3B',
      backgroundColor:
        '#1E1E1E',
      padding:
        16,
    },

    orderCode: {
      color:
        primaryColor,
      fontSize:
        22,
      fontWeight:
        '900',
    },

    orderMeta: {
      color:
        '#BDBDBD',
      marginTop:
        5,
    },

    customerName: {
      color:
        '#FFFFFF',
      marginTop:
        8,
      fontWeight:
        '700',
    },

    timeline: {
      paddingVertical:
        4,
    },

    stepRow: {
      flexDirection:
        'row',
      minHeight:
        72,
    },

    stepIndicatorColumn: {
      width:
        28,
      alignItems:
        'center',
    },

    stepDot: {
      width:
        16,
      height:
        16,
      borderRadius:
        8,
      borderWidth:
        2,
      borderColor:
        '#555',
      backgroundColor:
        '#151515',
      zIndex:
        1,
    },

    stepDotComplete: {
      borderColor:
        primaryColor,
      backgroundColor:
        primaryColor,
    },

    stepDotCurrent: {
      borderColor:
        primaryColor,
      backgroundColor:
        '#151515',
    },

    stepLine: {
      width:
        2,
      flex:
        1,
      backgroundColor:
        '#3A3A3A',
    },

    stepLineComplete: {
      backgroundColor:
        primaryColor,
    },

    stepTextContainer: {
      flex:
        1,
      paddingLeft:
        10,
      paddingBottom:
        18,
    },

    stepLabel: {
      color:
        '#FFFFFF',
      fontSize:
        16,
      fontWeight:
        '800',
    },

    stepLabelPending: {
      color:
        '#777',
    },

    currentLabel: {
      color:
        primaryColor,
      marginTop:
        4,
      fontSize:
        12,
      fontWeight:
        '800',
    },

    cancelledBox: {
      borderWidth:
        1,
      borderColor:
        '#7A2B2B',
      backgroundColor:
        '#2D1717',
      borderRadius:
        12,
      padding:
        18,
    },

    cancelledTitle: {
      color:
        '#FF8A8A',
      fontSize:
        20,
      fontWeight:
        '900',
    },

    cancelledText: {
      color:
        '#E1B7B7',
      marginTop:
        8,
      lineHeight:
        20,
    },

    refreshButton: {
      minHeight:
        46,
      borderRadius:
        10,
      alignItems:
        'center',
      justifyContent:
        'center',
      borderWidth:
        1,
      borderColor:
        primaryColor,
      paddingHorizontal:
        16,
    },

    refreshButtonText: {
      color:
        primaryColor,
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
